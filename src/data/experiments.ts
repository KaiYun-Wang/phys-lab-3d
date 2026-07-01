export interface Experiment {
  id: string;
  title: string;
  category: "physics" | "chemistry" | "biology" | "math";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  icon: string;
  color: string;
  topics: string[];
}

export const experiments: Experiment[] = [
  // ========== PHYSICS (10) ==========
  {
    id: "pendulum",
    title: "单摆运动",
    category: "physics",
    difficulty: "Beginner",
    description:
      "通过控制摆长、质量和初始角度探索简谐运动。观察重力和张力如何产生周期性振动。",
    icon: "🔄",
    color: "#4f8fff",
    topics: ["简谐运动", "重力", "周期", "振幅"],
  },
  {
    id: "projectile-motion",
    title: "抛体运动",
    category: "physics",
    difficulty: "Beginner",
    description:
      "以不同角度和速度发射抛体。可视化抛物线轨迹，理解射程、高度和飞行时间。",
    icon: "🎯",
    color: "#4f8fff",
    topics: ["运动学", "轨迹", "射程", "速度"],
  },
  {
    id: "double-slit",
    title: "双缝实验",
    category: "physics",
    difficulty: "Advanced",
    description:
      "见证波粒二象性。让光子通过双缝，观察证明量子力学的干涉图样。",
    icon: "🌊",
    color: "#4f8fff",
    topics: ["量子", "波粒二象性", "干涉", "光子"],
  },
  {
    id: "wave-interference",
    title: "波的干涉",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "创建两个波源，观看相长和相消干涉图样在实时3D空间中形成。",
    icon: "〰️",
    color: "#4f8fff",
    topics: ["波", "叠加", "干涉", "频率"],
  },
  {
    id: "wave-mechanics",
    title: "横波与纵波",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "左右分屏对比横波与纵波，同步调节频率、振幅、波长，可视化波前、疏密与相位。",
    icon: "📡",
    color: "#4f8fff",
    topics: ["横波", "纵波", "波长", "频率"],
  },
  {
    id: "electromagnetic",
    title: "电磁场",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "在3D空间中放置电荷，交互式可视化电场线、等势面和力向量。",
    icon: "⚡",
    color: "#4f8fff",
    topics: ["电场", "库仑定律", "电势", "向量"],
  },
  {
    id: "spring-mass",
    title: "弹簧-质量系统",
    category: "physics",
    difficulty: "Beginner",
    description:
      "将质量连接到刚度和阻尼可调的弹簧上。探索胡克定律、共振和能量守恒。",
    icon: "🔔",
    color: "#4f8fff",
    topics: ["胡克定律", "共振", "能量", "阻尼"],
  },
  {
    id: "gravitational-orbits",
    title: "引力轨道",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "通过调整质量、速度和距离模拟行星轨道。观察椭圆、圆形和逃逸轨迹。",
    icon: "🪐",
    color: "#4f8fff",
    topics: ["引力", "轨道", "开普勒定律", "逃逸速度"],
  },
  {
    id: "general-relativity",
    title: "广义相对论 · 史瓦西黑洞",
    category: "physics",
    difficulty: "Advanced",
    description:
      "潜入史瓦西黑洞周围的弯曲时空。在华丽的 3D 场景中观察测地线轨道、引力透镜、引力红移与发光吸积盘。",
    icon: "🕳️",
    color: "#7c3aed",
    topics: ["广义相对论", "黑洞", "测地线", "引力透镜"],
  },
  {
    id: "doppler",
    title: "多普勒效应",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "在3D中移动声源和观察者。观看波前压缩和膨胀，实时感受频率变化。",
    icon: "🔊",
    color: "#4f8fff",
    topics: ["声波", "频移", "波前", "相对论"],
  },
  {
    id: "refraction",
    title: "折射与反射",
    category: "physics",
    difficulty: "Beginner",
    description:
      "让光线穿过不同介质。控制入射角、折射率，观察斯涅尔定律的实际效果。",
    icon: "💡",
    color: "#4f8fff",
    topics: ["光学", "斯涅尔定律", "全内反射", "棱镜"],
  },
  {
    id: "ohms-law",
    title: "欧姆定律电路",
    category: "physics",
    difficulty: "Beginner",
    description:
      "用电阻、电池和LED搭建电路。调节电压和电阻，观看动画电子流动。",
    icon: "🔋",
    color: "#4f8fff",
    topics: ["电学", "欧姆定律", "电阻", "电流"],
  },
  {
    id: "bernoulli-venturi",
    title: "伯努利原理（文丘里管）",
    category: "physics",
    difficulty: "Intermediate",
    description:
      "通过文丘里管探索伯努利原理：调节流速与截面积，观察流速与压强的反比关系。",
    icon: "💨",
    color: "#4f8fff",
    topics: ["伯努利方程", "连续性方程", "压强", "流体力学"],
  },
  {
    id: "special-relativity",
    title: "狭义相对论实验室",
    category: "physics",
    difficulty: "Advanced",
    description:
      "驾驶飞船逼近光速，实时观察长度收缩、时间膨胀与相对论质量增大的经典效应。",
    icon: "⚡",
    color: "#4f8fff",
    topics: ["洛伦兹因子", "时间膨胀", "长度收缩", "相对论质量"],
  },

  // ========== CHEMISTRY (10) ==========
  {
    id: "atomic-structure",
    title: "原子结构",
    category: "chemistry",
    difficulty: "Beginner",
    description:
      "在3D中探索原子——添加/移除质子、中子和电子。观察元素变化和电子壳层填充。",
    icon: "⚛️",
    color: "#8b5cf6",
    topics: ["原子", "电子壳层", "质子", "元素周期表"],
  },
  {
    id: "chemical-bonding",
    title: "化学键",
    category: "chemistry",
    difficulty: "Intermediate",
    description:
      "在3D中可视化离子键、共价键和金属键。观看原子共享或转移电子形成分子。",
    icon: "🔗",
    color: "#8b5cf6",
    topics: ["离子键", "共价键", "金属键", "电子共享"],
  },
  {
    id: "electrolysis",
    title: "电解",
    category: "chemistry",
    difficulty: "Intermediate",
    description:
      "在水和其他溶液上进行电解实验。观察电极处气泡形成，理解氧化还原反应。",
    icon: "🧪",
    color: "#8b5cf6",
    topics: ["氧化还原", "电极", "阳极", "阴极"],
  },
  {
    id: "titration",
    title: "酸碱滴定",
    category: "chemistry",
    difficulty: "Intermediate",
    description:
      "进行虚拟滴定。逐滴控制滴定管，观察pH指示剂在等当点时的颜色变化。",
    icon: "💧",
    color: "#8b5cf6",
    topics: ["pH", "酸", "碱", "等当点"],
  },
  {
    id: "gas-laws",
    title: "气体定律 (PV=nRT)",
    category: "chemistry",
    difficulty: "Beginner",
    description:
      "在3D容器中压缩和加热气体分子。通过弹跳粒子观察玻意耳定律、查理定律和盖-吕萨克定律。",
    icon: "🌡️",
    color: "#8b5cf6",
    topics: ["玻意耳定律", "查理定律", "理想气体", "压强"],
  },
  {
    id: "acid-base-reactions",
    title: "酸碱反应",
    category: "chemistry",
    difficulty: "Beginner",
    description:
      "混合酸和碱，观察中和反应。在3D中查看pH变化、盐的形成和能量释放。",
    icon: "⚗️",
    color: "#8b5cf6",
    topics: ["中和", "pH标度", "盐", "放热反应"],
  },
  {
    id: "crystal-lattice",
    title: "晶体点阵结构",
    category: "chemistry",
    difficulty: "Intermediate",
    description:
      "探索3D晶体结构——FCC、BCC、HCP、金刚石立方。旋转、缩放，理解晶胞和堆积效率。",
    icon: "💎",
    color: "#8b5cf6",
    topics: ["晶体", "面心立方", "体心立方", "晶胞"],
  },
  {
    id: "diffusion",
    title: "分子扩散",
    category: "chemistry",
    difficulty: "Beginner",
    description:
      "观看粒子通过膜或在两种气体之间扩散。控制温度和浓度梯度。",
    icon: "🌫️",
    color: "#8b5cf6",
    topics: ["扩散", "渗透", "浓度", "布朗运动"],
  },
  {
    id: "thermochemistry",
    title: "放热与吸热反应",
    category: "chemistry",
    difficulty: "Intermediate",
    description:
      "可视化化学反应中的能量变化。通过能量图和温度效应观察键的断裂和形成。",
    icon: "🔥",
    color: "#8b5cf6",
    topics: ["焓", "活化能", "化学键", "能量图"],
  },
  {
    id: "periodic-trends",
    title: "元素周期表趋势",
    category: "chemistry",
    difficulty: "Beginner",
    description:
      "交互式3D元素周期表。通过动画可视化探索原子半径、电负性和电离能趋势。",
    icon: "📋",
    color: "#8b5cf6",
    topics: ["原子半径", "电负性", "电离", "趋势"],
  },

  // ========== BIOLOGY (10) ==========
  {
    id: "cell-structure",
    title: "动物细胞结构",
    category: "biology",
    difficulty: "Beginner",
    description:
      "探索精细的3D动物细胞。点击细胞器了解细胞核、线粒体、内质网、高尔基体等。",
    icon: "🔬",
    color: "#06d6a0",
    topics: ["细胞器", "细胞核", "线粒体", "细胞膜"],
  },
  {
    id: "dna-replication",
    title: "DNA复制",
    category: "biology",
    difficulty: "Advanced",
    description:
      "观看双螺旋逐步解开和复制。观察解旋酶、聚合酶和引物酶的工作过程。",
    icon: "🧬",
    color: "#06d6a0",
    topics: ["DNA", "解旋酶", "聚合酶", "复制叉"],
  },
  {
    id: "protein-synthesis",
    title: "蛋白质合成",
    category: "biology",
    difficulty: "Advanced",
    description:
      "在3D中跟踪转录和翻译过程。观看mRNA离开细胞核，核糖体逐个密码子构建蛋白质。",
    icon: "⚙️",
    color: "#06d6a0",
    topics: ["转录", "翻译", "mRNA", "核糖体"],
  },
  {
    id: "photosynthesis",
    title: "光合作用",
    category: "biology",
    difficulty: "Intermediate",
    description:
      "进入叶绿体，跟踪光反应和卡尔文循环。控制光照强度和CO2浓度。",
    icon: "🌿",
    color: "#06d6a0",
    topics: ["叶绿体", "光反应", "卡尔文循环", "葡萄糖"],
  },
  {
    id: "cellular-respiration",
    title: "细胞呼吸",
    category: "biology",
    difficulty: "Intermediate",
    description:
      "追踪葡萄糖经过糖酵解、克雷布斯循环和电子传递链。在3D线粒体中观察ATP生成。",
    icon: "⚡",
    color: "#06d6a0",
    topics: ["糖酵解", "克雷布斯循环", "ATP", "线粒体"],
  },
  {
    id: "mitosis-meiosis",
    title: "有丝分裂与减数分裂",
    category: "biology",
    difficulty: "Intermediate",
    description:
      "在3D中观看细胞分裂。逐步经历前期、中期、后期、末期。并排比较有丝分裂和减数分裂。",
    icon: "🫧",
    color: "#06d6a0",
    topics: ["有丝分裂", "减数分裂", "染色体", "细胞分裂"],
  },
  {
    id: "natural-selection",
    title: "自然选择模拟器",
    category: "biology",
    difficulty: "Intermediate",
    description:
      "模拟进化！控制环境因素，观察种群在几代中如何适应，产生性状变异。",
    icon: "🦎",
    color: "#06d6a0",
    topics: ["进化", "适应", "遗传学", "适应度"],
  },
  {
    id: "nervous-system",
    title: "神经元与突触",
    category: "biology",
    difficulty: "Intermediate",
    description:
      "在3D中追踪动作电位沿神经元传导。观看神经递质穿越突触间隙。",
    icon: "🧠",
    color: "#06d6a0",
    topics: ["神经元", "动作电位", "突触", "神经递质"],
  },
  {
    id: "ecosystem",
    title: "生态系统食物网",
    category: "biology",
    difficulty: "Beginner",
    description:
      "在3D中构建和探索食物网。添加/移除物种，实时观察种群动态变化。",
    icon: "🌿",
    color: "#06d6a0",
    topics: ["食物网", "营养级", "种群", "生物多样性"],
  },
  {
    id: "immune-response",
    title: "免疫系统反应",
    category: "biology",
    difficulty: "Advanced",
    description:
      "观看免疫系统对抗病毒！在3D血管环境中观察巨噬细胞、T细胞和抗体。",
    icon: "🛡️",
    color: "#06d6a0",
    topics: ["抗体", "T细胞", "巨噬细胞", "抗原"],
  },

  // ========== MATHEMATICS (10) ==========
  {
    id: "fourier-transform",
    title: "傅里叶变换可视化",
    category: "math",
    difficulty: "Advanced",
    description:
      "通过叠加正弦波构建任意波形。添加或移除谐波时，实时观察频谱更新。",
    icon: "📊",
    color: "#ff6b35",
    topics: ["频率", "波形", "谐波", "信号处理"],
  },
  {
    id: "fibonacci-spiral",
    title: "斐波那契与黄金螺旋",
    category: "math",
    difficulty: "Beginner",
    description:
      "在3D中观看斐波那契数列构建黄金螺旋。探索它在自然、艺术和建筑中的出现。",
    icon: "🐌",
    color: "#ff6b35",
    topics: ["斐波那契", "黄金比例", "螺旋", "Phi"],
  },
  {
    id: "3d-geometry",
    title: "3D几何探索器",
    category: "math",
    difficulty: "Beginner",
    description:
      "在3D中与柏拉图立体和阿基米德立体交互。探索面、边、顶点和欧拉公式。",
    icon: "📐",
    color: "#ff6b35",
    topics: ["柏拉图立体", "欧拉公式", "对称", "多面体"],
  },
  {
    id: "calculus-visualizer",
    title: "微积分可视化",
    category: "math",
    difficulty: "Intermediate",
    description:
      "在3D中可视化导数和积分。观看切线、曲线下面积和黎曼和的动画。",
    icon: "📈",
    color: "#ff6b35",
    topics: ["导数", "积分", "极限", "黎曼和"],
  },
  {
    id: "mandelbrot",
    title: "曼德博集合分形",
    category: "math",
    difficulty: "Intermediate",
    description:
      "在3D中潜入无限的曼德博集合。缩放进入各区域，观看分形细节在每一个尺度上涌现。",
    icon: "🌀",
    color: "#ff6b35",
    topics: ["分形", "复数", "迭代", "无穷"],
  },
  {
    id: "probability-distributions",
    title: "概率分布",
    category: "math",
    difficulty: "Intermediate",
    description:
      "生成随机数据，观看分布形成。比较正态分布、二项分布、泊松分布和均匀分布。",
    icon: "🎰",
    color: "#ff6b35",
    topics: ["正态分布", "二项分布", "均值", "标准差"],
  },
  {
    id: "linear-algebra",
    title: "线性代数可视化",
    category: "math",
    difficulty: "Intermediate",
    description:
      "在3D中可视化向量、矩阵和变换。应用旋转、缩放和剪切，观察线性映射的效果。",
    icon: "🔢",
    color: "#ff6b35",
    topics: ["向量", "矩阵", "特征值", "变换"],
  },
  {
    id: "trigonometry",
    title: "三角函数探索",
    category: "math",
    difficulty: "Beginner",
    description:
      "在3D单位圆上探索正弦、余弦和正切。调整角度，观察所有三角函数如何关联。",
    icon: "📏",
    color: "#ff6b35",
    topics: ["正弦", "余弦", "正切", "单位圆"],
  },
  {
    id: "complex-numbers",
    title: "复数平面",
    category: "math",
    difficulty: "Intermediate",
    description:
      "在阿尔冈平面上可视化复数。执行算术运算并观察几何解释。",
    icon: "♾️",
    color: "#ff6b35",
    topics: ["复数", "阿尔冈平面", "模", "辐角"],
  },
  {
    id: "topology-surfaces",
    title: "拓扑与曲面",
    category: "math",
    difficulty: "Advanced",
    description:
      "探索数学曲面——莫比乌斯带、克莱因瓶、环面等，在交互式3D中体验。",
    icon: "🍩",
    color: "#ff6b35",
    topics: ["拓扑", "莫比乌斯带", "克莱因瓶", "流形"],
  },
];

export const categories = [
  {
    id: "physics" as const,
    name: "物理",
    icon: "⚛️",
    color: "#4f8fff",
    description: "力、运动、波和能量",
  },
  {
    id: "chemistry" as const,
    name: "化学",
    icon: "🧪",
    color: "#8b5cf6",
    description: "原子、分子和反应",
  },
  {
    id: "biology" as const,
    name: "生物",
    icon: "🧬",
    color: "#06d6a0",
    description: "生命、细胞和生态系统",
  },
  {
    id: "math" as const,
    name: "数学",
    icon: "📐",
    color: "#ff6b35",
    description: "数字、形状和模式",
  },
];
