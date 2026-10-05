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
    await sleep(CONFIG.politeness.sellerMs);
  }
  return db.prepare('SELECT reviews, positive_pct AS positivePct, negative, reports FROM sellers WHERE source=? AND seller_id=?')
    .get(source, String(sellerId)) || null;
}

export async function runSearch(search) {
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
  for (const name of wanted) {
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

  // ---- 3. detail fetches, cheapest first ----------------------------------
  // Vinted returns titles only. Spend the budget on the cheapest unresolved
  // candidates rather than whichever happened to arrive first.
  if (search.kind === 'computer') {
    const needing = candidates
      .filter(({ r, spec }) => r.needsDetail &&
        !(spec.ram >= (search.min_ram || 0) && spec.storage >= (search.min_storage || 0) &&
          spec.ram > 0 && spec.storage > 0))
      .sort((a, b) => a.r.price - b.r.price)
      .slice(0, CONFIG.vinted.maxDetailFetches);
    let fetched = 0;
    for (const c of needing) {
      const d = await vinted.detail(c.r.url);
      fetched++;
      await sleep(CONFIG.politeness.detailMs);
      if (!d) continue;
      if (!d.inStock) { c.gone = true; continue; }
      c.r.description = d.description;
      const better = parseListing(c.r.title, c.r.description, search.kind);
      if (better) c.spec = better;
      if (!isRelevant(tokens, c.r.title, c.r.description)) c.gone = true;
    }
    if (fetched) log(`  ${fetched} detail fetches (cheapest first)`);
  }

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

  // ---- 5. staleness --------------------------------------------------------
  const stale = db.prepare(`SELECT l.id FROM listings l
    JOIN matches m ON m.listing_id = l.id
    WHERE m.search_id = ? AND l.sold_at IS NULL AND l.last_seen < ?`).all(search.id, sweepStart);
  for (const st of stale) {
    const misses = db.prepare('UPDATE listings SET misses = misses + 1 WHERE id=? RETURNING misses').get(st.id).misses;
    if (misses >= CONFIG.missesBeforeSold)
      db.prepare("UPDATE listings SET sold_at = datetime('now') WHERE id=?").run(st.id);
  }

  db.prepare("UPDATE searches SET last_run_at = datetime('now') WHERE id=?").run(search.id);
  log(`"${search.name}": ${pool.size} seen, ${offTopic} off-topic, ${matched} match, ${stale.length} stale, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return { found: pool.size, offTopic, matched };
}

export async function sweep() {
  const searches = db.prepare('SELECT * FROM searches WHERE enabled = 1 ORDER BY id').all();
  if (!searches.length) { log('no enabled searches'); return; }
  log(`sweeping ${searches.length} search(es)`);
  for (const s of searches) { log(`> ${s.name}`); await runSearch(s); }
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
