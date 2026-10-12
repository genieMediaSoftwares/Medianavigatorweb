// Non-color design tokens. Loaded by tailwind.config.js, so each token is also a class:
//   spacing    -> p-lg, gap-md, mt-xl ...
//   radius     -> rounded-md, rounded-lg ...
//   typography -> text-display, text-heading, text-title, text-body, text-label, text-caption
// Use the classes in components; use these objects only where a style prop is required.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
} as const;

export const typography = {
  /** Headline numbers in hero sections. */
  hero: { fontSize: 44, lineHeight: 48, fontWeight: '800' },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  /** Small uppercase section eyebrows and badges. */
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
} as const;

/** Minimum touch target (dp) for anything tappable. */
export const touchTarget = 44;

/**
 * Shadows are used sparingly: only surfaces that float above content. They use `boxShadow`
 * (supported on iOS, Android and web); the older shadow* props are deprecated on web.
 */
export const elevation = {
  /** Soft lift for hero surfaces and media tiles. */
  float: { boxShadow: '0px 8px 18px rgba(11, 31, 68, 0.10)' },
  sheet: { boxShadow: '0px -4px 16px rgba(11, 31, 68, 0.12)' },
  /** Cards that sit on the page (dashboard platform cards, analysis post cards). */
  card: { boxShadow: '0px 4px 12px rgba(11, 31, 68, 0.06)' },
  /** Round header buttons (connection screen back / settings). */
  button: { boxShadow: '0px 6px 14px rgba(11, 31, 68, 0.08)' },
  /** The sliding thumb of the segmented control. */
  thumb: { boxShadow: '0px 2px 6px rgba(11, 31, 68, 0.08)' },
} as const;
