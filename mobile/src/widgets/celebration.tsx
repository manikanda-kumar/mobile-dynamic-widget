import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Card } from '../ui/Card';
import { Badge, Cta, StatStrip } from '../ui/primitives';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme/color';
import { WidgetProps } from './types';

/* ------------------------------------------------------------- birthday ---- */
/* Celebratory, but the confetti is small, sparse and clipped: no party page. */

function Confetti({ colors }: { colors: string[] }) {
  const bits = [
    { x: 12, y: 18, r: -18, w: 5, h: 11, c: 0 },
    { x: 44, y: 6, r: 24, w: 4, h: 9, c: 1 },
    { x: 72, y: 30, r: -8, w: 5, h: 10, c: 2 },
    { x: 104, y: 12, r: 38, w: 4, h: 8, c: 0 },
    { x: 132, y: 34, r: -30, w: 5, h: 11, c: 1 },
    { x: 156, y: 8, r: 12, w: 4, h: 9, c: 2 },
  ];
  return (
    <Svg width={186} height={78}>
      {bits.map((b, i) => (
        <Rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={1.6}
          fill={colors[b.c]}
          opacity={0.5}
          transform={`rotate(${b.r} ${b.x + b.w / 2} ${b.y + b.h / 2})`}
        />
      ))}
      <Circle cx={90} cy={56} r={2.4} fill={colors[1]} opacity={0.4} />
      <Circle cx={28} cy={52} r={2} fill={colors[2]} opacity={0.35} />
      <Circle cx={146} cy={58} r={2.2} fill={colors[0]} opacity={0.35} />
    </Svg>
  );
}

export function BirthdayWidget({ widget, compact, hero, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;

  return (
    <Card level={hero ? 2 : 1} style={hero ? { padding: t.sp(5) } : undefined}>
      <View style={{ position: 'absolute', top: -6, right: -14, pointerEvents: 'none' }}>
        <Confetti colors={[t.c.primary, t.c.warning, t.c.success]} />
      </View>

      {d.badge ? <Badge label={d.badge} tone="warning" /> : null}

      <Text
        style={[hero ? t.text.display : t.text.amount, { marginTop: d.badge ? t.sp(3) : 0, maxWidth: '82%' }]}
        numberOfLines={2}
      >
        {d.title}
      </Text>
      {d.subtitle ? (
        <Text style={[t.text.body, { marginTop: t.sp(1.5), maxWidth: '86%' }]} numberOfLines={2}>
          {d.subtitle}
        </Text>
      ) : null}

      {d.amount ? (
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: t.sp(4),
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: t.sp(2),
            paddingVertical: t.sp(2),
            paddingHorizontal: t.sp(3.5),
            borderRadius: t.radius.md,
            backgroundColor: alpha(t.c.warning, t.isDark ? 0.14 : 0.12),
          }}
        >
          <Text style={[t.text.amount, { color: t.c.warning, fontSize: 20 }]}>{d.amount}</Text>
          <Text style={[t.text.micro, { color: t.c.warning }]}>gift credit</Text>
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(4), gap: t.sp(2) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} tone="warning" compact={compact} />
          {!compact && d.footnote ? (
            <Text style={[t.text.body, { fontSize: 11.5 }]} numberOfLines={2}>
              {d.footnote}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/* ---------------------------------------------------------- anniversary ---- */
/* A milestone reads as a numeral in a ring, not as another offer card. */

function MilestoneRing({ value, color, track }: { value: string; color: string; track: string }) {
  const size = 62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 3} stroke={track} strokeWidth={2} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${2 * Math.PI * (size / 2 - 3) * 0.72} ${2 * Math.PI * (size / 2 - 3)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 24, fontWeight: '700', color, letterSpacing: -0.8 }}>{value}</Text>
    </View>
  );
}

export function AnniversaryWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;

  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(3.5) }}>
        {d.amount ? <MilestoneRing value={d.amount} color={t.c.primary} track={t.c.surfaceAlt} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {d.badge ? <Badge label={d.badge} tone="primary" /> : null}
          <Text style={[t.text.title, { marginTop: d.badge ? t.sp(2) : 0 }]} numberOfLines={2}>
            {d.title}
          </Text>
          {d.subtitle ? (
            <Text style={[t.text.body, { marginTop: 2 }]} numberOfLines={1}>
              {d.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {!compact && d.stats?.length ? (
        <View style={{ marginTop: t.sp(3.5), paddingTop: t.sp(3), borderTopWidth: 1, borderTopColor: t.hairline }}>
          <StatStrip stats={d.stats} />
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="link" />
        </View>
      ) : null}
    </Card>
  );
}
