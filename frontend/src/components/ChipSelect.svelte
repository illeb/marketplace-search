<script>
  import { csvToList, toggleCsv, listToCsv } from '../lib/search.js';

  let {
    options,
    value = $bindable(''),
    emptyLabel = 'none picked — all allowed',
    filterable = false,
    filterPlaceholder = 'filter…',
  } = $props();

  let filter = $state('');

  const chosen = $derived(new Set(csvToList(value)));
  const order = $derived(options.map((o) => o.value));
  const shown = $derived(
    filter.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()))
      : options,
  );

  const toggle = (v) => { value = toggleCsv(value, v, order); };
  const clear = () => { value = ''; };
  const all = () => { value = listToCsv(order); };
</script>

<div class="chipset">
  {#if filterable}
    <div class="chipset-head">
      <input
        class="chip-filter"
        type="search"
        bind:value={filter}
        placeholder={filterPlaceholder}
        aria-label={filterPlaceholder}
      />
      {#if chosen.size}
        <button type="button" class="quiet tiny" onclick={clear}>clear {chosen.size}</button>
      {:else}
        <button type="button" class="quiet tiny" onclick={all}>pick all</button>
      {/if}
    </div>
  {/if}

  <div class="chips" class:scroll={filterable}>
    {#each shown as opt (opt.value)}
      <button
        type="button"
        class="chip"
        class:on={chosen.has(opt.value)}
        aria-pressed={chosen.has(opt.value)}
        onclick={() => toggle(opt.value)}
      >{opt.label}</button>
    {:else}
      <span class="hint">nothing matches “{filter}”</span>
    {/each}
  </div>

  {#if !chosen.size}
    <span class="hint">{emptyLabel}</span>
  {/if}
</div>

<style>
  .chipset { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .chipset-head { display: flex; gap: 6px; align-items: center; }
  .chip-filter { padding: 4px 8px; font-size: 12.5px; }
  .tiny { font-size: 11px; padding: 3px 7px; white-space: nowrap; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chips.scroll { max-height: 132px; overflow-y: auto; padding: 2px; }
  .chip {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--muted);
  }
  .chip:hover { color: var(--ink); }
  .chip.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .chip.on:hover { color: var(--on-accent); }
</style>
