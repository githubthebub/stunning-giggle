/**
 * Compass visual theme.
 *
 * Calm, grounded palette — supportive without being saccharine. No red-alert
 * gamification colours; progress reads as encouraging. One place to restyle the
 * whole app.
 */
export const colors = {
  background: '#12151b',
  surface: '#1b1f27',
  surfaceAlt: '#232833',
  border: '#2c323d',
  primary: '#5b8def', // steady blue — direction, not urgency
  primaryMuted: '#33415c',
  accent: '#6fb59a', // sage green — growth
  text: '#eef1f6',
  textMuted: '#a7b0be',
  textFaint: '#6f7887',
  danger: '#c26a6a', // used sparingly; never for streak-shaming
  crisisBg: '#161b22',
  crisisAccent: '#8fb0d8',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text, lineHeight: 24 },
  bodyMuted: { fontSize: 15, fontWeight: '400' as const, color: colors.textMuted, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, color: colors.textFaint },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, letterSpacing: 0.4 },
} as const;

export const theme = { colors, spacing, radius, typography };
export type Theme = typeof theme;
