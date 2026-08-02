import React, { useState } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme/color';
import { Icon } from './Icon';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export function useTone(tone: Tone = 'primary'): string {
  const { c } = useTheme();
  switch (tone) {
    case 'success':
      return c.success;
    case 'warning':
      return c.warning;
    case 'danger':
      return c.danger;
    case 'neutral':
      return c.textMuted;
    default:
      return c.primary;
  }
}

/* -------------------------------------------------------------- icon tile -- */

export function IconTile({ name, tone = 'primary', size = 38 }: { name?: string | null; tone?: Tone; size?: number }) {
  const t = useTheme();
  const color = useTone(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.wash(color, 1),
      }}
    >
      <Icon name={name} color={color} size={size * 0.55} />
    </View>
  );
}

/* ------------------------------------------------------------------ badge -- */

export function Badge({ label, tone = 'primary', subtle }: { label: string; tone?: Tone; subtle?: boolean }) {
  const t = useTheme();
  const color = useTone(tone);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: t.sp(2),
        paddingVertical: t.sp(1),
        borderRadius: t.radius.sm,
        backgroundColor: subtle ? 'transparent' : t.wash(color, 1.1),
        borderWidth: subtle ? 1 : 0,
        borderColor: t.c.border,
      }}
    >
      <Text style={[t.text.micro, { color: subtle ? t.c.textMuted : color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------- card head -- */

/**
 * Shared card masthead. In tight slots (rails, 1x1 cells) it stacks so the title
 * keeps the full width instead of being squeezed between an icon and a badge.
 */
export function CardHead({
  icon,
  tone = 'primary',
  title,
  subtitle,
  badge,
  badgeTone,
  compact,
  iconSize = 34,
  titleStyle,
  titleLines = 2,
}: {
  icon?: string | null;
  tone?: Tone;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  badgeTone?: Tone;
  compact?: boolean;
  iconSize?: number;
  titleStyle?: StyleProp<TextStyle>;
  titleLines?: number;
}) {
  const t = useTheme();
  // A badge that just repeats the headline is noise.
  const showBadge = !!badge && badge.trim().toLowerCase() !== title.trim().toLowerCase();

  const titleBlock = (
    <>
      <Text style={[t.text.title, titleStyle]} numberOfLines={titleLines}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[t.text.body, { marginTop: 2 }]} numberOfLines={compact ? 3 : 2}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.sp(2) }}>
          <IconTile name={icon} tone={tone} size={30} />
          {showBadge ? <Badge label={badge!} tone={badgeTone ?? tone} /> : null}
        </View>
        <View style={{ marginTop: t.sp(2.5) }}>{titleBlock}</View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.sp(3) }}>
      <IconTile name={icon} tone={tone} size={iconSize} />
      <View style={{ flex: 1, minWidth: 0 }}>{titleBlock}</View>
      {showBadge ? <Badge label={badge!} tone={badgeTone ?? tone} /> : null}
    </View>
  );
}

/* -------------------------------------------------------------------- cta -- */

export function Cta({
  label,
  onPress,
  tone = 'primary',
  variant = 'solid',
  compact,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  variant?: 'solid' | 'quiet' | 'link';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const color = useTone(tone);
  const [hover, setHover] = useState(false);

  if (variant === 'link') {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' }, style]}
      >
        <Text style={[t.text.label, { color, textDecorationLine: hover ? 'underline' : 'none' }]}>{label}</Text>
      </Pressable>
    );
  }

  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          paddingHorizontal: compact ? t.sp(3) : t.sp(4),
          paddingVertical: compact ? t.sp(2) : t.sp(2.5),
          borderRadius: t.radius.pill,
          alignSelf: 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? (hover ? alpha(color, 0.88) : color) : t.wash(color, hover ? 1.5 : 1),
          borderWidth: solid ? 0 : 1,
          borderColor: solid ? 'transparent' : alpha(color, 0.35),
          opacity: pressed ? 0.75 : 1,
          transitionDuration: '140ms',
        } as ViewStyle,
        style,
      ]}
    >
      <Text
        style={[
          t.text.label,
          { color: solid ? t.c.onPrimary : color, fontSize: compact ? 12 : 13, letterSpacing: -0.1 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ meter -- */

export function Meter({ value, tone = 'primary', height = 6 }: { value: number; tone?: Tone; height?: number }) {
  const t = useTheme();
  const color = useTone(tone);
  const pct = Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: t.isDark ? alpha(t.c.text, 0.09) : alpha(t.c.text, 0.07),
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/* -------------------------------------------------------------- delta pill -- */

export function Delta({ label, direction = 'up' }: { label: string; direction?: 'up' | 'down' | 'flat' | null }) {
  const t = useTheme();
  const color = direction === 'down' ? t.c.danger : direction === 'flat' ? t.c.textMuted : t.c.success;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(1) }}>
      {direction !== 'flat' ? (
        <Svg width={9} height={9} viewBox="0 0 10 10">
          <Path
            d={direction === 'down' ? 'M5 9.2 0.8 2.4h8.4z' : 'M5 0.8 9.2 7.6H0.8z'}
            fill={color}
          />
        </Svg>
      ) : null}
      <Text style={[t.text.label, { color, fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------- stat strip -- */

export function StatStrip({ stats, tone = 'neutral' }: { stats: { label: string; value: string }[]; tone?: Tone }) {
  const t = useTheme();
  const accent = useTone(tone);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.sp(5), rowGap: t.sp(3) }}>
      {stats.map((s) => (
        <View key={s.label} style={{ minWidth: 62 }}>
          <Text style={[t.text.micro, { marginBottom: 3 }]} numberOfLines={1}>
            {s.label}
          </Text>
          <Text
            style={[t.text.label, { fontSize: 13.5, color: tone === 'neutral' ? t.c.text : accent }]}
            numberOfLines={1}
          >
            {s.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* --------------------------------------------------------------- row list -- */

export function RowList({
  items,
  emphasis,
}: {
  items: { label: string; value: string; meta?: string | null }[];
  emphasis?: (item: { label: string; value: string; meta?: string | null }) => Tone | undefined;
}) {
  const t = useTheme();
  return (
    <View>
      {items.map((item, i) => (
        <View
          key={`${item.label}-${i}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.sp(3),
            paddingVertical: t.sp(2.25),
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.hairline,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[t.text.label, { fontWeight: '500' }]} numberOfLines={1}>
              {item.label}
            </Text>
            {item.meta ? (
              <Text style={[t.text.body, { fontSize: 11.5, marginTop: 1 }]} numberOfLines={1}>
                {item.meta}
              </Text>
            ) : null}
          </View>
          <Text
            style={[
              t.text.label,
              {
                fontSize: 13.5,
                fontVariant: ['tabular-nums'],
                color: emphasis?.(item) === 'success' ? t.c.success : t.c.text,
              },
            ]}
            numberOfLines={1}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------- sparkline -- */

export function Sparkline({
  series,
  color,
  height = 44,
  filled = true,
}: {
  series: number[];
  color: string;
  height?: number;
  filled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  if (!series || series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 3;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `M${points[0][0].toFixed(2)},${height} L${line.replace(/ /g, ' L')} L${points[points.length - 1][0].toFixed(2)},${height} Z`;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {filled ? <Path d={area} fill={alpha(color, 0.12)} /> : null}
          <Polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- divider -- */

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.hairline, marginLeft: inset }} />;
}
