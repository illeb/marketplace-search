import { Injectable, NotFoundException } from '@nestjs/common';
import { db, pruneOrphanListings, compact } from '../hunter/db.mjs';
import { runSearch, sweep, refilter, matchingIds, allProgress } from '../hunter/worker.mjs';
import {
  Search, SearchInput, SearchKind, Vendor, RunResult, RunProgress, RunRecord,
} from './search.model.js';

/** The database keeps csv strings and snake_case; the schema wants arrays and
 *  camelCase. All of that translation lives here and nowhere else. */
/** Everything node:sqlite will accept as a bound parameter. */
type Col = string | number | null;

const csvToList = (s: unknown): string[] =>
  String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const listToCsv = (a: readonly string[] | undefined): string => (a ?? []).join(',');

const COUNT_SQL = `
  (SELECT COUNT(*) FROM matches m JOIN listings l ON l.id = m.listing_id
    WHERE m.search_id = s.id AND l.sold_at IS NULL) AS count,
  (SELECT COUNT(*) FROM matches m JOIN listings l ON l.id = m.listing_id
    WHERE m.search_id = s.id AND l.sold_at IS NULL
      AND date(m.first_matched) = date('now')) AS new_count`;

@Injectable()
export class SearchesService {
  private toModel(r: any): Search {
    return {
      id: r.id,
      name: r.name,
      query: r.query,
      exclude: r.exclude ?? '',
      kind: String(r.kind || 'other').toUpperCase() as SearchKind,
      minPrice: r.min_price ?? 0,
      maxPrice: r.max_price ?? 0,
      sources: csvToList(r.sources),
      countries: csvToList(r.countries),
      place: r.place ?? undefined,
      lat: r.lat ?? undefined,
      lon: r.lon ?? undefined,
      radiusKm: r.radius_km ?? 0,
      includeUnlocated: !!(r.include_unlocated ?? 1),
      chassis: csvToList(r.chassis),
      vendor: r.vendor ? (String(r.vendor).toUpperCase() as Vendor) : undefined,
      brands: csvToList(r.brands),
      cpuTiers: csvToList(r.cpu_tiers),
      minGen: r.min_gen ?? 0,
      minYear: r.min_year ?? 0,
      minRam: r.min_ram ?? 0,
      minStorage: r.min_storage ?? 0,
      minReviews: r.min_reviews ?? 0,
      enabled: !!r.enabled,
      lastRunAt: r.last_run_at ?? undefined,
      count: r.count ?? 0,
      newCount: r.new_count ?? 0,
    };
  }

  /** Only the fields present on the input are written, so a partial update
   *  leaves everything else alone. */
  private toColumns(i: SearchInput): Record<string, Col> {
    const out: Record<string, Col> = {};
    const put = (col: string, v: Col | undefined) => { if (v !== undefined) out[col] = v; };
    put('name', i.name);
    put('query', i.query);
    put('exclude', i.exclude);
    if (i.kind !== undefined) out.kind = String(i.kind).toLowerCase();
    put('min_price', i.minPrice);
    put('max_price', i.maxPrice);
    if (i.sources !== undefined) out.sources = listToCsv(i.sources);
    if (i.countries !== undefined) out.countries = listToCsv(i.countries);
    put('place', i.place);
    put('lat', i.lat);
    put('lon', i.lon);
    put('radius_km', i.radiusKm);
    if (i.includeUnlocated !== undefined) out.include_unlocated = i.includeUnlocated ? 1 : 0;
    if (i.chassis !== undefined) out.chassis = listToCsv(i.chassis);
    // '' rather than null: the matcher treats an empty string as "either vendor"
    if (i.vendor !== undefined) out.vendor = i.vendor ? capitalise(String(i.vendor)) : '';
    if (i.brands !== undefined) out.brands = listToCsv(i.brands);
    if (i.cpuTiers !== undefined) out.cpu_tiers = listToCsv(i.cpuTiers);
    put('min_gen', i.minGen);
    put('min_year', i.minYear);
    put('min_ram', i.minRam);
    put('min_storage', i.minStorage);
    put('min_reviews', i.minReviews);
    if (i.enabled !== undefined) out.enabled = i.enabled ? 1 : 0;
    return out;
  }

  findAll(): Search[] {
    return db.prepare(`SELECT s.*, ${COUNT_SQL} FROM searches s ORDER BY s.id`)
      .all().map((r: any) => this.toModel(r));
  }

  findOne(id: number): Search | null {
    const r = db.prepare(`SELECT s.*, ${COUNT_SQL} FROM searches s WHERE s.id = ?`).get(id);
    return r ? this.toModel(r as any) : null;
  }

  private getOrThrow(id: number): Search {
    const s = this.findOne(id);
    if (!s) throw new NotFoundException(`no search ${id}`);
    return s;
  }

  create(input: SearchInput): Search {
    const cols = { ...DEFAULTS, ...this.toColumns(input) };
    const names = Object.keys(cols);
    const info = db.prepare(
      `INSERT INTO searches (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`,
    ).run(...names.map((n) => cols[n]));
    return this.getOrThrow(Number(info.lastInsertRowid));
  }

  update(id: number, input: SearchInput): Search {
    const cols = this.toColumns(input);
    const names = Object.keys(cols);
    if (names.length) {
      db.prepare(`UPDATE searches SET ${names.map((n) => `${n}=?`).join(',')} WHERE id=?`)
        .run(...names.map((n) => cols[n]), id);

      // Re-decide the matches against what is already stored. Without this a
      // changed filter does nothing visible until the next sweep, which reads
      // three marketplaces and takes minutes, so the filter looks broken.
      // Roughly 170 ms over 3,600 listings, and no network.
      const row = db.prepare('SELECT * FROM searches WHERE id=?').get(id);
      if (row) refilter(row);
    }
    return this.getOrThrow(id);
  }

  /**
   * Via la ricerca, e con lei gli annunci che restano senza nessuno che li
   * rivendichi. I preferiti sono messi al riparo dalla potatura stessa, perché
   * sono salvati a mano e non devono dipendere dalla ricerca che li ha trovati.
   */
  remove(id: number): boolean {
    const gone = db.prepare('DELETE FROM searches WHERE id=?').run(id).changes > 0;
    if (!gone) return false;
    if (pruneOrphanListings() > 0) compact();
    return true;
  }

  /**
   * Which stored listings a search would match if `input` were saved. Nothing
   * is written; this is what the editor previews against while you are still
   * deciding.
   */
  wouldMatch(id: number, input: SearchInput): { ids: number[]; centre: { lat?: number; lon?: number } | null } {
    const row = db.prepare('SELECT * FROM searches WHERE id=?').get(id) as any;
    if (!row) throw new NotFoundException(`no search ${id}`);
    const candidate = { ...row, ...this.toColumns(input) };
    return {
      ids: matchingIds(candidate).ids as number[],
      centre: { lat: candidate.lat, lon: candidate.lon },
    };
  }

  /** Runs one search now. Hits three marketplaces, so it takes minutes. */
  async run(id: number): Promise<RunResult> {
    const row = db.prepare('SELECT * FROM searches WHERE id=?').get(id);
    if (!row) throw new NotFoundException(`no search ${id}`);
    const r = await runSearch(row);
    return { found: r.found, offTopic: r.offTopic, matched: r.matched };
  }

  /** Scans in flight right now. Empty when nothing is running. */
  progress(): RunProgress[] {
    return allProgress().map((p: any) => ({
      searchId: p.searchId,
      phase: p.phase ?? 'collect',
      step: p.step ?? 0,
      steps: p.steps ?? 0,
      label: p.label ?? '',
      found: p.found ?? 0,
      startedAt: p.startedAt,
    }));
  }

  /** Recent scans, newest first. This is what says whether the hourly pass ran. */
  history(limit = 50): RunRecord[] {
    return (db.prepare(`
      SELECT r.*, s.name AS search_name FROM sweep_runs r
      LEFT JOIN searches s ON s.id = r.search_id
      ORDER BY r.started_at DESC, r.id DESC LIMIT ?`).all(limit) as any[])
      .map((r) => ({
        id: r.id,
        searchId: r.search_id ?? undefined,
        searchName: r.search_name ?? undefined,
        trigger: r.trigger ?? 'manual',
        startedAt: r.started_at,
        finishedAt: r.finished_at ?? undefined,
        found: r.found ?? undefined,
        offTopic: r.off_topic ?? undefined,
        matched: r.matched ?? undefined,
        error: r.error ?? undefined,
      }));
  }

  /** Fires every enabled search and returns immediately. */
  sweepAll(): boolean {
    void sweep().catch(() => {});
    return true;
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const DEFAULTS: Record<string, Col> = {
  name: 'New search', query: '', exclude: '', kind: 'computer', min_price: 0, max_price: 300,
  place: '', lat: null, lon: null, radius_km: 0, include_unlocated: 1, countries: '',
  sources: 'subito,wallapop,vinted', vendor: '', brands: '', min_gen: 0, min_year: 0,
  min_ram: 0, min_storage: 0, chassis: '', cpu_tiers: '', min_reviews: 0, enabled: 1,
};
