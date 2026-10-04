<script>
  import { timeAgo } from '../lib/format.js';

  let { search, running, runResult, runError, sweeping, onrun, onsweep } = $props();

  const lastRun = $derived(timeAgo(search?.last_run_at));
</script>

<div class="runbar">
  <div class="who">
    <h2>{search?.name || 'No search selected'}</h2>
    <p class="hint">
      {#if running}
        Sweeping {search?.sources || 'the marketplaces'} — this usually takes one to four minutes.
      {:else if runError}
        <span class="bad">Run failed: {runError}</span>
      {:else if runResult}
        Found {runResult.found} · {runResult.offTopic} off topic · <b>{runResult.matched} matched</b>
      {:else if lastRun}
        Last run {lastRun}
      {:else}
        Never run
      {/if}
    </p>
  </div>

  <button type="button" class="primary" disabled={!search || running} onclick={onrun}>
    {#if running}<span class="spinner" aria-hidden="true"></span>Running…{:else}Run now{/if}
  </button>

  <button type="button" disabled={sweeping} onclick={onsweep} title="Run every enabled search in the background">
    {#if sweeping}<span class="spinner" aria-hidden="true"></span>Sweeping…{:else}Sweep all{/if}
  </button>
</div>

<style>
  .runbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 9px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .who { flex: 1 1 220px; min-width: 0; }
  h2 { margin: 0; font-size: 16px; letter-spacing: -0.01em; }
  p { margin: 2px 0 0; }
  .bad { color: var(--bad); }
  button { display: inline-flex; align-items: center; gap: 7px; }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex: none;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation-duration: 2.4s; }
  }
</style>
