import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { Cta, Delta, RowList, Sparkline, StatStrip } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { WidgetProps } from './types';

/* -------------------------------------------------------------- payments --- */
/* A ledger, not a pitch: rows, due dates, a total, one action. */

export function PaymentsWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const rows = d.items ?? [];

  return (
    <Card>
      <View
        style={{
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'flex-start',
          justifyContent: 'space-between',
          gap: compact ? t.sp(2.5) : t.sp(3),
        }}
      >
        <View style={{ flex: compact ? undefined : 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2) }}>
            <Icon name={d.icon ?? 'payments'} color={t.c.textMuted} size={15} />
            <Text style={[t.text.title, { flex: 1, fontSize: compact ? 14.5 : 16 }]} numberOfLines={2}>
              {d.title}
            </Text>
          </View>
          {d.subtitle ? (
            <Text style={[t.text.body, { marginTop: 3 }]} numberOfLines={2}>
              {d.subtitle}
            </Text>
          ) : null}
        </View>
        {d.amount ? (
          <View style={{ alignItems: compact ? 'flex-start' : 'flex-end' }}>
            <Text style={t.text.micro}>Total</Text>
            <Text style={[t.text.label, { fontSize: 15, marginTop: 2, fontVariant: ['tabular-nums'] }]}>
              {d.amount}
            </Text>
          </View>
        ) : null}
      </View>

      {!compact && rows.length ? (
        <View style={{ marginTop: t.sp(3), paddingTop: t.sp(1), borderTopWidth: 1, borderTopColor: t.hairline }}>
          <RowList items={rows} emphasis={(i) => (/autopay/i.test(i.meta ?? '') ? 'success' : undefined)} />
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3.5) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} compact />
        </View>
      ) : null}
    </Card>
  );
}

/* ----------------------------------------------------------- investments --- */
/* Portfolio value, movement, trend and allocation: the densest card by design. */

function AllocationBar({ stats }: { stats: { label: string; value: string }[] }) {
  const t = useTheme();
  const parsed = stats
    .map((s) => ({ label: s.label, pct: parseFloat(s.value) }))
    .filter((s) => Number.isFinite(s.pct) && s.pct > 0);
  const total = parsed.reduce((sum, s) => sum + s.pct, 0);
  if (parsed.length < 2 || total <= 0) return <StatStrip stats={stats} />;

  const palette = [t.c.primary, t.c.success, t.c.warning, t.c.danger];

  return (
    <View>
      <View style={{ flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        {parsed.map((s, i) => (
          <View key={s.label} style={{ flex: s.pct / total, backgroundColor: palette[i % palette.length] }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.sp(3.5), marginTop: t.sp(2.5) }}>
        {parsed.map((s, i) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette[i % palette.length] }} />
            <Text style={[t.text.body, { fontSize: 11.5, color: t.c.text }]}>{s.label}</Text>
            <Text style={[t.text.body, { fontSize: 11.5 }]}>{Math.round(s.pct)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InvestmentsWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const series = d.series ?? null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.sp(2.5) }}>
        <Text style={[t.text.label, { flex: 1, color: t.c.textMuted, fontWeight: '600' }]} numberOfLines={2}>
          {d.title}
        </Text>
        <Icon name={d.icon ?? 'investments'} color={t.c.textMuted} size={15} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.sp(3), marginTop: t.sp(2.5), flexWrap: 'wrap' }}>
        {d.amount ? (
          <Text style={[t.text.display, { fontSize: 25, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
            {d.amount}
          </Text>
        ) : null}
        {d.delta ? <Delta label={d.delta} direction={d.deltaDirection ?? 'up'} /> : null}
      </View>

      {d.subtitle ? (
        <Text style={[t.text.body, { marginTop: 2 }]} numberOfLines={1}>
          {d.subtitle}
        </Text>
      ) : null}

      {series?.length ? (
        <View style={{ marginTop: t.sp(3) }}>
          <Sparkline series={series} color={d.deltaDirection === 'down' ? t.c.danger : t.c.primary} height={compact ? 38 : 54} />
        </View>
      ) : null}

      {!compact && d.stats?.length ? (
        <View style={{ marginTop: t.sp(3.5), paddingTop: t.sp(3), borderTopWidth: 1, borderTopColor: t.hairline }}>
          <AllocationBar stats={d.stats} />
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3.5) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="link" />
        </View>
      ) : null}
    </Card>
  );
}
