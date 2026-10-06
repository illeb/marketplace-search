// WebMCP: the app's own actions, offered to an agent driving the browser.
//
// Chrome 146 shipped navigator.modelContext; provideContext() and
// clearContext() were dropped in the March 2026 revision, so registration is
// per tool. Absent the API this is inert and the app is unaffected.

const MAX_ROWS = 40;

const ok = (v) => ({ success: true, ...v });
const fail = (reason) => ({ success: false, reason });

/** Listings are wide and long; an agent wants the shape, not 800 rows. */
const slim = (l) => ({
  id: l.id,
  price: l.price,
  title: l.title,
  url: l.url,
  source: l.source,
  city: l.city ?? null,
  distanceKm: l.distanceKm ?? null,
  vendor: l.vendor ?? null,
  chassis: l.chassis ?? null,
  model: l.model ?? null,
  year: l.year ?? null,
  // null means the advert never said, not that the machine has none
  ramGb: l.ramGb ?? null,
  storageGb: l.storageGb ?? null,
  sellerReviews: l.reviews ?? null,
  sellerPositivePct: l.positivePct ?? null,
  isNew: !!l.isNew,
  cautions: l.cautions ?? [],
});

const searchSummary = (s) => ({
  id: s.id,
  name: s.name,
  terms: s.query,
  kind: s.kind,
  priceRange: [s.minPrice, s.maxPrice],
  matches: s.count,
  newToday: s.newCount,
  enabled: s.enabled,
  near: s.place || null,
  radiusKm: s.radiusKm,
  lastRunAt: s.lastRunAt ?? null,
});

const FILTER_PROPS = {
  name: { type: 'string', description: 'label for the search' },
  query: { type: 'string', description: 'comma separated terms; every term is swept each run' },
  kind: { type: 'string', enum: ['COMPUTER', 'MEMORY', 'OTHER'] },
  minPrice: { type: 'number' },
  maxPrice: { type: 'number' },
  sources: { type: 'array', items: { type: 'string', enum: ['subito', 'wallapop', 'vinted'] } },
  countries: { type: 'array', items: { type: 'string' }, description: 'ISO2 codes; empty means all of Europe' },
  chassis: { type: 'array', items: { type: 'string', enum: ['Micro', 'SFF', 'Tower', 'Unstated'] } },
  vendor: { type: ['string', 'null'], enum: ['INTEL', 'AMD', null] },
  brands: { type: 'array', items: { type: 'string', enum: ['Dell', 'HP', 'Lenovo', 'Fujitsu', 'Acer', 'Asus', 'MSI', 'Shuttle', 'Terra'] } },
  minYear: { type: 'integer', description: 'launch-year floor; the one age limit that holds for Intel and AMD alike' },
  minRam: { type: 'integer', description: 'GB' },
  minStorage: { type: 'integer', description: 'GB' },
  minReviews: { type: 'integer', description: 'seller reputation floor' },
  radiusKm: { type: 'integer', description: '0 means no distance limit' },
  includeUnlocated: { type: 'boolean', description: 'keep adverts that state no location when a radius is set' },
  enabled: { type: 'boolean' },
};

/**
 * @param {object} app  live accessors into the running UI
 * @returns {() => void} teardown
 */
export function registerTools(app) {
  if (typeof navigator === 'undefined' || !('modelContext' in navigator)) return () => {};
  const mc = navigator.modelContext;

  const tools = [
    {
      name: 'listSearches',
      description: 'The saved marketplace searches, each with its live match count and when it last ran.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ok({ searches: (await app.searches()).map(searchSummary) }),
    },
    {
      name: 'selectSearch',
      description: 'Show a saved search in the interface. Use the id from listSearches.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
      execute: async ({ id }) => {
        const s = (await app.searches()).find((x) => x.id === id);
        if (!s) return fail(`no search with id ${id}`);
        app.select(id);
        return ok({ selected: searchSummary(s) });
      },
    },
    {
      name: 'getListings',
      description:
        'Results for one saved search, cheapest first. A null on ramGb, storageGb or year '
        + 'means the advert never said, not that the machine has none. A null distanceKm means '
        + 'the advert states no location.',
      inputSchema: {
        type: 'object',
        properties: {
          searchId: { type: 'integer' },
          maxPrice: { type: 'number', description: 'optional ceiling' },
          newToday: { type: 'boolean', description: 'only adverts first matched today' },
          specsStated: { type: 'boolean', description: 'only adverts that state memory and storage' },
          limit: { type: 'integer', description: `at most ${MAX_ROWS}` },
        },
        required: ['searchId'],
      },
      execute: async ({ searchId, maxPrice, newToday, specsStated, limit }) => {
        let rows;
        try { rows = await app.listings(searchId); }
        catch (e) { return fail(e.message); }
        const before = rows.length;
        if (maxPrice != null) rows = rows.filter((r) => r.price <= maxPrice);
        if (newToday) rows = rows.filter((r) => r.isNew);
        if (specsStated) rows = rows.filter((r) => r.ramGb && r.storageGb);
        const cap = Math.min(limit ?? MAX_ROWS, MAX_ROWS);
        return ok({
          matched: rows.length,
          totalForSearch: before,
          returned: Math.min(cap, rows.length),
          omitted: Math.max(0, rows.length - cap),
          listings: rows.slice(0, cap).map(slim),
        });
      },
    },
    {
      name: 'createSearch',
      description: 'Create a saved search. Anything omitted takes its default.',
      inputSchema: { type: 'object', properties: FILTER_PROPS, required: ['name', 'query'] },
      execute: async (input) => {
        try { return ok({ created: searchSummary(await app.createSearch(input)) }); }
        catch (e) { return fail(e.message); }
      },
    },
    {
      name: 'updateSearch',
      description: 'Change filters on a saved search. Only the fields given are written.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer' }, ...FILTER_PROPS },
        required: ['id'],
      },
      execute: async ({ id, ...input }) => {
        try { return ok({ updated: searchSummary(await app.updateSearch(id, input)) }); }
        catch (e) { return fail(e.message); }
      },
    },
    {
      name: 'deleteSearch',
      description: 'Delete a saved search and everything it matched. This cannot be undone.',
      inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      execute: async ({ id }) => {
        try { return (await app.deleteSearch(id)) ? ok({ deleted: id }) : fail(`no search with id ${id}`); }
        catch (e) { return fail(e.message); }
      },
    },
    {
      name: 'runSearch',
      description:
        'Sweep one search against the marketplaces now and return the counts. Reads three '
        + 'sites, so it takes one to four minutes.',
      inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      execute: async ({ id }) => {
        try { return ok({ result: await app.runSearch(id) }); }
        catch (e) { return fail(e.message); }
      },
    },
  ];

  for (const t of tools) mc.registerTool(t);
  return () => { for (const t of tools) { try { mc.unregisterTool(t.name); } catch { /* gone already */ } } };
}
