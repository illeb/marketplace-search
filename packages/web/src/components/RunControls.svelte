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
    track: {
      width: '100%',
      height: 4,
      marginBlockStart: 8,
      borderRadius: 999,
      backgroundColor: t.surface3,
      overflow: 'hidden',
    },
    barFill: { height: '100%', backgroundColor: t.accent, borderRadius: 999 },
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

  let { search, running, runningElsewhere = null, runResult, runError, progress = null, onrun } = $props();

  const lastRun = $derived(timeAgo(search?.lastRunAt));
  const sources = $derived((search?.sources ?? []).join(', '));
</script>

<div {...stylex.attrs(ui.panel, s.bar)}>
  <div {...stylex.attrs(s.who)}>
    <h2 {...stylex.attrs(s.title)}>{search?.name || 'Nessuna ricerca selezionata'}</h2>
    <p {...stylex.attrs(ui.hint, s.line)}>
      {#if running}
        {#if progress}
          Passo {progress.step} di {progress.steps} &middot; {progress.label} &middot;
          {progress.found} annunci letti
        {:else}
          Avvio…
        {/if}
      {:else if runError}
        <span {...stylex.attrs(s.bad)}>Scansione fallita: {runError}</span>
      {:else if runResult}
        Letti {runResult.found} &middot; {runResult.offTopic} fuori tema &middot;
        <b>{runResult.matched} corrispondenti</b>
      {:else if runningElsewhere}
        Scansione in corso su «{runningElsewhere}»: una per volta, così i marketplace
        non vengono interrogati in parallelo.
      {:else if lastRun}
        Ultima scansione {lastRun} &middot; legge {sources || 'i marketplace'}, solo per questa ricerca
      {:else}
        Mai scansionata &middot; legge {sources || 'i marketplace'}, solo per questa ricerca
      {/if}
    </p>
    {#if running}
      <div
        role="progressbar"
        aria-valuenow={progress?.step ?? 0}
        aria-valuemin="0"
        aria-valuemax={progress?.steps ?? 1}
        {...stylex.attrs(s.track)}
      >
        <!-- la larghezza è l'unica cosa dinamica, quindi resta un attributo style -->
        <div
          class={stylex.attrs(s.barFill).class}
          style="width: {progress && progress.steps ? Math.round((progress.step / progress.steps) * 100) : 6}%"
        ></div>
      </div>
    {/if}
  </div>

  <button
    type="button"
    disabled={!search || running || !!runningElsewhere}
    onclick={onrun}
    title={runningElsewhere ? `Aspetta che finisca «${runningElsewhere}»` : undefined}
    {...stylex.attrs(ui.button, ui.primary, s.btn)}
  >
    {#if running}
      <span aria-hidden="true" {...stylex.attrs(s.spinner)}></span>
      {progress ? `${progress.step}/${progress.steps}` : 'Scansione…'}
    {:else}
      Scansiona questa ricerca
    {/if}
  </button>

</div>
