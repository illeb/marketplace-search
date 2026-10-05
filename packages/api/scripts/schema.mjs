// Scrive schema.graphql alla radice del repository leggendo lo schema dal
// server in ascolto. Serve l'introspezione, quindi il server dev'essere su:
// in sviluppo lo è, e in produzione l'introspezione è comunque disponibile
// solo da dentro, perché la porta non è esposta a Internet.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';

const url = process.env.GRAPHQL_URL || 'http://127.0.0.1:8080/graphql';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'schema.graphql');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'apollo-require-preflight': '1' },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});
if (!res.ok) throw new Error(`${url} ha risposto ${res.status}; il server è acceso?`);
const { data, errors } = await res.json();
if (errors) throw new Error(errors.map((e) => e.message).join('; '));

const header = `# Il contratto GraphQL, generato dallo schema vero del server.
#
# Non si scrive a mano: la versione precedente era scritta a mano ed è andata
# alla deriva senza che nessuno se ne accorgesse, le mancavano i preferiti,
# l'anteprima dei filtri, lo storico, il progresso e metà dei campi di Listing.
# Per rifarlo, con il server in ascolto:
#
#   pnpm --filter api schema
#
`;
writeFileSync(out, header + printSchema(buildClientSchema(data)));
console.log(`schema.graphql riscritto da ${url}`);
