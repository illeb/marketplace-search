<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';

  const s = stylex.create({
    group: {
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: 2,
      padding: 2,
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: t.radiusSm,
    },
    option: {
      flexGrow: 1,
      font: 'inherit',
      fontSize: 13,
      lineHeight: 1,
      paddingBlock: 6,
      paddingInline: 11,
      borderWidth: 0,
      borderRadius: 5,
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: { default: t.muted, ':hover': t.ink },
      boxShadow: null,
    },
    on: {
      backgroundColor: t.surface,
      color: t.ink,
      boxShadow: '0 1px 2px rgba(0,0,0,.12)',
    },
  });
</script>

<script>
  let { options, value = $bindable(''), label = '' } = $props();
</script>

<div {...stylex.attrs(s.group)} role="radiogroup" aria-label={label}>
  {#each options as opt (String(opt.value))}
    <button
      type="button"
      role="radio"
      aria-checked={value === opt.value}
      onclick={() => (value = opt.value)}
      {...stylex.attrs(s.option, value === opt.value && s.on)}
    >{opt.label}</button>
  {/each}
</div>
