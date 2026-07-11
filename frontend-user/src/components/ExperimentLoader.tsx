"use client";

import { lazy, Suspense, useMemo } from "react";
import type { ExperimentId } from "@/experiments/registry";
import { getExperimentEntry } from "@/experiments/registry";

function ExperimentLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center text-gray-400">
        <div className="animate-spin text-4xl mb-4">⚛️</div>
        <p>加载实验中...</p>
      </div>
    </div>
  );
}

export function ExperimentLoader({ id }: { id: ExperimentId }) {
  const LazyExperiment = useMemo(() => {
    const entry = getExperimentEntry(id);
    if (!entry) return null;
    return lazy(entry.loadPage);
  }, [id]);

  if (!LazyExperiment) return null;

  return (
    <Suspense fallback={<ExperimentLoading />}>
      <LazyExperiment />
    </Suspense>
  );
}

export function ExperimentDetailsLoader({ id }: { id: ExperimentId }) {
  const LazyDetails = useMemo(() => {
    const entry = getExperimentEntry(id);
    if (!entry) return null;
    return lazy(entry.loadDetails);
  }, [id]);

  if (!LazyDetails) return null;

  return (
    <Suspense fallback={<ExperimentLoading />}>
      <LazyDetails />
    </Suspense>
  );
}
