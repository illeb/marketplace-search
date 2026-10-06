import { CONFIG } from './config.mjs';
import { db, upsertListing, saveSpecs, saveSeller, sellerIsFresh } from './db.mjs';
import { parseListing } from './parse.mjs';
import { evaluate } from './match.mjs';
import { countriesFor, searchedWholeOfEurope, ensureCoords } from './geo.mjs';
import { termTokens, isRelevant } from './relevance.mjs';
import * as subito from './sources/subito.mjs';
import * as wallapop from './sources/wallapop.mjs';
import * as vinted from './sources/vinted.mjs';

const SOURCES = { subito, wallapop, vinted };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function reputation(source, sellerId) {
  if (!sellerId) return null;
  if (!sellerIsFresh(source, sellerId)) {
    const rep = await SOURCES[source].seller(sellerId);
    if (rep) saveSeller(source, sellerId, rep);
    // Vinted si frena da sé; per le altre fonti la pausa serve ancora qui.
    if (source !== 'vinted') await sleep(CONFIG.politeness.sellerMs);
  }
  return db.prepare('SELECT reviews, positive_pct AS positivePct, negative, reports FROM sellers WHERE source=? AND seller_id=?')
    .get(source, String(sellerId)) || null;
}

/* ---- progress and history ------------------------------------------------
 * A run reads three marketplaces one after another and takes minutes, so the
 * interface needs to say where it has got to. Progress is in memory, because it
 * is worthless once the process restarts; the history is a table, because
 * "did the hourly sweep actually fire" is a question you can only answer after
 * the fact.
 * ------------------------------------------------------------------------ */
const progress = new Map();   // search id -> {phase, step, steps, label, startedAt}

export const progressOf = (id) => progress.get(Number(id)) ?? null;
export const allProgress = () => [...progress.entries()].map(([searchId, p]) => ({ searchId, ...p }));

const setProgress = (id, patch) => {
  const now = progress.get(id) ?? { startedAt: new Date().toISOString() };
  progress.set(id, { ...now, ...patch });
};

/** Open a history row; the id comes back so the end can be written onto it. */
function beginRun(searchId, trigger) {
  const info = db.prepare(
    `INSERT INTO sweep_runs (search_id, trigger, started_at) VALUES (?,?,datetime('now'))`,
  ).run(searchId, trigger);
  return Number(info.lastInsertRowid);
}

function endRun(runId, { found = 0, offTopic = 0, matched = 0, error = null } = {}) {
  db.prepare(`UPDATE sweep_runs SET finished_at=datetime('now'),
    found=?, off_topic=?, matched=?, error=? WHERE id=?`)
    .run(found, offTopic, matched, error, runId);
}

/* ---- budget di richieste a Vinted ----------------------------------------
 * Le letture di pagina erano un tetto per ricerca: con tre ricerche che
 * leggono Vinted diventavano il triplo, e nessuno lo aveva deciso. Adesso il
 * budget è della passata e le ricerche se lo dividono nell'ordine in cui
 * girano. Una scansione lanciata a mano si apre il suo, perché è una sola.
 * ------------------------------------------------------------------------ */
let budget = null;
const newBudget = () => ({
  details: CONFIG.vinted.maxDetailFetches,
  dates: CONFIG.vinted.maxDateFetches,
});

export async function runSearch(search, { trigger = 'manual' } = {}) {
  const runId = beginRun(search.id, trigger);
  const ownBudget = budget == null;
  if (ownBudget) budget = newBudget();
  try {
    const out = await runSearchInner(search);
    endRun(runId, out);
    return out;
  } catch (e) {
    endRun(runId, { error: String(e?.message ?? e) });
    throw e;
  } finally {
    progress.delete(Number(search.id));
    if (ownBudget) budget = null;
  }
}

async function runSearchInner(search) {
  const started = Date.now();
  // Anchor staleness to the moment the sweep began, or long sweeps mark their
  // own early results as missing.
  const sweepStart = db.prepare("SELECT datetime('now') AS t").get().t;
  const wanted = String(search.sources || '').split(',').map(s => s.trim()).filter(s => SOURCES[s]);

  // A search may hold several terms, comma separated — one sweep covers them all,
  // which is how the market actually has to be searched to get real coverage.
  const terms = String(search.query || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!terms.length) terms.push('');
  const tokens = termTokens(search.query);

  const wantedCountries = countriesFor(search);
  const wholeEurope = searchedWholeOfEurope(search);

  // ---- 1. collect ----------------------------------------------------------
  const pool = new Map();                       // url -> raw record
  // the collect pass is most of the wall clock, so it drives the step counter
  const steps = wanted.length + 2;
  let step = 0;
  for (const name of wanted) {
    step += 1;
    setProgress(Number(search.id), {
      phase: 'collect', step, steps, label: name, found: pool.size,
    });
    // Subito is an Italian marketplace: skip it when Italy is not in scope.
    if (name === 'subito' && !wholeEurope && !wantedCountries.includes('IT')) {
      log('  subito: skipped, Italy not in scope'); continue;
    }
    // Wallapop searches one national catalogue per request, so a few are tried.
    // Vinted's catalogue is EU-wide and gets filtered by seller country instead.
    const catalogues = name === 'wallapop'
      ? (wholeEurope ? ['IT', 'ES'] : wantedCountries.slice(0, 3))
      : [undefined];

    let got = 0;
    for (const term of terms) {
      for (const cc of [...new Set(catalogues)]) {
        try {
          const part = await SOURCES[name].search({
            query: term, minPrice: search.min_price, maxPrice: search.max_price,
            lat: search.lat ?? 48.0, lon: search.lon ?? 10.0, country: cc, maxPages: 3,
          });
          got += part.length;
          for (const r of part) if (r.url && !pool.has(r.url)) pool.set(r.url, r);
        } catch (e) { log(`  ${name} "${term}"${cc ? ' ' + cc : ''}: ${e.message}`); }
      }
    }
    log(`  ${name}: ${got} raw across ${terms.length} term(s)`);
    setProgress(Number(search.id), { found: pool.size });
  }

  // ---- 2. relevance --------------------------------------------------------
  // Marketplaces answer with whatever they consider related. A search for a dough
  // mixer came back with neck massagers and floor tiles; Vinted mixes promoted
  // items in as well. Anything not mentioning the query is discarded here.
  let offTopic = 0;
  const candidates = [];
  for (const r of pool.values()) {
    if (!isRelevant(tokens, r.title, r.description)) { offTopic++; continue; }
    const spec = parseListing(r.title, r.description, search.kind);
    if (spec) candidates.push({ r, spec });
  }
  if (offTopic) log(`  dropped ${offTopic} off-topic`);

  setProgress(Number(search.id), {
    phase: 'details', step: steps - 1, steps, label: 'reading adverts', found: pool.size,
  });

  // ---- 3. detail fetches, cheapest first ----------------------------------
  // Vinted returns titles only. Spend the budget on the cheapest unresolved
  // candidates rather than whichever happened to arrive first.
  // Vale per ogni tipo di ricerca, non solo per i computer: la pagina porta la
  // descrizione, ma anche la data di pubblicazione, che il catalogo non dà e
  // senza la quale "nuovo oggi" su Vinted non sarebbe rispondibile.
  {
    // Una macchina già descritta per intero non ha bisogno della pagina; per
    // tutto il resto manca comunque la data, quindi la lettura si giustifica.
    const resolved = ({ spec }) => search.kind === 'computer'
      && spec.ram >= (search.min_ram || 0) && spec.storage >= (search.min_storage || 0)
      && spec.ram > 0 && spec.storage > 0;
    // Un annuncio fuori dalla forbice di prezzo non corrisponderà mai, quindi
    // leggerne la pagina è budget buttato: il prezzo è l'unico filtro che si può
    // applicare prima di spenderlo.
    const inPrice = ({ r }) => r.price >= (search.min_price || 0)
      && (!search.max_price || r.price <= search.max_price);
    const needing = candidates
      .filter((c) => c.r.needsDetail && inPrice(c) && !resolved(c))
      .sort((a, b) => a.r.price - b.r.price)
      .slice(0, Math.max(0, budget?.details ?? CONFIG.vinted.maxDetailFetches));
    let fetched = 0, dated = 0;
    for (const c of needing) {
      // In castigo le richieste tornerebbero vuote: meglio fermarsi e lasciare
      // il budget alla prossima ricerca, o alla prossima passata.
      if (vinted.cooling() > CONFIG.vinted.maxWaitMs) { log('  vinted in pausa, salto i dettagli'); break; }
      const d = await vinted.detail(c.r.url);
      fetched++;
      if (budget) budget.details--;
      // la pausa la tiene il freno dentro all'adattatore, non serve qui
      if (!d) continue;
      // d.gone: la pagina risponde 200 ma è quella del "non trovato"
      if (d.gone || !d.inStock) { c.gone = true; continue; }
      if (d.postedAt) { c.r.postedAt = d.postedAt; dated++; }
      c.r.description = d.description;
      const better = parseListing(c.r.title, c.r.description, search.kind);
      if (better) c.spec = better;
      if (!isRelevant(tokens, c.r.title, c.r.description)) c.gone = true;
    }
    if (fetched) log(`  ${fetched} detail fetches (cheapest first), ${dated} dated`);
  }

  setProgress(Number(search.id), {
    phase: 'match', step: steps, steps, label: 'scoring', found: pool.size,
  });

  // ---- 4. store, score, match ---------------------------------------------
  // Coordinates are only worth resolving when the search actually filters on
  // distance. Every town is geocoded once and cached for good.
  const needsGeo = (search.radius_km ?? 0) > 0 && search.lat != null && search.lon != null;
  let matched = 0, geocoded = 0;
  for (const { r, spec, gone } of candidates) {
    if (gone) continue;
    const rep = await reputation(r.source, r.sellerId);
    const listingId = upsertListing(r);
    saveSpecs(listingId, spec);
    if (rep && !r.country && rep.country)
      db.prepare('UPDATE listings SET country=? WHERE id=?').run(rep.country, listingId);
    const row = db.prepare('SELECT * FROM listings WHERE id=?').get(listingId);
    if (needsGeo && await ensureCoords(row)) geocoded++;
    const { ok } = evaluate(search, row, spec, rep);
    if (ok) {
      db.prepare('INSERT OR IGNORE INTO matches (search_id, listing_id) VALUES (?,?)').run(search.id, listingId);
      matched++;
    } else {
      db.prepare('DELETE FROM matches WHERE search_id=? AND listing_id=?').run(search.id, listingId);
    }
  }

  // ---- 4b. le date che mancano a ciò che si vede --------------------------
  // Le letture di pagina della fase 3 servono a decidere se un annuncio
  // corrisponde, e si spendono dal più economico in giù: le righe che poi
  // finiscono davvero in lista spesso non sono fra quelle, e restavano senza
  // data. Qui si torna solo sulle corrispondenze Vinted che ne sono ancora
  // prive — l'unica fonte che non la pubblica — e quel che si trova resta
  // salvato, quindi questa fase si svuota da sola col passare delle passate.
  if (wanted.includes('vinted')) {
    const missing = db.prepare(`SELECT l.id, l.url FROM listings l
      JOIN matches m ON m.listing_id = l.id
      WHERE m.search_id = ? AND l.source = 'vinted'
        AND l.posted_at IS NULL AND l.sold_at IS NULL
      ORDER BY l.price ASC LIMIT ?`)
      .all(search.id, Math.max(0, budget?.dates ?? CONFIG.vinted.maxDateFetches));

    if (missing.length) {
      setProgress(Number(search.id), {
        phase: 'dates', step: steps, steps, label: 'date di pubblicazione', found: pool.size,
      });
      let dated = 0, retired = 0;
      for (const row of missing) {
        if (vinted.cooling() > CONFIG.vinted.maxWaitMs) { log('  vinted in pausa, salto le date'); break; }
        const d = await vinted.detail(row.url);
        if (budget) budget.dates--;
        if (!d) continue;
        // Questa fase apre proprio le righe che si vedono in tabella, quindi è
        // il posto giusto per accorgersi che una non esiste più: senza, un
        // annuncio sparito resta in lista finché non lo prende il contatore
        // delle assenze, e intanto il link apre una pagina vuota.
        if (d.gone || !d.inStock) {
          db.prepare("UPDATE listings SET sold_at = datetime('now') WHERE id=?").run(row.id);
          retired++;
          continue;
        }
        if (!d.postedAt) continue;
        db.prepare('UPDATE listings SET posted_at=? WHERE id=?').run(d.postedAt, row.id);
        dated++;
      }
      log(`  ${missing.length} date mancanti cercate, ${dated} trovate, ${retired} sparite`);
    }
  }

  // ---- 5. staleness --------------------------------------------------------
  // Un annuncio che questa passata non ha più trovato nel catalogo. Contarlo e
  // basta non funzionava in nessuna delle due direzioni: un annuncio vivo che
  // per due giri non è uscito dalla ricerca — succede, oltre la terza pagina o
  // se il catalogo riordina — veniva dato per venduto e spariva dalla lista
  // senza che nessuno lo avesse tolto; e uno davvero sparito restava in lista
  // fino alla seconda assenza, col link che apriva il vuoto.
  //
  // Quindi si chiede alla pagina, che è l'unica a saperlo davvero. Gli spariti
  // per passata sono una manciata, quindi sono poche richieste, e il conteggio
  // resta solo per quando la pagina non risponde in modo chiaro.
  const stale = db.prepare(`SELECT l.id, l.source, l.url FROM listings l
    JOIN matches m ON m.listing_id = l.id
    WHERE m.search_id = ? AND l.sold_at IS NULL AND l.last_seen < ?`).all(search.id, sweepStart);

  const sold = db.prepare("UPDATE listings SET sold_at = datetime('now') WHERE id=?");
  const miss = db.prepare('UPDATE listings SET misses = misses + 1 WHERE id=? RETURNING misses');
  const forgive = db.prepare('UPDATE listings SET misses = 0 WHERE id=?');
  let asked = 0, confirmed = 0, alive = 0;

  for (const st of stale) {
    const source = SOURCES[st.source];
    let gone = null;
    if (source?.isSold) {
      try { gone = await source.isSold(st.url); } catch { gone = null; }
      asked++;
      // Vinted ha il suo freno interno; le altre fonti la pausa la vogliono qui.
      if (st.source !== 'vinted') await sleep(CONFIG.politeness.detailMs);
    }
    if (gone === true) { sold.run(st.id); confirmed++; continue; }
    // Vivo: l'assenza era del catalogo, non dell'annuncio, e non deve pesare.
    if (gone === false) { forgive.run(st.id); alive++; continue; }
    // null: non si sa, e allora si torna a contare.
    if (miss.get(st.id).misses >= CONFIG.missesBeforeSold) sold.run(st.id);
  }
  if (asked) log(`  ${asked} spariti verificati: ${confirmed} ritirati, ${alive} ancora vivi`);

  db.prepare("UPDATE searches SET last_run_at = datetime('now') WHERE id=?").run(search.id);
  log(`"${search.name}": ${pool.size} seen, ${offTopic} off-topic, ${matched} match, ${stale.length} stale, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return { found: pool.size, offTopic, matched };
}

export async function sweep({ trigger = 'sweep' } = {}) {
  const searches = db.prepare('SELECT * FROM searches WHERE enabled = 1 ORDER BY id').all();
  if (!searches.length) { log('no enabled searches'); return; }
  log(`sweeping ${searches.length} search(es)`);
  // Un budget solo per tutta la passata, e un castigo preso sei ore fa non
  // deve pesare su questa.
  budget = newBudget();
  vinted.resetLimiter();
  try {
    for (const s of searches) {
      log(`> ${s.name}`);
      try { await runSearch(s, { trigger }); }
      catch (e) { log(`  ${s.name} failed: ${e.message}`); }
    }
  } finally {
    budget = null;
  }
  log('sweep complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const once = process.argv.includes('--once');
  await sweep();
  if (!once) {
    log(`scheduler armed, every ${CONFIG.sweepMinutes} min`);
    setInterval(() => sweep().catch(e => log('sweep failed:', e.message)), CONFIG.sweepMinutes * 60_000);
  }
}

/**
 * Re-decide which stored listings a search matches, without touching the
 * network. Changing a filter used to do nothing visible until the next sweep,
 * which reads three marketplaces and takes minutes — so a saved filter looked
 * broken.
 *
 * Everything needed is already in the database: the advert text, the seller's
 * reputation and the coordinates. The listing is re-parsed rather than read
 * from the specs table because the parse depends on the search's kind, and the
 * kind is one of the things being changed.
 */
export function matchingIds(search) {
  const terms = termTokens(search.query);
  const rows = db.prepare(`
    SELECT l.*, s.reviews, s.positive_pct AS positivePct, s.reports
    FROM listings l
    LEFT JOIN sellers s ON s.source = l.source AND s.seller_id = l.seller_id
    WHERE l.sold_at IS NULL`).all();

  const out = [];
  for (const r of rows) {
    if (!isRelevant(terms, r.title, r.description)) continue;
    const spec = parseListing(r.title, r.description, search.kind);
    const seller = r.reviews == null ? null
      : { reviews: r.reviews, positivePct: r.positivePct, reports: r.reports };
    if (evaluate(search, r, spec, seller).ok) out.push(r.id);
  }
  return { ids: out, considered: rows.length };
}

export function refilter(search) {
  const { ids, considered } = matchingIds(search);
  const want = new Set(ids);
  const add = db.prepare('INSERT OR IGNORE INTO matches (search_id, listing_id) VALUES (?,?)');
  const drop = db.prepare('DELETE FROM matches WHERE search_id=? AND listing_id=?');
  const had = new Set(
    db.prepare('SELECT listing_id FROM matches WHERE search_id=?').all(search.id)
      .map((r) => r.listing_id),
  );

  for (const id of want) if (!had.has(id)) add.run(search.id, id);
  for (const id of had) if (!want.has(id)) drop.run(search.id, id);
  return { considered, matched: want.size };
}
