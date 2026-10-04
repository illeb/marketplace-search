import * as stylex from '@stylexjs/stylex';
import { t } from './tokens.stylex.js';

// StyleX has no global element selectors, so what used to be `button { … }` in
// app.css is an explicit style every button opts into. That is the whole cost of
// the move, and it is why these primitives live in one place.

export const ui = stylex.create({
  /* ---- buttons --------------------------------------------------------- */
  button: {
    font: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1,
    color: t.ink,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: t.line,
    borderRadius: t.radiusSm,
    paddingBlock: 8,
    paddingInline: 12,
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: 1, ':disabled': 0.55 },
  },
  buttonHover: {
    backgroundColor: { default: t.surface, ':hover:not(:disabled)': t.surface2 },
    borderColor: { default: t.line, ':hover:not(:disabled)': t.lineStrong },
  },
  primary: {
    color: t.onAccent,
    backgroundColor: { default: t.accent, ':hover:not(:disabled)': t.accentInk },
    borderColor: t.accent,
    fontWeight: 600,
  },
  danger: {
    color: t.bad,
    borderColor: { default: t.line, ':hover:not(:disabled)': t.bad },
    backgroundColor: { default: t.surface, ':hover:not(:disabled)': t.badWash },
  },
  quiet: {
    color: t.muted,
    backgroundColor: { default: 'transparent', ':hover:not(:disabled)': t.surface2 },
    borderColor: 'transparent',
  },
  tiny: { fontSize: 11.5, paddingBlock: 5, paddingInline: 8 },

  /* ---- inputs ---------------------------------------------------------- */
  input: {
    font: 'inherit',
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: t.line,
    borderRadius: t.radiusSm,
    paddingBlock: 8,
    paddingInline: 10,
    width: '100%',
    minWidth: 0,
  },
  textarea: { resize: 'vertical', minHeight: 64, lineHeight: 1.45 },

  /* ---- field scaffolding ----------------------------------------------- */
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: {
    fontFamily: t.mono,
    fontSize: 10.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: t.faint,
  },
  hint: { fontSize: 11.5, lineHeight: 1.45, color: t.faint },
  mono: { fontFamily: t.mono },

  /** An advert that never stated the thing. Not the same as zero. */
  unstated: { fontStyle: 'italic', color: t.faint },

  /* ---- surfaces -------------------------------------------------------- */
  panel: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: t.line,
    borderRadius: t.radius,
  },

  /* ---- chips ----------------------------------------------------------- */
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: t.mono,
    fontSize: 11,
    lineHeight: 1,
    color: t.muted,
    backgroundColor: t.surface3,
    borderRadius: 4,
    paddingBlock: 4,
    paddingInline: 7,
    whiteSpace: 'nowrap',
  },
  chipOn: { color: t.onAccent, backgroundColor: t.accent, fontWeight: 600 },
  chipWarn: { color: t.warn, backgroundColor: t.warnWash },
  chipGood: { color: t.good, backgroundColor: t.goodWash },

  srOnly: {
    position: 'absolute',
    width: 1, height: 1,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});
