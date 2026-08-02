import React from 'react';
import { Text, View } from 'react-native';
import type { Section } from '../types/manifest';
import { useTheme } from '../theme/ThemeProvider';
import { useRenderContext } from './RenderContext';
import { resolveLayout } from './layouts';

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

export function SectionRenderer({ section }: { section: Section }) {
  const t = useTheme();
  const { debug } = useRenderContext();
  const Layout = resolveLayout(section.layout);

  if (!Layout) {
    // Server shipped a layout this build cannot arrange: drop the section, keep the screen.
    warnOnce(
      `layout:${section.layout}`,
      `[DXP] Unknown section layout "${section.layout}" (id=${section.id}) — section skipped.`,
    );
    return null;
  }

  if (!section.widgets.length) return null;

  return (
    <View style={{ marginBottom: t.sp(7) }}>
      {section.title || debug ? (
        <View style={{ paddingHorizontal: t.gutter, marginBottom: t.sp(3), gap: 2 }}>
          {section.title ? (
            <Text style={[t.text.title, { fontSize: 15, letterSpacing: -0.1 }]} numberOfLines={1}>
              {section.title}
            </Text>
          ) : null}
          {debug ? (
            <Text style={t.text.mono} numberOfLines={1}>
              {section.id} · {section.layout}
              {section.layout === 'grid' ? ` · ${section.columns ?? 2}col` : ''} · {section.widgets.length}w
            </Text>
          ) : null}
        </View>
      ) : null}
      <Layout section={section} gutter={t.gutter} />
    </View>
  );
}
