import type { ComponentType } from "react";

export interface ExperimentMetadata {
  title: string;
  description: string;
}

interface ExperimentRegistryEntry {
  loadPage: () => Promise<{ default: ComponentType }>;
  loadDetails: () => Promise<{ default: ComponentType }>;
  metadata: ExperimentMetadata;
}

export const experimentRegistry = {
  "double-slit": {
    loadPage: () => import("@/experiments/double-slit-page"),
    loadDetails: () => import("@/experiments/details/double-slit-details"),
    metadata: {
      title: "双缝实验 - 交互式物理实验室",
      description: "交互式 3D 双缝实验，可视化干涉条纹与强度分布。",
    },
  },
  "wave-mechanics": {
    loadPage: () => import("@/experiments/wave-mechanics-page"),
    loadDetails: () => import("@/experiments/details/wave-mechanics-details"),
    metadata: {
      title: "横波与纵波 - 交互式物理实验",
      description:
        "3D 对比横波与纵波：同步调节频率、振幅、波长，观察波前、疏密区与相位关系。",
    },
  },
  "general-relativity": {
    loadPage: () => import("@/experiments/general-relativity-page"),
    loadDetails: () => import("@/experiments/details/general-relativity-details"),
    metadata: {
      title: "广义相对论 · 史瓦西黑洞 - 交互式物理实验",
      description:
        "在 3D 场景中探索弯曲时空、测地线轨道、引力透镜与引力红移。",
    },
  },
  doppler: {
    loadPage: () => import("@/experiments/doppler-page"),
    loadDetails: () => import("@/experiments/details/doppler-details"),
    metadata: {
      title: "多普勒效应 - 交互式物理实验室",
      description: "交互式 3D 多普勒效应模拟，实时可视化频率变化。",
    },
  },
  "bernoulli-venturi": {
    loadPage: () => import("@/experiments/bernoulli-venturi-page"),
    loadDetails: () => import("@/experiments/details/bernoulli-venturi-details"),
    metadata: {
      title: "伯努利原理 - 文丘里管 - Interactive Physics Lab",
      description: "交互式 3D 文丘里管实验，演示伯努利原理与连续性方程。",
    },
  },
  "special-relativity": {
    loadPage: () => import("@/experiments/special-relativity-page"),
    loadDetails: () => import("@/experiments/details/special-relativity-details"),
    metadata: {
      title: "狭义相对论实验室 - Interactive Physics Lab",
      description: "交互式 3D 狭义相对论实验，演示长度收缩、时间膨胀与相对论质量。",
    },
  },
} as const satisfies Record<string, ExperimentRegistryEntry>;

export type ExperimentId = keyof typeof experimentRegistry;

export function isValidExperimentId(id: string): id is ExperimentId {
  return id in experimentRegistry;
}

export function getExperimentEntry(id: string) {
  if (!isValidExperimentId(id)) return null;
  return experimentRegistry[id];
}

export function getExperimentMetadata(id: string): ExperimentMetadata | null {
  return getExperimentEntry(id)?.metadata ?? null;
}

export function getAllExperimentIds(): ExperimentId[] {
  return Object.keys(experimentRegistry) as ExperimentId[];
}
