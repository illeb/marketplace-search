<script>
  // Purely a lens over what is already on screen. Nothing here is written back
  // to the saved search, which is why it lives apart from the filter editor.
  let { view = $bindable(), shown, total, kind } = $props();

  const defaults = { newOnly: false, specsOnly: false, shipsOnly: false, hideSold: true, maxPrice: null };
  const touched = $derived(
    Object.keys(defaults).some((k) => view[k] !== defaults[k]),
  );
  const reset = () => { view = { ...defaults }; };
</script>

<div class="viewbar">
  <span class="tag">View</span>

  <label class="toggle">
    <input type="checkbox" bind:checked={view.newOnly} />
    <span>New today</span>
  </label>

  {#if kind === 'computer' || kind === 'memory'}
    <label class="toggle">
      <input type="checkbox" bind:checked={view.specsOnly} />
      <span>Specs stated</span>
    </label>
  {/if}

  <label class="toggle">
    <input type="checkbox" bind:checked={view.shipsOnly} />
    <span>Ships</span>
  </label>

  <label class="toggle">
    <input type="checkbox" bind:checked={view.hideSold} />
    <span>Hide sold</span>
  </label>

  <label class="price">
    <span>Max €</span>
    <input
      type="number"
      min="0"
      step="10"
      placeholder="any"
      value={view.maxPrice ?? ''}
      oninput={(e) => (view.maxPrice = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
    />
  </label>

  {#if touched}
    <button type="button" class="quiet" onclick={reset}>Reset view</button>
  {/if}

  <span class="count mono">{shown} of {total} shown</span>
</div>

<style>
  .viewbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px 12px;
    padding: 9px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--faint);
  }
  .toggle { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; cursor: pointer; }
  .price { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; }
  .price input { width: 82px; padding: 4px 7px; }
  .count { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 600; }
  button { font-size: 12px; padding: 3px 8px; }

  @media (max-width: 520px) {
    .count { margin-left: 0; flex-basis: 100%; }
  }
</style>
