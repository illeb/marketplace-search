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

<nav class="searches" aria-label="Saved searches">
  <div class="head">
    <h2>Searches</h2>
    <button type="button" class="primary new" onclick={onnew}>+ New search</button>
  </div>

  <ul>
    {#if draftingNew}
      <li class="item on draft">
        <div class="body">
          <span class="name">New search</span>
          <span class="sub">unsaved — fill it in and press Create</span>
        </div>
      </li>
    {/if}

    {#each searches as s (s.id)}
      {@const count = counts[s.id]}
      <li class="item" class:on={!draftingNew && s.id === selectedId} class:off={!s.enabled}>
        <button
          type="button"
          class="pick"
          aria-current={!draftingNew && s.id === selectedId ? 'true' : undefined}
          onclick={() => onselect(s.id)}
        >
          <span class="body">
            <span class="name">
              {s.name || '(unnamed)'}
              {#if !draftingNew && s.id === selectedId && dirty}<span class="dot" title="unsaved changes"></span>{/if}
            </span>
            <span class="sub">{s.query || 'no search terms'}</span>
          </span>
          <span class="count mono" title="live matches">
            {count == null ? '…' : count}
          </span>
        </button>

        {#if deletingId === s.id}
          <div class="confirm">
            <span>Delete “{s.name}”? Listings stay in the database.</span>
            <button type="button" class="danger" onclick={(e) => { e.stopPropagation(); ondelete(s.id); }}>
              Delete
            </button>
            <button type="button" class="quiet" onclick={(e) => confirmFor(s.id, e)}>Keep</button>
          </div>
        {:else}
          <button
            type="button"
            class="quiet del"
            title="Delete this search"
            aria-label="Delete {s.name}"
            onclick={(e) => confirmFor(s.id, e)}
          >×</button>
        {/if}
      </li>
    {:else}
      <li class="empty">No searches yet. Create one to begin.</li>
    {/each}
  </ul>
</nav>

<style>
  .searches { display: flex; flex-direction: column; gap: 10px; }
  .head { display: flex; align-items: center; gap: 8px; }
  h2 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0;
    flex: 1;
  }
  .new { font-size: 12.5px; padding: 5px 10px; white-space: nowrap; }

  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }

  .item {
    position: relative;
    min-width: 0;
    display: flex;
    align-items: stretch;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    flex-wrap: wrap;
  }
  .item.on { border-color: var(--accent); background: var(--accent-wash); }
  .item.off .name { text-decoration: line-through; }
  .item.off { opacity: 0.68; }
  .item.draft { border-style: dashed; }

  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    border: 0;
    background: transparent;
    border-radius: 0;
    padding: 9px 4px 9px 11px;
  }
  .pick:hover { background: var(--surface-2); }
  .item.on .pick:hover { background: transparent; }

  .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .draft .body { padding: 9px 11px; }
  .name { font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .sub {
    font-size: 11.5px;
    font-weight: 400;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--warn); flex: none;
  }
  .count {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--muted);
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--surface-2);
    flex: none;
  }
  .item.on .count { background: var(--surface); color: var(--accent-ink); }

  .del { font-size: 17px; line-height: 1; padding: 0 11px; border-radius: 0; color: var(--faint); }
  .del:hover { color: var(--bad); background: var(--bad-wash); border-color: transparent; }

  .confirm {
    flex: 1 0 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 9px 11px;
    background: var(--bad-wash);
    font-size: 12px;
    color: var(--ink);
  }
  .confirm span { flex: 1 1 140px; }
  .confirm button { font-size: 12px; padding: 4px 9px; }

  .empty {
    padding: 16px 12px;
    text-align: center;
    color: var(--muted);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
  }
</style>
