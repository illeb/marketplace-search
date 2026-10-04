<script>
  import ChipSelect from './ChipSelect.svelte';
  import Segmented from './Segmented.svelte';
  import PlaceField from './PlaceField.svelte';
  import {
    SOURCES, KINDS, CHASSIS, BRANDS, CPU_TIERS, VENDORS, RADII,
  } from '../lib/search.js';

  let {
    draft,
    countries = [],
    changed = [],
    isNew = false,
    saving = false,
    onsave,
    onrevert,
    oncancel,
  } = $props();

  const countryOptions = $derived(countries.map((c) => ({ value: c.code, label: c.name })));
  const dirty = $derived(changed.length > 0);
  const marks = $derived(new Set(changed));
  const mark = (f) => (marks.has(f) ? 'changed' : '');

  const ENABLED = [
    { value: 1, label: 'Enabled' },
    { value: 0, label: 'Paused' },
  ];

  // Filters are read far less often than results, so the panel folds away. The
  // choice is a per-browser convenience; storage can be unavailable, and the
  // panel simply starts open when it is.
  const STORE_KEY = 'mh.filters.collapsed';
  const read = () => {
    try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
  };
  let collapsed = $state(read());
  const open = $derived(isNew || !collapsed);
  function toggle() {
    collapsed = !collapsed;
    try { localStorage.setItem(STORE_KEY, collapsed ? '1' : '0'); } catch { /* private window */ }
  }
</script>

<section class="editor" aria-label="Search filters">
  <header class="bar" class:bare={!open}>
    <h2>{isNew ? 'New search' : 'Filters'}</h2>
    <span class="state" class:unsaved={dirty || isNew}>
      {#if isNew}
        not created yet
      {:else if dirty}
        {changed.length} unsaved change{changed.length === 1 ? '' : 's'}
      {:else}
        all changes saved
      {/if}
    </span>
    {#if !isNew}
      <button type="button" class="quiet fold" aria-expanded={open} onclick={toggle}>
        {open ? 'Hide' : 'Show'} filters
      </button>
    {/if}
    {#if isNew}
      <button type="button" class="primary" disabled={saving} onclick={onsave}>
        {saving ? 'Creating…' : 'Create search'}
      </button>
      <button type="button" onclick={oncancel} disabled={saving}>Cancel</button>
    {:else}
      <button type="button" class="primary" disabled={!dirty || saving} onclick={onsave}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" disabled={!dirty || saving} onclick={onrevert}>Revert</button>
    {/if}
  </header>

  <div class="body" class:folded={!open}>
  <div class="grid">
    <label class="field {mark('name')}" style="grid-column: span 2">
      <span class="label">Name</span>
      <input type="text" bind:value={draft.name} placeholder="what this search is for" />
    </label>

    <label class="field {mark('query')}" style="grid-column: span 2">
      <span class="label">Search terms</span>
      <input type="text" bind:value={draft.query} placeholder="optiplex micro, thinkcentre tiny" />
      <span class="hint">comma separated — every term is swept on each run</span>
    </label>

    <div class="field {mark('kind')}">
      <span class="label">Looking for</span>
      <Segmented options={KINDS} bind:value={draft.kind} label="Looking for" />
    </div>

    <div class="field {mark('enabled')}">
      <span class="label">Sweeps</span>
      <Segmented options={ENABLED} bind:value={draft.enabled} label="Enabled" />
      <span class="hint">paused searches are skipped by “Sweep all”</span>
    </div>

    <label class="field {mark('min_price')}">
      <span class="label">Min price €</span>
      <input type="number" min="0" step="5" bind:value={draft.min_price} />
    </label>

    <label class="field {mark('max_price')}">
      <span class="label">Max price €</span>
      <input type="number" min="0" step="10" bind:value={draft.max_price} />
    </label>

    <div class="field {mark('sources')}" style="grid-column: span 2">
      <span class="label">Sources</span>
      <ChipSelect options={SOURCES} bind:value={draft.sources} emptyLabel="none picked — this search will find nothing" />
    </div>

    <label class="field {mark('min_reviews')}">
      <span class="label">Min seller reviews</span>
      <input type="number" min="0" step="1" bind:value={draft.min_reviews} />
      <span class="hint">0 keeps sellers with no history</span>
    </label>
  </div>

  <fieldset>
    <legend>Where</legend>
    <div class="grid">
      <div class="field {mark('place')} {mark('lat')}" style="grid-column: span 2">
        <span class="label">Near</span>
        <PlaceField bind:place={draft.place} bind:lat={draft.lat} bind:lon={draft.lon} />
      </div>

      <label class="field {mark('radius_km')}">
        <span class="label">Radius</span>
        <select bind:value={draft.radius_km}>
          {#each RADII as km (km)}
            <option value={km}>{km === 0 ? 'No distance limit' : `${km} km`}</option>
          {/each}
        </select>
        {#if draft.radius_km > 0 && draft.lat == null}
          <span class="hint warn-hint">a radius needs a town picked from the list above</span>
        {/if}
      </label>

      {#if draft.radius_km > 0}
        <label class="field check {mark('include_unlocated')}">
          <span class="label">Adverts with no location</span>
          <span class="checkrow">
            <input
              type="checkbox"
              checked={!!draft.include_unlocated}
              onchange={(e) => (draft.include_unlocated = e.currentTarget.checked ? 1 : 0)}
            />
            <span>Keep them anyway</span>
          </span>
          <span class="hint">
            Vinted adverts almost never state a location. Untick this and a {draft.radius_km} km
            radius will drop nearly every Vinted result along with the genuinely distant ones.
          </span>
        </label>
      {/if}

      <div class="field {mark('countries')}" style="grid-column: 1 / -1">
        <span class="label">Countries</span>
        <ChipSelect
          options={countryOptions}
          bind:value={draft.countries}
          filterable
          filterPlaceholder="filter countries…"
          emptyLabel="none picked — all of Europe is searched"
        />
      </div>
    </div>
  </fieldset>

  {#if draft.kind === 'computer'}
    <fieldset>
      <legend>Machine</legend>
      <div class="grid">
        <div class="field {mark('chassis')}">
          <span class="label">Size</span>
          <ChipSelect options={CHASSIS} bind:value={draft.chassis} emptyLabel="any size, stated or not" />
        </div>

        <div class="field {mark('vendor')}">
          <span class="label">Processor vendor</span>
          <Segmented options={VENDORS} bind:value={draft.vendor} label="Processor vendor" />
        </div>

        <div class="field {mark('brands')}">
          <span class="label">Brands</span>
          <ChipSelect options={BRANDS} bind:value={draft.brands} emptyLabel="any brand" />
        </div>

        <div class="field {mark('cpu_tiers')}">
          <span class="label">Processor tier</span>
          <ChipSelect options={CPU_TIERS} bind:value={draft.cpu_tiers} emptyLabel="any processor" />
        </div>

        <label class="field {mark('min_gen')}">
          <span class="label">Min Intel generation</span>
          <input type="number" min="0" max="20" step="1" bind:value={draft.min_gen} />
          <span class="hint">0 = any. AMD machines carry no generation.</span>
        </label>

        <label class="field {mark('min_year')}">
          <span class="label">Min launch year</span>
          <input type="number" min="0" max="2035" step="1" bind:value={draft.min_year} />
          <span class="hint">0 = any. Holds Intel and Ryzen to one rule.</span>
        </label>

        <label class="field {mark('min_ram')}">
          <span class="label">Min memory GB</span>
          <input type="number" min="0" step="4" bind:value={draft.min_ram} />
          <span class="hint">above 0, adverts that never stated memory are dropped</span>
        </label>

        <label class="field {mark('min_storage')}">
          <span class="label">Min storage GB</span>
          <input type="number" min="0" step="64" bind:value={draft.min_storage} />
          <span class="hint">any drive type, not only SSD</span>
        </label>
      </div>
    </fieldset>
  {:else if draft.kind === 'memory'}
    <fieldset>
      <legend>Memory</legend>
      <div class="grid">
        <label class="field {mark('min_ram')}">
          <span class="label">Min kit size GB</span>
          <input type="number" min="0" step="4" bind:value={draft.min_ram} />
          <span class="hint">the total across every stick in the kit</span>
        </label>
      </div>
    </fieldset>
  {/if}
  </div>
</section>

<style>
  .editor {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 14px 16px 16px;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--line);
  }
  h2 { font-size: 15px; margin: 0; }
  .state {
    flex: 1;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .state.unsaved { color: var(--warn); }
  .fold { font-size: 12px; padding: 5px 9px; }

  .body.folded { display: none; }
  .bar.bare { border-bottom: 0; padding-bottom: 0; margin-bottom: 0; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px 14px;
    align-items: start;
    margin-top: 12px;
  }

  fieldset {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 4px 13px 14px;
    margin: 16px 0 0;
    min-width: 0;
  }
  legend {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 6px;
  }

  .field.changed > .label::after {
    content: " •";
    color: var(--warn);
  }
  .field.changed > .label { color: var(--warn); }

  .checkrow { display: flex; align-items: center; gap: 7px; font-size: 13px; }
  .warn-hint { color: var(--warn); }

  @media (max-width: 620px) {
    .grid { grid-template-columns: 1fr; }
    .grid > .field[style] { grid-column: auto !important; }
    .editor { padding: 12px; }
  }
</style>
