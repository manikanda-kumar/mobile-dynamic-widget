/** Tiny colour helpers. Everything is driven by the manifest palette, so the
 *  renderer only ever derives from the colours it was given. */

function parse(hex: string): [number, number, number] {
  let h = (hex ?? '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

export function mix(from: string, to: string, t: number): string {
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const k = Math.max(0, Math.min(1, t));
  const c = (a: number, b: number) => Math.round(a + (b - a) * k);
  return `rgb(${c(r1, r2)}, ${c(g1, g2)}, ${c(b1, b2)})`;
}

/** Relative luminance, 0 (black) .. 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.4;
}
