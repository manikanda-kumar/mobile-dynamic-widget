import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

/**
 * Fires once, the first time the host node is actually visible.
 *
 * On web this uses IntersectionObserver (which accounts for clipping by scrolling
 * ancestors, so off-screen carousel cards do not count). Anywhere else it falls
 * back to a short post-mount timer.
 */
export function useImpression(key: string, onVisible: () => void) {
  const ref = useRef<View | null>(null);
  const fired = useRef<string | null>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;

  const fire = useCallback(() => {
    if (fired.current === key) return;
    fired.current = key;
    cb.current();
  }, [key]);

  useEffect(() => {
    fired.current = null;
    let cancelled = false;
    const safeFire = () => {
      if (!cancelled) fire();
    };

    if (Platform.OS === 'web' && typeof IntersectionObserver !== 'undefined') {
      const node = ref.current as unknown as Element | null;
      if (node && typeof (node as Element).getBoundingClientRect === 'function') {
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                safeFire();
                io.disconnect();
              }
            }
          },
          { threshold: [0, 0.35, 0.75] },
        );
        io.observe(node);
        return () => {
          cancelled = true;
          io.disconnect();
        };
      }
    }

    const t = setTimeout(safeFire, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, fire]);

  return ref;
}
