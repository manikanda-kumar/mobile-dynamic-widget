import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, fetchManifest, fetchUsers } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { FIXTURE_USERS, fixtureManifest } from '../api/fixture';
import type { DemoUser, Manifest } from '../types/manifest';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { RenderProvider } from '../render/RenderContext';
import { SectionRenderer } from '../render/SectionRenderer';
import { Header } from '../components/Header';
import { ApiErrorBanner, EmptyState, LoadingState } from '../components/StateViews';
import { MISSING_WIDGET_TYPES } from '../widgets/registry';

const DEFAULT_USER = 'u_priya';

export function HomeScreen() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [userId, setUserId] = useState(DEFAULT_USER);
  const [debug, setDebug] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<{ url: string; detail: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (MISSING_WIDGET_TYPES.length) {
      console.warn(`[DXP] Widget registry is missing types: ${MISSING_WIDGET_TYPES.join(', ')}`);
    }
  }, []);

  /* Demo user list. Falls back to the bundled roster so the switcher still works
     with the backend down. */
  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((list) => {
        if (!cancelled && list.length) setUsers(list);
        else if (!cancelled) setUsers(FIXTURE_USERS);
      })
      .catch(() => {
        if (!cancelled) setUsers(FIXTURE_USERS);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchManifest(userId, debug);
      setManifest(m);
      setApiError(null);
    } catch (err) {
      const e = err as ApiError;
      setApiError({ url: e.url ?? `${API_BASE_URL}/api/v1/manifest`, detail: e.message ?? 'request failed' });
      // Never a blank screen: render the bundled fixture for the same user.
      setManifest(fixtureManifest(userId, debug));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, debug]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <ThemeProvider theme={manifest?.theme}>
      <RenderProvider userId={userId} debug={debug} experiments={manifest?.experiments ?? []}>
        <Shell
          users={users.length ? users : FIXTURE_USERS}
          userId={userId}
          manifest={manifest}
          debug={debug}
          loading={loading}
          refreshing={refreshing}
          apiError={apiError}
          onSelectUser={setUserId}
          onToggleDebug={() => setDebug((d) => !d)}
          onRefresh={onRefresh}
        />
      </RenderProvider>
    </ThemeProvider>
  );
}

function Shell({
  users,
  userId,
  manifest,
  debug,
  loading,
  refreshing,
  apiError,
  onSelectUser,
  onToggleDebug,
  onRefresh,
}: {
  users: DemoUser[];
  userId: string;
  manifest: Manifest | null;
  debug: boolean;
  loading: boolean;
  refreshing: boolean;
  apiError: { url: string; detail: string } | null;
  onSelectUser: (id: string) => void;
  onToggleDebug: () => void;
  onRefresh: () => void;
}) {
  const t = useTheme();

  // Keep the browser canvas in step with the manifest theme.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = t.c.background;
    }
  }, [t.c.background]);

  const totals = useMemo(() => {
    const sections = manifest?.sections ?? [];
    return { sections: sections.length, widgets: sections.reduce((n, s) => n + s.widgets.length, 0) };
  }, [manifest]);

  const hasContent = (manifest?.sections?.length ?? 0) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.c.background, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: t.c.surface }}>
          <Header
            users={users}
            userId={userId}
            manifest={manifest}
            debug={debug}
            loading={loading}
            onSelectUser={onSelectUser}
            onToggleDebug={onToggleDebug}
            onRefresh={onRefresh}
          />
        </SafeAreaView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: t.sp(5), paddingBottom: t.sp(14) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.c.textMuted} />}
        >
          {apiError ? (
            <ApiErrorBanner apiUrl={apiError.url} detail={apiError.detail} onRetry={onRefresh} />
          ) : null}

          {loading && !manifest ? (
            <LoadingState />
          ) : hasContent ? (
            <View style={{ paddingTop: apiError ? t.sp(5) : 0 }}>
              {/* Order, grouping and layout are the server's decision. The renderer
                  walks `sections` exactly as received. */}
              {manifest!.sections.map((section) => (
                <SectionRenderer key={section.id} section={section} />
              ))}
            </View>
          ) : (
            <EmptyState userId={userId} />
          )}

          {manifest ? (
            <View style={{ paddingHorizontal: t.gutter, paddingTop: t.sp(2), gap: 3 }}>
              <Text style={t.text.mono} numberOfLines={1}>
                manifest v{manifest.version} · {totals.sections} sections · {totals.widgets} widgets ·{' '}
                {manifest.userId}
              </Text>
              <Text style={[t.text.mono, { fontSize: 10 }]} numberOfLines={1}>
                {apiError ? 'source: bundled fixture' : `source: ${API_BASE_URL}`}
                {manifest.generatedAt ? ` · ${manifest.generatedAt}` : ''}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}
