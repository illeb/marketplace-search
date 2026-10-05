import { Client, cacheExchange, fetchExchange, gql } from '@urql/svelte';

// Same origin as the page: the api serves both /graphql and these files.
export const client = new Client({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
  // Apollo refuses anything that could have been a simple cross-site request.
  // This header is its documented opt-out and costs nothing on a same-origin
  // call; without it the very first query comes back as a CSRF error.
  fetchOptions: { headers: { 'apollo-require-preflight': 'true' } },
});

/* ---- documents ---------------------------------------------------------- */

export const SEARCH_FIELDS = gql`
  fragment SearchFields on Search {
    id name query exclude kind minPrice maxPrice sources countries
    place lat lon radiusKm includeUnlocated
    chassis vendor brands cpuTiers
    minGen minYear minRam minStorage minReviews
    enabled lastRunAt count newCount
  }
`;

export const SEARCHES = gql`
  query Searches { searches { ...SearchFields } }
  ${SEARCH_FIELDS}
`;

const LISTING_FIELDS = `
      id source url title price city country shippable imageUrl
      postedAt postedApprox firstSeen soldAt isNew isFavourite distanceKm
      vendor family model chassis cpu cpuNum generation year
      ramGb ssdGb hddGb storageGb memTotal memSticks memPer memSpeed tiered
      reviews positivePct cautions ageDays priceMin priceMax`;

export const LISTINGS = gql`
  query Listings($searchId: Int!) {
    listings(searchId: $searchId) {
      ${LISTING_FIELDS}
    }
  }
`;

/** What the search would match if the open filters were saved. Writes nothing. */
export const PREVIEW = gql`
  query Preview($searchId: Int!, $input: SearchInput!) {
    preview(searchId: $searchId, input: $input) {
      ${LISTING_FIELDS}
    }
  }
`;

export const FAVOURITES = gql`
  query Favourites { favourites { ${LISTING_FIELDS} } }
`;

export const SET_FAVOURITE = gql`
  mutation SetFavourite($listingId: Int!, $value: Boolean!) {
    setFavourite(listingId: $listingId, value: $value)
  }
`;

export const RUN_PROGRESS = gql`
  query RunProgress { runProgress { searchId phase step steps label found startedAt } }
`;

export const RUN_HISTORY = gql`
  query RunHistory($limit: Int) {
    runHistory(limit: $limit) {
      id searchId searchName trigger startedAt finishedAt found offTopic matched error
    }
  }
`;

export const PLACES    = gql`query Places($q: String!) { places(q: $q) { label lat lon country } }`;
export const COUNTRIES = gql`query Countries { countries { code name } }`;
export const STATS     = gql`query Stats { stats { listings live sold sellers searches } }`;

export const CREATE_SEARCH = gql`
  mutation CreateSearch($input: SearchInput!) { createSearch(input: $input) { ...SearchFields } }
  ${SEARCH_FIELDS}
`;
export const UPDATE_SEARCH = gql`
  mutation UpdateSearch($id: Int!, $input: SearchInput!) {
    updateSearch(id: $id, input: $input) { ...SearchFields }
  }
  ${SEARCH_FIELDS}
`;
export const DELETE_SEARCH = gql`mutation DeleteSearch($id: Int!) { deleteSearch(id: $id) }`;
export const RUN_SEARCH    = gql`mutation RunSearch($id: Int!) { runSearch(id: $id) { found offTopic matched } }`;
export const SWEEP         = gql`mutation Sweep { sweep }`;

export const SETTINGS = gql`query Settings { settings { sweepMinutes defaultSweepMinutes } }`;
export const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($sweepMinutes: Int!) {
    updateSettings(sweepMinutes: $sweepMinutes) { sweepMinutes defaultSweepMinutes }
  }
`;

/* ---- thin imperative wrappers ------------------------------------------- */
// The app drives its own state rather than subscribing per component, so these
// read as plain async calls and raise the server's own message on failure.

const unwrap = (res) => {
  if (res.error) {
    const g = res.error.graphQLErrors?.[0]?.message;
    throw new Error(g || res.error.networkError?.message || 'the server is unreachable');
  }
  return res.data;
};

const q = (doc, vars) => client.query(doc, vars, { requestPolicy: 'network-only' })
  .toPromise().then(unwrap);
const m = (doc, vars) => client.mutation(doc, vars).toPromise().then(unwrap);

export const api = {
  searches:  () => q(SEARCHES).then((d) => d.searches),
  listings:  (searchId) => q(LISTINGS, { searchId }).then((d) => d.listings),
  preview:   (searchId, input) => q(PREVIEW, { searchId, input }).then((d) => d.preview),
  favourites: () => q(FAVOURITES).then((d) => d.favourites),
  runProgress: () => q(RUN_PROGRESS).then((d) => d.runProgress),
  runHistory: (limit) => q(RUN_HISTORY, { limit }).then((d) => d.runHistory),
  setFavourite: (listingId, value) => m(SET_FAVOURITE, { listingId, value }).then((d) => d.setFavourite),
  places:    (s) => q(PLACES, { q: s }).then((d) => d.places),
  countries: () => q(COUNTRIES).then((d) => d.countries),
  stats:     () => q(STATS).then((d) => d.stats),

  createSearch: (input) => m(CREATE_SEARCH, { input }).then((d) => d.createSearch),
  updateSearch: (id, input) => m(UPDATE_SEARCH, { id, input }).then((d) => d.updateSearch),
  deleteSearch: (id) => m(DELETE_SEARCH, { id }).then((d) => d.deleteSearch),
  runSearch:    (id) => m(RUN_SEARCH, { id }).then((d) => d.runSearch),
  sweep:        () => m(SWEEP).then((d) => d.sweep),

  settings:       () => q(SETTINGS).then((d) => d.settings),
  updateSettings: (sweepMinutes) =>
    m(UPDATE_SETTINGS, { sweepMinutes }).then((d) => d.updateSettings),
};
