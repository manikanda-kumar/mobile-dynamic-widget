import React, { createContext, useContext, useMemo } from 'react';
import type { ExperimentAssignment } from '../types/manifest';

export interface RenderContextValue {
  userId: string;
  debug: boolean;
  experiments: ExperimentAssignment[];
  variantFor: (experimentId?: string | null) => string | null;
}

const RenderContext = createContext<RenderContextValue>({
  userId: 'anon',
  debug: false,
  experiments: [],
  variantFor: () => null,
});

export function RenderProvider({
  userId,
  debug,
  experiments,
  children,
}: {
  userId: string;
  debug: boolean;
  experiments: ExperimentAssignment[];
  children: React.ReactNode;
}) {
  const value = useMemo<RenderContextValue>(
    () => ({
      userId,
      debug,
      experiments,
      variantFor: (experimentId) =>
        experimentId ? (experiments.find((e) => e.id === experimentId)?.variant ?? null) : null,
    }),
    [userId, debug, experiments],
  );
  return <RenderContext.Provider value={value}>{children}</RenderContext.Provider>;
}

export function useRenderContext(): RenderContextValue {
  return useContext(RenderContext);
}
