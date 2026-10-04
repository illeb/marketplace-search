<script>
  import { api } from './lib/api.js';
  import { toDraft, newDraft, changedFields, SEARCH_FIELDS } from './lib/search.js';
  import { isNew, specsStated } from './lib/format.js';

  import SearchList from './components/SearchList.svelte';
  import FilterEditor from './components/FilterEditor.svelte';
  import ResultsTable from './components/ResultsTable.svelte';
  import ViewFilters from './components/ViewFilters.svelte';
  import RunControls from './components/RunControls.svelte';

  /* ---- server state ----------------------------------------------------- */
  let searches = $state([]);
  let countries = $state([]);
  let stats = $state(null);
  let rowsBySearch = $state({});        // search id -> listing rows, as fetched
  let booted = $state(false);
  let error = $state(null);

  /* ---- editing ---------------------------------------------------------- */
  let selectedId = $state(null);
  let drafts = $state({});              // search id -> working copy
  let pendingNew = $state(null);        // the not-yet-created search, or null
  let saving = $state(false);
  let deletingId = $state(null);

  /* ---- running ---------------------------------------------------------- */
  let running = $state(false);
  let runResult = $state(null);
  let runError = $state(null);
  let sweeping = $state(false);
  let loadingRows = $state(false);

  /* ---- the view lens ---------------------------------------------------- */
  let view = $state({
    newOnly: false, specsOnly: false, shipsOnly: false, hideSold: true, maxPrice: null,
  });

  const selected = $derived(searches.find((s) => s.id === selectedId) ?? null);
  const draft = $derived(pendingNew ?? drafts[selectedId] ?? null);
  const changed = $derived(
    !draft ? [] : pendingNew ? SEARCH_FIELDS.slice() : changedFields(draft, selected),
  );
  const dirtyIds = $derived(
    new Set(
      Object.keys(drafts)
        .filter((id) => {
          const s = searches.find((x) => String(x.id) === String(id));
          return s && changedFields(drafts[id], s).length > 0;
        })
        .map(Number),
    ),
  );

  const rows = $derived(rowsBySearch[selectedId] ?? null);
  // The searches endpoint carries the live match count, so the sidebar needs no
  // listings at all. A search whose rows are already loaded uses those instead,
  // so the number reacts immediately after a run.
  const counts = $derived(
    Object.fromEntries(
      searches.map((s) => [
        s.id,
        rowsBySearch[s.id]
          ? rowsBySearch[s.id].filter((r) => !r.sold_at).length
          : (s.count ?? null),
      ]),
    ),
  );

  const visible = $derived.by(() => {
    const list = rows ?? [];
    return list.filter((r) => {
      if (view.hideSold && r.sold_at) return false;
      if (view.newOnly && !isNew(r)) return false;
      if (view.specsOnly && !specsStated(r)) return false;
      if (view.shipsOnly && !r.shippable) return false;
      if (view.maxPrice != null && Number(r.price ?? 0) > view.maxPrice) return false;
      return true;
    });
  });

  /* ---- loading ----------------------------------------------------------- */

  async function loadRows(id, { force = false } = {}) {
    if (!id) return;
    if (rowsBySearch[id] && !force) return;
    loadingRows = id === selectedId;
    try {
      rowsBySearch[id] = await api.listings(id);
    } catch (e) {
      if (id === selectedId) error = `Could not load listings: ${e.message}`;
    } finally {
      if (id === selectedId) loadingRows = false;
    }
  }

  const refreshStats = () => api.stats().then((s) => (stats = s)).catch(() => {});


  function select(id) {
    selectedId = id;
    pendingNew = null;
    deletingId = null;
    runResult = null;
    runError = null;
    if (id && !drafts[id]) {
      const s = searches.find((x) => x.id === id);
      if (s) drafts[id] = toDraft(s);
    }
    loadRows(id);
  }

  async function boot() {
    try {
      const [s, c] = await Promise.all([api.searches(), api.countries()]);
      searches = s;
      countries = c;
      booted = true;
      if (s.length) select(s[0].id);
      refreshStats();
    } catch (e) {
      error = `Could not reach the API: ${e.message}`;
      booted = true;
    }
  }
  boot();

  /* ---- saving ------------------------------------------------------------ */

  async function save() {
    if (!draft) return;
    saving = true;
    error = null;
    try {
      const body = toDraft(draft);
      if (pendingNew) {
        const created = await api.createSearch(body);
        searches = [...searches, created];
        drafts[created.id] = toDraft(created);
        pendingNew = null;
        select(created.id);
        refreshStats();
      } else {
        const updated = await api.updateSearch(selectedId, body);
        searches = searches.map((s) => (s.id === updated.id ? updated : s));
        drafts[updated.id] = toDraft(updated);
      }
    } catch (e) {
      error = `Save failed: ${e.message}`;
    } finally {
      saving = false;
    }
  }

  function revert() {
    if (pendingNew) { pendingNew = newDraft(); return; }
    if (selected) drafts[selected.id] = toDraft(selected);
  }

  function startNew() {
    pendingNew = newDraft();
    deletingId = null;
    runResult = null;
    runError = null;
  }

  const cancelNew = () => { pendingNew = null; };

  async function remove(id) {
    error = null;
    try {
      await api.deleteSearch(id);
    } catch (e) {
      error = `Delete failed: ${e.message}`;
      return;
    }
    searches = searches.filter((s) => s.id !== id);
    delete drafts[id];
    delete rowsBySearch[id];
    deletingId = null;
    if (selectedId === id) {
      if (searches.length) select(searches[0].id);
      else selectedId = null;
    }
    refreshStats();
  }

  /* ---- running ----------------------------------------------------------- */

  async function run() {
    if (!selected || running) return;
    running = true;
    runResult = null;
    runError = null;
    const id = selected.id;
    try {
      runResult = await api.runSearch(id);
      await Promise.all([loadRows(id, { force: true }), refreshSearches(), refreshStats()]);
    } catch (e) {
      runError = e.message;
    } finally {
      running = false;
    }
  }

  async function refreshSearches() {
    try {
      const fresh = await api.searches();
      searches = fresh;
    } catch { /* leave what we have */ }
  }

  // The sweep endpoint only says it started, so progress is inferred by watching
  // last_run_at move on every enabled search.
  let sweepTimer = null;
  async function sweep() {
    if (sweeping) return;
    error = null;
    const before = Object.fromEntries(searches.map((s) => [s.id, s.last_run_at ?? '']));
    const watching = searches.filter((s) => s.enabled).map((s) => s.id);
    try {
      await api.sweep();
    } catch (e) {
      error = `Sweep failed to start: ${e.message}`;
      return;
    }
    sweeping = true;
    const deadline = Date.now() + 20 * 60 * 1000;
    clearInterval(sweepTimer);
    sweepTimer = setInterval(async () => {
      await refreshSearches();
      refreshStats();
      // Counts arrive with the search list, so only the search on screen needs
      // its rows pulled again. Reloading all of them was megabytes nobody reads.
      const moved = searches.filter((s) => (s.last_run_at ?? '') !== (before[s.id] ?? ''));
      if (moved.some((s) => s.id === selectedId)) await loadRows(selectedId, { force: true });
      for (const s of moved) if (s.id !== selectedId) delete rowsBySearch[s.id];
      const allDone = watching.every((id) => {
        const s = searches.find((x) => x.id === id);
        return s && (s.last_run_at ?? '') !== (before[id] ?? '');
      });
      if (allDone || Date.now() > deadline) {
        clearInterval(sweepTimer);
        sweepTimer = null;
        sweeping = false;
      }
    }, 15000);
  }
</script>

<header class="topbar">
  <h1>Marketplace&nbsp;Hunter</h1>
  {#if stats}
    <p class="stats mono">
      {stats.listings} listings · {stats.live} live · {stats.sold} sold ·
      {stats.sellers} sellers · {stats.searches} searches
    </p>
  {/if}
</header>

{#if error}
  <div class="banner" role="alert">
    <span>{error}</span>
    <button type="button" class="quiet" onclick={() => (error = null)}>Dismiss</button>
  </div>
{/if}

<div class="shell">
  <aside>
    <SearchList
      {searches}
      {counts}
      {selectedId}
      draftingNew={!!pendingNew}
      dirty={selectedId != null && dirtyIds.has(selectedId)}
      bind:deletingId
      onselect={select}
      onnew={startNew}
      ondelete={remove}
    />
  </aside>

  <main>
    {#if !booted}
      <p class="placeholder">Loading…</p>
    {:else if !draft}
      <p class="placeholder">
        {searches.length ? 'Pick a search on the left.' : 'No searches yet — create one to begin.'}
      </p>
    {:else}
      {#if !pendingNew}
        <RunControls
          search={selected}
          {running}
          {runResult}
          {runError}
          {sweeping}
          onrun={run}
          onsweep={sweep}
        />
      {/if}

      <FilterEditor
        {draft}
        {countries}
        {changed}
        {saving}
        isNew={!!pendingNew}
        onsave={save}
        onrevert={revert}
        oncancel={cancelNew}
      />

      {#if !pendingNew}
        <ViewFilters
          bind:view
          shown={visible.length}
          total={rows?.length ?? 0}
          kind={draft.kind}
        />

        {#if loadingRows && !rows}
          <p class="placeholder">Loading listings…</p>
        {:else if !rows?.length}
          <p class="placeholder">Nothing matched yet. Press <b>Run now</b> to sweep the marketplaces.</p>
        {:else if !visible.length}
          <p class="placeholder">Every one of the {rows.length} matches is hidden by the view filters.</p>
        {:else}
          <ResultsTable rows={visible} search={selected} />
        {/if}
      {/if}
    {/if}
  </main>
</div>

<style>
  .topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 16px;
    padding: 14px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  h1 { font-size: 17px; margin: 0; letter-spacing: -0.015em; }
  .stats { margin: 0; margin-left: auto; font-size: 12px; color: var(--muted); }

  .banner {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 12px 20px 0;
    padding: 9px 13px;
    border-radius: var(--radius);
    background: var(--bad-wash);
    border: 1px solid var(--bad);
    color: var(--ink);
    font-size: 13px;
  }
  .banner span { flex: 1; }

  .shell {
    display: grid;
    grid-template-columns: minmax(230px, 290px) minmax(0, 1fr);
    gap: 16px;
    max-width: 1440px;
    margin: 0 auto;
    padding: 16px 20px 40px;
    align-items: start;
  }

  aside { position: sticky; top: 14px; min-width: 0; }

  main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

  .placeholder {
    margin: 0;
    padding: 36px 20px;
    text-align: center;
    color: var(--muted);
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
  }

  @media (max-width: 960px) {
    .shell { grid-template-columns: minmax(0, 1fr); padding: 12px 14px 32px; }
    aside { position: static; }
    .banner { margin: 10px 14px 0; }
  }

  @media (max-width: 480px) {
    .topbar { padding: 12px 14px; }
    .stats { margin-left: 0; }
    .shell { padding: 10px 12px 28px; gap: 12px; }
  }
</style>
