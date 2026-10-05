import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { CONFIG } from './hunter/config.mjs';
import { pruneOrphanListings, compact } from './hunter/db.mjs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // The compiled web package is served from the same origin as /graphql, which
  // is why there is no CORS configuration anywhere.
  // Only the hashed files under assets/ may be cached hard. index.html and
  // stylex.css keep fixed names — StyleX emits its stylesheet unhashed — so a
  // blanket max-age pins the browser to a stale stylesheet after every deploy.
  app.useStaticAssets(CONFIG.webRoot, {
    index: ['index.html'],
    setHeaders: (res, filePath) => {
      res.setHeader(
        'cache-control',
        /[\\/]assets[\\/]/.test(filePath)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      );
    },
  });

  // Anything that is not /graphql and not a real file is the single-page app.
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/graphql') || req.path.includes('.')) return next();
    res.sendFile('index.html', { root: CONFIG.webRoot });
  });

  await app.listen(CONFIG.port, '0.0.0.0');
  const log = new Logger('Bootstrap');
  log.log(`http://localhost:${CONFIG.port}  graphql /graphql  db ${CONFIG.dbPath}`);

  // Una passata di pulizia all'avvio. Serve per gli annunci lasciati indietro
  // dalle ricerche cancellate prima che la cancellazione li portasse via, e per
  // quelli che una passata ha letto ma nessun filtro ha trattenuto: non si
  // vedono da nessuna parte e la prossima scansione li rileggerebbe comunque.
  const pruned = pruneOrphanListings();
  if (pruned > 0) {
    compact();
    log.log(`${pruned} annunci senza ricerca rimossi`);
  }
}

void bootstrap();
