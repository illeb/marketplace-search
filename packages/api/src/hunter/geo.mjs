// Place lookup for the location autocomplete, and the European country list.
// Results are cached in SQLite so typing does not hammer the geocoder.
import { db } from './db.mjs';
import { CONFIG } from './config.mjs';

export const EUROPE = [
  ['AL','Albania'],['AD','Andorra'],['AT','Austria'],['BY','Belarus'],['BE','Belgium'],
  ['BA','Bosnia and Herzegovina'],['BG','Bulgaria'],['HR','Croatia'],['CY','Cyprus'],
  ['CZ','Czechia'],['DK','Denmark'],['EE','Estonia'],['FI','Finland'],['FR','France'],
  ['DE','Germany'],['GR','Greece'],['HU','Hungary'],['IS','Iceland'],['IE','Ireland'],
  ['IT','Italy'],['XK','Kosovo'],['LV','Latvia'],['LI','Liechtenstein'],['LT','Lithuania'],
  ['LU','Luxembourg'],['MT','Malta'],['MD','Moldova'],['MC','Monaco'],['ME','Montenegro'],
  ['NL','Netherlands'],['MK','North Macedonia'],['NO','Norway'],['PL','Poland'],
  ['PT','Portugal'],['RO','Romania'],['SM','San Marino'],['RS','Serbia'],['SK','Slovakia'],
  ['SI','Slovenia'],['ES','Spain'],['SE','Sweden'],['CH','Switzerland'],['UA','Ukraine'],
  ['GB','United Kingdom'],['VA','Vatican City'],
];
export const EUROPE_CODES = EUROPE.map(([c]) => c);
const NAME_BY_CODE = Object.fromEntries(EUROPE);
export const countryName = c => NAME_BY_CODE[String(c || '').toUpperCase()] || c;

/** Countries a search should consider: those chosen, or all of Europe. */
export function countriesFor(search) {
  const picked = String(search.countries || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  return picked.length ? picked : EUROPE_CODES;
}
export const searchedWholeOfEurope = search =>
  !String(search.countries || '').split(',').map(s => s.trim()).filter(Boolean).length;

/**
 * Autocomplete over place names. Backed by OpenStreetMap's Nominatim, which asks
 * for a real User-Agent and no more than one request a second — hence the cache
 * and the debounce on the client.
 */
export async function lookupPlace(q) {
  const key = String(q || '').trim().toLowerCase();
  if (key.length < 2) return [];
  const hit = db.prepare("SELECT results FROM places WHERE q=? AND fetched_at > datetime('now','-30 days')").get(key);
  if (hit) return JSON.parse(hit.results);

  // Photon is Nominatim's data served for type-ahead, so it does prefix matching
  // where Nominatim's /search only does full-text. The bounding box biases
  // results to Europe; the country filter then enforces it.
  const SETTLEMENT = new Set(['city','town','village','municipality','district','state','county','region','locality']);
  const url = 'https://photon.komoot.io/api/?' + new URLSearchParams({
    q: key, limit: '25', lang: 'en', bbox: '-25,34,45,72',
  });
  let out = [];
  try {
    const r = await fetch(url, { headers: {
      'user-agent': 'marketplace-hunter/1.0 (personal marketplace watcher)', accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      out = (j.features || [])
        .map(f => ({ p: f.properties || {}, c: f.geometry?.coordinates || [] }))
        .filter(({ p, c }) => c.length === 2 && p.name &&
          EUROPE_CODES.includes(String(p.countrycode || '').toUpperCase()) &&
          (SETTLEMENT.has(p.type) || p.city))
        .map(({ p, c }) => ({
          label: [p.name, p.state || p.county, countryName(String(p.countrycode).toUpperCase())]
            .filter(Boolean).join(', '),
          lat: +(+c[1]).toFixed(4), lon: +(+c[0]).toFixed(4),
          country: String(p.countrycode).toUpperCase(),
          // a settlement beats a county or a region when the names collide
          rank: p.type === 'city' ? 0 : p.type === 'town' ? 1 : p.type === 'village' ? 2 : 3,
        }));
      out.sort((a, b) => a.rank - b.rank);
      const seen = new Set();
      out = out.filter(x => !seen.has(x.label) && seen.add(x.label)).slice(0, 8)
               .map(({ rank, ...rest }) => rest);
    }
  } catch { /* offline or rate-limited: an empty list is better than an error */ }

  db.prepare(`INSERT INTO places (q, results, fetched_at) VALUES (?,?,datetime('now'))
              ON CONFLICT(q) DO UPDATE SET results=excluded.results, fetched_at=excluded.fetched_at`)
    .run(key, JSON.stringify(out));
  return out;
}

/* ------------------------------------------------------------------ *
 * Distance
 *
 * Only Wallapop hands back coordinates. Subito names a town, and Vinted's
 * search gives no location at all, so a radius filter has to geocode the town
 * name and treat "no location" as its own state rather than as "far away".
 * ------------------------------------------------------------------ */

const R_EARTH_KM = 6371;
const rad = d => d * Math.PI / 180;

/** Great-circle distance in kilometres, rounded to the nearest whole one. */
export function distanceKm(aLat, aLon, bLat, bLon) {
  if (![aLat, aLon, bLat, bLon].every(n => typeof n === 'number' && isFinite(n))) return null;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h))));
}

const geoKey = (city, country) =>
  `${String(city || '').trim().toLowerCase()}|${String(country || '').trim().toUpperCase()}`;

/**
 * Coordinates for a town name, cached permanently. A miss is cached too, as
 * null, so a town the geocoder does not know is not looked up on every sweep.
 * Returns null when the name is unknown or empty.
 */
export async function geocodeCity(city, country) {
  if (!city) return null;
  const key = geoKey(city, country);
  const hit = db.prepare('SELECT lat, lon FROM geocache WHERE key=?').get(key);
  if (hit) return hit.lat == null ? null : { lat: hit.lat, lon: hit.lon };

  let found = null;
  try {
    const p = new URLSearchParams({ q: city, limit: '5', lang: 'en', bbox: '-25,34,45,72' });
    const r = await fetch('https://photon.komoot.io/api/?' + p, {
      headers: { 'user-agent': 'marketplace-hunter/1.0 (personal marketplace watcher)',
                 accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      const f = (j.features || []).find(f => {
        const cc = String(f.properties?.countrycode || '').toUpperCase();
        return !country || cc === String(country).toUpperCase();
      }) || (j.features || [])[0];
      const c = f?.geometry?.coordinates;
      if (c && c.length === 2) found = { lat: +(+c[1]).toFixed(4), lon: +(+c[0]).toFixed(4) };
    }
  } catch { /* offline: cache nothing, try again next sweep */
    return null;
  }
  db.prepare(`INSERT INTO geocache (key, lat, lon, fetched_at) VALUES (?,?,?,datetime('now'))
              ON CONFLICT(key) DO UPDATE SET lat=excluded.lat, lon=excluded.lon,
                                             fetched_at=excluded.fetched_at`)
    .run(key, found ? found.lat : null, found ? found.lon : null);
  // Only a real request owes the geocoder a pause. Every town is looked up once
  // ever, so after the first sweep this path is almost never taken.
  await new Promise(r => setTimeout(r, 120));
  return found;
}

/**
 * Give one stored listing a coordinate fix if it names a town and has none.
 * Mutates the row so the caller can evaluate it straight away. Returns true
 * when a fix was written.
 */
export async function ensureCoords(row) {
  if (!row || row.lat != null || !row.city) return false;
  const c = await geocodeCity(row.city, row.country);
  if (!c) return false;
  db.prepare('UPDATE listings SET lat=?, lon=? WHERE id=?').run(c.lat, c.lon, row.id);
  row.lat = c.lat; row.lon = c.lon;
  return true;
}
