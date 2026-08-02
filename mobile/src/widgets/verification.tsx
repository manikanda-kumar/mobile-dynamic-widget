import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card } from '../ui/Card';
import { Badge, CardHead, Cta, IconTile, Meter } from '../ui/primitives';
import { useTheme } from '../theme/ThemeProvider';
import { normaliseProgress, WidgetProps } from './types';

/* ------------------------------------------------------------------ kyc ---- */
/* Task-style: a checklist with real progress, not a marketing card. */

function CheckDot({ done }: { done: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 17,
        height: 17,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? t.c.success : 'transparent',
        borderWidth: done ? 0 : 1.4,
        borderColor: t.c.border,
      }}
    >
      {done ? (
        <Svg width={9} height={9} viewBox="0 0 10 10">
          <Path d="M1.4 5.2 3.9 7.7 8.6 2.4" stroke={t.c.onPrimary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

export function KycWidget({ widget, compact, hero, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const progress = normaliseProgress(d.progress);
  const steps = d.items ?? [];
  const isDone = (v: string) => /done|verified|complete/i.test(v);

  return (
    <Card level={hero ? 2 : 1} style={hero ? { padding: t.sp(5) } : undefined}>
      <CardHead
        icon={d.icon ?? 'kyc'}
        tone="warning"
        title={d.title}
        subtitle={d.subtitle}
        badge={d.badge}
        compact={compact}
        iconSize={hero ? 40 : 34}
        titleStyle={hero ? { fontSize: 19, lineHeight: 24 } : undefined}
      />

      {progress !== null ? (
        <View style={{ marginTop: t.sp(4) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: t.sp(1.5) }}>
            <Text style={t.text.micro}>{d.progressLabel ?? 'Progress'}</Text>
            <Text style={[t.text.label, { fontSize: 12, color: t.c.warning, fontVariant: ['tabular-nums'] }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <Meter value={progress} tone="warning" />
        </View>
      ) : null}

      {!compact && steps.length ? (
        <View style={{ marginTop: t.sp(4), gap: t.sp(2.5) }}>
          {steps.map((s) => {
            const done = isDone(s.value);
            return (
              <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2.5) }}>
                <CheckDot done={done} />
                <Text
                  style={[
                    t.text.label,
                    { fontWeight: '500', flex: 1, color: done ? t.c.textMuted : t.c.text },
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
                <Text style={[t.text.micro, { color: done ? t.c.success : t.c.warning }]}>{s.value}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(4) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} tone="warning" compact={!hero} />
        </View>
      ) : null}
    </Card>
  );
}

/* ----------------------------------------------------------------- vkyc ---- */
/* Appointment-style: the value is the slot, so the slot gets the emphasis. */

export function VkycWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const slots = d.stats ?? [];

  return (
    <Card>
      <CardHead
        icon={d.icon ?? 'vkyc'}
        tone="primary"
        title={d.title}
        subtitle={d.subtitle}
        badge={d.badge}
        compact={compact}
      />

      {!compact && slots.length ? (
        <View style={{ flexDirection: 'row', gap: t.sp(2.5), marginTop: t.sp(3.5) }}>
          {slots.map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: t.c.surfaceAlt,
                borderRadius: t.radius.sm,
                paddingVertical: t.sp(2.5),
                paddingHorizontal: t.sp(3),
              }}
            >
              <Text style={[t.text.micro, { fontSize: 9.5 }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={[t.text.label, { marginTop: 3, fontSize: 14 }]} numberOfLines={1}>
                {s.value}
              </Text>
            </View>
          ))}
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

/* ----------------------------------------------- email_verification -------- */
/* Deliberately the lightest card on the screen: a nag, not a product. */

export function EmailVerificationWidget({ widget, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;

  return (
    <Card level={0} style={{ backgroundColor: t.c.surfaceAlt, borderColor: 'transparent', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile name={d.icon ?? 'email'} tone="warning" size={30} />
        {d.badge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.c.warning }} />
            <Text style={t.text.micro}>{d.badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[t.text.label, { marginTop: t.sp(3), fontSize: 13.5 }]} numberOfLines={2}>
        {d.title}
      </Text>
      {d.subtitle ? (
        <Text style={[t.text.mono, { marginTop: 3 }]} numberOfLines={1}>
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

/* ---------------------------------------------- mobile_verification -------- */
/* Same family as email, different affordance: the OTP boxes say "type here". */

export function MobileVerificationWidget({ widget, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;

  return (
    <Card level={0} style={{ backgroundColor: t.c.surfaceAlt, borderColor: 'transparent', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile name={d.icon ?? 'mobile'} tone="primary" size={30} />
        {d.badge ? <Badge label={d.badge} tone="primary" /> : null}
      </View>

      <Text style={[t.text.label, { marginTop: t.sp(3), fontSize: 13.5 }]} numberOfLines={2}>
        {d.title}
      </Text>
      {d.subtitle ? (
        <Text style={[t.text.mono, { marginTop: 3 }]} numberOfLines={1}>
          {d.subtitle}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 5, marginTop: t.sp(3) }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 24,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: t.c.border,
              backgroundColor: t.c.surface,
            }}
          />
        ))}
      </View>

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="link" />
        </View>
      ) : null}
    </Card>
  );
}
