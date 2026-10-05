<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  // StyleX has no descendant selectors, so what used to be `.item.on .count`
  // becomes a flag handed to the child. Every parent state that used to reach
  // into a child is passed explicitly below.
  const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } });

  const s = stylex.create({
    nav: { display: 'flex', flexDirection: 'column', gap: 10 },
    head: { display: 'flex', alignItems: 'center', gap: 8 },
    h2: {
      flexGrow: 1,
      margin: 0,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: t.muted,
    },
    newBtn: { fontSize: 12.5, paddingBlock: 5, paddingInline: 10, whiteSpace: 'nowrap' },
    ul: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 },

    item: {
      position: 'relative',
      minWidth: 0,
      display: 'flex',
      alignItems: 'stretch',
      flexWrap: 'wrap',
      overflow: 'hidden',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: t.radius,
    },
    itemOn: { borderColor: t.accent, backgroundColor: t.accentWash },
    itemOff: { opacity: 0.68 },
    itemDraft: { borderStyle: 'dashed' },

    pick: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '0%',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      textAlign: 'left',
      font: 'inherit',
      fontSize: 14,
      color: t.ink,
      borderWidth: 0,
      borderRadius: 0,
      cursor: 'pointer',
      paddingBlock: { default: 9, '@media (max-width: 620px)': 7 },
      paddingInlineStart: 11,
      paddingInlineEnd: 4,
      backgroundColor: { default: 'transparent', ':hover': t.surface2 },
    },
    pickOn: { backgroundColor: { default: 'transparent', ':hover': 'transparent' } },

    body: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
    bodyDraft: { paddingBlock: 9, paddingInline: 11 },
    name: { fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
    nameOff: { textDecoration: 'line-through' },
    sub: {
      display: { default: 'block', '@media (max-width: 620px)': 'none' },
      fontSize: 11.5,
      fontWeight: 400,
      color: t.muted,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    dot: { width: 7, height: 7, borderRadius: '50%', backgroundColor: t.warn, flexGrow: 0, flexShrink: 0 },
    count: {
      flexGrow: 0, flexShrink: 0,
      fontSize: 12.5,
      fontWeight: 700,
      color: t.muted,
      paddingBlock: 1,
      paddingInline: 7,
      borderRadius: 999,
      backgroundColor: t.surface2,
    },
    countOn: { backgroundColor: t.surface, color: t.accentInk },

    del: {
      fontSize: 17,
      lineHeight: 1,
      paddingBlock: 0,
      paddingInline: 11,
      borderRadius: 0,
      color: { default: t.faint, ':hover': t.bad },
      backgroundColor: { default: 'transparent', ':hover': t.badWash },
      borderColor: 'transparent',
    },

    confirm: {
      flexGrow: 1, flexShrink: 0, flexBasis: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      paddingBlock: 9,
      paddingInline: 11,
      backgroundColor: t.badWash,
      fontSize: 12,
      color: t.ink,
    },
    confirmText: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
    confirmBtn: { fontSize: 12, paddingBlock: 4, paddingInline: 9 },

    scanAll: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginBlockStart: 2,
    },
    scanNote: { marginBlockStart: 5, marginBlockEnd: 0 },
    favRow: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBlockStart: 10,
      paddingBlock: 9,
      paddingInline: 11,
      textAlign: 'left',
      font: 'inherit',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      backgroundColor: { default: t.surface, ':hover': t.surface2 },
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: t.radius,
      color: t.ink,
    },
    favRowOn: {
      borderColor: t.accent,
      backgroundColor: { default: t.accentWash, ':hover': t.accentWash },
      color: t.accentInk,
    },
    star: { fontSize: 15, lineHeight: 1 },
    spinner: {
      width: 11, height: 11,
      flexGrow: 0, flexShrink: 0,
      borderWidth: 2, borderStyle: 'solid',
      borderColor: 'currentColor',
      borderRightColor: 'transparent',
      borderRadius: '50%',
      animationName: spin,
      animationDuration: { default: '0.7s', '@media (prefers-reduced-motion: reduce)': '2.4s' },
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
    },
    empty: {
      paddingBlock: 16,
      paddingInline: 12,
      textAlign: 'center',
      color: t.muted,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.line,
      borderRadius: t.radius,
    },
  });
</script>

<script>
  let {
    searches,
    counts,
    selectedId,
    sweeping = false,
    favouritesActive = false,
    draftingNew = false,
    dirty = false,
    deletingId = $bindable(null),
    onselect,
    onnew,
    ondelete,
    onsweep,
    onfavourites,
    onhistory,
    showHistory = false,
  } = $props();

  const enabledCount = $derived(searches.filter((x) => x.enabled).length);

  function confirmFor(id, event) {
    event.stopPropagation();
    deletingId = deletingId === id ? null : id;
  }
</script>

<nav {...stylex.attrs(s.nav)} aria-label="Ricerche salvate">
  <div {...stylex.attrs(s.head)}>
    <h2 {...stylex.attrs(s.h2)}>Ricerche</h2>
    <button type="button" onclick={onnew} {...stylex.attrs(ui.button, ui.primary, s.newBtn)}>
      + Nuova ricerca
    </button>
  </div>

  <ul {...stylex.attrs(s.ul)}>
    {#if draftingNew}
      <li {...stylex.attrs(s.item, s.itemOn, s.itemDraft)}>
        <div {...stylex.attrs(s.body, s.bodyDraft)}>
          <span {...stylex.attrs(s.name)}>Nuova ricerca</span>
          <span {...stylex.attrs(s.sub)}>non salvata: compilala e premi Crea</span>
        </div>
      </li>
    {/if}

    {#each searches as item (item.id)}
      {@const count = counts[item.id]}
      {@const on = !draftingNew && item.id === selectedId}
      <li {...stylex.attrs(s.item, on && s.itemOn, !item.enabled && s.itemOff)}>
        <button
          type="button"
          aria-current={on ? 'true' : undefined}
          onclick={() => onselect(item.id)}
          {...stylex.attrs(s.pick, on && s.pickOn)}
        >
          <span {...stylex.attrs(s.body)}>
            <span {...stylex.attrs(s.name, !item.enabled && s.nameOff)}>
              {item.name || '(senza nome)'}
              {#if on && dirty}<span title="modifiche non salvate" {...stylex.attrs(s.dot)}></span>{/if}
            </span>
            <span {...stylex.attrs(s.sub)}>{item.query || 'nessun termine di ricerca'}</span>
          </span>
          <span title="corrispondenze attive" {...stylex.attrs(ui.mono, s.count, on && s.countOn)}>
            {count == null ? '…' : count}
          </span>
        </button>

        {#if deletingId === item.id}
          <div {...stylex.attrs(s.confirm)}>
            <span {...stylex.attrs(s.confirmText)}>Eliminare “{item.name}”? Gli annunci restano nel database.</span>
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); ondelete(item.id); }}
              {...stylex.attrs(ui.button, ui.danger, s.confirmBtn)}
            >Elimina</button>
            <button
              type="button"
              onclick={(e) => confirmFor(item.id, e)}
              {...stylex.attrs(ui.button, ui.quiet, s.confirmBtn)}
            >Annulla</button>
          </div>
        {:else}
          <button
            type="button"
            title="Elimina questa ricerca"
            aria-label="Elimina {item.name}"
            onclick={(e) => confirmFor(item.id, e)}
            {...stylex.attrs(ui.button, s.del)}
          >×</button>
        {/if}
      </li>
    {:else}
      <li {...stylex.attrs(s.empty)}>Ancora nessuna ricerca. Creane una per iniziare.</li>
    {/each}
  </ul>

  <button
    type="button"
    disabled={sweeping || !enabledCount}
    onclick={onsweep}
    {...stylex.attrs(ui.button, ui.buttonHover, s.scanAll)}
  >
    {#if sweeping}<span aria-hidden="true" {...stylex.attrs(s.spinner)}></span>Scansione in corso…{:else}Scansiona tutti{/if}
  </button>
  <p {...stylex.attrs(ui.hint, s.scanNote)}>
    Lancia {enabledCount} {enabledCount === 1 ? 'ricerca attiva' : 'ricerche attive'} su Subito,
    Wallapop e Vinted, una dopo l'altra, in background, qualche minuto ciascuna. Le ricerche in
    pausa sono saltate. È lo stesso passaggio che fa la schedulazione oraria.
  </p>

  <button
    type="button"
    onclick={onhistory}
    aria-expanded={showHistory}
    {...stylex.attrs(s.favRow, showHistory && s.favRowOn)}
  >
    <span aria-hidden="true" {...stylex.attrs(s.star)}>🕒</span>
    Storico scansioni
  </button>

  <button
    type="button"
    onclick={onfavourites}
    aria-current={favouritesActive ? 'true' : undefined}
    {...stylex.attrs(s.favRow, favouritesActive && s.favRowOn)}
  >
    <span aria-hidden="true" {...stylex.attrs(s.star)}>★</span>
    Annunci preferiti
  </button>
</nav>
