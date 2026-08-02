import React, { useCallback } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import type { SectionLayout, Widget, WidgetCta, WidgetSize } from '../types/manifest';
import { resolveWidget } from '../widgets/registry';
import { useAnalytics } from '../analytics/AnalyticsProvider';
import { useImpression } from '../analytics/useImpression';
import { useRenderContext } from './RenderContext';
import { useTheme } from '../theme/ThemeProvider';

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function DebugStrip({ widget }: { widget: Widget }) {
  const t = useTheme();
  // Falls back to the manifest priority when the server has not (yet) shipped a
  // `debug` object, so the toggle is never a no-op.
  const d = widget.debug ?? {};
  const rules = d.appliedRules ?? [];

  return (
    <View
      style={{
        marginTop: t.sp(1.5),
        paddingVertical: t.sp(2),
        paddingHorizontal: t.sp(3),
        borderRadius: t.radius.sm,
        backgroundColor: t.c.surfaceAlt,
        borderWidth: 1,
        borderColor: t.c.border,
        borderStyle: 'dashed',
        gap: t.sp(1.5),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.sp(2.5) }}>
        <Text style={[t.text.micro, { color: t.c.primary }]}>P {d.finalPriority ?? widget.priority}</Text>
        <Text style={t.text.mono}>
          base {d.basePriority ?? '—'} · ml {d.mlBoost ?? 0} · {widget.type} · {widget.size ?? '—'}
        </Text>
      </View>
      {rules.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.sp(1.5) }}>
          {rules.map((r) => (
            <View
              key={r}
              style={{
                paddingHorizontal: t.sp(1.5),
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: t.wash(t.c.primary, 1),
              }}
            >
              <Text style={[t.text.mono, { color: t.c.primary, fontSize: 10 }]}>{r}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[t.text.mono, { fontSize: 10 }]}>no rules applied</Text>
      )}
    </View>
  );
}

export interface WidgetHostProps {
  widget: Widget;
  sectionId: string;
  layout: SectionLayout;
  position: number;
  compact?: boolean;
  hero?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WidgetHost({
  widget,
  sectionId,
  layout,
  position,
  compact = false,
  hero = false,
  style,
}: WidgetHostProps) {
  const { userId, debug, variantFor } = useRenderContext();
  const { track } = useAnalytics();
  const Component = resolveWidget(widget.type);

  const experimentId = widget.analytics?.experimentId ?? null;
  const variant = variantFor(experimentId);

  const onImpression = useCallback(() => {
    track(userId, {
      type: 'impression',
      widgetId: widget.id,
      widgetType: widget.type,
      experimentId,
      variant,
      meta: {
        position,
        sectionId,
        layout,
        impressionKey: widget.analytics?.impressionKey ?? null,
      },
    });
  }, [track, userId, widget.id, widget.type, widget.analytics, experimentId, variant, position, sectionId, layout]);

  const ref = useImpression(`${userId}:${widget.id}:${position}`, onImpression);

  const onCta = useCallback(
    (cta: WidgetCta) => {
      track(userId, {
        type: 'click',
        widgetId: widget.id,
        widgetType: widget.type,
        experimentId,
        variant,
        meta: { position, sectionId, action: cta.action, target: cta.target ?? null, label: cta.label },
      });
    },
    [track, userId, widget.id, widget.type, experimentId, variant, position, sectionId],
  );

  if (!Component) {
    // Server shipped a widget this build does not know about: skip it, keep going.
    warnOnce(`widget:${widget.type}`, `[DXP] Unknown widget type "${widget.type}" (id=${widget.id}) — skipped.`);
    return null;
  }

  const size: WidgetSize = (widget.size as WidgetSize) ?? '2x1';

  return (
    <View ref={ref} style={style} collapsable={false}>
      <Component widget={widget} layout={layout} size={size} compact={compact} hero={hero} onCta={onCta} />
      {debug ? <DebugStrip widget={widget} /> : null}
    </View>
  );
}
