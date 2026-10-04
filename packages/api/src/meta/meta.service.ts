import { Injectable } from '@nestjs/common';
import { db } from '../hunter/db.mjs';
import { lookupPlace, EUROPE } from '../hunter/geo.mjs';
import { Country, Place, Stats } from './meta.model.js';

@Injectable()
export class MetaService {
  /** Type-ahead over place names, cached in SQLite so typing does not hammer
   *  the geocoder. */
  async places(q: string): Promise<Place[]> {
    return (await lookupPlace(q)) as Place[];
  }

  countries(): Country[] {
    return EUROPE.map(([code, name]: [string, string]) => ({ code, name }));
  }

  stats(): Stats {
    const one = (sql: string) => (db.prepare(sql).get() as any).c as number;
    return {
      listings: one('SELECT COUNT(*) c FROM listings'),
      live: one('SELECT COUNT(*) c FROM listings WHERE sold_at IS NULL'),
      sold: one('SELECT COUNT(*) c FROM listings WHERE sold_at IS NOT NULL'),
      sellers: one('SELECT COUNT(*) c FROM sellers'),
      searches: one('SELECT COUNT(*) c FROM searches'),
    };
  }
}
