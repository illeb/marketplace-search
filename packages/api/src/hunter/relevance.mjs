// Marketplaces answer a query with whatever they think is related, and on Subito
// that stretches to neck massagers when you ask for a dough mixer. Vinted also
// mixes promoted items into results. Nothing downstream can tell the difference,
// so the listing has to earn its place by actually mentioning what was asked for.

export const strip = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // fold accents: perché -> perche
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** Significant words per term. Short words carry no signal on their own. */
export function termTokens(query) {
  return String(query || '').split(',').map(t => strip(t)).filter(Boolean).map(term => {
    const words = term.split(' ').filter(Boolean);
    const long = words.filter(w => w.length >= 4);
    return { term, tokens: long.length ? long : words };
  }).filter(t => t.tokens.length);
}

/** Drop the final letter so Italian and Spanish inflections still match:
 *  impastatrice/impastatrici, pentola/pentole, ordenador/ordenadores. */
export const stem = w => (w.length >= 5 ? w.slice(0, -1) : w);

/**
 * A listing is relevant when any one significant word from any term appears in its
 * title or body, compared on stems so plurals count.
 *
 * The second test covers a listing whose word is shorter than the query's
 * ("ordenador" for "ordenadores"), but it has to stay close to the whole query:
 * at four characters it let the verb "impasta" stand in for "impastatrice",
 * which dragged pasta machines and a lot of Kinder toys into a mixer search.
 */
const NEAR = 0.75;
export function isRelevant(terms, title, description) {
  if (!terms.length) return true;
  const words = (strip(title) + ' ' + strip(description)).split(' ').filter(Boolean);
  return terms.some(({ tokens }) => tokens.some(tok => {
    const st = stem(tok);
    return words.some(w => w.startsWith(st)
      || (st.startsWith(w) && w.length >= 5 && w.length >= st.length * NEAR));
  }));
}
