import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { Cta, Delta, Meter, Sparkline } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { normaliseProgress, WidgetProps } from './types';

/* --------------------------------------------------------------- rewards --- */
/* Balance plus the distance to the next tier: the ladder is the motivation. */

export function RewardsWidget({ widget, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const progress = normaliseProgress(d.progress);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.sp(2.5) }}>
        <Text style={[t.text.label, { flex: 1, color: t.c.textMuted, fontWeight: '600' }]} numberOfLines={2}>
          {d.title}
        </Text>
        <Icon name={d.icon ?? 'rewards'} color={t.c.primary} size={16} />
      </View>

      {d.amount ? (
        <Text style={[t.text.amount, { marginTop: t.sp(2.5), fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
          {d.amount}
        </Text>
      ) : null}

      {d.delta ? (
        <View style={{ marginTop: t.sp(1.5) }}>
          <Delta label={d.delta} direction={d.deltaDirection ?? 'up'} />
        </View>
      ) : null}

      {progress !== null ? (
        <View style={{ marginTop: t.sp(3) }}>
          <Meter value={progress} height={5} />
        </View>
      ) : null}

      {d.subtitle ? (
        <Text style={[t.text.body, { fontSize: 11.5, marginTop: t.sp(2) }]} numberOfLines={2}>
          {d.subtitle}
        </Text>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="link" />
        </View>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------- cashback --- */
/* Value earned over time: the trend line is the story, so it gets the space. */

export function CashbackWidget({ widget, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const series = d.series ?? null;

  return (
    <Card padded={false}>
      <View style={{ padding: t.sp(4), paddingBottom: series?.length ? t.sp(2) : t.sp(4), flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.sp(2.5) }}>
          <Text style={[t.text.label, { flex: 1, color: t.c.textMuted, fontWeight: '600' }]} numberOfLines={2}>
            {d.title}
          </Text>
          <Icon name={d.icon ?? 'cashback'} color={t.c.success} size={16} />
        </View>

        {d.amount ? (
          <Text
            style={[t.text.amount, { marginTop: t.sp(2.5), color: t.c.success, fontVariant: ['tabular-nums'] }]}
            numberOfLines={1}
          >
            {d.amount}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2), marginTop: t.sp(1.5), flexWrap: 'wrap' }}>
          {d.delta ? <Delta label={d.delta} direction={d.deltaDirection ?? 'up'} /> : null}
          {d.subtitle ? (
            <Text style={[t.text.body, { fontSize: 11.5, flexShrink: 1 }]} numberOfLines={1}>
              {d.subtitle}
            </Text>
          ) : null}
        </View>

        {d.cta ? (
          <View style={{ marginTop: 'auto', paddingTop: t.sp(3) }}>
            <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="link" />
          </View>
        ) : null}
      </View>

      {series?.length ? <Sparkline series={series} color={t.c.success} height={40} /> : null}
    </Card>
  );
}
