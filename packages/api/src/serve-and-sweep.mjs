// Container entrypoint: the HTTP server plus the periodic sweep in one process.
import { CONFIG } from './config.mjs';
import { sweep } from './worker.mjs';
import './server.mjs';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
log(`scheduler armed, every ${CONFIG.sweepMinutes} min`);
setTimeout(() => sweep().catch(e => log('sweep failed:', e.message)), 10_000);
setInterval(() => sweep().catch(e => log('sweep failed:', e.message)), CONFIG.sweepMinutes * 60_000);
