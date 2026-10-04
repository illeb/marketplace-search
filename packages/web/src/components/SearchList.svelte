<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  // StyleX has no descendant selectors, so what used to be `.item.on .count`
  // becomes a flag handed to the child. Every parent state that used to reach
  // into a child is passed explicitly below.
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
      paddingBlock: 9,
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
    draftingNew = false,
    dirty = false,
    deletingId = $bindable(null),
    onselect,
    onnew,
    ondelete,
  } = $props();

  function confirmFor(id, event) {
    event.stopPropagation();
    deletingId = deletingId === id ? null : id;
  }
</script>

<nav {...stylex.attrs(s.nav)} aria-label="Saved searches">
  <div {...stylex.attrs(s.head)}>
    <h2 {...stylex.attrs(s.h2)}>Searches</h2>
    <button type="button" onclick={onnew} {...stylex.attrs(ui.button, ui.primary, s.newBtn)}>
      + New search
    </button>
  </div>

  <ul {...stylex.attrs(s.ul)}>
    {#if draftingNew}
      <li {...stylex.attrs(s.item, s.itemOn, s.itemDraft)}>
        <div {...stylex.attrs(s.body, s.bodyDraft)}>
          <span {...stylex.attrs(s.name)}>New search</span>
          <span {...stylex.attrs(s.sub)}>unsaved — fill it in and press Create</span>
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
              {item.name || '(unnamed)'}
              {#if on && dirty}<span title="unsaved changes" {...stylex.attrs(s.dot)}></span>{/if}
            </span>
            <span {...stylex.attrs(s.sub)}>{item.query || 'no search terms'}</span>
          </span>
          <span title="live matches" {...stylex.attrs(ui.mono, s.count, on && s.countOn)}>
            {count == null ? '…' : count}
          </span>
        </button>

        {#if deletingId === item.id}
          <div {...stylex.attrs(s.confirm)}>
            <span {...stylex.attrs(s.confirmText)}>Delete “{item.name}”? Listings stay in the database.</span>
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); ondelete(item.id); }}
              {...stylex.attrs(ui.button, ui.danger, s.confirmBtn)}
            >Delete</button>
            <button
              type="button"
              onclick={(e) => confirmFor(item.id, e)}
              {...stylex.attrs(ui.button, ui.quiet, s.confirmBtn)}
            >Keep</button>
          </div>
        {:else}
          <button
            type="button"
            title="Delete this search"
            aria-label="Delete {item.name}"
            onclick={(e) => confirmFor(item.id, e)}
            {...stylex.attrs(ui.button, s.del)}
          >×</button>
        {/if}
      </li>
    {:else}
      <li {...stylex.attrs(s.empty)}>No searches yet. Create one to begin.</li>
    {/each}
  </ul>
</nav>
