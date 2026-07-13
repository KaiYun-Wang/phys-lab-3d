export const DEFAULT_EXPERIMENT_COVER = "/covers/experiment-cover.png";

export interface Experiment {
  id: string;
  title: string;
  category: "physics";
  description: string;
  coverImage: string;
  color: string;
  topics: string[];
}

export const experiments: Experiment[] = [
  {
    id: "double-slit",
    title: "双缝实验",
    category: "physics",
    description:
      "见证波粒二象性。让光子通过双缝，观察证明量子力学的干涉图样。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#4f8fff",
    topics: ["量子", "波粒二象性", "干涉", "光子"],
  },
  {
    id: "wave-mechanics",
    title: "横波与纵波",
    category: "physics",
    description:
      "左右分屏对比横波与纵波，同步调节频率、振幅、波长，可视化波前、疏密与相位。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#4f8fff",
    topics: ["横波", "纵波", "波长", "频率"],
  },
  {
    id: "general-relativity",
    title: "广义相对论 · 史瓦西黑洞",
    category: "physics",
    description:
      "潜入史瓦西黑洞周围的弯曲时空。在华丽的 3D 场景中观察测地线轨道、引力透镜、引力红移与发光吸积盘。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#7c3aed",
    topics: ["广义相对论", "黑洞", "测地线", "引力透镜"],
  },
  {
    id: "doppler",
    title: "多普勒效应",
    category: "physics",
    description:
      "在3D中移动声源和观察者。观看波前压缩和膨胀，实时感受频率变化。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#4f8fff",
    topics: ["声波", "频移", "波前", "相对论"],
  },
  {
    id: "bernoulli-venturi",
    title: "伯努利原理（文丘里管）",
    category: "physics",
    description:
      "通过文丘里管探索伯努利原理：调节流速与截面积，观察流速与压强的反比关系。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#4f8fff",
    topics: ["伯努利方程", "连续性方程", "压强", "流体力学"],
  },
  {
    id: "special-relativity",
    title: "狭义相对论实验室",
    category: "physics",
    description:
      "驾驶飞船逼近光速，实时观察长度收缩、时间膨胀与相对论质量增大的经典效应。",
    coverImage: DEFAULT_EXPERIMENT_COVER,
    color: "#4f8fff",
    topics: ["洛伦兹因子", "时间膨胀", "长度收缩", "相对论质量"],
  },
];

export const categories = [
  {
    id: "physics" as const,
    name: "物理",
    color: "#4f8fff",
    description: "力、运动、波和能量",
  },
];
