// Rendering rules shared by the table.
//
// The central one: a zero or null in ram_gb, storage_gb or distance_km means
// the advert never said, not that the machine has none and not that the seller
// is next door. Those read as "not stated" / "location unknown", never as 0.

export const stated = (n) => n != null && Number(n) > 0;

export const money = (n) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} €`;

export const gb = (n) => (stated(n) ? `${Number(n)} GB` : null);

export const distance = (km) => (km == null ? null : `${Math.round(km)} km`);

export const percent = (p) => (p == null ? null : `${Math.round(p)}%`);

/** Processor as the advert's words allow: "i5-8500", "Ryzen 5", or nothing. */
export function cpuLabel(row) {
  if (!row.cpu) return null;
  return row.cpu_num ? `${row.cpu}-${row.cpu_num}` : row.cpu;
}

/**
 * Brand and model as a chip. HP models are stored as slugs — "prodesk400g3" —
 * so the word, the number and the generation get their spaces back. Lenovo's
 * "m710q" and Dell's "3050" are already as short as they go.
 */
export function modelLabel(row) {
  const raw = String(row.model || '');
  const pretty = raw.replace(
    /^([a-z]{4,})(\d+)(g\d+)?$/i,
    (_, word, num, gen) => [word, num, gen].filter(Boolean).join(' '),
  );
  return [row.family, pretty].filter(Boolean).join(' ') || null;
}

/** The core/thread count, where the backend uses an em dash to mean unknown. */
export const threads = (row) => (row.threads && row.threads !== '\u2014' ? row.threads : null);

/** How a row describes its drives, when it says anything at all. */
export function storageDetail(row) {
  const bits = [];
  if (stated(row.ssd_gb)) bits.push(`${row.ssd_gb} GB SSD`);
  if (stated(row.hdd_gb)) bits.push(`${row.hdd_gb} GB HDD`);
  return bits.length ? bits.join(' + ') : null;
}

/** True when this row is a memory kit rather than a machine. */
export const isMemory = (row) => stated(row.mem_total) || stated(row.mem_sticks);

/** True when this row carries any machine specification at all. */
export const isMachine = (row) => !isMemory(row) && !!(row.family || row.cpu || row.chassis);

/**
 * Did the advert state the specification? Used by the "specs stated" view
 * filter. A memory kit has to state its total; a machine has to state both its
 * memory and its storage. Anything with no specifications to state passes.
 */
export function specsStated(row) {
  if (isMemory(row)) return stated(row.mem_total);
  if (isMachine(row)) return stated(row.ram_gb) && stated(row.storage_gb);
  return true;
}

/** Matched today. Falls back to the age when the server does not say. */
export const isNew = (row) => (row.is_new != null ? !!row.is_new : row.age_days === 0);

export function ageLabel(days) {
  if (days == null) return 'seen recently';
  if (days <= 0) return 'first seen today';
  if (days === 1) return 'first seen yesterday';
  return `first seen ${days} days ago`;
}

/** The backend stores UTC without a zone marker. */
export function timeAgo(sqlTimestamp) {
  if (!sqlTimestamp) return null;
  const t = Date.parse(String(sqlTimestamp).replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Red, amber or green for a seller, on the same rule the old UI used. */
export function sellerTone(row) {
  const n = row.reviews ?? 0;
  if (n < 3) return 'bad';
  if ((row.positive_pct != null && row.positive_pct < 90) || (row.reports ?? 0) >= 50 || n < 5)
    return 'warn';
  return 'good';
}
