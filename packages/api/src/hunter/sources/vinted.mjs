// Vinted: the awkward one. The catalogue API needs a bootstrapped anonymous
// session cookie, its search results carry titles only, and it rate-limits hard
// enough that the session has to be rotated every handful of requests.
import { CONFIG } from '../config.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WEB = () => `https://www.${CONFIG.vinted.host}`;
const API = () => `https://api.edge.${CONFIG.vinted.host}/svc-catalogue/items`;

export const id = 'vinted';

let jar = '', sinceRotate = 0;

function readSetCookies(res) {
  const list = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=\s*[^;,=\s]+=)/);
  const map = new Map();
  for (const raw of list) {
    const pair = raw.split(';')[0]; const i = pair.indexOf('=');
    if (i === -1) continue;
    const k = pair.slice(0, i).trim(), v = pair.slice(i + 1).trim();
    if (!k) continue;
    if (v === '') map.delete(k); else map.set(k, v);   // "name=; Max-Age=-1" deletes
  }
  return map;
}

async function bootstrap() {
  const res = await fetch(`${WEB()}/`, { headers: {
    'user-agent': CONFIG.userAgent, accept: 'text/html', 'accept-language': 'it-IT,it;q=0.9' } });
  const map = readSetCookies(res);
  if (!map.has('access_token_web')) throw new Error(`Vinted refused an anonymous session (HTTP ${res.status})`);
  jar = [...map].map(([k, v]) => `${k}=${v}`).join('; ');
  sinceRotate = 0;
}

async function authed(url, accept = 'application/json, text/plain, */*') {
  if (!jar || sinceRotate >= CONFIG.vinted.rotateEvery) await bootstrap();
  sinceRotate++;
  const anon = jar.match(/(?:^|;\s*)anon_id=([^;]+)/)?.[1] || '';
  return fetch(url, { headers: {
    'user-agent': CONFIG.userAgent, accept, 'accept-language': 'it-IT,it;q=0.9',
    origin: WEB(), referer: `${WEB()}/catalog`, cookie: jar, ...(anon ? { 'x-anon-id': anon } : {}) } });
}

export async function search({ query, minPrice = 0, maxPrice = 1000, maxPages = 3 }) {
  const out = []; const time = Math.floor(Date.now() / 1000); const sid = crypto.randomUUID();
  for (let page = 1; page <= maxPages; page++) {
    const p = new URLSearchParams({ page: String(page), per_page: '96', time: String(time),
      search_text: query, currency: 'EUR', order: 'price_low_to_high',
      price_to: String(Math.ceil(maxPrice)), global_search_session_id: sid });
    // Senza il limite inferiore il catalogo manda anche tutto ciò che costa meno
    // del minimo, e ordinando dal più economico quella roba arrivava prima di
    // ogni altra cosa: non poteva corrispondere a niente e si mangiava il budget
    // di letture di pagina, che è l'unica via alla data di pubblicazione.
    if (minPrice > 0) p.set('price_from', String(Math.floor(minPrice)));
    let r;
    try { r = await authed(`${API()}?${p}`); } catch { break; }
    if (r.status === 401 || r.status === 403) { jar = ''; try { r = await authed(`${API()}?${p}`); } catch { break; } }
    if (!r.ok) break;
    const d = await r.json();
    const items = d.items || [];
    for (const x of items) out.push({
      source: id, sourceId: String(x.id), url: `${WEB()}${x.url}`,
      title: x.title || '', description: '', price: +x.price.amount,
      sellerId: x.user?.id ? String(x.user.id) : null, city: null, country: null,
      shippable: true, condition: x.item_box?.second_line || null, needsDetail: true,
      // Il catalogo non porta date; la pagina del singolo annuncio sì, e la
      // legge detail(). Qui resta null e viene riempita se l'annuncio merita
      // una lettura di dettaglio.
      postedAt: null,
      imageUrl: x.photo?.url || x.photo?.thumbnails?.at(-1)?.url || null,
    });
    if (page >= (d.pagination?.total_pages || 1) || !items.length) break;
    await sleep(CONFIG.politeness.vintedMs);
  }
  return out;
}

/* ---- data di pubblicazione ------------------------------------------------
 * Vinted non la mette in nessuna API: non nel catalogo, non nel JSON-LD. La
 * pagina dell'annuncio però la mostra, e solo come tempo trascorso — la riga
 * "Caricato 13 ore fa" sotto i dettagli. Si legge quella e si torna indietro.
 *
 * Il risultato è quindi approssimato, e tanto più grosso quanto più vecchio è
 * l'annuncio: a "ore" vale l'ora giusta, a "2 mesi" vale più o meno la
 * quindicina. L'interfaccia lo dichiara invece di fingere una precisione che
 * non c'è. Per "nuovo oggi", che è la domanda vera, la lettura in ore basta.
 * ------------------------------------------------------------------------ */
const UNIT_MINUTES = [
  // "ora" da sola vuol dire adesso, ma qui ha sempre un numero davanti e
  // vale quindi l'unità oraria: "1 ora fa" non è "adesso".
  [/^second|^attimo/, 0],
  [/^minut/, 1],
  [/^or[ae]$/, 60],
  [/^giorn/, 60 * 24],
  [/^settiman/, 60 * 24 * 7],
  [/^mes/, 60 * 24 * 30],
  [/^ann/, 60 * 24 * 365],
];

export function uploadedAgoToIso(text, now = Date.now()) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  if (/^(adesso|poco fa|pochi secondi fa)$/.test(t)) return new Date(now).toISOString();
  const m = t.match(/(\d+)\s*([a-zà-ù]+)/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = UNIT_MINUTES.find(([re]) => re.test(m[2]));
  if (!unit || !Number.isFinite(n)) return null;
  return new Date(now - n * unit[1] * 60_000).toISOString();
}

/** Search gives titles only, so promising candidates need their page fetched. */
export async function detail(url) {
  try {
    const r = await authed(url, 'text/html');
    if (!r.ok) return null;
    const html = await r.text();
    // la data sta fuori dal JSON-LD, quindi si legge prima e a parte
    const up = html.match(/itemProp="upload_date"[\s\S]{0,200}?>([^<>]{1,40})</);
    const postedAt = up ? uploadedAgoToIso(up[1]) : null;

    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const j = JSON.parse(m[1]);
    return { description: j.description || '',
             inStock: /InStock/i.test(j.offers?.availability || ''),
             price: j.offers?.price != null ? Number(j.offers.price) : null,
             postedAt };
  } catch { return null; }
}

export async function seller(sellerId) {
  try {
    if (!jar) await bootstrap();
    const r = await fetch(`${WEB()}/api/v2/users/${sellerId}`, { headers: {
      'user-agent': CONFIG.userAgent, accept: 'application/json', referer: `${WEB()}/`, cookie: jar } });
    if (!r.ok) return null;
    const u = (await r.json()).user;
    if (!u?.id) return null;
    const reviews = u.feedback_count ?? 0, neg = u.negative_feedback_count ?? 0;
    return { reviews, negative: neg,
             positivePct: reviews ? Math.round((reviews - neg) / reviews * 100) : null,
             reports: null, country: u.country_iso_code, city: u.city };
  } catch { return null; }
}

export async function isSold(url) {
  // A removed item answers 404 or 410, which detail() flattens into null along
  // with every transient failure. Ask separately so a withdrawn advert is not
  // reported as "cannot tell" forever.
  try {
    const r = await authed(url, 'text/html');
    if (r.status === 404 || r.status === 410) return true;
  } catch { /* fall through to the detail read */ }
  const d = await detail(url);
  return d == null ? null : !d.inStock;
}
