// Subito: no authentication, full description inline, offset pagination.
// Reputation lives on a separate trust endpoint. The easiest of the three.
import { CONFIG } from '../config.mjs';
const H = () => ({ accept: 'application/json', 'user-agent': CONFIG.userAgent, referer: 'https://www.subito.it/' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const feat = (ad, uri) => (ad.features || []).find(f => f.uri === uri)?.values?.[0]?.value ?? null;
const money = v => parseFloat(String(v).replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));

export const id = 'subito';

export async function search({ query, maxPages = 3 }) {
  const out = [];
  for (let start = 0; start < maxPages * 100; start += 100) {
    let r;
    try { r = await fetch(`https://hades.subito.it/v1/search/items?q=${encodeURIComponent(query)}&lim=100&start=${start}`, { headers: H() }); }
    catch { break; }
    if (!r.ok) break;
    const d = await r.json();
    const ads = d.ads || [];
    for (const a of ads) {
      const price = money(feat(a, '/price'));
      if (!Number.isFinite(price)) continue;
      out.push({
        source: id, sourceId: a.urn.split(':').pop(), url: a.urls?.default || '',
        title: a.subject || '', description: a.body || '', price,
        postedAt: a.dates?.display_iso8601 || a.dates?.display || null,
        imageUrl: a.images?.[0]?.cdn_base_url
          ? `${a.images[0].cdn_base_url}?rule=gallery-thumbnail-desktop-1x-auto` : null,
        sellerId: a.advertiser?.user_id || null,
        city: a.geo?.town?.value || a.geo?.city?.value || null,
        region: a.geo?.region?.value || null, country: 'IT',
        shippable: feat(a, '/item_shippable') === 'Sì',
        condition: feat(a, '/item_condition'),
      });
    }
    if (ads.length < 100) break;
    await sleep(CONFIG.politeness.subitoMs);
  }
  return out;
}

export async function seller(sellerId) {
  try {
    const r = await fetch(`https://hades.subito.it/v1/trust/profiles/profile/sdrn:subito:user:${sellerId}`, { headers: H() });
    if (!r.ok) return null;
    const f = (await r.json()).reputation?.feedback || {};
    return { reviews: f.receivedCount ?? 0,
             positivePct: f.overallScore == null ? null : Math.round(f.overallScore * 100),
             negative: null, reports: null };
  } catch { return null; }
}

/** A sold advert keeps serving its page at the old price; the badge is the tell. */
export async function isSold(url) {
  try {
    const r = await fetch(url, { headers: { ...H(), accept: 'text/html' } });
    // A withdrawn advert answers 410 Gone and a deleted one 404. Both are
    // definitive: returning null for them left a sold machine on the shortlist
    // because the search had simply stopped returning it.
    if (r.status === 410 || r.status === 404) return true;
    if (!r.ok) return null;
    const html = await r.text();
    if (html.length < 20000) return null;          // challenge or error page
    return /item-sold-badge/.test(html);
  } catch { return null; }
}
