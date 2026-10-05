import { DDR3_MODELS, vendorOf } from './parse.mjs';
import { countriesFor, distanceKm } from './geo.mjs';

const countriesOk = search => countriesFor(search);

const csv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

/** Decide whether a parsed listing satisfies a saved search. Returns reasons when it does not. */
export function evaluate(search, listing, spec, seller) {
  const why = [];
  if (listing.price < (search.min_price ?? 0)) why.push('under min price');
  if (listing.price > (search.max_price ?? 1e9)) why.push('over max price');
  if (listing.country && !countriesOk(search).includes(listing.country)) why.push(`sells from ${listing.country}`);
  if ((search.min_reviews ?? 0) > 0 && (seller?.reviews ?? 0) < search.min_reviews)
    why.push(`seller has ${seller?.reviews ?? 0} reviews`);

  // Distance from the search centre. Only Wallapop gives coordinates and Vinted
  // gives no location at all, so an unknown location is its own state: excluding
  // it silently would delete Vinted from every radius search.
  if ((search.radius_km ?? 0) > 0 && search.lat != null && search.lon != null) {
    const d = distanceKm(search.lat, search.lon, listing.lat, listing.lon);
    if (d == null) {
      if (!(search.include_unlocated ?? 1)) why.push('location not stated');
    } else if (d > search.radius_km) why.push(`${d} km away`);
  }
  if (!spec) { why.push('unparseable'); return { ok: false, why }; }
  if (spec.tiered) why.push('tiered pricing, headline is the stripped build');

  if (spec.kind === 'memory') {
    if ((search.min_ram ?? 0) && (spec.memTotal ?? 0) < search.min_ram) why.push('too little memory');
    return { ok: why.length === 0, why };
  }
  // Generic items carry no specifications, so price, place and seller are the whole test.
  if (spec.kind === 'other') return { ok: why.length === 0, why };

  if (search.vendor) {
    const v = vendorOf(spec);
    if (v !== search.vendor) why.push(v ? `${v} processor` : 'processor unknown');
  }
  const brands = csv(search.brands);
  if (brands.length && !brands.includes(spec.family)) why.push(`brand ${spec.family}`);
  const chassis = csv(search.chassis);
  if (chassis.length && !chassis.includes(spec.chassis)) why.push(`chassis ${spec.chassis}`);
  const tiers = csv(search.cpu_tiers);
  if (tiers.length && !tiers.includes(spec.cpu)) why.push(`processor ${spec.cpu ?? 'unknown'}`);
  if ((search.min_gen ?? 0) && !(spec.generation >= search.min_gen))
    why.push(spec.generation ? `generation ${spec.generation}` : 'generation unknown');
  // An age limit in years, so Intel generations and Ryzen series can be held to
  // the same rule. AMD machines carry no Intel generation at all.
  if ((search.min_year ?? 0) && !(spec.year >= search.min_year))
    why.push(spec.year ? `${spec.year} model` : 'age unknown');
  if ((search.min_ram ?? 0) && !(spec.ram >= search.min_ram))
    why.push(spec.ram ? `${spec.ram} GB memory` : 'memory unknown');
  if ((search.min_storage ?? 0) && !(spec.storage >= search.min_storage))
    why.push(spec.storage ? `${spec.storage} GB storage` : 'storage unknown');
  return { ok: why.length === 0, why };
}

/** Advisory notes shown next to a row that already matched. */
export function cautions(listing, spec, seller) {
  const out = [];
  if (spec?.chassis === 'Unstated') out.push('formato non indicato, chiedi al venditore');
  if (spec?.model && DDR3_MODELS.has(spec.model)) out.push('memoria DDR3L, massimo 16 GB');
  if (listing.shippable === 0) out.push('solo ritiro di persona');
  if (seller && seller.reviews != null && seller.reviews < 5) out.push(`solo ${seller.reviews} recension${seller.reviews === 1 ? 'e' : 'i'}`);
  if (seller?.positivePct != null && seller.positivePct < 90 && (seller.reviews ?? 0) >= 5)
    out.push(`${seller.positivePct}% positive`);
  if ((seller?.reports ?? 0) >= 50) out.push(`${seller.reports} segnalazioni sul venditore`);
  if (spec?.ssd && spec.ssd < 256) out.push(`disco da ${spec.ssd} GB`);
  return out;
}
