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

export async function search({ query, maxPrice = 1000, maxPages = 3 }) {
  const out = []; const time = Math.floor(Date.now() / 1000); const sid = crypto.randomUUID();
  for (let page = 1; page <= maxPages; page++) {
    const p = new URLSearchParams({ page: String(page), per_page: '96', time: String(time),
      search_text: query, currency: 'EUR', order: 'price_low_to_high',
      price_to: String(Math.ceil(maxPrice)), global_search_session_id: sid });
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
      imageUrl: x.photo?.url || x.photo?.thumbnails?.at(-1)?.url || null,
    });
    if (page >= (d.pagination?.total_pages || 1) || !items.length) break;
    await sleep(CONFIG.politeness.vintedMs);
  }
  return out;
}

/** Search gives titles only, so promising candidates need their page fetched. */
export async function detail(url) {
  try {
    const r = await authed(url, 'text/html');
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const j = JSON.parse(m[1]);
    return { description: j.description || '',
             inStock: /InStock/i.test(j.offers?.availability || ''),
             price: j.offers?.price != null ? Number(j.offers.price) : null };
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
