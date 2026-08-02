import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { DemoUser, Manifest } from '../types/manifest';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../ui/Icon';
import { alpha } from '../theme/color';
import { useAnalyticsStats } from '../analytics/AnalyticsProvider';

/* Demo affordances only. Nothing here influences what the screen renders — the
   manifest does. These controls just change which manifest is requested. */

function ControlButton({
  label,
  icon,
  active,
  onPress,
  busy,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  onPress: () => void;
  busy?: boolean;
}) {
  const t = useTheme();
  const color = active ? t.c.primary : t.c.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.sp(1.5),
        paddingHorizontal: t.sp(2.5),
        height: 30,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: active ? alpha(t.c.primary, 0.4) : t.c.border,
        backgroundColor: active ? t.wash(t.c.primary, 1) : 'transparent',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} color={color} size={13} strokeWidth={1.7} />
      ) : null}
      <Text style={[t.text.micro, { color, letterSpacing: 0.4 }]}>{label}</Text>
    </Pressable>
  );
}

export function Header({
  users,
  userId,
  manifest,
  debug,
  loading,
  onSelectUser,
  onToggleDebug,
  onRefresh,
}: {
  users: DemoUser[];
  userId: string;
  manifest: Manifest | null;
  debug: boolean;
  loading: boolean;
  onSelectUser: (id: string) => void;
  onToggleDebug: () => void;
  onRefresh: () => void;
}) {
  const t = useTheme();
  const stats = useAnalyticsStats();
  const experiments = manifest?.experiments ?? [];

  return (
    <View
      style={{
        backgroundColor: t.c.surface,
        borderBottomWidth: 1,
        borderBottomColor: t.c.border,
        paddingTop: t.sp(3),
        paddingBottom: t.sp(2.5),
      }}
    >
      <View
        style={{
          paddingHorizontal: t.gutter,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t.sp(3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2.5), flexShrink: 1 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: t.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.wash(t.c.primary, 1.2),
            }}
          >
            <Icon name="layers" color={t.c.primary} size={16} strokeWidth={1.6} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[t.text.title, { fontSize: 15 }]} numberOfLines={1}>
              Home
            </Text>
            <Text style={[t.text.micro, { marginTop: 1 }]} numberOfLines={1}>
              {manifest ? `${manifest.layout} · v${manifest.version} · ${manifest.theme?.name ?? 'theme'}` : 'loading manifest'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2) }}>
          <ControlButton label="Debug" active={debug} onPress={onToggleDebug} />
          <ControlButton label="Refresh" icon="refresh" onPress={onRefresh} busy={loading} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: t.gutter, gap: t.sp(2), paddingTop: t.sp(2.5) }}
      >
        {users.map((u) => {
          const active = u.id === userId;
          return (
            <Pressable
              key={u.id}
              onPress={() => onSelectUser(u.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                paddingHorizontal: t.sp(3),
                paddingVertical: t.sp(2),
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: active ? alpha(t.c.primary, 0.45) : t.c.border,
                backgroundColor: active ? t.wash(t.c.primary, 1) : t.c.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.sp(2),
              })}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? t.c.primary : alpha(t.c.textMuted, 0.22),
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: active ? t.c.onPrimary : t.c.textMuted }}>
                  {u.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text
                style={[t.text.label, { fontSize: 12.5, color: active ? t.c.primary : t.c.text }]}
                numberOfLines={1}
              >
                {u.name}
              </Text>
              {u.segment ? (
                <Text style={[t.text.micro, { fontSize: 9.5, color: active ? t.c.primary : t.c.textMuted }]}>
                  {u.segment}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {experiments.length || debug ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: t.gutter,
            paddingTop: t.sp(2.5),
            alignItems: 'center',
            gap: t.sp(2),
          }}
        >
          {experiments.map((e) => (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.sp(1.5),
                paddingHorizontal: t.sp(2),
                paddingVertical: 2,
                borderRadius: t.radius.sm,
                backgroundColor: t.wash(t.c.primary, 1),
              }}
            >
              <Text style={[t.text.mono, { fontSize: 9.5, color: t.c.primary }]} numberOfLines={1}>
                {e.id.replace(/^exp_/, '')}
              </Text>
              <Text style={[t.text.micro, { fontSize: 9.5, color: t.c.primary }]} numberOfLines={1}>
                {e.variant}
                {debug && typeof e.bucket === 'number' ? ` · b${e.bucket}` : ''}
              </Text>
            </View>
          ))}
          {debug ? (
            <Text style={[t.text.mono, { fontSize: 9.5 }]} numberOfLines={1}>
              events q{stats.queued} · sent {stats.sent}
              {stats.failed ? ` · failed ${stats.failed}` : ''}
            </Text>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}
