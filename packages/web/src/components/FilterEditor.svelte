<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const s = stylex.create({
    editor: { paddingBlock: { default: 14, '@media (max-width: 620px)': 12 },
              paddingBlockEnd: { default: 16, '@media (max-width: 620px)': 12 },
              paddingInline: { default: 16, '@media (max-width: 620px)': 12 } },
    bar: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 9,
      paddingBlockEnd: 12,
      marginBlockEnd: 4,
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: t.line,
    },
    barBare: { borderBottomWidth: 0, paddingBlockEnd: 0, marginBlockEnd: 0 },
    h2: { margin: 0, fontSize: 15 },
    state: { flexGrow: 1, fontSize: 12, fontWeight: 600, color: t.muted },
    stateUnsaved: { color: t.warn },
    fold: { fontSize: 12, paddingBlock: 5, paddingInline: 9 },
    folded: { display: 'none' },
    grid: {
      display: 'grid',
      gridTemplateColumns: {
        default: 'repeat(auto-fit, minmax(190px, 1fr))',
        '@media (max-width: 620px)': '1fr',
      },
      rowGap: 12,
      columnGap: 14,
      alignItems: 'start',
      marginBlockStart: 12,
    },
    span2: { gridColumn: { default: 'span 2', '@media (max-width: 620px)': 'auto' } },
    fieldset: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: t.radius,
      paddingBlock: 4,
      paddingBlockEnd: 14,
      paddingInline: 13,
      marginBlock: 16, marginBlockEnd: 0,
      marginInline: 0,
      minWidth: 0,
    },
    legend: {
      fontSize: 11,
      fontWeight: 700,
      color: t.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      paddingInline: 6,
    },
    // `.field.changed > .label` cannot be expressed without a descendant
    // selector, so the flag is handed to the label itself.
    labelChanged: { color: t.warn, '::after': { content: '" •"', color: t.warn } },
    checkrow: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 },
    warnHint: { color: t.warn },
  });
</script>

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
  const changedLabel = (...fs) => fs.some((f) => marks.has(f)) && s.labelChanged;

  const ENABLED = [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Paused' },
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

<section aria-label="Search filters" {...stylex.attrs(ui.panel, s.editor)}>
  <header {...stylex.attrs(s.bar, !open && s.barBare)}>
    <h2 {...stylex.attrs(s.h2)}>{isNew ? 'New search' : 'Filters'}</h2>
    <span {...stylex.attrs(s.state, (dirty || isNew) && s.stateUnsaved)}>
      {#if isNew}
        not created yet
      {:else if dirty}
        {changed.length} unsaved change{changed.length === 1 ? '' : 's'}
      {:else}
        all changes saved
      {/if}
    </span>
    {#if !isNew}
      <button type="button" aria-expanded={open} onclick={toggle} {...stylex.attrs(ui.button, ui.quiet, s.fold)}>
        {open ? 'Hide' : 'Show'} filters
      </button>
    {/if}
    {#if isNew}
      <button type="button"  disabled={saving} onclick={onsave} {...stylex.attrs(ui.button, ui.primary)}>
        {saving ? 'Creating…' : 'Create search'}
      </button>
      <button type="button" onclick={oncancel} disabled={saving} {...stylex.attrs(ui.button, ui.buttonHover)}>Cancel</button>
    {:else}
      <button type="button"  disabled={!dirty || saving} onclick={onsave} {...stylex.attrs(ui.button, ui.primary)}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" disabled={!dirty || saving} onclick={onrevert} {...stylex.attrs(ui.button, ui.buttonHover)}>Revert</button>
    {/if}
  </header>

  <div {...stylex.attrs(!open && s.folded)}>
  <div {...stylex.attrs(s.grid)}>
    <label {...stylex.attrs(ui.field, s.span2)}>
      <span {...stylex.attrs(ui.label, changedLabel('name'))}>Name</span>
      <input type="text" bind:value={draft.name} placeholder="what this search is for" {...stylex.attrs(ui.input)} />
    </label>

    <label {...stylex.attrs(ui.field, s.span2)}>
      <span {...stylex.attrs(ui.label, changedLabel('query'))}>Search terms</span>
      <input type="text" bind:value={draft.query} placeholder="optiplex micro, thinkcentre tiny" {...stylex.attrs(ui.input)} />
      <span {...stylex.attrs(ui.hint)}>comma separated — every term is swept on each run</span>
    </label>

    <div {...stylex.attrs(ui.field)}>
      <span {...stylex.attrs(ui.label, changedLabel('kind'))}>Looking for</span>
      <Segmented options={KINDS} bind:value={draft.kind} label="Looking for" />
    </div>

    <div {...stylex.attrs(ui.field)}>
      <span {...stylex.attrs(ui.label, changedLabel('enabled'))}>Sweeps</span>
      <Segmented options={ENABLED} bind:value={draft.enabled} label="Enabled" />
      <span {...stylex.attrs(ui.hint)}>paused searches are skipped by “Sweep all”</span>
    </div>

    <label {...stylex.attrs(ui.field)}>
      <span {...stylex.attrs(ui.label, changedLabel('minPrice'))}>Min price €</span>
      <input type="number" min="0" step="5" bind:value={draft.minPrice} {...stylex.attrs(ui.input)} />
    </label>

    <label {...stylex.attrs(ui.field)}>
      <span {...stylex.attrs(ui.label, changedLabel('maxPrice'))}>Max price €</span>
      <input type="number" min="0" step="10" bind:value={draft.maxPrice} {...stylex.attrs(ui.input)} />
    </label>

    <div {...stylex.attrs(ui.field, s.span2)}>
      <span {...stylex.attrs(ui.label, changedLabel('sources'))}>Sources</span>
      <ChipSelect options={SOURCES} bind:value={draft.sources} emptyLabel="none picked — this search will find nothing" />
    </div>

    <label {...stylex.attrs(ui.field)}>
      <span {...stylex.attrs(ui.label, changedLabel('minReviews'))}>Min seller reviews</span>
      <input type="number" min="0" step="1" bind:value={draft.minReviews} {...stylex.attrs(ui.input)} />
      <span {...stylex.attrs(ui.hint)}>0 keeps sellers with no history</span>
    </label>
  </div>

  <fieldset {...stylex.attrs(s.fieldset)}>
    <legend {...stylex.attrs(s.legend)}>Where</legend>
    <div {...stylex.attrs(s.grid)}>
      <div {...stylex.attrs(ui.field, s.span2)}>
        <span {...stylex.attrs(ui.label, changedLabel('place', 'lat'))}>Near</span>
        <PlaceField bind:place={draft.place} bind:lat={draft.lat} bind:lon={draft.lon} />
      </div>

      <label {...stylex.attrs(ui.field)}>
        <span {...stylex.attrs(ui.label, changedLabel('radiusKm'))}>Radius</span>
        <select bind:value={draft.radiusKm} {...stylex.attrs(ui.input)}>
          {#each RADII as km (km)}
            <option value={km}>{km === 0 ? 'No distance limit' : `${km} km`}</option>
          {/each}
        </select>
        {#if draft.radiusKm > 0 && draft.lat == null}
          <span {...stylex.attrs(ui.hint, s.warnHint)}>a radius needs a town picked from the list above</span>
        {/if}
      </label>

      {#if draft.radiusKm > 0}
        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('includeUnlocated'))}>Adverts with no location</span>
          <span {...stylex.attrs(s.checkrow)}>
            <input
              type="checkbox"
              checked={draft.includeUnlocated}
              onchange={(e) => (draft.includeUnlocated = e.currentTarget.checked)}
            />
            <span>Keep them anyway</span>
          </span>
          <span {...stylex.attrs(ui.hint)}>
            Vinted adverts almost never state a location. Untick this and a {draft.radiusKm} km
            radius will drop nearly every Vinted result along with the genuinely distant ones.
          </span>
        </label>
      {/if}

      <div {...stylex.attrs(ui.field)} style="grid-column: 1 / -1">
        <span {...stylex.attrs(ui.label, changedLabel('chassis'))}>Countries</span>
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

  {#if draft.kind === 'COMPUTER'}
    <fieldset {...stylex.attrs(s.fieldset)}>
      <legend {...stylex.attrs(s.legend)}>Machine</legend>
      <div {...stylex.attrs(s.grid)}>
        <div {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('vendor'))}>Size</span>
          <ChipSelect options={CHASSIS} bind:value={draft.chassis} emptyLabel="any size, stated or not" />
        </div>

        <div {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('brands'))}>Processor vendor</span>
          <Segmented options={VENDORS} bind:value={draft.vendor} label="Processor vendor" />
        </div>

        <div {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('cpuTiers'))}>Brands</span>
          <ChipSelect options={BRANDS} bind:value={draft.brands} emptyLabel="any brand" />
        </div>

        <div {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('minGen'))}>Processor tier</span>
          <ChipSelect options={CPU_TIERS} bind:value={draft.cpuTiers} emptyLabel="any processor" />
        </div>

        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('minYear'))}>Min Intel generation</span>
          <input type="number" min="0" max="20" step="1" bind:value={draft.minGen} {...stylex.attrs(ui.input)} />
          <span {...stylex.attrs(ui.hint)}>0 = any. AMD machines carry no generation.</span>
        </label>

        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('minRam'))}>Min launch year</span>
          <input type="number" min="0" max="2035" step="1" bind:value={draft.minYear} {...stylex.attrs(ui.input)} />
          <span {...stylex.attrs(ui.hint)}>0 = any. Holds Intel and Ryzen to one rule.</span>
        </label>

        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('minStorage'))}>Min memory GB</span>
          <input type="number" min="0" step="4" bind:value={draft.minRam} {...stylex.attrs(ui.input)} />
          <span {...stylex.attrs(ui.hint)}>above 0, adverts that never stated memory are dropped</span>
        </label>

        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label, changedLabel('minRam'))}>Min storage GB</span>
          <input type="number" min="0" step="64" bind:value={draft.minStorage} {...stylex.attrs(ui.input)} />
          <span {...stylex.attrs(ui.hint)}>any drive type, not only SSD</span>
        </label>
      </div>
    </fieldset>
  {:else if draft.kind === 'MEMORY'}
    <fieldset {...stylex.attrs(s.fieldset)}>
      <legend {...stylex.attrs(s.legend)}>Memory</legend>
      <div {...stylex.attrs(s.grid)}>
        <label {...stylex.attrs(ui.field)}>
          <span {...stylex.attrs(ui.label)}>Min kit size GB</span>
          <input type="number" min="0" step="4" bind:value={draft.minRam} {...stylex.attrs(ui.input)} />
          <span {...stylex.attrs(ui.hint)}>the total across every stick in the kit</span>
        </label>
      </div>
    </fieldset>
  {/if}
  </div>
</section>
