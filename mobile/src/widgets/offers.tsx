import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { Badge, CardHead, Cta, Meter, StatStrip } from '../ui/primitives';
import { useTheme } from '../theme/ThemeProvider';
import { mix } from '../theme/color';
import { normaliseProgress, splitTitleAmount, WidgetProps } from './types';

/* ---------------------------------------------------------- loan_offer ----- */
/* Amount-forward: the sanctioned number is the whole point of the card. */

export function LoanOfferWidget({ widget, compact, hero, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const { title, amount } = splitTitleAmount(d.title, d.amount);

  return (
    <Card level={hero ? 2 : 1} style={hero ? { padding: t.sp(5) } : undefined}>
      <CardHead
        icon={d.icon ?? 'loan'}
        tone="primary"
        title={title}
        subtitle={d.subtitle}
        badge={d.badge}
        compact={compact}
        iconSize={hero ? 40 : 34}
      />

      {amount ? (
        <Text
          style={[
            hero ? t.text.display : t.text.amount,
            { marginTop: t.sp(hero ? 4 : 3), fontVariant: ['tabular-nums'] },
          ]}
          numberOfLines={1}
        >
          {amount}
        </Text>
      ) : null}

      {!compact && d.stats?.length ? (
        <View style={{ marginTop: t.sp(4), paddingTop: t.sp(3.5), borderTopWidth: 1, borderTopColor: t.hairline }}>
          <StatStrip stats={d.stats} />
        </View>
      ) : null}

      {d.cta ? (
        <View
          style={{
            marginTop: 'auto',
            paddingTop: t.sp(4),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.sp(3),
            flexWrap: 'wrap',
          }}
        >
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} compact={compact} />
          {!compact && d.footnote ? (
            <Text style={[t.text.body, { fontSize: 11.5, flexShrink: 1 }]} numberOfLines={2}>
              {d.footnote}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------- credit_card_offer ------ */
/* Product-object forward: a small plastic-card rendering carries the identity. */

function MiniCard({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 86,
        height: 54,
        borderRadius: t.radius.md,
        backgroundColor: mix(t.c.surface, t.c.primary, t.isDark ? 0.28 : 0.14),
        borderWidth: 1,
        borderColor: mix(t.c.border, t.c.primary, 0.35),
        padding: 8,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ width: 14, height: 10, borderRadius: 2.5, backgroundColor: t.c.warning, opacity: 0.85 }} />
      <View style={{ gap: 3 }}>
        <View style={{ height: 3, width: '70%', borderRadius: 2, backgroundColor: t.c.text, opacity: 0.22 }} />
        <View style={{ height: 3, width: '45%', borderRadius: 2, backgroundColor: t.c.text, opacity: 0.14 }} />
      </View>
      <Text style={[t.text.micro, { color: t.c.text, opacity: 0.55, fontSize: 8 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function CreditCardOfferWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;

  return (
    <Card>
      <View
        style={{
          flexDirection: compact ? 'column' : 'row',
          gap: t.sp(3.5),
          alignItems: compact ? 'stretch' : 'center',
        }}
      >
        <MiniCard label={d.title} />
        <View style={{ flex: compact ? undefined : 1, minWidth: 0 }}>
          {d.badge ? <Badge label={d.badge} tone="success" /> : null}
          <Text style={[t.text.title, { marginTop: d.badge ? t.sp(2) : 0 }]} numberOfLines={2}>
            {d.title}
          </Text>
          {d.subtitle ? (
            <Text style={[t.text.body, { marginTop: 2 }]} numberOfLines={3}>
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
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3.5) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="quiet" compact />
        </View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ fd ----- */
/* Rate-forward with a tenure ladder: this is a yield decision, not an offer. */

export function FdWidget({ widget, compact, hero, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const ladder = d.items ?? [];
  const { title, amount } = splitTitleAmount(d.title, d.amount);
  const isRate = !!amount && amount.includes('%');

  return (
    <Card level={hero ? 2 : 1} style={hero ? { padding: t.sp(5) } : undefined}>
      <CardHead
        icon={d.icon ?? 'fd'}
        tone="success"
        title={title}
        subtitle={d.subtitle}
        badge={d.badge}
        badgeTone="neutral"
        compact={compact}
      />

      {amount ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.sp(1.5), marginTop: t.sp(3.5) }}>
          <Text style={[hero ? t.text.display : t.text.amount, { color: t.c.success, fontVariant: ['tabular-nums'] }]}>
            {amount}
          </Text>
          {isRate ? <Text style={t.text.micro}>per annum</Text> : null}
        </View>
      ) : null}

      {!compact && ladder.length ? (
        <View style={{ flexDirection: 'row', gap: t.sp(2), marginTop: t.sp(3.5) }}>
          {ladder.map((rung) => {
            const best = !!rung.meta;
            return (
              <View
                key={rung.label}
                style={{
                  flex: 1,
                  paddingVertical: t.sp(2),
                  paddingHorizontal: t.sp(2),
                  borderRadius: t.radius.sm,
                  backgroundColor: best ? t.wash(t.c.success, 1) : t.c.surfaceAlt,
                  borderWidth: 1,
                  borderColor: best ? t.wash(t.c.success, 2.5) : 'transparent',
                }}
              >
                <Text style={[t.text.micro, { fontSize: 9.5, letterSpacing: 0.4 }]} numberOfLines={1}>
                  {rung.label}
                </Text>
                <Text
                  style={[t.text.label, { marginTop: 3, fontSize: 13, color: best ? t.c.success : t.c.text }]}
                  numberOfLines={1}
                >
                  {rung.value}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(4) }}>
          <Cta
            label={d.cta.label}
            onPress={() => onCta(d.cta!)}
            tone="success"
            variant={hero ? 'solid' : 'quiet'}
            compact={!hero}
          />
        </View>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------- pledge ----- */
/* Headroom-forward: how much of what you already hold can be unlocked. */

export function PledgeWidget({ widget, compact, onCta }: WidgetProps) {
  const t = useTheme();
  const d = widget.data;
  const progress = normaliseProgress(d.progress);
  const { title, amount } = splitTitleAmount(d.title, d.amount);

  return (
    <Card>
      <CardHead
        icon={d.icon ?? 'pledge'}
        tone="primary"
        title={title}
        subtitle={d.subtitle}
        badge={d.badge}
        compact={compact}
      />

      {amount ? (
        <View style={{ marginTop: t.sp(3.5) }}>
          <Text style={t.text.micro}>Available to borrow</Text>
          <Text style={[t.text.amount, { marginTop: 3, fontVariant: ['tabular-nums'] }]}>{amount}</Text>
        </View>
      ) : null}

      {progress !== null ? (
        <View style={{ marginTop: t.sp(3) }}>
          <Meter value={progress} />
          {d.progressLabel ? (
            <Text style={[t.text.body, { fontSize: 11.5, marginTop: t.sp(1.5) }]} numberOfLines={1}>
              {d.progressLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!compact && d.stats?.length ? (
        <View style={{ marginTop: t.sp(3.5) }}>
          <StatStrip stats={d.stats} />
        </View>
      ) : null}

      {d.cta ? (
        <View style={{ marginTop: 'auto', paddingTop: t.sp(3.5) }}>
          <Cta label={d.cta.label} onPress={() => onCta(d.cta!)} variant="quiet" compact />
        </View>
      ) : null}
    </Card>
  );
}
