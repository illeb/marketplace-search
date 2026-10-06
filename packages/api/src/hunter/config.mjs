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
    // Intervallo minimo fra due richieste a Vinted, qualunque fase le chieda.
    // Prima ogni fase aveva la sua pausa e due non ne avevano nessuna, quindi
    // il ritmo vero non era scritto da nessuna parte.
    minGapMs: Number(process.env.VINTED_MIN_GAP_MS || 1100),
    // Il tetto a cui può arrivare allargandosi dopo i rifiuti, e dopo quante
    // risposte buone di fila si torna a stringere.
    maxGapMs: Number(process.env.VINTED_MAX_GAP_MS || 6000),
    easeAfter: Number(process.env.VINTED_EASE_AFTER || 40),
    // Quanto si sta fermi al primo rifiuto; raddoppia a ogni recidiva fino al
    // tetto. maxWait è quanto si è disposti ad aspettare dentro una passata:
    // oltre, si lascia perdere Vinted per questo giro invece di restare appesi
    // mentre le altre ricerche aspettano il loro turno.
    coolMs: Number(process.env.VINTED_COOL_MS || 60_000),
    maxCoolMs: Number(process.env.VINTED_MAX_COOL_MS || 15 * 60_000),
    maxWaitMs: Number(process.env.VINTED_MAX_WAIT_MS || 90_000),
    // Rifare la sessione costa una richiesta alla home, che è quasi 2 MB. Ogni
    // dieci voleva dire un decimo del traffico speso a ripresentarsi; adesso il
    // ritmo lo tiene il freno, e la sessione si rifà soprattutto quando scade.
    rotateEvery: Number(process.env.VINTED_ROTATE_EVERY || 40),
    // Il catalogo dà solo i titoli, e nemmeno una data: specifiche e data di
    // pubblicazione costano una pagina ciascuna, letta dai candidati più
    // economici in giù.
    //
    // Questi due sono il budget di una PASSATA INTERA, non di una ricerca:
    // erano per ricerca, e con tre ricerche che leggono Vinted diventavano il
    // triplo senza che nessuno lo avesse deciso.
    maxDetailFetches: Number(process.env.VINTED_MAX_DETAILS || 120),
    maxDateFetches: Number(process.env.VINTED_MAX_DATES || 80),
  },
  politeness: { subitoMs: 250, wallapopMs: 300, vintedMs: 250, detailMs: 900, sellerMs: 400 },
};
