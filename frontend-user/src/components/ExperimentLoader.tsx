"use client";

import { lazy, Suspense, useMemo } from "react";
import type { ExperimentId } from "@/experiments/registry";
import { getExperimentEntry } from "@/experiments/registry";
import LoadingScreen from "@/components/LoadingScreen";

function ExperimentLoading() {
  return <LoadingScreen title="正在加载实验…" hint="初始化 3D 场景与物理引擎" />;
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
