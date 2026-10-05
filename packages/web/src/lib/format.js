// Regole di resa condivise dalla tabella.
//
// La più importante: uno zero o un null in ramGb, storageGb o distanceKm vuol
// dire che l'annuncio non l'ha detto, non che la macchina non ne abbia e non
// che il venditore sia dietro l'angolo. Si leggono "non indicato" e "posizione
// non indicata", mai 0.

export const stated = (n) => n != null && Number(n) > 0;

export const money = (n) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : `${Number(n).toLocaleString('it-IT', { maximumFractionDigits: 0 })} €`;

export const gb = (n) => (stated(n) ? `${Number(n)} GB` : null);

export const distance = (km) => (km == null ? null : `${Math.round(km)} km`);

export const percent = (p) => (p == null ? null : `${Math.round(p)}%`);

/** Processore per quanto lo consentono le parole dell'annuncio. */
export function cpuLabel(row) {
  if (!row.cpu) return null;
  return row.cpuNum ? `${row.cpu}-${row.cpuNum}` : row.cpu;
}

/**
 * Marca e modello come chip. I modelli HP sono salvati come slug, "prodesk400g3",
 * quindi parola, numero e generazione si riprendono i loro spazi. "m710q" di
 * Lenovo e "3050" di Dell sono già corti quanto basta.
 */
export function modelLabel(row) {
  const raw = String(row.model || '');
  const pretty = raw.replace(
    /^([a-z]{4,})(\d+)(g\d+)?$/i,
    (_, word, num, gen) => [word, num, gen].filter(Boolean).join(' '),
  );
  return [row.family, pretty].filter(Boolean).join(' ') || null;
}

/** Core e thread, dove il backend usa una lineetta per dire "non si sa". */
export const threads = (row) => (row.threads && row.threads !== '—' ? row.threads : null);

/** Come l'annuncio descrive i dischi, quando dice qualcosa. */
export function storageDetail(row) {
  const bits = [];
  if (stated(row.ssdGb)) bits.push(`${row.ssdGb} GB SSD`);
  if (stated(row.hddGb)) bits.push(`${row.hddGb} GB HDD`);
  return bits.length ? bits.join(' + ') : null;
}

/** Vero quando la riga è un kit di memoria e non una macchina. */
export const isMemory = (row) => stated(row.memTotal) || stated(row.memSticks);

/** Vero quando la riga porta una qualsiasi specifica da macchina. */
export const isMachine = (row) => !isMemory(row) && !!(row.family || row.cpu || row.chassis);

/**
 * L'annuncio ha indicato le specifiche? Lo usa il filtro di vista. Un kit di
 * memoria deve indicare il totale, una macchina sia memoria sia disco. Quello
 * che non ha specifiche da indicare passa.
 */
export function specsStated(row) {
  if (isMemory(row)) return stated(row.memTotal);
  if (isMachine(row)) return stated(row.ramGb) && stated(row.storageGb);
  return true;
}

/** Trovato oggi. Ripiega sull'età quando il server non lo dice. */
export const isNew = (row) => (row.isNew != null ? !!row.isNew : row.ageDays === 0);

/* ---- tempi ---------------------------------------------------------------
 * Il backend salva UTC senza indicatore di fuso, quindi la Z va aggiunta a mano
 * o il browser lo legge come ora locale e sbaglia di due ore d'estate.
 * ------------------------------------------------------------------------ */

export function parseSqlTime(sqlTimestamp) {
  if (!sqlTimestamp) return null;
  const raw = String(sqlTimestamp).trim();
  // Due formati arrivano qui. SQLite scrive "2026-10-05 08:22:01" senza zona, e
  // va letto come UTC. Le date di pubblicazione arrivano dai marketplace già in
  // ISO con il loro fuso: aggiungere una Z a quelle produce NaN.
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);
  const t = Date.parse(hasZone ? raw : `${raw.replace(' ', 'T')}Z`);
  return Number.isNaN(t) ? null : new Date(t);
}

const DATE_TIME = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const TIME_ONLY = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

/**
 * Quando l'annuncio è stato pubblicato. Subito e Wallapop lo dicono; Vinted no,
 * né nel catalogo né nella pagina del singolo annuncio, quindi lì si ripiega su
 * quando lo abbiamo visto noi — ed è dichiarato, perché le due cose non sono la
 * stessa e confonderle fa sembrare nuovo tutto il primo giorno di una ricerca.
 */
export function publishedDate(row) {
  return parseSqlTime(row?.postedAt) ?? parseSqlTime(row?.firstSeen);
}

export const hasRealDate = (row) => parseSqlTime(row?.postedAt) != null;

/** Data e ora di pubblicazione, pronta da mostrare. */
export function addedAt(row) {
  const d = publishedDate(row);
  if (!d) return null;
  const today = new Date().toDateString() === d.toDateString();
  return today ? `oggi alle ${TIME_ONLY.format(d)}` : DATE_TIME.format(d);
}

/** Ore trascorse dalla pubblicazione, per il filtro per data. */
export function hoursSinceAdded(row) {
  const d = publishedDate(row);
  return d ? (Date.now() - d.getTime()) / 3_600_000 : null;
}

export function ageLabel(days) {
  if (days == null) return 'visto di recente';
  if (days <= 0) return 'visto oggi per la prima volta';
  if (days === 1) return 'visto ieri per la prima volta';
  return `visto ${days} giorni fa per la prima volta`;
}

export function timeAgo(sqlTimestamp) {
  const d = parseSqlTime(sqlTimestamp);
  if (!d) return null;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'adesso';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "un'ora fa" : `${hours} ore fa`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ieri' : `${days} giorni fa`;
}

/** Data e ora complete, per lo storico delle scansioni. */
export function dateTime(sqlTimestamp) {
  const d = parseSqlTime(sqlTimestamp);
  return d ? DATE_TIME.format(d) : null;
}

/** Quanto è durata una scansione. */
export function duration(from, to) {
  const a = parseSqlTime(from);
  const b = parseSqlTime(to);
  if (!a || !b) return null;
  const secs = Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
  if (secs < 60) return `${secs} s`;
  return `${Math.floor(secs / 60)} min ${String(secs % 60).padStart(2, '0')} s`;
}

/** Rosso, ambra o verde per un venditore, con la regola della vecchia interfaccia. */
export function sellerTone(row) {
  const n = row.reviews ?? 0;
  if (n < 3) return 'bad';
  if ((row.positivePct != null && row.positivePct < 90) || (row.reports ?? 0) >= 50 || n < 5)
    return 'warn';
  return 'good';
}
