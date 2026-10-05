<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const s = stylex.create({
    bar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      rowGap: 7,
      columnGap: 12,
      paddingBlock: 9,
      paddingInline: 12,
    },
    tag: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: t.faint,
    },
    toggle: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' },
    price: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 },
    priceInput: { width: 82, paddingBlock: 4, paddingInline: 7 },
    windowSelect: { width: 'auto', paddingBlock: 4, paddingInline: 7 },
    count: {
      marginInlineStart: { default: 'auto', '@media (max-width: 520px)': 0 },
      flexBasis: { default: 'auto', '@media (max-width: 520px)': '100%' },
      fontSize: 12,
      fontWeight: 600,
      color: t.muted,
    },
    resetBtn: { fontSize: 12, paddingBlock: 3, paddingInline: 8 },
  });
</script>

<script>
  // Purely a lens over what is already on screen. Nothing here is written back
  // to the saved search, which is why it lives apart from the filter editor.
  let { view = $bindable(), shown, total, kind } = $props();

  // addedWithin: ore. Vale sulla ricerca già fatta, senza rilanciarla.
  const defaults = {
    newOnly: false, specsOnly: false, shipsOnly: false, hideSold: true,
    maxPrice: null, addedWithin: 0,
  };

  const WINDOWS = [
    { value: 0, label: 'sempre' },
    { value: 1, label: "ultima ora" },
    { value: 6, label: 'ultime 6 ore' },
    { value: 24, label: 'ultime 24 ore' },
    { value: 72, label: 'ultimi 3 giorni' },
    { value: 168, label: 'ultima settimana' },
  ];
  const touched = $derived(Object.keys(defaults).some((k) => view[k] !== defaults[k]));
  const reset = () => { view = { ...defaults }; };
</script>

<div {...stylex.attrs(ui.panel, s.bar)}>
  <span {...stylex.attrs(s.tag)}>Vista</span>

  <label {...stylex.attrs(s.toggle)}>
    <input type="checkbox" bind:checked={view.newOnly} />
    <span>Nuovi oggi</span>
  </label>

  {#if kind === 'COMPUTER' || kind === 'MEMORY'}
    <label {...stylex.attrs(s.toggle)}>
      <input type="checkbox" bind:checked={view.specsOnly} />
      <span>Con specifiche</span>
    </label>
  {/if}

  <label {...stylex.attrs(s.toggle)}>
    <input type="checkbox" bind:checked={view.shipsOnly} />
    <span>Spedisce</span>
  </label>

  <label {...stylex.attrs(s.toggle)}>
    <input type="checkbox" bind:checked={view.hideSold} />
    <span>Nascondi venduti</span>
  </label>

  <label {...stylex.attrs(s.price)}>
    <span>Max €</span>
    <input
      type="number"
      min="0"
      step="10"
      placeholder="qualsiasi"
      value={view.maxPrice ?? ''}
      oninput={(e) => (view.maxPrice = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
      {...stylex.attrs(ui.input, s.priceInput)}
    />
  </label>

  <label {...stylex.attrs(s.price)}>
    <span>Aggiunti</span>
    <select
      value={view.addedWithin}
      onchange={(e) => (view.addedWithin = Number(e.currentTarget.value))}
      {...stylex.attrs(ui.input, s.windowSelect)}
    >
      {#each WINDOWS as w (w.value)}<option value={w.value}>{w.label}</option>{/each}
    </select>
  </label>

  {#if touched}
    <button type="button" onclick={reset} {...stylex.attrs(ui.button, ui.quiet, s.resetBtn)}>
      Azzera vista
    </button>
  {/if}

  <span {...stylex.attrs(ui.mono, s.count)}>{shown} di {total} mostrati</span>
</div>
