// Wallapop: needs the x-deviceos header, paginates with a JWT cursor, and
// returns descriptions inline. Geo is native via latitude/longitude.
import { CONFIG } from '../config.mjs';
const H = () => ({ accept: 'application/json', 'user-agent': CONFIG.userAgent,
                   origin: 'https://it.wallapop.com', 'x-deviceos': '0' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const id = 'wallapop';

export async function search({ query, minPrice = 0, maxPrice = 1000, lat, lon, country = 'IT', maxPages = 3 }) {
  const out = []; let next = null, page = 0;
  do {
    const p = new URLSearchParams({
      keywords: query, source: 'search_box', order_by: 'price_low_to_high',
      min_sale_price: String(Math.max(0, Math.floor(minPrice))),
      max_sale_price: String(Math.ceil(maxPrice)),
      latitude: String(lat), longitude: String(lon),
      search_country: country, section_type: 'organic_search_results',
    });
    if (next) p.set('next_page', next);
    let r;
    try { r = await fetch('https://api.wallapop.com/api/v3/search/section?' + p, { headers: H() }); }
    catch { break; }
    if (!r.ok) break;
    const d = await r.json();
    for (const x of d?.data?.section?.items || []) {
      if (x.reserved?.flag) continue;
      out.push({
        source: id, sourceId: x.id, url: 'https://it.wallapop.com/item/' + x.web_slug,
        title: x.title || '', description: x.description || '', price: +x.price.amount,
        sellerId: x.user_id || null, city: x.location?.city || null,
        region: x.location?.region || null, country: x.location?.country_code || null,
        shippable: !!(x.shipping?.item_is_shippable && x.shipping?.user_allows_shipping),
        condition: null,
      });
    }
    next = d?.meta?.next_page || null; page++;
    await sleep(CONFIG.politeness.wallapopMs);
  } while (next && page < maxPages);
  return out;
}

export async function seller(sellerId) {
  try {
    const r = await fetch(`https://api.wallapop.com/api/v3/users/${sellerId}/stats`, { headers: H() });
    if (!r.ok) return null;
    const j = await r.json();
    const c = t => (j.counters || []).find(x => x.type === t)?.value ?? null;
    const reviews = c('reviews') ?? 0;
    return { reviews, positivePct: j.rating_average == null ? null : Math.round(j.rating_average / 5 * 100),
             negative: null, reports: c('reports_received') ?? 0 };
  } catch { return null; }
}

export async function isSold(url) {
  try {
    const r = await fetch(url, { headers: { ...H(), accept: 'text/html' } });
    if (r.status === 404 || r.status === 410) return true;
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/"sold"\s*:\s*(true|false)/);
    return m ? m[1] === 'true' : null;
  } catch { return null; }
}
