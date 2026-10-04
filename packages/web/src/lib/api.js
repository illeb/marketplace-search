// Thin wrapper over the backend's JSON API. Every call returns parsed JSON and
// throws an Error carrying the server's own message when it fails, so callers
// can surface one banner instead of each inventing its own error shape.

const JSON_HEADERS = { 'content-type': 'application/json' };

async function request(path, options) {
  let res;
  try {
    res = await fetch(`/api${path}`, options);
  } catch (cause) {
    throw new Error('the server is unreachable', { cause });
  }
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) throw new Error(body?.error || `${res.status} ${res.statusText}`);
  return body;
}

const send = (path, method, body) =>
  request(path, { method, headers: JSON_HEADERS, body: JSON.stringify(body ?? {}) });

export const api = {
  searches: () => request('/searches'),
  createSearch: (body) => send('/searches', 'POST', body),
  updateSearch: (id, body) => send(`/searches/${id}`, 'PUT', body),
  deleteSearch: (id) => request(`/searches/${id}`, { method: 'DELETE' }),
  // A run scrapes three marketplaces and can take minutes. No timeout here on
  // purpose: the caller shows progress instead.
  runSearch: (id) => request(`/searches/${id}/run`, { method: 'POST' }),
  sweep: () => request('/sweep', { method: 'POST' }),
  listings: (searchId) => request(`/listings?search_id=${encodeURIComponent(searchId)}`),
  places: (q, signal) => request(`/places?q=${encodeURIComponent(q)}`, { signal }),
  countries: () => request('/countries'),
  stats: () => request('/stats'),
};
