// Ricontrolla gli annunci dati per venduti e resuscita quelli ancora vivi.
//
// Serve una volta sola, per riparare quel che ha lasciato il vecchio criterio:
// due assenze di fila dal catalogo bastavano a ritirare un annuncio, anche se
// era semplicemente finito oltre la terza pagina dei risultati. Da adesso in
// poi la scansione chiede alla pagina prima di ritirare, quindi questo non si
// riaccumula e lo script non va rimesso in un cron.
//
// Dentro al contenitore non c'è pnpm, quindi si chiama col percorso:
//
//   node packages/api/scripts/recheck-sold.mjs      quelli di una ricerca attiva
//   RECHECK_ALL=1 node .../recheck-sold.mjs         tutto l'archivio
//   RECHECK_LIMIT=10 node .../recheck-sold.mjs      solo i primi 10, per provare
//
// Fuori, dal repository, `pnpm --filter api recheck-sold` fa lo stesso.
import { db } from '../dist/hunter/db.mjs';
import * as subito from '../dist/hunter/sources/subito.mjs';
import * as wallapop from '../dist/hunter/sources/wallapop.mjs';
import * as vinted from '../dist/hunter/sources/vinted.mjs';

const SOURCES = { subito, wallapop, vinted };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const where = process.env.RECHECK_ALL
  ? 'l.sold_at IS NOT NULL'
  : 'l.sold_at IS NOT NULL AND EXISTS (SELECT 1 FROM matches m WHERE m.listing_id = l.id)';

const limit = Number(process.env.RECHECK_LIMIT) || 0;
const rows = db.prepare(
  `SELECT l.id, l.source, l.url, l.title FROM listings l WHERE ${where}
   ORDER BY l.sold_at DESC${limit > 0 ? ' LIMIT ' + limit : ''}`,
).all();

console.log(`${rows.length} annunci dati per venduti da ricontrollare`);

let vivi = 0, confermati = 0, incerti = 0;
for (const [i, r] of rows.entries()) {
  const src = SOURCES[r.source];
  let gone = null;
  if (src?.isSold) { try { gone = await src.isSold(r.url); } catch { gone = null; } }
  await sleep(700);

  if (gone === false) {
    db.prepare('UPDATE listings SET sold_at = NULL, misses = 0 WHERE id=?').run(r.id);
    vivi++;
    console.log(`  vivo   ${String(r.title ?? '').slice(0, 56)}`);
  } else if (gone === true) confermati++;
  else incerti++;

  if ((i + 1) % 25 === 0) console.log(`  ... ${i + 1}/${rows.length}`);
}

console.log(`\n${vivi} rimessi in lista, ${confermati} venduti confermati, ${incerti} senza risposta chiara`);
