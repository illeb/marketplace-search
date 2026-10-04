import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { CONFIG } from './config.mjs';
import { db } from './db.mjs';
import { runSearch, sweep } from './worker.mjs';
import { cautions } from './match.mjs';
import { coreString } from './parse.mjs';
import { lookupPlace, EUROPE, distanceKm } from './geo.mjs';
import { vendorOf } from './parse.mjs';

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, bad) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { bad(e); } }); });

const FIELDS = ['name','query','kind','min_price','max_price','place','lat','lon','radius_km',
  'include_unlocated','countries','sources','vendor','brands','min_gen','min_year','min_ram',
  'min_storage','chassis','cpu_tiers','min_reviews','enabled'];

const DEFAULTS = { name:'New search', query:'', kind:'computer', min_price:0, max_price:300,
  place:'', lat:null, lon:null, radius_km:0, include_unlocated:1, countries:'',
  sources:'subito,wallapop,vinted', vendor:'', brands:'', min_gen:0, min_year:0, min_ram:0,
  min_storage:0, chassis:'', cpu_tiers:'', min_reviews:0, enabled:1 };

function listingsFor(searchId) {
  const search = db.prepare('SELECT lat, lon, radius_km FROM searches WHERE id=?').get(searchId) || {};
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT l.*, m.first_matched, s.family, s.model, s.chassis, s.cpu, s.cpu_num, s.generation, s.year,
           s.ram_gb, s.ssd_gb, s.hdd_gb, s.storage_gb, s.mem_total, s.mem_sticks, s.mem_per, s.mem_speed,
           s.tiered, s.confidence,
           sel.reviews, sel.positive_pct, sel.negative, sel.reports,
           (SELECT COUNT(*) FROM price_history ph WHERE ph.listing_id = l.id) AS price_points,
           (SELECT MAX(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_max,
           (SELECT MIN(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_min
    FROM matches m
    JOIN listings l ON l.id = m.listing_id
    LEFT JOIN specs s ON s.listing_id = l.id
    LEFT JOIN sellers sel ON sel.source = l.source AND sel.seller_id = l.seller_id
    WHERE m.search_id = ?
    ORDER BY l.price ASC`).all(searchId);
  return rows.map(r => ({
    ...r,
    vendor: vendorOf({ cpu: r.cpu, model: r.model, generation: r.generation }),
    // Null means the advert never said where it is, which is not the same as far
    // away. Vinted adverts almost never carry a location.
    distance_km: distanceKm(search.lat, search.lon, r.lat, r.lon),
    is_new: (r.first_matched || '').slice(0, 10) === today ? 1 : 0,
    threads: r.cpu ? coreString(r.cpu, r.cpu_num, r.generation) : null,
    cautions: cautions(r, { kind: r.mem_total ? 'memory' : 'computer', chassis: r.chassis, model: r.model, ssd: r.ssd_gb },
                       { reviews: r.reviews, positivePct: r.positive_pct, reports: r.reports }),
    age_days: Math.floor((Date.now() - Date.parse(r.first_seen + 'Z')) / 86400000),
  }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
  const seg = url.pathname.split('/').filter(Boolean);
  try {
    if (seg[0] === 'api') {
      if (seg[1] === 'searches' && seg.length === 2 && req.method === 'GET') {
        // The live match count belongs here. Without it the sidebar has to pull
        // every listing of every search just to show a number, which was about
        // 1.6 MB for six searches.
        return json(res, 200, db.prepare(`
          SELECT s.*,
            (SELECT COUNT(*) FROM matches m JOIN listings l ON l.id = m.listing_id
              WHERE m.search_id = s.id AND l.sold_at IS NULL) AS count,
            (SELECT COUNT(*) FROM matches m JOIN listings l ON l.id = m.listing_id
              WHERE m.search_id = s.id AND l.sold_at IS NULL
                AND date(m.first_matched) = date('now')) AS new_count
          FROM searches s ORDER BY s.id`).all());
      }

      if (seg[1] === 'searches' && seg.length === 2 && req.method === 'POST') {
        const b = { ...DEFAULTS, ...(await readBody(req)) };
        const cols = FIELDS.join(','), qs = FIELDS.map(() => '?').join(',');
        const info = db.prepare(`INSERT INTO searches (${cols}) VALUES (${qs})`).run(...FIELDS.map(f => b[f]));
        return json(res, 201, db.prepare('SELECT * FROM searches WHERE id=?').get(Number(info.lastInsertRowid)));
      }

      if (seg[1] === 'searches' && seg[2] && req.method === 'PUT') {
        const b = await readBody(req);
        const set = FIELDS.filter(f => f in b);
        if (set.length) db.prepare(`UPDATE searches SET ${set.map(f => `${f}=?`).join(',')} WHERE id=?`)
          .run(...set.map(f => b[f]), Number(seg[2]));
        return json(res, 200, db.prepare('SELECT * FROM searches WHERE id=?').get(Number(seg[2])));
      }

      if (seg[1] === 'searches' && seg[2] && req.method === 'DELETE') {
        db.prepare('DELETE FROM searches WHERE id=?').run(Number(seg[2]));
        return json(res, 200, { deleted: true });
      }

      if (seg[1] === 'searches' && seg[2] && seg[3] === 'run' && req.method === 'POST') {
        const s = db.prepare('SELECT * FROM searches WHERE id=?').get(Number(seg[2]));
        if (!s) return json(res, 404, { error: 'no such search' });
        const r = await runSearch(s);
        return json(res, 200, r);
      }

      if (seg[1] === 'sweep' && req.method === 'POST') { sweep().catch(() => {}); return json(res, 202, { started: true }); }

      if (seg[1] === 'listings' && req.method === 'GET') {
        const id = Number(url.searchParams.get('search_id'));
        if (!id) return json(res, 400, { error: 'search_id required' });
        return json(res, 200, listingsFor(id));
      }

      if (seg[1] === 'places' && req.method === 'GET')
        return json(res, 200, await lookupPlace(url.searchParams.get('q') || ''));

      if (seg[1] === 'countries' && req.method === 'GET')
        return json(res, 200, EUROPE.map(([code, name]) => ({ code, name })));

      if (seg[1] === 'stats' && req.method === 'GET') {
        return json(res, 200, {
          listings: db.prepare('SELECT COUNT(*) c FROM listings').get().c,
          live: db.prepare('SELECT COUNT(*) c FROM listings WHERE sold_at IS NULL').get().c,
          sold: db.prepare('SELECT COUNT(*) c FROM listings WHERE sold_at IS NOT NULL').get().c,
          sellers: db.prepare('SELECT COUNT(*) c FROM sellers').get().c,
          searches: db.prepare('SELECT COUNT(*) c FROM searches').get().c,
        });
      }
      return json(res, 404, { error: 'unknown endpoint' });
    }

    // The built frontend ships as index.html plus assets/, so the static handler
    // has to serve a subdirectory. Segments are whitelisted rather than filtered
    // for "..", which is the check that is easy to get subtly wrong.
    const file = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const parts = file.split('/');
    if (parts.length > 3 || !parts.every(p => /^[\w.-]+$/.test(p) && p !== '..'))
      return json(res, 400, { error: 'bad path' });
    const TYPES = { html:'text/html', js:'text/javascript', mjs:'text/javascript',
                    css:'text/css', json:'application/json', svg:'image/svg+xml',
                    woff2:'font/woff2', ico:'image/x-icon', png:'image/png', map:'application/json' };
    let body;
    try {
      body = await readFile(new URL(`../public/${file}`, import.meta.url));
    } catch (e) {
      // A missing file is a 404, not a server error, and the error text stays in
      // the log rather than going out to the client.
      if (e?.code === 'ENOENT' || e?.code === 'EISDIR') return json(res, 404, { error: 'not found' });
      throw e;
    }
    const type = TYPES[file.split('.').pop()] || 'text/plain';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8`,
      'cache-control': file.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-store' });
    res.end(body);
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) });
  }
});

server.listen(CONFIG.port, '0.0.0.0', () =>
  console.log(`marketplace-hunter on http://localhost:${CONFIG.port}  (db: ${CONFIG.dbPath})`));
