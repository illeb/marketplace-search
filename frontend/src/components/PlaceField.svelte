<script>
  import { api } from '../lib/api.js';

  // place/lat/lon travel together: a typed string with no coordinates is not a
  // usable centre for a radius, so typing clears the fix and only a pick from
  // the list restores one.
  let { place = $bindable(''), lat = $bindable(null), lon = $bindable(null) } = $props();

  let items = $state([]);
  let open = $state(false);
  let active = $state(-1);
  let busy = $state(false);

  let timer = null;
  let controller = null;
  let listId = `places-${Math.random().toString(36).slice(2, 8)}`;

  const close = () => { open = false; active = -1; };

  function cancel() {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
  }

  async function lookup(q) {
    cancel();
    controller = new AbortController();
    busy = true;
    try {
      const found = await api.places(q, controller.signal);
      items = Array.isArray(found) ? found : [];
      active = -1;
      open = items.length > 0;
    } catch {
      // An aborted or failed lookup is not worth a banner; the field simply
      // offers nothing.
      items = [];
      close();
    } finally {
      busy = false;
    }
  }

  function onInput(event) {
    place = event.currentTarget.value;
    lat = null;
    lon = null;
    cancel();
    const q = place.trim();
    if (q.length < 2) { items = []; close(); return; }
    timer = setTimeout(() => lookup(q), 280);
  }

  function choose(index) {
    const hit = items[index];
    if (!hit) return;
    place = hit.label;
    lat = hit.lat;
    lon = hit.lon;
    items = [];
    close();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') { cancel(); close(); return; }
    if (!open || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = active >= items.length - 1 ? 0 : active + 1;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = active <= 0 ? items.length - 1 : active - 1;
    } else if (event.key === 'Enter') {
      if (active >= 0) { event.preventDefault(); choose(active); }
    } else if (event.key === 'Tab') {
      close();
    }
  }

  function clearPlace() {
    cancel();
    place = '';
    lat = null;
    lon = null;
    items = [];
    close();
  }
</script>

<div class="place">
  <div class="input-row">
    <input
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      placeholder="start typing a town"
      value={place}
      oninput={onInput}
      onkeydown={onKeydown}
      onblur={() => setTimeout(close, 140)}
      onfocus={() => { if (items.length) open = true; }}
    />
    {#if place}
      <button type="button" class="quiet clear" onclick={clearPlace} title="clear the centre">×</button>
    {/if}
  </div>

  {#if open}
    <ul class="list" id={listId} role="listbox">
      {#each items as item, i (item.label)}
        <li
          id="{listId}-{i}"
          role="option"
          aria-selected={i === active}
          class:on={i === active}
          onmousedown={(e) => { e.preventDefault(); choose(i); }}
          onmouseenter={() => (active = i)}
        >{item.label}</li>
      {/each}
    </ul>
  {/if}

  {#if busy}
    <span class="hint">looking…</span>
  {:else if place && lat == null}
    <span class="hint warn-hint">no coordinates — pick a town from the list for a radius to work</span>
  {:else if lat != null}
    <span class="hint mono">{lat.toFixed(3)}, {lon.toFixed(3)}</span>
  {:else}
    <span class="hint">optional — sets the centre for the radius and biases Wallapop</span>
  {/if}
</div>

<style>
  .place { position: relative; display: flex; flex-direction: column; gap: 4px; }
  .input-row { position: relative; display: flex; align-items: center; }
  .input-row input { padding-right: 30px; }
  .clear {
    position: absolute;
    right: 2px;
    font-size: 17px;
    line-height: 1;
    padding: 2px 7px;
  }
  .list {
    position: absolute;
    z-index: 40;
    left: 0;
    right: 0;
    top: 100%;
    margin: 3px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
    max-height: 240px;
    overflow-y: auto;
  }
  .list li {
    padding: 6px 9px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
  }
  .list li.on { background: var(--accent-wash); color: var(--accent-ink); }
  .warn-hint { color: var(--warn); }
</style>
