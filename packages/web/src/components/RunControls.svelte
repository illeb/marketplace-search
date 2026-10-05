<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } });

  const s = stylex.create({
    bar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 9,
      paddingBlock: 12,
      paddingInline: 14,
    },
    who: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0 },
    title: { margin: 0, fontSize: 16, letterSpacing: '-0.01em' },
    line: { marginBlock: 2, marginBlockEnd: 0 },
    bad: { color: t.bad },
    btn: { display: 'inline-flex', alignItems: 'center', gap: 7 },
    spinner: {
      width: 12,
      height: 12,
      flexGrow: 0, flexShrink: 0,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'currentColor',
      borderRightColor: 'transparent',
      borderRadius: '50%',
      animationName: spin,
      animationDuration: { default: '0.7s', '@media (prefers-reduced-motion: reduce)': '2.4s' },
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
    },
  });
</script>

<script>
  import { timeAgo } from '../lib/format.js';

  let { search, running, runResult, runError, onrun } = $props();

  const lastRun = $derived(timeAgo(search?.lastRunAt));
  const sources = $derived((search?.sources ?? []).join(', '));
</script>

<div {...stylex.attrs(ui.panel, s.bar)}>
  <div {...stylex.attrs(s.who)}>
    <h2 {...stylex.attrs(s.title)}>{search?.name || 'No search selected'}</h2>
    <p {...stylex.attrs(ui.hint, s.line)}>
      {#if running}
        Sweeping {sources || 'the marketplaces'} — this usually takes one to four minutes.
      {:else if runError}
        <span {...stylex.attrs(s.bad)}>Run failed: {runError}</span>
      {:else if runResult}
        Found {runResult.found} · {runResult.offTopic} off topic · <b>{runResult.matched} matched</b>
      {:else if lastRun}
        Last scanned {lastRun} &middot; reads {sources || 'the marketplaces'} for this search only
      {:else}
        Never scanned &middot; reads {sources || 'the marketplaces'} for this search only
      {/if}
    </p>
  </div>

  <button
    type="button"
    disabled={!search || running}
    onclick={onrun}
    {...stylex.attrs(ui.button, ui.primary, s.btn)}
  >
    {#if running}
      <span aria-hidden="true" {...stylex.attrs(s.spinner)}></span>Scanning…
    {:else}
      Scan this search
    {/if}
  </button>

</div>
