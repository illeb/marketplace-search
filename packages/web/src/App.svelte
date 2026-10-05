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
      // Appiccicata e più alta della finestra, la colonna non si può raggiungere
      // in fondo: la pagina scorre il contenuto centrale, non lei. Con i pannelli
      // aperti sotto le ricerche succedeva, e il pannello restava fuori schermo.
      maxHeight: { default: 'calc(100vh - 28px)', '@media (max-width: 960px)': 'none' },
      overflowY: { default: 'auto', '@media (max-width: 960px)': 'visible' },
      // lo spazio per la barra di scorrimento, così il bordo dei riquadri non si taglia
      paddingInlineEnd: { default: 2, '@media (max-width: 960px)': 0 },
    },
    build: { margin: 0, fontSize: 11, color: t.faint, cursor: 'help' },
    main: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    histPanel: { marginBlockStart: 10, paddingBlock: 8, paddingInline: 10 },
    histEmpty: { margin: 0 },
    histList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 },
    histRow: { display: 'flex', alignItems: 'baseline', gap: 7, fontSize: 12 },
    histWhen: { flexGrow: 0, flexShrink: 0, fontSize: 11, color: t.faint },
    histWhat: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    histTrigger: { marginInlineStart: 5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.faint },
    histOut: { flexGrow: 0, flexShrink: 0, fontSize: 11, color: t.muted },
    histBad: { color: t.bad },
    favBar: { paddingBlock: 13, paddingInline: 15 },
    favTitle: { margin: 0, fontSize: 16, letterSpacing: '-0.01em' },
    favHint: { marginBlockStart: 3, marginBlockEnd: 0, maxWidth: '70ch' },
    previewNote: {
      margin: 0,
      paddingBlock: 8,
      paddingInline: 12,
      borderRadius: t.radiusSm,
      backgroundColor: t.accentWash,
      color: t.accentInk,
      fontSize: 13,
    },
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
  import { toDraft, newDraft, changedFields, SEARCH_FIELDS, toInput } from './lib/search.js';
  import { isNew, specsStated, hoursSinceAdded, dateTime, duration } from './lib/format.js';
  import { registerTools } from './lib/webmcp.js';

  import SearchList from './components/SearchList.svelte';
  import FilterEditor from './components/FilterEditor.svelte';
  import ResultsTable from './components/ResultsTable.svelte';
  import ViewFilters from './components/ViewFilters.svelte';
  import RunControls from './components/RunControls.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';

  /* ---- server state ----------------------------------------------------- */
  let searches = $state([]);
  let countries = $state([]);
  let stats = $state(null);
  let rowsBySearch = $state({});        // search id -> listing rows, as fetched
  let mode = $state('search');          // 'search' | 'favourites'
  let favRows = $state(null);
  let previewRows = $state(null);       // what the unsaved filters would match
  let previewing = $state(false);
  let progress = $state([]);            // scansioni in corso, dal server
  let history = $state(null);           // storico, caricato su richiesta
  let showHistory = $state(false);
  let version = $state(null);           // da quale commit gira il server
  let settings = $state(null);          // impostazioni generali, dal server
  let showSettings = $state(false);
  let savingSettings = $state(false);
  let settingsError = $state(null);
  let settingsSavedAt = $state(null);
  let booted = $state(false);
  let error = $state(null);

  /* ---- editing ---------------------------------------------------------- */
  let selectedId = $state(null);
  let drafts = $state({});              // search id -> working copy
  let pendingNew = $state(null);        // the not-yet-created search, or null
  let saving = $state(false);
  let deletingId = $state(null);

  /* ---- running ----------------------------------------------------------
   * Quale ricerca sta girando, non "sta girando qualcosa": con un booleano solo
   * il pulsante restava disabilitato anche passando a un'altra ricerca, e
   * sembrava che la scansione le stesse prendendo tutte. Anche l'esito è per
   * ricerca, o tornando indietro si leggerebbe il risultato di un'altra.
   * ------------------------------------------------------------------------ */
  let runningId = $state(null);
  let runOutcome = $state({});          // search id -> { result } | { error }
  let sweeping = $state(false);
  let loadingRows = $state(false);

  /* ---- the view lens ---------------------------------------------------- */
  let view = $state({
    newOnly: false, specsOnly: false, shipsOnly: false, hideSold: true,
    maxPrice: null, addedWithin: 0,
  });

  const selected = $derived(searches.find((s) => s.id === selectedId) ?? null);
  const selectedProgress = $derived(progress.find((p) => p.searchId === selectedId) ?? null);
  const running = $derived(runningId != null && runningId === selectedId);
  const runResult = $derived(runOutcome[selectedId]?.result ?? null);
  const runError = $derived(runOutcome[selectedId]?.error ?? null);
  // Una scansione a mano per volta: il nome serve a dire quale, invece di
  // lasciare un pulsante spento senza spiegazione.
  const runningElsewhere = $derived(
    runningId != null && runningId !== selectedId
      ? (searches.find((x) => x.id === runningId)?.name ?? 'un\'altra ricerca')
      : null,
  );

  const sweepLabel = $derived.by(() => {
    const m = settings?.sweepMinutes;
    if (m == null) return null;
    if (m === 0) return 'che però è spenta';
    if (m < 60) return `ogni ${m} minuti`;
    if (m === 60) return 'ogni ora';
    if (m % 60 === 0) return m === 1440 ? 'una volta al giorno' : `ogni ${m / 60} ore`;
    return `ogni ${m} minuti`;
  });
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

  // An edited filter shows its effect straight away; Save only decides what the
  // scheduled sweeps will use from then on.
  const rows = $derived(
    mode === 'favourites' ? favRows : (previewRows ?? rowsBySearch[selectedId] ?? null),
  );
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
      if (view.addedWithin) {
        const h = hoursSinceAdded(r);
        if (h == null || h > view.addedWithin) return false;
      }
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
    mode = 'search';
    selectedId = id;
    pendingNew = null;
    deletingId = null;
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

  let previewTimer = null;
  let previewSeq = 0;
  $effect(() => {
    const d = draft;
    const id = selectedId;
    const isDirty = changed.length > 0;
    // reading every field here is what makes the effect track them
    const input = d && !pendingNew ? toInput(d, SEARCH_FIELDS) : null;

    clearTimeout(previewTimer);
    if (!input || !id || !isDirty || mode === 'favourites') {
      previewRows = null;
      previewing = false;
      return;
    }
    const mine = ++previewSeq;
    previewing = true;
    previewTimer = setTimeout(async () => {
      try {
        const r = await api.preview(id, input);
        if (mine === previewSeq) previewRows = r;
      } catch {
        if (mine === previewSeq) previewRows = null;   // fall back to the saved list
      } finally {
        if (mine === previewSeq) previewing = false;
      }
    }, 320);
  });

  // Una scansione dura minuti: il server dice a che punto è, e si smette di
  // chiedere appena non c'è più niente in corso.
  let progressTimer = null;
  function watchProgress() {
    clearInterval(progressTimer);
    progressTimer = setInterval(async () => {
      try {
        progress = await api.runProgress();
        if (!progress.length && runningId == null && !sweeping) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      } catch { /* una lettura persa non merita un banner */ }
    }, 1500);
  }

  async function loadHistory() {
    try { history = await api.runHistory(40); }
    catch (e) { error = `Storico non caricato: ${e.message}`; }
  }

  function toggleHistory() {
    showHistory = !showHistory;
    if (showHistory && !history) loadHistory();
  }

  async function loadSettings() {
    try { settings = await api.settings(); }
    catch (e) { settingsError = `Impostazioni non caricate: ${e.message}`; }
  }

  function toggleSettings() {
    showSettings = !showSettings;
    if (showSettings && !settings) loadSettings();
  }

  async function saveSettings(sweepMinutes) {
    savingSettings = true;
    settingsError = null;
    try {
      settings = await api.updateSettings(sweepMinutes);
      settingsSavedAt = Date.now();
    } catch (e) {
      settingsError = e.message;
    } finally {
      savingSettings = false;
    }
  }

  async function loadFavourites() {
    try { favRows = await api.favourites(); }
    catch (e) { error = `Could not load saved adverts: ${e.message}`; }
  }

  function showFavourites() {
    mode = 'favourites';
    deletingId = null;
    favRows = null;
    loadFavourites();
  }

  async function toggleFavourite(row) {
    const next = !row.isFavourite;
    try {
      await api.setFavourite(row.id, next);
      const flip = (list) => list?.map((r) => (r.id === row.id ? { ...r, isFavourite: next } : r));
      for (const k of Object.keys(rowsBySearch)) rowsBySearch[k] = flip(rowsBySearch[k]);
      if (previewRows) previewRows = flip(previewRows);
      if (mode === 'favourites') favRows = next ? flip(favRows) : favRows.filter((r) => r.id !== row.id);
      else if (favRows) favRows = null;   // stale, reload on next visit
    } catch (e) {
      error = `Could not save that advert: ${e.message}`;
    }
  }

  async function boot() {
    try {
      const [s, c] = await Promise.all([api.searches(), api.countries()]);
      searches = s;
      countries = c;
      booted = true;
      if (s.length) select(s[0].id);
      refreshStats();
      // serve anche a chiuso: la spiegazione di "Scansiona tutti" dice a che ritmo
      loadSettings();
      api.version().then((v) => (version = v)).catch(() => {});
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
    if (!selected || runningId != null) return;
    const id = selected.id;
    runningId = id;
    runOutcome = { ...runOutcome, [id]: {} };
    progress = [];
    watchProgress();
    try {
      const result = await api.runSearch(id);
      runOutcome = { ...runOutcome, [id]: { result } };
      history = null;
      await Promise.all([loadRows(id, { force: true }), refreshSearches(), refreshStats()]);
    } catch (e) {
      runOutcome = { ...runOutcome, [id]: { error: e.message } };
    } finally {
      runningId = null;
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
    watchProgress();
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
      {stats.listings} annunci · {stats.live} attivi · {stats.sold} venduti ·
      {stats.sellers} venditori · {stats.searches} ricerche
    </p>
  {/if}
  {#if version}
    <p
      {...stylex.attrs(ui.mono, s.build)}
      title={version.sha
        ? `commit ${version.sha}${version.builtAt ? ` · immagine costruita il ${dateTime(version.builtAt)}` : ''}`
        : 'nessuna versione impressa: si sta girando da sorgente, non da immagine'}
    >
      {version.sha ? version.sha.slice(0, 7) : 'sviluppo'}
    </p>
  {/if}
</header>

{#if error}
  <div role="alert" {...stylex.attrs(s.banner)}>
    <span {...stylex.attrs(s.bannerText)}>{error}</span>
    <button type="button" onclick={() => (error = null)}
      {...stylex.attrs(ui.button, ui.quiet)}>Chiudi</button>
  </div>
{/if}

<div {...stylex.attrs(s.shell)}>
  <aside {...stylex.attrs(s.aside)}>
    <SearchList
      {searches}
      {counts}
      {selectedId}
      {sweeping}
      favouritesActive={mode === 'favourites'}
      draftingNew={!!pendingNew}
      dirty={selectedId != null && dirtyIds.has(selectedId)}
      bind:deletingId
      onselect={select}
      onnew={startNew}
      ondelete={remove}
      onsweep={sweep}
      onfavourites={showFavourites}
      {showHistory}
      onhistory={toggleHistory}
      {showSettings}
      onsettings={toggleSettings}
      {sweepLabel}
    />

    {#if showSettings}
      <SettingsPanel
        {settings}
        saving={savingSettings}
        error={settingsError}
        savedAt={settingsSavedAt}
        onsave={saveSettings}
      />
    {/if}

    {#if showHistory}
      <div {...stylex.attrs(ui.panel, s.histPanel)}>
        {#if !history}
          <p {...stylex.attrs(ui.hint, s.histEmpty)}>Carico…</p>
        {:else if !history.length}
          <p {...stylex.attrs(ui.hint, s.histEmpty)}>
            Ancora nessuna scansione registrata. Lo storico parte da questa versione: le
            scansioni fatte prima non sono state annotate da nessuna parte.
          </p>
        {:else}
          <ul {...stylex.attrs(s.histList)}>
            {#each history as h (h.id)}
              <li {...stylex.attrs(s.histRow)}>
                <span {...stylex.attrs(ui.mono, s.histWhen)}>{dateTime(h.startedAt)}</span>
                <span {...stylex.attrs(s.histWhat)}>
                  {h.searchName ?? 'ricerca rimossa'}
                  <span {...stylex.attrs(s.histTrigger)}>
                    {h.trigger === 'schedule' ? 'automatica' : h.trigger === 'sweep' ? 'tutte' : 'manuale'}
                  </span>
                </span>
                <span {...stylex.attrs(ui.mono, s.histOut)}>
                  {#if h.error}
                    <span {...stylex.attrs(s.histBad)}>errore</span>
                  {:else if !h.finishedAt}
                    in corso
                  {:else}
                    {h.matched ?? 0} · {duration(h.startedAt, h.finishedAt)}
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </aside>

  <main {...stylex.attrs(s.main)}>
    {#if mode === 'favourites'}
      <div {...stylex.attrs(ui.panel, s.favBar)}>
        <h2 {...stylex.attrs(s.favTitle)}>Annunci preferiti</h2>
        <p {...stylex.attrs(ui.hint, s.favHint)}>
          Tenuti da parte a mano, indipendenti da qualsiasi ricerca. Restano qui anche se
          cancelli la ricerca che li ha trovati o se l'annuncio sparisce. La stella su una
          riga li toglie.
        </p>
      </div>
      {#if !favRows}
        <p {...stylex.attrs(s.placeholder)}>Carico…</p>
      {:else if !favRows.length}
        <p {...stylex.attrs(s.placeholder)}>
          Ancora niente. Premi la stella su un annuncio per tenerlo qui.
        </p>
      {:else}
        <ViewFilters bind:view shown={visible.length} total={favRows.length} kind={null} />
        <ResultsTable rows={visible} search={null} onfavourite={toggleFavourite} />
      {/if}
    {:else if !booted}
      <p {...stylex.attrs(s.placeholder)}>Carico…</p>
    {:else if !draft}
      <p {...stylex.attrs(s.placeholder)}>
        {searches.length ? 'Scegli una ricerca a sinistra.' : 'Nessuna ricerca: creane una per iniziare.'}
      </p>
    {:else}
      {#if !pendingNew}
        <RunControls
          search={selected}
          {running}
          {runningElsewhere}
          {runResult}
          {runError}
          progress={selectedProgress}
          onrun={run}
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
          <p {...stylex.attrs(s.placeholder)}>Carico gli annunci…</p>
        {:else if !rows?.length}
          <p {...stylex.attrs(s.placeholder)}>Ancora nessuna corrispondenza. Premi <b>Scansiona questa ricerca</b>.</p>
        {:else if !visible.length}
          <p {...stylex.attrs(s.placeholder)}>Tutte le {rows.length} corrispondenze sono nascoste dai filtri di vista.</p>
        {:else}
          {#if previewRows}
            <p {...stylex.attrs(s.previewNote)}>
              Stai vedendo cosa troverebbero i filtri aperti. <b>Salva</b> per usarli anche
              nelle scansioni automatiche.
            </p>
          {/if}
          <ResultsTable rows={visible} search={selected} onfavourite={toggleFavourite} />
        {/if}
      {/if}
    {/if}
  </main>
</div>
