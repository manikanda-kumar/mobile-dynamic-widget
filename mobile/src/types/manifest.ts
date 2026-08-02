/**
 * Typed mirror of DEMO_SPEC.md — the backend contract.
 *
 * Everything the renderer consumes is described here. Fields marked optional are
 * genuinely optional on the wire: the renderer must tolerate nulls / missing keys
 * and never assume a shape beyond `data.title`.
 */

/* ------------------------------------------------------------------ theme -- */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ManifestTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  /** Corner radius base, px. */
  radius: number;
  /** Spacing base unit, px. */
  spacing: number;
}

/* ----------------------------------------------------------------- widget -- */

/** The 14 widget types the registry must cover (PLAN.md / DEMO_SPEC.md). */
export const WIDGET_TYPES = [
  'loan_offer',
  'credit_card_offer',
  'fd',
  'pledge',
  'kyc',
  'vkyc',
  'email_verification',
  'mobile_verification',
  'birthday',
  'anniversary',
  'rewards',
  'cashback',
  'payments',
  'investments',
] as const;

export type KnownWidgetType = (typeof WIDGET_TYPES)[number];

/** Wire type is a plain string: unknown values must degrade, not crash. */
export type WidgetType = KnownWidgetType | (string & {});

export type WidgetSize = '1x1' | '2x1' | '2x2' | '3x1';

export type CtaAction = 'navigate' | 'deeplink' | 'dismiss' | 'external' | (string & {});

export interface WidgetCta {
  label: string;
  action: CtaAction;
  target?: string | null;
}

/**
 * Optional enrichment fields. None of these are required by DEMO_SPEC.md; each
 * widget falls back to title/subtitle/amount when they are absent. They exist so
 * the backend can make a card denser without a renderer release.
 */
export interface WidgetDataExtras {
  /** Small label/value pairs rendered as a stat strip. */
  stats?: { label: string; value: string }[] | null;
  /** Row list (payments, tenure ladders, reward history). */
  items?: { label: string; value: string; meta?: string | null }[] | null;
  /** Change indicator, e.g. "+2.4%". */
  delta?: string | null;
  deltaDirection?: 'up' | 'down' | 'flat' | null;
  /** Series for the inline sparkline (investments / cashback). */
  series?: number[] | null;
  /** Fine print under the CTA row. */
  footnote?: string | null;
  /** Optional low-emphasis secondary action. */
  secondaryCta?: WidgetCta | null;
  /** Progress helper text, e.g. "2 of 4 steps". */
  progressLabel?: string | null;
}

export interface WidgetData extends WidgetDataExtras {
  /** The only guaranteed field. */
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  /** 0..1 or 0..100 — the renderer normalises both. */
  progress?: number | null;
  amount?: string | null;
  cta?: WidgetCta | null;
}

export interface WidgetAnalyticsMeta {
  impressionKey?: string | null;
  experimentId?: string | null;
}

/** Present only when the manifest was requested with `?debug=1`. */
export interface WidgetDebug {
  basePriority?: number | null;
  mlBoost?: number | null;
  appliedRules?: string[] | null;
  finalPriority?: number | null;
}

export interface Widget {
  id: string;
  type: WidgetType;
  priority: number;
  size?: WidgetSize | null;
  data: WidgetData;
  analytics?: WidgetAnalyticsMeta | null;
  debug?: WidgetDebug | null;
}

/* ---------------------------------------------------------------- section -- */

export const SECTION_LAYOUTS = ['banner', 'carousel', 'vertical', 'horizontal', 'grid'] as const;
export type KnownSectionLayout = (typeof SECTION_LAYOUTS)[number];
export type SectionLayout = KnownSectionLayout | (string & {});

export interface Section {
  id: string;
  layout: SectionLayout;
  title?: string | null;
  /** Grid only. 2 or 3; defaults to 2 when absent. */
  columns?: number | null;
  widgets: Widget[];
}

/* --------------------------------------------------------------- manifest -- */

export interface ExperimentAssignment {
  id: string;
  variant: string;
  bucket?: number | null;
}

export interface Manifest {
  version: number;
  generatedAt: string;
  userId: string;
  layout: string;
  theme: ManifestTheme;
  experiments: ExperimentAssignment[];
  sections: Section[];
}

/* ------------------------------------------------------------------ users -- */

export interface DemoUser {
  id: string;
  name: string;
  segment?: string | null;
  description?: string | null;
}

/* -------------------------------------------------------------- analytics -- */

export type AnalyticsEventType =
  | 'impression'
  | 'click'
  | 'dwell'
  | 'scroll'
  | 'conversion'
  | 'dismiss';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  widgetId: string;
  widgetType: WidgetType;
  experimentId?: string | null;
  variant?: string | null;
  /** epoch millis */
  ts: number;
  meta?: Record<string, unknown> | null;
}

export interface AnalyticsBatch {
  userId: string;
  events: AnalyticsEvent[];
}
