import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CONFIG } from './config.mjs';

mkdirSync(dirname(CONFIG.dbPath), { recursive: true });
export const db = new DatabaseSync(CONFIG.dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'computer',     -- 'computer' | 'memory' | 'other'
  min_price REAL DEFAULT 0,
  max_price REAL DEFAULT 300,
  place TEXT DEFAULT '',                     -- label chosen from the autocomplete
  lat REAL,                                  -- filled in from the place, not typed
  lon REAL,
  countries TEXT DEFAULT '',                 -- csv of ISO2; empty means all of Europe
  sources TEXT DEFAULT 'subito,wallapop,vinted',
  brands TEXT DEFAULT '',                    -- csv, empty = any
  min_gen INTEGER DEFAULT 0,
  min_ram INTEGER DEFAULT 0,
  min_storage INTEGER DEFAULT 0,
  chassis TEXT DEFAULT '',                   -- csv of SFF,Micro,Unstated
  cpu_tiers TEXT DEFAULT '',                 -- csv of i3,i5,i7
  min_reviews INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_run_at TEXT
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  price REAL,
  seller_id TEXT,
  city TEXT,
  country TEXT,
  shippable INTEGER,
  condition TEXT,
  first_seen TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  misses INTEGER DEFAULT 0,
  sold_at TEXT,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS specs (
  listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  family TEXT, model TEXT, chassis TEXT,
  cpu TEXT, cpu_num TEXT, generation INTEGER,
  ram_gb INTEGER, ssd_gb INTEGER, hdd_gb INTEGER, storage_gb INTEGER,
  mem_total INTEGER, mem_sticks INTEGER, mem_per INTEGER, mem_speed INTEGER,
  tiered INTEGER DEFAULT 0,
  confidence TEXT
);

CREATE TABLE IF NOT EXISTS sellers (
  source TEXT NOT NULL, seller_id TEXT NOT NULL,
  reviews INTEGER, positive_pct REAL, negative INTEGER, reports INTEGER,
  fetched_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (source, seller_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  price REAL, seen_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
  search_id INTEGER REFERENCES searches(id) ON DELETE CASCADE,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  first_matched TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (search_id, listing_id)
);

CREATE TABLE IF NOT EXISTS places (
  q TEXT PRIMARY KEY,          -- lowercased query
  results TEXT,                -- JSON array of {label, lat, lon, country}
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_seen ON listings(last_seen);
CREATE INDEX IF NOT EXISTS idx_listings_sold ON listings(sold_at);
CREATE INDEX IF NOT EXISTS idx_matches_search ON matches(search_id);
`);

/* ---- migrations ----------------------------------------------------------
 * Columns added after the first release. `CREATE TABLE IF NOT EXISTS` only
 * builds a table that is absent; it never widens one that already exists, so a
 * database from an older build would be missing these forever. Each ALTER is
 * guarded by the live column list, which makes this idempotent and leaves a
 * fresh container and an upgraded one identical.
 *
 * These were applied by hand during development and never committed, so the
 * first real deployment came up without radius_km and could not save a search.
 * ------------------------------------------------------------------------ */
const columnsOf = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
const addColumn = (table, name, decl) => {
  if (!columnsOf(table).includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${decl}`);
};

// the launch-year floor, the one age limit that holds for Intel and AMD alike
addColumn('searches', 'min_year', 'INTEGER DEFAULT 0');
addColumn('searches', 'vendor', "TEXT DEFAULT ''");
// distance filtering
addColumn('searches', 'radius_km', 'INTEGER DEFAULT 0');
addColumn('searches', 'include_unlocated', 'INTEGER DEFAULT 1');
addColumn('listings', 'lat', 'REAL');
addColumn('listings', 'lon', 'REAL');
// the parsed launch year of a machine
addColumn('specs', 'year', 'INTEGER');

// Town name -> coordinates. Only Wallapop returns a position, so a radius
// depends on geocoding the town once and keeping it.
db.exec(`
CREATE TABLE IF NOT EXISTS geocache (
  key TEXT PRIMARY KEY,          -- "city|country", lower case
  lat REAL, lon REAL,            -- null when the geocoder found nothing
  fetched_at TEXT DEFAULT (datetime('now'))
);
`);

export function upsertListing(rec) {
  const existing = db.prepare('SELECT id, price FROM listings WHERE source=? AND source_id=?')
    .get(rec.source, String(rec.sourceId));
  if (existing) {
    db.prepare(`UPDATE listings SET title=?, description=?, price=?, seller_id=?, city=?, country=?,
      shippable=?, condition=?, last_seen=datetime('now'), misses=0, sold_at=NULL WHERE id=?`)
      .run(rec.title, rec.description ?? '', rec.price, rec.sellerId ?? null, rec.city ?? null,
           rec.country ?? null, rec.shippable ? 1 : 0, rec.condition ?? null, existing.id);
    if (Number(existing.price) !== Number(rec.price))
      db.prepare('INSERT INTO price_history (listing_id, price) VALUES (?,?)').run(existing.id, rec.price);
    return existing.id;
  }
  const info = db.prepare(`INSERT INTO listings
    (source, source_id, url, title, description, price, seller_id, city, country, shippable, condition)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(rec.source, String(rec.sourceId), rec.url, rec.title, rec.description ?? '', rec.price,
         rec.sellerId ?? null, rec.city ?? null, rec.country ?? null, rec.shippable ? 1 : 0, rec.condition ?? null);
  const id = Number(info.lastInsertRowid);
  db.prepare('INSERT INTO price_history (listing_id, price) VALUES (?,?)').run(id, rec.price);
  return id;
}

export function saveSpecs(listingId, s) {
  db.prepare(`INSERT INTO specs
    (listing_id, family, model, chassis, cpu, cpu_num, generation, year, ram_gb, ssd_gb, hdd_gb, storage_gb,
     mem_total, mem_sticks, mem_per, mem_speed, tiered, confidence)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(listing_id) DO UPDATE SET
      family=excluded.family, model=excluded.model, chassis=excluded.chassis, cpu=excluded.cpu,
      cpu_num=excluded.cpu_num, generation=excluded.generation, year=excluded.year, ram_gb=excluded.ram_gb,
      ssd_gb=excluded.ssd_gb, hdd_gb=excluded.hdd_gb, storage_gb=excluded.storage_gb, mem_total=excluded.mem_total,
      mem_sticks=excluded.mem_sticks, mem_per=excluded.mem_per, mem_speed=excluded.mem_speed,
      tiered=excluded.tiered, confidence=excluded.confidence`)
    .run(listingId, s.family ?? null, s.model ?? null, s.chassis ?? null, s.cpu ?? null,
         s.cpuNum ?? null, s.generation ?? null, s.year ?? null, s.ram ?? null, s.ssd ?? null, s.hdd ?? null, s.storage ?? null,
         s.memTotal ?? null, s.memSticks ?? null, s.memPer ?? null, s.memSpeed ?? null,
         s.tiered ? 1 : 0, JSON.stringify(s.confidence ?? {}));
}

export function saveSeller(source, sellerId, rep) {
  db.prepare(`INSERT INTO sellers (source, seller_id, reviews, positive_pct, negative, reports, fetched_at)
    VALUES (?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(source, seller_id) DO UPDATE SET reviews=excluded.reviews,
      positive_pct=excluded.positive_pct, negative=excluded.negative,
      reports=excluded.reports, fetched_at=excluded.fetched_at`)
    .run(source, String(sellerId), rep.reviews ?? null, rep.positivePct ?? null,
         rep.negative ?? null, rep.reports ?? null);
}

export const sellerIsFresh = (source, id, hours = 72) =>
  !!db.prepare(`SELECT 1 FROM sellers WHERE source=? AND seller_id=?
                AND fetched_at > datetime('now', ?)`).get(source, String(id), `-${hours} hours`);
