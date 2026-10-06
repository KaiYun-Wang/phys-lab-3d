/**
 * 悬停微交互引擎（GSAP 事件委托，零 JSX 侵入）
 *
 * 效果分层（基准：DESIGN-style-guide.md §五 微交互）：
 * - 卡片类（首页实验卡）：hover 弹性放大 + 上浮，同排卡片被反向「挤开」补偿
 * - 按钮类（筛选胶囊 / 主按钮等）：hover 弹性放大，同排紧邻按钮被挤开
 * - 导航类（顶栏链接 / 公告 / 音效开关）：hover 弹性放大，不挤动邻居
 * - 列表行（个人中心会话条目）：纵向微抬 + 音效（不做横向缩放，防滚动条闪现）
 * - 按压：pointerdown 收缩 + 触感音效；pointerup 回弹
 *
 * 性能与无障碍：
 * - 只动 transform（合成器友好），不触发布局属性；全宽按钮收敛防溢出
 * - prefers-reduced-motion 时整体停用（CSS 颜色反馈仍在）
 * - 规则表刻意不覆盖实验页（exp-* / sx-control-* / ai-*）：实验页保持克制
 */
import gsap from "gsap";
import { playHoverTick, playPress } from "@/lib/uiSound";

/** 按压收缩比例（相对各元素 hover 尺寸） */
const PRESS_SCALE = 0.955;
/** 全宽按钮（登录提交等）：不挤开邻居，放大收敛到 1.02 防溢出 */
const FULL_WIDTH_SCALE = 1.02;
/** 同排邻居边缘间距超过该值时视为不在同一组，不做挤开（胶囊 8px / 卡片行 16~20px，含浮点误差容差） */
const NEIGHBOR_MAX_GAP = 24;
/** 邻居位移衰减（按由近到远） */
const PUSH_DECAY = [1, 0.5, 0.22];
/** 挤开位移相对「放大溢出量」的比例（邻居让出七成溢出距离） */
const PUSH_RATIO = 0.7;

type HoverRule = {
  /** 命中选择器 */
  sel: string;
  /** hover 缩放目标 */
  scale: number;
  /** 缩放锚点（默认居中；顶栏右侧元素锚定右缘防溢出） */
  origin?: string;
  /** 是否挤开同排紧邻按钮/卡片（组内成员） */
  push?: boolean;
  /** 不做按压反馈（纯展示块：卡片、列表行等无点击语义的元素） */
  noPress?: boolean;
  /** 纵向抬起像素（负数向上；与缩放叠加表达「浮起」） */
  lift?: number;
  /** 仅音效：不写任何 transform（滑块等 thumb 为伪元素的控件，视觉由 CSS 负责） */
  audioOnly?: boolean;
};

const HOVER_RULES: HoverRule[] = [
  // 首页实验卡片：放大 + 上浮（原 CSS translateY(-4px) 移交引擎），同行卡片挤开
  { sel: ".kh-card", scale: 1.02, lift: -4, push: true, noPress: true },
  // 卡内收藏星：小按钮放大 + 按压
  { sel: ".kh-card__fav", scale: 1.12 },
  // 学科筛选胶囊（组内挤开）/ 仅看已收藏 / 主按钮 / 次按钮
  { sel: ".kh-tab", scale: 1.06, push: true },
  { sel: ".kh-fav-filter", scale: 1.05 },
  { sel: ".btn-primary", scale: 1.05, push: true },
  { sel: ".btn-ghost", scale: 1.05 },
  // 顶栏：品牌 logo / 登录链接 / 用户头像 / 公告 / 音效开关
  { sel: ".kh-lockup", scale: 1.05 },
  { sel: ".kh-header__link", scale: 1.05 },
  { sel: ".kh-header__user", scale: 1.04, origin: "right center" },
  { sel: ".kh-announce", scale: 1.05 },
  { sel: ".kh-sound", scale: 1.12 },
  { sel: ".kh-github", scale: 1.12 },
  // 首页收藏榜（TOP 榜）：翻页箭头 / 进度圆点（悬停放大 + tick 与按压音效；翻页时另有纸页声）
  { sel: ".sx-rank-nav", scale: 1.12 },
  { sel: ".sx-rank-dot", scale: 1.4 },
  // AI 悬浮球（原 CSS hover/active 缩放已移交引擎，保留辉光反馈）
  { sel: ".ai-fab", scale: 1.08 },
  // 登录页：登录/注册页签 / 密码可见性小按钮
  { sel: ".auth-tab", scale: 1.05 },
  { sel: ".auth-input-wrap__peek", scale: 1.1 },
  // 个人中心：横幅 / 统计卡（四卡组挤开）/ 卡片 / 按钮 / 链接 / 弹窗关闭 / 会话行（微抬）
  { sel: ".pf-banner", scale: 1.01, noPress: true },
  { sel: ".pf-stat-card", scale: 1.03, push: true, noPress: true },
  { sel: ".pf-card", scale: 1.01, noPress: true },
  { sel: ".pf-btn", scale: 1.06, push: true },
  { sel: ".pf-link", scale: 1.05 },
  { sel: ".pf-modal__close", scale: 1.1 },
  // 个人中心：头像（点开大图查看）/ 头像大图关闭按钮
  { sel: ".pf-ava-btn", scale: 1.06 },
  { sel: ".pf-ava-lightbox__close", scale: 1.1 },
  { sel: ".pf-sess", scale: 1, lift: -1.5, noPress: true },
  // 实验页控件（工作台 UI 层）：图标按钮 / 胶囊 / 底部播放条 / 选项切换 / 评论排序筛选 / 发布按钮
  { sel: ".exp-icon-btn", scale: 1.12 },
  { sel: ".exp-chip", scale: 1.06, push: true },
  { sel: ".exp-sim-btn", scale: 1.1, push: true },
  { sel: ".exp-option", scale: 1.05, push: true },
  { sel: ".venturi-fluid-option", scale: 1.05, push: true },
  { sel: ".exp-sort-btn", scale: 1.08, push: true },
  { sel: ".exp-tab", scale: 1.06, push: true },
  { sel: ".exp-btn-send", scale: 1.06 },
  // AI 实验助手：面板按钮（新对话/历史/返回）/ 历史条目（微抬）/ 思考与步骤开关 / 示例问题 / 发送
  { sel: ".ai-icon-btn", scale: 1.08, push: true },
  { sel: ".ai-sess-row", scale: 1, lift: -1.5, noPress: true },
  { sel: ".ai-think-toggle", scale: 1.05 },
  { sel: ".ai-step-toggle", scale: 1.05 },
  { sel: ".ai-example-card", scale: 1.02, push: true, noPress: true },
  { sel: ".ai-composer .send", scale: 1.08 },
  // AI 教学演示：演示卡（消息与列表面板）/ 卡内主按钮与删除 / 引用演示 / 面板返回 / 再演示·清除 / 进度节点 / 测验选项
  { sel: ".demo-plan-card", scale: 1.015, noPress: true },
  { sel: ".demo-plan-card__btn", scale: 1.06, push: true },
  { sel: ".demo-plan-card__del", scale: 1.15 },
  { sel: ".ai-ref-btn", scale: 1.05 },
  { sel: ".demo-panel__back", scale: 1.06 },
  { sel: ".demo-panel__btn", scale: 1.06, push: true },
  // 语音讲解 / 字幕开关：整行轻放大 + tick/press 音效（胶囊滑动由 CSS 负责）
  { sel: ".demo-tool", scale: 1.02 },
  // 进度节点：轻放大（光晕/颜色反馈由 CSS 过渡负责，组合成「发光悬浮」质感）
  { sel: ".demo-scrubber__node", scale: 1.35 },
  { sel: ".demo-panel__quiz-opts button", scale: 1.04 },
  // 演示字幕条（底部浮动讲解）：关闭讲解 / 上一步·下一步 / 实验页顶栏返回大厅
  { sel: ".demo-caption__stop", scale: 1.1 },
  { sel: ".demo-caption__nav-btn", scale: 1.06, push: true },
  { sel: ".exp-topbar-back", scale: 1.06 },
  // 实验页面包屑 / 控制台操作按钮（全宽收敛）/ 查看原理说明；详情页：面包屑链接 / 章节卡 / 返回实验
  { sel: ".exp-topbar-crumb--main a", scale: 1.05 },
  { sel: ".exp-action-btn", scale: 1.02, push: true },
  { sel: ".exp-details-link", scale: 1.02, push: true },
  { sel: ".exp-details__crumb-link", scale: 1.05 },
  { sel: ".exp-details-section", scale: 1.01, noPress: true },
  { sel: ".exp-details__back", scale: 1.06 },
  // 实验页评论面板：评论条目（微抬）/ 有帮助·回复·删除（组内挤开）/ 回复提示取消
  { sel: ".exp-thread", scale: 1, lift: -1.5, noPress: true },
  { sel: ".exp-react-btn", scale: 1.1, push: true },
  { sel: ".exp-react-reply", scale: 1.06, push: true },
  { sel: ".exp-react-delete", scale: 1.06, push: true },
  { sel: ".exp-reply-hint button", scale: 1.06 },
  // 参数滑块：仅音效（thumb 为伪元素，CSS 自身已有 hover 放大；⛔ 不写 transform）
  { sel: ".sx-control-stack input[type=\"range\"], .exp-sim-range", scale: 1, audioOnly: true, noPress: true },
];

const ITEM_SELECTOR = HOVER_RULES.map((r) => r.sel).join(", ");

function ruleFor(el: HTMLElement): HoverRule | null {
  return HOVER_RULES.find((r) => el.matches(r.sel)) ?? null;
}

type PushState = { el: HTMLElement; dx: number };
type HoverState = {
  el: HTMLElement;
  scale: number;
  lift: number;
  pushed: PushState[];
  /** 父级 hover 态（卡片内按钮场景）：父卡片在子级 hover 期间保持放大 */
  parent: HoverState | null;
};

function isInteractive(el: HTMLElement) {
  return !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true";
}

/** 按钮宽度接近容器宽度（表单全宽按钮）：不做挤开，缩放收敛 */
function isFullWidth(el: HTMLElement) {
  const parent = el.parentElement;
  if (!parent) return false;
  return el.getBoundingClientRect().width > parent.clientWidth * 0.9;
}

export type HoverMotionOptions = {
  /** 是否播放音效（登录页等场景可只保留动效） */
  sound?: boolean;
};

export function attachHoverMotion(root: HTMLElement, options: HoverMotionOptions = {}): () => void {
  const soundEnabled = options.sound !== false;
  // 尊重系统 reduced-motion：停用全部缩放 / 挤开 / 按压
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  let current: HoverState | null = null;
  let pressedEl: HTMLElement | null = null;

  /** 回弹到 hover 态（新进入、按压松开时复用） */
  const settleHover = (state: HoverState) => {
    gsap.to(state.el, {
      scale: state.scale,
      y: state.lift,
      duration: 0.34,
      ease: "back.out(2.6)",
      overwrite: "auto",
    });
    state.pushed.forEach(({ el, dx }) => {
      gsap.to(el, { x: dx, duration: 0.34, ease: "power3.out", overwrite: "auto" });
    });
  };

  /** 还原到静止态 */
  const restState = (state: HoverState) => {
    gsap.to(state.el, { scale: 1, y: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
    state.pushed.forEach(({ el }) => {
      gsap.to(el, { x: 0, duration: 0.36, ease: "power3.out", overwrite: "auto" });
    });
  };

  /** 链式还原：子级与其所有祖先一起回到静止态（鼠标整体离开时） */
  const restChain = (state: HoverState) => {
    let node: HoverState | null = state;
    while (node) {
      restState(node);
      node = node.parent;
    }
  };

  const clearCurrent = () => {
    if (!current) return;
    const state = current;
    current = null;
    restChain(state);
  };

  const findItem = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const el = target.closest(ITEM_SELECTOR);
    return el instanceof HTMLElement && root.contains(el) ? el : null;
  };

  /** 收集同排紧邻按钮的挤开位移（只对按钮组生效） */
  const computePushes = (el: HTMLElement, scale: number): PushState[] => {
    const parent = el.parentElement;
    if (!parent) return [];
    const rect = el.getBoundingClientRect();
    const overflow = (rect.width * (scale - 1)) / 2;
    if (overflow < 0.4) return [];

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const left: { el: HTMLElement; gap: number }[] = [];
    const right: { el: HTMLElement; gap: number }[] = [];

    for (const node of Array.from(parent.children)) {
      if (!(node instanceof HTMLElement) || node === el) continue;
      if (!node.matches(ITEM_SELECTOR) || !isInteractive(node)) continue;
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // 垂直中线偏差过大 = 折行后的另一排
      if (Math.abs(r.top + r.height / 2 - centerY) > rect.height * 0.6) continue;
      const nodeCenter = r.left + r.width / 2;
      const gap = nodeCenter < centerX ? rect.left - r.right : r.left - rect.right;
      if (gap < -rect.width * 0.5 || gap > NEIGHBOR_MAX_GAP) continue;
      (nodeCenter < centerX ? left : right).push({ el: node, gap: Math.max(gap, 0) });
    }

    left.sort((a, b) => a.gap - b.gap);
    right.sort((a, b) => a.gap - b.gap);

    const base = overflow * PUSH_RATIO;
    const pushes: PushState[] = [];
    left.slice(0, PUSH_DECAY.length).forEach((n, i) => {
      pushes.push({ el: n.el, dx: -base * PUSH_DECAY[i] });
    });
    right.slice(0, PUSH_DECAY.length).forEach((n, i) => {
      pushes.push({ el: n.el, dx: base * PUSH_DECAY[i] });
    });
    return pushes;
  };

  /** 构建一次 hover 变换态（parent：卡片内按钮挂在卡片状态之下，卡片保持放大不缩回） */
  const buildState = (el: HTMLElement, rule: HoverRule, parent: HoverState | null): HoverState => {
    // 全宽按钮（rule.push 类）不做挤开、放大收敛到 1.02；导航类（天然 100% 宽）不受此限
    const fullWidth = rule.push === true && isFullWidth(el);
    const hoverScale = fullWidth ? FULL_WIDTH_SCALE : rule.scale;
    el.style.transformOrigin = rule.origin ?? "center center";
    return {
      el,
      scale: hoverScale,
      lift: rule.lift ?? 0,
      pushed: rule.push && !fullWidth ? computePushes(el, hoverScale) : [],
      parent,
    };
  };

  const onOver = (e: MouseEvent) => {
    const el = findItem(e.target);
    if (!el || current?.el === el) return;
    const related = e.relatedTarget;
    if (related instanceof Node && el.contains(related)) return; // 元素内部子级间移动

    if (current) {
      const chainRoot = current.parent?.el ?? current.el;
      // 链内切换（卡片已悬停，鼠标移入卡内按钮/按钮间移动）：父级保持放大不缩回
      if (el !== chainRoot && chainRoot.contains(el)) {
        const rule = ruleFor(el);
        if (rule) {
          if (soundEnabled) playHoverTick();
          if (!rule.audioOnly) {
            const rootState = current.parent ?? current;
            if (current !== rootState) restState(current); // 还原旧子级；current 即根时保持不动
            const state = buildState(el, rule, rootState);
            current = state;
            settleHover(state);
          }
        }
        return;
      }
      // 从子级滑回父级（mouseover 兜底）：子级还原，父级保持
      if (el === current.parent?.el) {
        const child = current;
        current = child.parent;
        restState(child);
        if (soundEnabled) playHoverTick();
        return;
      }
    }

    clearCurrent();
    if (!isInteractive(el)) return;
    const rule = ruleFor(el);
    if (!rule) return;

    if (soundEnabled) playHoverTick();
    if (rule.audioOnly) return; // 仅音效（滑块等）：视觉由 CSS 负责，不建立 hover 变换状态
    const state = buildState(el, rule, null);
    current = state;
    settleHover(state);
  };

  const onOut = (e: MouseEvent) => {
    const el = findItem(e.target);
    if (!el || el !== current?.el) return;
    const related = e.relatedTarget;
    if (related instanceof Node && el.contains(related)) return;
    if (related instanceof Element) {
      const next = related.closest(ITEM_SELECTOR);
      if (next instanceof HTMLElement && next !== el) {
        // 滑回链上父级：子级还原，父级保持放大（不等 mouseover 重建）
        if (current.parent?.el === next) {
          const child = current;
          current = child.parent;
          restState(child);
        }
        return; // 其余：交给下一次 mouseover 无缝接管
      }
    }
    clearCurrent();
  };

  const onPointerDown = (e: PointerEvent) => {
    const el = findItem(e.target);
    if (!el || !isInteractive(el)) return;
    const rule = ruleFor(el);
    if (!rule || rule.noPress) return; // 纯展示块不做按压（无点击语义）
    pressedEl = el;
    if (soundEnabled) playPress();
    const hoverScale = rule.push === true && isFullWidth(el) ? FULL_WIDTH_SCALE : rule.scale;
    gsap.to(el, {
      scale: hoverScale * PRESS_SCALE,
      duration: 0.1,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const onPointerUp = () => {
    const el = pressedEl;
    pressedEl = null;
    if (!el) return;
    if (current?.el === el) {
      settleHover(current); // 仍悬停：回弹到 hover 尺寸
    } else {
      gsap.to(el, { scale: 1, duration: 0.26, ease: "back.out(3)", overwrite: "auto" });
    }
  };

  root.addEventListener("mouseover", onOver);
  root.addEventListener("mouseout", onOut);
  root.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  return () => {
    root.removeEventListener("mouseover", onOver);
    root.removeEventListener("mouseout", onOut);
    root.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    clearCurrent();
    if (pressedEl) {
      gsap.killTweensOf(pressedEl);
      pressedEl = null;
    }
  };
}
