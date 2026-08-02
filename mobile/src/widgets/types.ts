import type { SectionLayout, Widget, WidgetCta, WidgetSize } from '../types/manifest';

export interface WidgetProps {
  widget: Widget;
  /** Layout of the section this widget was placed in by the server. */
  layout: SectionLayout;
  /** Server size hint, already defaulted. */
  size: WidgetSize;
  /** True for tight slots (horizontal rails, 1x1 grid cells). */
  compact: boolean;
  /** True when the widget is the sole occupant of a full-bleed banner. */
  hero: boolean;
  onCta: (cta: WidgetCta) => void;
}

export type WidgetComponent = React.ComponentType<WidgetProps>;

/** `data.progress` may arrive as 0..1 or 0..100. */
export function normaliseProgress(p?: number | null): number | null {
  if (typeof p !== 'number' || Number.isNaN(p)) return null;
  const v = p > 1 ? p / 100 : p;
  return Math.max(0, Math.min(1, v));
}

/** Avoid printing the same number twice when the backend puts it in both fields. */
export function amountIsRedundant(title: string, amount?: string | null): boolean {
  if (!amount) return true;
  return title.includes(amount);
}

/**
 * Amount-forward cards want the number big and the words small. Backends often
 * bake the number into the title ("Pre-approved ₹5,00,000"); lift it out so the
 * card reads as headline + figure instead of repeating itself.
 */
export function splitTitleAmount(
  title: string,
  amount?: string | null,
): { title: string; amount: string | null } {
  if (!amount) return { title, amount: null };
  if (!title.includes(amount)) return { title, amount };
  const stripped = title
    .replace(amount, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·,:•\-–—]+/, '')
    .replace(/[\s·,:•\-–—]+$/, '')
    .trim();
  return stripped.length >= 3 ? { title: stripped, amount } : { title, amount: null };
}
