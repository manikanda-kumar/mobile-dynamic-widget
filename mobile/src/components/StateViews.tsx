import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Cta } from '../ui/primitives';
import { Card } from '../ui/Card';
import { alpha } from '../theme/color';

/** Shown while the first manifest is in flight. Mirrors the real card rhythm. */
export function LoadingState() {
  const t = useTheme();
  const block = (h: number, w: string | number = '100%', mt = 0) => (
    <View
      style={{
        height: h,
        width: w as number,
        marginTop: mt,
        borderRadius: t.radius.sm,
        backgroundColor: alpha(t.c.text, t.isDark ? 0.06 : 0.05),
      }}
    />
  );
  return (
    <View style={{ paddingHorizontal: t.gutter, paddingTop: t.sp(5), gap: t.sp(4) }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} level={0}>
          {block(12, '35%')}
          {block(26, '62%', t.sp(3))}
          {block(10, '80%', t.sp(3))}
          {block(10, '55%', t.sp(2))}
        </Card>
      ))}
    </View>
  );
}

/**
 * The API is unreachable. The screen still renders (bundled fixture), but the
 * failure is stated plainly, with the exact URL that failed.
 */
export function ApiErrorBanner({
  apiUrl,
  detail,
  onRetry,
}: {
  apiUrl: string;
  detail: string;
  onRetry: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.gutter, paddingTop: t.sp(4) }}>
      <View
        style={{
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: alpha(t.c.danger, 0.35),
          backgroundColor: t.wash(t.c.danger, 0.9),
          padding: t.sp(3.5),
          gap: t.sp(2),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.sp(2) }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.c.danger }} />
          <Text style={[t.text.label, { color: t.c.danger, fontSize: 13 }]}>Backend unreachable</Text>
        </View>
        <Text style={[t.text.body, { color: t.c.text, fontSize: 12.5 }]}>
          Showing bundled demo data. Start the Go server, then retry.
        </Text>
        <Text style={t.text.mono} numberOfLines={2}>
          {apiUrl} — {detail}
        </Text>
        <Cta label="Retry" onPress={onRetry} tone="danger" variant="quiet" compact />
      </View>
    </View>
  );
}

export function EmptyState({ userId }: { userId: string }) {
  const t = useTheme();
  return (
    <View style={{ padding: t.gutter, paddingTop: t.sp(12), alignItems: 'center', gap: t.sp(2) }}>
      <Text style={[t.text.title, { textAlign: 'center' }]}>Nothing to show</Text>
      <Text style={[t.text.body, { textAlign: 'center', maxWidth: 280 }]}>
        The manifest for {userId} contained no renderable sections. Rules or feature flags may have
        filtered everything out.
      </Text>
    </View>
  );
}
