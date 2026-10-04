export const CONFIG = {
  port: Number(process.env.PORT || 8080),
  dbPath: process.env.DB_PATH || new URL('../../data/hunter.db', import.meta.url).pathname,
  // Static root. In the workspace the web package builds next door; in the
  // image the compiled files are copied in and WEB_ROOT points at them.
  webRoot: process.env.WEB_ROOT || new URL('../../../web/dist/', import.meta.url).pathname,
  // how often the worker sweeps every enabled search
  sweepMinutes: Number(process.env.SWEEP_MINUTES || 60),
  // a listing missing from this many consecutive sweeps is treated as sold
  missesBeforeSold: Number(process.env.MISSES_BEFORE_SOLD || 2),
  userAgent: process.env.USER_AGENT ||
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  vinted: {
    host: process.env.VINTED_HOST || 'vinted.it',
    // Vinted rate-limits hard; re-bootstrap the anonymous session this often
    rotateEvery: Number(process.env.VINTED_ROTATE_EVERY || 10),
    // its search returns titles only, so each candidate costs a page fetch
    maxDetailFetches: Number(process.env.VINTED_MAX_DETAILS || 40),
  },
  politeness: { subitoMs: 250, wallapopMs: 300, vintedMs: 250, detailMs: 900, sellerMs: 400 },
};
