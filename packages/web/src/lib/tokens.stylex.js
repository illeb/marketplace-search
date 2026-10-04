import * as stylex from '@stylexjs/stylex';

const DARK = '@media (prefers-color-scheme: dark)';

/**
 * The palette. Every token carries a `default`, so nothing is defined only in
 * the dark branch — the media key redefines, it never introduces. StyleX
 * compiles these to custom properties, so the two themes cost one stylesheet.
 */
export const t = stylex.defineVars({
  bg:          { default: '#eef0f3', [DARK]: '#131619' },
  surface:     { default: '#ffffff', [DARK]: '#1b1f25' },
  surface2:    { default: '#f6f7f9', [DARK]: '#22272e' },
  surface3:    { default: '#eceef2', [DARK]: '#2a313a' },
  ink:         { default: '#15181d', [DARK]: '#e7ebf0' },
  muted:       { default: '#626d7b', [DARK]: '#909ba8' },
  faint:       { default: '#8b95a2', [DARK]: '#76828f' },
  line:        { default: '#d5dae1', [DARK]: '#2e353e' },
  lineStrong:  { default: '#b9c1cb', [DARK]: '#3d4653' },
  accent:      { default: '#a9541f', [DARK]: '#de8b53' },
  accentInk:   { default: '#8a4318', [DARK]: '#eda271' },
  accentWash:  { default: '#f6ece4', [DARK]: '#2d2219' },
  onAccent:    { default: '#ffffff', [DARK]: '#1a1207' },
  good:        { default: '#1b6e52', [DARK]: '#56c295' },
  goodWash:    { default: '#e3f1ea', [DARK]: '#163026' },
  warn:        { default: '#8e6412', [DARK]: '#d6a541' },
  warnWash:    { default: '#f7eedb', [DARK]: '#302716' },
  bad:         { default: '#9e3030', [DARK]: '#e07878' },
  badWash:     { default: '#f7e4e4', [DARK]: '#341d1d' },
  shadow:      { default: '0 10px 28px -16px rgba(16,22,30,.45)',
                 [DARK]:  '0 10px 28px -16px rgba(0,0,0,.75)' },

  mono: { default: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  sans: { default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  radius:   { default: '10px' },
  radiusSm: { default: '7px' },
});
