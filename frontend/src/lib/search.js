// The saved-search record: its field list, its defaults, and the helpers that
// keep an editing draft honest about what has and has not been saved.

export const SEARCH_FIELDS = [
  'name', 'query', 'kind',
  'min_price', 'max_price',
  'sources', 'countries',
  'chassis', 'vendor', 'brands', 'cpu_tiers',
  'min_gen', 'min_year', 'min_ram', 'min_storage',
  'min_reviews',
  'place', 'lat', 'lon', 'radius_km', 'include_unlocated',
  'enabled',
];

// Fields the server stores as numbers. lat/lon are the exception: they are
// numbers but null is meaningful, so they are handled on their own.
const NUMERIC = new Set([
  'min_price', 'max_price', 'min_gen', 'min_year', 'min_ram', 'min_storage',
  'min_reviews', 'radius_km', 'include_unlocated', 'enabled',
]);

export const DEFAULT_SEARCH = {
  name: 'New search',
  query: '',
  kind: 'computer',
  min_price: 0,
  max_price: 300,
  sources: 'subito,wallapop,vinted',
  countries: '',
  chassis: '',
  vendor: '',
  brands: '',
  cpu_tiers: '',
  min_gen: 0,
  min_year: 0,
  min_ram: 0,
  min_storage: 0,
  min_reviews: 0,
  place: '',
  lat: null,
  lon: null,
  radius_km: 0,
  include_unlocated: 1,
  enabled: 1,
};

/** Pull just the editable fields off a server record, coerced to their types. */
export function toDraft(record) {
  const out = {};
  for (const f of SEARCH_FIELDS) {
    const v = record?.[f];
    if (f === 'lat' || f === 'lon') out[f] = v == null || v === '' ? null : Number(v);
    else if (NUMERIC.has(f)) out[f] = Number(v ?? DEFAULT_SEARCH[f]) || 0;
    else out[f] = String(v ?? DEFAULT_SEARCH[f] ?? '');
  }
  return out;
}

export const newDraft = () => toDraft(DEFAULT_SEARCH);

/** Which fields differ between the draft and what the server last returned. */
export function changedFields(draft, saved) {
  if (!saved) return SEARCH_FIELDS.slice();
  const base = toDraft(saved);
  return SEARCH_FIELDS.filter((f) => draft[f] !== base[f]);
}

/* ---- the csv-backed multi-selects ---------------------------------------- */

export const csvToList = (s) =>
  String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export const listToCsv = (list) => list.join(',');

/** Toggle one value in a csv string, keeping `order` as the canonical order. */
export function toggleCsv(csv, value, order) {
  const have = new Set(csvToList(csv));
  if (have.has(value)) have.delete(value);
  else have.add(value);
  const known = order.filter((o) => have.has(o));
  const extra = [...have].filter((v) => !order.includes(v));
  return listToCsv([...known, ...extra]);
}

/* ---- option vocabularies, mirroring what the backend parses -------------- */

export const SOURCES = [
  { value: 'subito', label: 'Subito' },
  { value: 'wallapop', label: 'Wallapop' },
  { value: 'vinted', label: 'Vinted' },
];

export const KINDS = [
  { value: 'computer', label: 'Computer' },
  { value: 'memory', label: 'Memory' },
  { value: 'other', label: 'Other' },
];

export const CHASSIS = [
  { value: 'Micro', label: 'Micro' },
  { value: 'SFF', label: 'SFF' },
  { value: 'Tower', label: 'Tower' },
  { value: 'Unstated', label: 'Unstated' },
];

export const BRANDS = [
  { value: 'Dell', label: 'Dell' },
  { value: 'HP', label: 'HP' },
  { value: 'Lenovo', label: 'Lenovo' },
  { value: 'Fujitsu', label: 'Fujitsu' },
];

export const CPU_TIERS = [
  { value: 'i3', label: 'i3' },
  { value: 'i5', label: 'i5' },
  { value: 'i7', label: 'i7' },
  { value: 'Ryzen 3', label: 'Ryzen 3' },
  { value: 'Ryzen 5', label: 'Ryzen 5' },
  { value: 'Ryzen 7', label: 'Ryzen 7' },
];

export const VENDORS = [
  { value: '', label: 'Any' },
  { value: 'Intel', label: 'Intel' },
  { value: 'AMD', label: 'AMD' },
];

export const RADII = [0, 10, 25, 50, 100, 200, 500];
