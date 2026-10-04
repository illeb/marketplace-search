<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from './lib/tokens.stylex.js';
  import { ui } from './lib/ui.stylex.js';

  const s = stylex.create({
    topbar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      rowGap: 6,
      columnGap: 16,
      paddingBlock: { default: 14, '@media (max-width: 480px)': 12 },
      paddingInline: { default: 20, '@media (max-width: 480px)': 14 },
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: t.line,
    },
    h1: { margin: 0, fontSize: 17, letterSpacing: '-0.015em' },
    stats: {
      margin: 0,
      marginInlineStart: { default: 'auto', '@media (max-width: 480px)': 0 },
      fontSize: 12,
      color: t.muted,
    },
    banner: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBlockStart: { default: 12, '@media (max-width: 960px)': 10 },
      marginInline: { default: 20, '@media (max-width: 960px)': 14 },
      paddingBlock: 9,
      paddingInline: 13,
      borderRadius: t.radius,
      backgroundColor: t.badWash,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.bad,
      color: t.ink,
      fontSize: 13,
    },
    bannerText: { flexGrow: 1 },
    shell: {
      display: 'grid',
      gridTemplateColumns: {
        default: 'minmax(230px, 290px) minmax(0, 1fr)',
        '@media (max-width: 960px)': 'minmax(0, 1fr)',
      },
      gap: { default: 16, '@media (max-width: 480px)': 12 },
      maxWidth: 1440,
      marginInline: 'auto',
      paddingBlock: { default: 16, '@media (max-width: 480px)': 10 },
      paddingBlockEnd: { default: 40, '@media (max-width: 960px)': 32, '@media (max-width: 480px)': 28 },
      paddingInline: { default: 20, '@media (max-width: 960px)': 14, '@media (max-width: 480px)': 12 },
      alignItems: 'start',
    },
    aside: {
      position: { default: 'sticky', '@media (max-width: 960px)': 'static' },
      top: 14,
      minWidth: 0,
    },
    main: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    placeholder: {
      margin: 0,
      paddingBlock: 36,
      paddingInline: 20,
      textAlign: 'center',
      color: t.muted,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.line,
      borderRadius: t.radius,
    },
  });
</script>

<script>
  import { api } from './lib/gql.js';
  import { toDraft, newDraft, changedFields, SEARCH_FIELDS } from './lib/search.js';
  import { isNew, specsStated } from './lib/format.js';
  import { registerTools } from './lib/webmcp.js';

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
          ? rowsBySearch[s.id].filter((r) => !r.soldAt).length
          : (s.count ?? null),
      ]),
    ),
  );

  const visible = $derived.by(() => {
    const list = rows ?? [];
    return list.filter((r) => {
      if (view.hideSold && r.soldAt) return false;
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

  $effect(() => registerTools({
    searches: async () => (searches.length ? searches : api.searches()),
    listings: async (id) => rowsBySearch[id] ?? (await loadRows(id)) ?? rowsBySearch[id] ?? [],
    select,
    createSearch: async (input) => {
      const created = await api.createSearch(input);
      searches = [...searches, created];
      drafts[created.id] = toDraft(created);
      select(created.id);
      return created;
    },
    updateSearch: async (id, input) => {
      const updated = await api.updateSearch(id, input);
      searches = searches.map((x) => (x.id === updated.id ? updated : x));
      drafts[updated.id] = toDraft(updated);
      return updated;
    },
    deleteSearch: async (id) => {
      const gone = await api.deleteSearch(id);
      if (gone) {
        searches = searches.filter((x) => x.id !== id);
        if (selectedId === id) select(searches[0]?.id ?? null);
      }
      return gone;
    },
    runSearch: async (id) => {
      const r = await api.runSearch(id);
      await Promise.all([loadRows(id, { force: true }), refreshSearches(), refreshStats()]);
      return r;
    },
  }));

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
        // the server re-decided the matches against the new filters
        await Promise.all([loadRows(updated.id, { force: true }), refreshSearches()]);
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
  // lastRunAt move on every enabled search.
  let sweepTimer = null;
  async function sweep() {
    if (sweeping) return;
    error = null;
    const before = Object.fromEntries(searches.map((s) => [s.id, s.lastRunAt ?? '']));
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
      const moved = searches.filter((s) => (s.lastRunAt ?? '') !== (before[s.id] ?? ''));
      if (moved.some((s) => s.id === selectedId)) await loadRows(selectedId, { force: true });
      for (const s of moved) if (s.id !== selectedId) delete rowsBySearch[s.id];
      const allDone = watching.every((id) => {
        const s = searches.find((x) => x.id === id);
        return s && (s.lastRunAt ?? '') !== (before[id] ?? '');
      });
      if (allDone || Date.now() > deadline) {
        clearInterval(sweepTimer);
        sweepTimer = null;
        sweeping = false;
      }
    }, 15000);
  }
</script>

<header {...stylex.attrs(s.topbar)}>
  <h1 {...stylex.attrs(s.h1)}>Marketplace&nbsp;Hunter</h1>
  {#if stats}
    <p {...stylex.attrs(ui.mono, s.stats)}>
      {stats.listings} listings · {stats.live} live · {stats.sold} sold ·
      {stats.sellers} sellers · {stats.searches} searches
    </p>
  {/if}
</header>

{#if error}
  <div role="alert" {...stylex.attrs(s.banner)}>
    <span {...stylex.attrs(s.bannerText)}>{error}</span>
    <button type="button" onclick={() => (error = null)}
      {...stylex.attrs(ui.button, ui.quiet)}>Dismiss</button>
  </div>
{/if}

<div {...stylex.attrs(s.shell)}>
  <aside {...stylex.attrs(s.aside)}>
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

  <main {...stylex.attrs(s.main)}>
    {#if !booted}
      <p {...stylex.attrs(s.placeholder)}>Loading…</p>
    {:else if !draft}
      <p {...stylex.attrs(s.placeholder)}>
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
          <p {...stylex.attrs(s.placeholder)}>Loading listings…</p>
        {:else if !rows?.length}
          <p {...stylex.attrs(s.placeholder)}>Nothing matched yet. Press <b>Run now</b> to sweep the marketplaces.</p>
        {:else if !visible.length}
          <p {...stylex.attrs(s.placeholder)}>Every one of the {rows.length} matches is hidden by the view filters.</p>
        {:else}
          <ResultsTable rows={visible} search={selected} />
        {/if}
      {/if}
    {/if}
  </main>
</div>
