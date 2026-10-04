<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const s = stylex.create({
    set: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
    head: { display: 'flex', alignItems: 'center', gap: 6 },
    filter: { paddingBlock: 4, paddingInline: 8, fontSize: 12.5 },
    tiny: { fontSize: 11, paddingBlock: 3, paddingInline: 7, whiteSpace: 'nowrap' },
    chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
    scroll: { maxHeight: 132, overflowY: 'auto', padding: 2 },
    chip: {
      font: 'inherit',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      paddingBlock: 3,
      paddingInline: 9,
      borderRadius: 999,
      cursor: 'pointer',
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
      color: { default: t.muted, ':hover': t.ink },
    },
    on: {
      backgroundColor: t.accent,
      borderColor: t.accent,
      color: { default: t.onAccent, ':hover': t.onAccent },
    },
  });
</script>

<script>
  import { toggleIn } from '../lib/search.js';

  let {
    options,
    value = $bindable([]),
    emptyLabel = 'none picked — all allowed',
    filterable = false,
    filterPlaceholder = 'filter…',
  } = $props();

  let filter = $state('');

  const chosen = $derived(new Set(value ?? []));
  const order = $derived(options.map((o) => o.value));
  const shown = $derived(
    filter.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()))
      : options,
  );

  const toggle = (v) => { value = toggleIn(value ?? [], v, order); };
  const clear = () => { value = []; };
  const all = () => { value = [...order]; };
</script>

<div {...stylex.attrs(s.set)}>
  {#if filterable}
    <div {...stylex.attrs(s.head)}>
      <input
        type="search"
        bind:value={filter}
        placeholder={filterPlaceholder}
        aria-label={filterPlaceholder}
        {...stylex.attrs(ui.input, s.filter)}
      />
      {#if chosen.size}
        <button type="button" onclick={clear} {...stylex.attrs(ui.button, ui.quiet, s.tiny)}>
          clear {chosen.size}
        </button>
      {:else}
        <button type="button" onclick={all} {...stylex.attrs(ui.button, ui.quiet, s.tiny)}>
          pick all
        </button>
      {/if}
    </div>
  {/if}

  <div {...stylex.attrs(s.chips, filterable && s.scroll)}>
    {#each shown as opt (String(opt.value))}
      <button
        type="button"
        aria-pressed={chosen.has(opt.value)}
        onclick={() => toggle(opt.value)}
        {...stylex.attrs(s.chip, chosen.has(opt.value) && s.on)}
      >{opt.label}</button>
    {:else}
      <span {...stylex.attrs(ui.hint)}>nothing matches “{filter}”</span>
    {/each}
  </div>

  {#if !chosen.size}
    <span {...stylex.attrs(ui.hint)}>{emptyLabel}</span>
  {/if}
</div>
