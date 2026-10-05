// The saved-search record: its field list, its defaults, and the helpers that
// keep an editing draft honest about what has and has not been saved.
//
// Fields are camelCase to match the GraphQL schema, and the multi-selects are
// real arrays now rather than comma-separated strings.

export const SEARCH_FIELDS = [
  'name', 'query', 'exclude', 'kind',
  'minPrice', 'maxPrice',
  'sources', 'countries',
  'chassis', 'vendor', 'brands', 'cpuTiers',
  'minGen', 'minYear', 'minRam', 'minStorage',
  'minReviews',
  'place', 'lat', 'lon', 'radiusKm', 'includeUnlocated',
  'enabled',
];

const NUMERIC = new Set([
  'minPrice', 'maxPrice', 'minGen', 'minYear', 'minRam', 'minStorage',
  'minReviews', 'radiusKm',
]);
const BOOLEAN = new Set(['includeUnlocated', 'enabled']);
export const LIST_FIELDS = new Set(['sources', 'countries', 'chassis', 'brands', 'cpuTiers']);

export const DEFAULT_SEARCH = {
  name: 'Nuova ricerca',
  query: '',
  exclude: '',
  kind: 'COMPUTER',
  minPrice: 0,
  maxPrice: 300,
  sources: ['subito', 'wallapop', 'vinted'],
  countries: [],
  chassis: [],
  vendor: null,
  brands: [],
  cpuTiers: [],
  minGen: 0,
  minYear: 0,
  minRam: 0,
  minStorage: 0,
  minReviews: 0,
  place: '',
  lat: null,
  lon: null,
  radiusKm: 0,
  includeUnlocated: true,
  enabled: true,
};

/** Pull just the editable fields off a server record, coerced to their types. */
export function toDraft(record) {
  const out = {};
  for (const f of SEARCH_FIELDS) {
    const v = record?.[f];
    if (f === 'lat' || f === 'lon') out[f] = v == null || v === '' ? null : Number(v);
    else if (f === 'vendor') out[f] = v ?? null;
    else if (LIST_FIELDS.has(f)) out[f] = [...(v ?? DEFAULT_SEARCH[f])];
    else if (BOOLEAN.has(f)) out[f] = Boolean(v ?? DEFAULT_SEARCH[f]);
    else if (NUMERIC.has(f)) out[f] = Number(v ?? DEFAULT_SEARCH[f]) || 0;
    else out[f] = String(v ?? DEFAULT_SEARCH[f] ?? '');
  }
  return out;
}

export const newDraft = () => toDraft(DEFAULT_SEARCH);

const sameList = (a, b) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Which fields differ between the draft and what the server last returned. */
export function changedFields(draft, saved) {
  if (!saved) return SEARCH_FIELDS.slice();
  const base = toDraft(saved);
  return SEARCH_FIELDS.filter((f) =>
    LIST_FIELDS.has(f) ? !sameList(draft[f], base[f]) : draft[f] !== base[f]);
}

/** Only the changed fields, shaped for a SearchInput. */
export function toInput(draft, fields) {
  const out = {};
  for (const f of fields) out[f] = draft[f];
  return out;
}

/* ---- the array-backed multi-selects -------------------------------------- */

/** Toggle one value, keeping `order` as the canonical order. */
export function toggleIn(list, value, order) {
  const have = new Set(list);
  if (have.has(value)) have.delete(value);
  else have.add(value);
  const known = order.filter((o) => have.has(o));
  const extra = [...have].filter((v) => !order.includes(v));
  return [...known, ...extra];
}

/* ---- option vocabularies, mirroring what the backend parses -------------- */

export const SOURCES = [
  { value: 'subito', label: 'Subito' },
  { value: 'wallapop', label: 'Wallapop' },
  { value: 'vinted', label: 'Vinted' },
];

export const KINDS = [
  { value: 'COMPUTER', label: 'Computer' },
  { value: 'MEMORY', label: 'Memoria' },
  { value: 'OTHER', label: 'Altro' },
];

export const CHASSIS = [
  { value: 'Micro', label: 'Micro' },
  { value: 'SFF', label: 'SFF' },
  { value: 'Tower', label: 'Tower' },
  { value: 'Unstated', label: 'Non indicato' },
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
  { value: null, label: 'Qualsiasi' },
  { value: 'INTEL', label: 'Intel' },
  { value: 'AMD', label: 'AMD' },
];

export const RADII = [0, 10, 25, 50, 100, 200, 500];
