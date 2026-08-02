import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { postAnalytics } from '../api/client';
import type { AnalyticsEvent, AnalyticsEventType } from '../types/manifest';

export const FLUSH_AT_EVENTS = 10;
export const FLUSH_AFTER_MS = 3000;

type Queued = { userId: string; event: AnalyticsEvent };

export interface AnalyticsApi {
  track: (userId: string, event: Omit<AnalyticsEvent, 'ts'> & { ts?: number }) => void;
  flush: () => void;
}

export interface AnalyticsStats {
  queued: number;
  sent: number;
  failed: number;
  lastFlushAt: number | null;
}

const ApiContext = createContext<AnalyticsApi>({ track: () => {}, flush: () => {} });
const StatsContext = createContext<AnalyticsStats>({ queued: 0, sent: 0, failed: 0, lastFlushAt: null });

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const queue = useRef<Queued[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const [stats, setStats] = useState<AnalyticsStats>({ queued: 0, sent: 0, failed: 0, lastFlushAt: null });

  const send = useCallback(async (batchItems: Queued[]) => {
    const byUser = new Map<string, AnalyticsEvent[]>();
    batchItems.forEach(({ userId, event }) => {
      const list = byUser.get(userId) ?? [];
      list.push(event);
      byUser.set(userId, list);
    });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      Array.from(byUser.entries()).map(async ([userId, events]) => {
        try {
          const accepted = await postAnalytics({ userId, events });
          sent += accepted;
        } catch {
          // Analytics is best-effort: a dead endpoint must never break the screen.
          failed += events.length;
        }
      }),
    );
    if (!mounted.current) return;
    setStats((s) => ({
      queued: queue.current.length,
      sent: s.sent + sent,
      failed: s.failed + failed,
      lastFlushAt: Date.now(),
    }));
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (queue.current.length === 0) return;
    const batchItems = queue.current;
    queue.current = [];
    void send(batchItems);
  }, [send]);

  const track = useCallback<AnalyticsApi['track']>(
    (userId, event) => {
      queue.current.push({ userId, event: { ...event, ts: event.ts ?? Date.now() } });
      setStats((s) => ({ ...s, queued: queue.current.length }));
      if (queue.current.length >= FLUSH_AT_EVENTS) {
        flush();
        return;
      }
      if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null;
          flush();
        }, FLUSH_AFTER_MS);
      }
    },
    [flush],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      // Unmount flush: drain synchronously-ish so nothing is lost on teardown.
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      const pending = queue.current;
      queue.current = [];
      if (pending.length === 0) return;
      const byUser = new Map<string, AnalyticsEvent[]>();
      pending.forEach(({ userId, event }) => {
        const list = byUser.get(userId) ?? [];
        list.push(event);
        byUser.set(userId, list);
      });
      byUser.forEach((events, userId) => {
        const body = JSON.stringify({ userId, events });
        const url = `${API_BASE_URL}/api/v1/analytics/events`;
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          try {
            navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
            return;
          } catch {
            /* fall through */
          }
        }
        void fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => undefined);
      });
    };
  }, []);

  const api = useMemo<AnalyticsApi>(() => ({ track, flush }), [track, flush]);

  return (
    <ApiContext.Provider value={api}>
      <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>
    </ApiContext.Provider>
  );
}

export function useAnalytics(): AnalyticsApi {
  return useContext(ApiContext);
}

export function useAnalyticsStats(): AnalyticsStats {
  return useContext(StatsContext);
}

export type { AnalyticsEventType };
