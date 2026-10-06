import { Injectable } from '@nestjs/common';
import { db } from '../hunter/db.mjs';
import { cautions } from '../hunter/match.mjs';
import { vendorOf } from '../hunter/parse.mjs';
import { distanceKm } from '../hunter/geo.mjs';
import { Listing } from './listing.model.js';
import { Vendor } from '../searches/search.model.js';

/**
 * One SELECT with a swappable WHERE, so a search, an unsaved-filter preview and
 * the saved adverts all come back shaped identically. first_matched arrives as
 * a correlated subquery rather than a join, because the favourites and the
 * preview are not reached through the matches table at all.
 */
const SELECT = (where: string) => `
  SELECT l.*,
         (SELECT MIN(first_matched) FROM matches mm WHERE mm.listing_id = l.id) AS first_matched,
         s.family, s.model, s.chassis, s.cpu, s.cpu_num, s.generation, s.year,
         s.ram_gb, s.ssd_gb, s.hdd_gb, s.storage_gb,
         s.mem_total, s.mem_sticks, s.mem_per, s.mem_speed, s.tiered,
         sel.reviews, sel.positive_pct, sel.reports,
         (SELECT MAX(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_max,
         (SELECT MIN(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_min
  FROM listings l
  LEFT JOIN specs s ON s.listing_id = l.id
  LEFT JOIN sellers sel ON sel.source = l.source AND sel.seller_id = l.seller_id
  WHERE ${where}
  ORDER BY l.price ASC`;

const BY_SEARCH = SELECT('l.id IN (SELECT listing_id FROM matches WHERE search_id = ?)');
const SAVED = SELECT('l.id IN (SELECT listing_id FROM favourites)');

type Centre = { lat?: number | null; lon?: number | null } | null;

@Injectable()
export class ListingsService {
  forSearch(searchId: number): Listing[] {
    const centre = db.prepare('SELECT lat, lon FROM searches WHERE id=?').get(searchId) as Centre;
    return this.map(db.prepare(BY_SEARCH).all(searchId) as any[], centre);
  }

  /** Everything saved by hand. No search centre, so no distance. */
  favourites(): Listing[] {
    return this.map(db.prepare(SAVED).all() as any[], null);
  }

  setFavourite(listingId: number, value: boolean): boolean {
    if (value) db.prepare('INSERT OR IGNORE INTO favourites (listing_id) VALUES (?)').run(listingId);
    else db.prepare('DELETE FROM favourites WHERE listing_id=?').run(listingId);
    return value;
  }

  /** An arbitrary set of ids, which is how the unsaved-filter preview reads. */
  byIds(ids: readonly number[], centre: Centre): Listing[] {
    if (!ids.length) return [];
    const holes = ids.map(() => '?').join(',');
    return this.map(db.prepare(SELECT(`l.id IN (${holes})`)).all(...ids) as any[], centre);
  }

  /** Ids saved by hand, read once per call rather than once per row. */
  private favouriteIds(): Set<number> {
    return new Set(
      (db.prepare('SELECT listing_id FROM favourites').all() as any[]).map((r) => r.listing_id),
    );
  }

  private map(rows: any[], centre: Centre): Listing[] {
    const today = new Date().toISOString().slice(0, 10);
    const fav = this.favouriteIds();

    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      url: r.url,
      title: r.title ?? '',
      description: r.description ?? undefined,
      price: r.price,
      city: r.city ?? undefined,
      country: r.country ?? undefined,
      shippable: !!r.shippable,
      imageUrl: r.image_url ?? undefined,
      postedAt: r.posted_at ?? undefined,
      postedApprox: r.source === 'vinted' && r.posted_at != null,
      shippingCost: r.shipping_cost ?? undefined,
      // Subito dichiara la cifra esatta; su Vinted è il minimo fra i corrieri.
      shippingFrom: r.source !== 'subito',
      firstSeen: r.first_seen,
      soldAt: r.sold_at ?? undefined,
      // "nuovo" vuol dire pubblicato oggi. Resta il ripiego su quando lo abbiamo
      // visto per le righe senza data: su Vinted la data arriva dalla pagina del
      // singolo annuncio, che non viene letta per tutti.
      isNew: r.posted_at
        ? String(r.posted_at).slice(0, 10) === today
        : String(r.first_seen ?? '').slice(0, 10) === today,
      isFavourite: fav.has(r.id),
      // Null means the advert states no location, never that it is far away.
      distanceKm: distanceKm(centre?.lat, centre?.lon, r.lat, r.lon) ?? undefined,
      vendor: toVendor(vendorOf({ cpu: r.cpu, model: r.model, generation: r.generation })),
      family: r.family ?? undefined,
      model: r.model ?? undefined,
      chassis: r.chassis ?? undefined,
      cpu: r.cpu ?? undefined,
      cpuNum: r.cpu_num ?? undefined,
      generation: r.generation ?? undefined,
      year: r.year ?? undefined,
      ramGb: r.ram_gb ?? undefined,
      ssdGb: r.ssd_gb ?? undefined,
      hddGb: r.hdd_gb ?? undefined,
      storageGb: r.storage_gb ?? undefined,
      memTotal: r.mem_total ?? undefined,
      memSticks: r.mem_sticks ?? undefined,
      memPer: r.mem_per ?? undefined,
      memSpeed: r.mem_speed ?? undefined,
      tiered: !!r.tiered,
      reviews: r.reviews ?? undefined,
      positivePct: r.positive_pct ?? undefined,
      cautions: cautions(
        r,
        { chassis: r.chassis, model: r.model, ssd: r.ssd_gb },
        { reviews: r.reviews, positivePct: r.positive_pct, reports: r.reports },
      ),
      ageDays: Math.floor((Date.now() - Date.parse(`${r.first_seen}Z`)) / 86_400_000),
      priceMin: r.price_min ?? undefined,
      priceMax: r.price_max ?? undefined,
    }));
  }
}

const toVendor = (v: string | null): Vendor | undefined =>
  v === 'AMD' ? Vendor.AMD : v === 'Intel' ? Vendor.INTEL : undefined;
