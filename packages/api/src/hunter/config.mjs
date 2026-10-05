export const CONFIG = {
  port: Number(process.env.PORT || 8080),
  // Impressi dentro l'immagine al momento della build: sono l'unico modo
  // onesto di sapere, guardando un contenitore acceso, da quale commit viene.
  // Fuori dall'immagine non ci sono, e allora si sta girando da sorgente.
  version: process.env.APP_VERSION || null,
  builtAt: process.env.APP_BUILT_AT || null,
  dbPath: process.env.DB_PATH || new URL('../../data/hunter.db', import.meta.url).pathname,
  // Static root. In the workspace the web package builds next door; in the
  // image the compiled files are copied in and WEB_ROOT points at them.
  webRoot: process.env.WEB_ROOT || new URL('../../../web/dist/', import.meta.url).pathname,
  // Default sweep rate when nobody has chosen one in the settings. Six hours:
  // the marketplaces are swept whole each pass, and four passes a day is plenty
  // for second-hand listings that sit for days.
  sweepMinutes: Number(process.env.SWEEP_MINUTES || 360),
  // a listing missing from this many consecutive sweeps is treated as sold
  missesBeforeSold: Number(process.env.MISSES_BEFORE_SOLD || 2),
  userAgent: process.env.USER_AGENT ||
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  vinted: {
    host: process.env.VINTED_HOST || 'vinted.it',
    // Vinted rate-limits hard; re-bootstrap the anonymous session this often
    rotateEvery: Number(process.env.VINTED_ROTATE_EVERY || 10),
    // Il catalogo dà solo i titoli, e nemmeno una data: specifiche e data di
    // pubblicazione costano una pagina ciascuna, letta dai candidati più
    // economici in giù. A 900 ms l'una, 120 sono quasi due minuti per ricerca —
    // sostenibili con le scansioni ogni sei ore, non lo erano ogni ora.
    maxDetailFetches: Number(process.env.VINTED_MAX_DETAILS || 120),
    // Secondo giro, solo sulle corrispondenze rimaste senza data. È il numero
    // di annunci nuovi che una passata può datare; non ricresce, perché una
    // data presa resta e la volta dopo quella riga non viene più riletta.
    maxDateFetches: Number(process.env.VINTED_MAX_DATES || 80),
  },
  politeness: { subitoMs: 250, wallapopMs: 300, vintedMs: 250, detailMs: 900, sellerMs: 400 },
};
