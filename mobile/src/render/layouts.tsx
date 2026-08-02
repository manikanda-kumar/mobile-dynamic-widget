import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Section, SectionLayout, WidgetSize } from '../types/manifest';
import { useTheme } from '../theme/ThemeProvider';
import { WidgetHost } from './WidgetHost';

export interface LayoutProps {
  section: Section;
  /** Horizontal page padding, so full-bleed rails can bleed and re-pad. */
  gutter: number;
}

export type LayoutComponent = React.ComponentType<LayoutProps>;

const SPAN: Record<WidgetSize, number> = { '1x1': 1, '2x1': 2, '2x2': 2, '3x1': 3 };

/* ----------------------------------------------------------------- banner -- */
/* Full-bleed, one decision per row, most elevation on the screen. */

function BannerLayout({ section, gutter }: LayoutProps) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: gutter, gap: t.sp(3) }}>
      {section.widgets.map((w, i) => (
        <WidgetHost key={w.id} widget={w} sectionId={section.id} layout="banner" position={i} hero />
      ))}
    </View>
  );
}

/* --------------------------------------------------------------- carousel -- */
/* Peeking cards: the next card is always partly visible so the rail reads as one. */

function CarouselLayout({ section, gutter }: LayoutProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const gap = t.sp(3);
  const cardWidth = width > 0 ? Math.min(320, Math.max(230, width - gutter - t.sp(9))) : 280;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + gap}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: gutter, gap }}
      >
        {section.widgets.map((w, i) => (
          <WidgetHost
            key={w.id}
            widget={w}
            sectionId={section.id}
            layout="carousel"
            position={i}
            compact={w.size === '1x1'}
            style={{ width: cardWidth }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------- horizontal -- */
/* Tighter rail for secondary content: smaller cards, compact widget variants. */

function HorizontalLayout({ section, gutter }: LayoutProps) {
  const t = useTheme();
  const gap = t.sp(2.5);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: gutter, gap }}
    >
      {section.widgets.map((w, i) => (
        <WidgetHost
          key={w.id}
          widget={w}
          sectionId={section.id}
          layout="horizontal"
          position={i}
          compact
          style={{ width: 218 }}
        />
      ))}
    </ScrollView>
  );
}

/* --------------------------------------------------------------- vertical -- */

function VerticalLayout({ section, gutter }: LayoutProps) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: gutter, gap: t.sp(3) }}>
      {section.widgets.map((w, i) => (
        <WidgetHost key={w.id} widget={w} sectionId={section.id} layout="vertical" position={i} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------- grid -- */
/* Honours the server size hint: span = 1 (1x1), 2 (2x1/2x2), 3 (3x1). */

function GridLayout({ section, gutter }: LayoutProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.min(3, section.columns ?? 2));
  const gap = t.sp(3);
  const inner = Math.max(0, width - gutter * 2);
  const colWidth = inner > 0 ? (inner - gap * (columns - 1)) / columns : 0;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ paddingHorizontal: gutter, flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {section.widgets.map((w, i) => {
        const span = Math.min(columns, SPAN[(w.size as WidgetSize) ?? '2x1'] ?? 2);
        const cellWidth = colWidth > 0 ? colWidth * span + gap * (span - 1) : undefined;
        return (
          <WidgetHost
            key={w.id}
            widget={w}
            sectionId={section.id}
            layout="grid"
            position={i}
            compact={span === 1}
            style={{
              width: cellWidth,
              minHeight: w.size === '2x2' ? 180 : undefined,
            }}
          />
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------- registry -- */

export const layoutRegistry: Record<string, LayoutComponent> = {
  banner: BannerLayout,
  carousel: CarouselLayout,
  vertical: VerticalLayout,
  horizontal: HorizontalLayout,
  grid: GridLayout,
};

export function resolveLayout(layout: SectionLayout): LayoutComponent | null {
  return layoutRegistry[layout] ?? null;
}
