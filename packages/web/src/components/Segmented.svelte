<script>
  let { options, value = $bindable(''), label = '' } = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as opt (opt.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === opt.value}
      class:on={value === opt.value}
      onclick={() => (value = opt.value)}
    >{opt.label}</button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 2px;
    flex-wrap: wrap;
  }
  .segmented button {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 4px 11px;
    border-radius: 5px;
    font-size: 13px;
    flex: 1 1 auto;
  }
  .segmented button:hover { color: var(--ink); }
  .segmented button.on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }
</style>
