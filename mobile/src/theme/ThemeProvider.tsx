import React, { createContext, useContext, useMemo } from 'react';
import { Platform, TextStyle, ViewStyle } from 'react-native';
import type { ManifestTheme, ThemeColors } from '../types/manifest';
import { alpha, isDarkColor, mix } from './color';

/**
 * The only local colour values in the app: used when the manifest is missing or
 * malformed. Everything else comes from `manifest.theme`.
 */
export const FALLBACK_THEME: ManifestTheme = {
  id: 'fallback',
  name: 'Fallback',
  colors: {
    background: '#0B1120',
    surface: '#151E2E',
    surfaceAlt: '#1E2A3E',
    primary: '#4F8DF7',
    onPrimary: '#FFFFFF',
    text: '#F2F5FA',
    textMuted: '#94A3B8',
    border: '#243449',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
  radius: 16,
  spacing: 12,
};

const FONT = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export interface Tokens {
  raw: ManifestTheme;
  c: ThemeColors;
  isDark: boolean;
  /** 4px-ish rhythm derived from the manifest spacing base. */
  sp: (n: number) => number;
  gutter: number;
  radius: { sm: number; md: number; lg: number; pill: number };
  text: Record<
    'display' | 'amount' | 'title' | 'body' | 'label' | 'micro' | 'mono',
    TextStyle
  >;
  /** Card surface: soft border, restrained elevation. */
  card: (level?: 0 | 1 | 2) => ViewStyle;
  /** Low-chroma wash of a semantic colour, readable on the current surface. */
  wash: (color: string, strength?: number) => string;
  hairline: string;
}

function buildTokens(theme: ManifestTheme): Tokens {
  const c = theme.colors ?? FALLBACK_THEME.colors;
  const base = typeof theme.spacing === 'number' && theme.spacing > 0 ? theme.spacing : 12;
  const r = typeof theme.radius === 'number' && theme.radius > 0 ? theme.radius : 16;
  const dark = isDarkColor(c.background ?? '#0B1120');
  const unit = base / 3; // spacing 12 -> 4px unit

  const sp = (n: number) => Math.round(unit * n);

  const text: Tokens['text'] = {
    display: { fontFamily: FONT, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.7, color: c.text },
    amount: { fontFamily: FONT, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.5, color: c.text },
    title: { fontFamily: FONT, fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.2, color: c.text },
    body: { fontFamily: FONT, fontSize: 13.5, lineHeight: 19, fontWeight: '400', color: c.textMuted },
    label: { fontFamily: FONT, fontSize: 12.5, lineHeight: 16, fontWeight: '600', color: c.text },
    micro: { fontFamily: FONT, fontSize: 10.5, lineHeight: 13, fontWeight: '700', letterSpacing: 0.7, color: c.textMuted, textTransform: 'uppercase' },
    mono: {
      fontFamily: Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', default: 'monospace' }),
      fontSize: 11,
      lineHeight: 15,
      color: c.textMuted,
    },
  };

  const card = (level: 0 | 1 | 2 = 1): ViewStyle => ({
    backgroundColor: c.surface,
    borderRadius: r,
    borderWidth: 1,
    borderColor: c.border,
    ...(level === 0
      ? {}
      : Platform.OS === 'web'
        ? ({
            boxShadow: dark
              ? `0 1px 2px ${alpha('#000000', 0.4)}, 0 ${level * 6}px ${level * 16}px ${alpha('#000000', 0.22)}`
              : `0 1px 2px ${alpha(c.text, 0.05)}, 0 ${level * 5}px ${level * 14}px ${alpha(c.text, 0.06)}`,
          } as unknown as ViewStyle)
        : {
            shadowColor: dark ? '#000000' : c.text,
            shadowOpacity: dark ? 0.35 : 0.08,
            shadowRadius: level * 10,
            shadowOffset: { width: 0, height: level * 3 },
            elevation: level * 2,
          }),
  });

  const wash = (color: string, strength = 1) =>
    dark ? alpha(color, 0.15 * strength) : alpha(color, 0.1 * strength);

  return {
    raw: theme,
    c,
    isDark: dark,
    sp,
    gutter: sp(4),
    radius: { sm: Math.round(r * 0.4), md: Math.round(r * 0.7), lg: r, pill: 999 },
    text,
    card,
    wash,
    hairline: dark ? mix(c.border, c.surface, 0.35) : mix(c.border, c.surface, 0.25),
  };
}

const ThemeContext = createContext<Tokens>(buildTokens(FALLBACK_THEME));

export function ThemeProvider({ theme, children }: { theme?: ManifestTheme | null; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t = theme && theme.colors ? theme : FALLBACK_THEME;
    return buildTokens(t);
  }, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Tokens {
  return useContext(ThemeContext);
}
