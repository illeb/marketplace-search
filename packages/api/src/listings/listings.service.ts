import { Injectable } from '@nestjs/common';
import { db } from '../hunter/db.mjs';
import { cautions } from '../hunter/match.mjs';
import { vendorOf } from '../hunter/parse.mjs';
import { distanceKm } from '../hunter/geo.mjs';
import { Listing } from './listing.model.js';
import { Vendor } from '../searches/search.model.js';

const ROWS = `
  SELECT l.*, m.first_matched,
         s.family, s.model, s.chassis, s.cpu, s.cpu_num, s.generation, s.year,
         s.ram_gb, s.ssd_gb, s.hdd_gb, s.storage_gb,
         s.mem_total, s.mem_sticks, s.mem_per, s.mem_speed, s.tiered,
         sel.reviews, sel.positive_pct, sel.reports,
         (SELECT MAX(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_max,
         (SELECT MIN(price) FROM price_history ph WHERE ph.listing_id = l.id) AS price_min
  FROM matches m
  JOIN listings l ON l.id = m.listing_id
  LEFT JOIN specs s ON s.listing_id = l.id
  LEFT JOIN sellers sel ON sel.source = l.source AND sel.seller_id = l.seller_id
  WHERE m.search_id = ?
  ORDER BY l.price ASC`;

@Injectable()
export class ListingsService {
  forSearch(searchId: number): Listing[] {
    const centre = db.prepare('SELECT lat, lon FROM searches WHERE id=?').get(searchId) as any;
    const today = new Date().toISOString().slice(0, 10);

    return db.prepare(ROWS).all(searchId).map((r: any) => ({
      id: r.id,
      source: r.source,
      url: r.url,
      title: r.title ?? '',
      description: r.description ?? undefined,
      price: r.price,
      city: r.city ?? undefined,
      country: r.country ?? undefined,
      shippable: !!r.shippable,
      firstSeen: r.first_seen,
      soldAt: r.sold_at ?? undefined,
      isNew: String(r.first_matched ?? '').slice(0, 10) === today,
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
