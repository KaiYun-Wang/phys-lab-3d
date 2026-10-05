/**
 * 悬停微交互引擎（GSAP 事件委托，零 JSX 侵入）
 *
 * 效果分层（基准：DESIGN-style-guide.md §五 微交互）：
 * - 导航类（侧栏菜单项 / 品牌 / 声音开关等）：hover 弹性放大，不挤动邻居
 * - 按钮类（.btn-pill）：hover 弹性放大，同排紧邻按钮被反向「挤开」补偿
 * - 按压：pointerdown 收缩 + 触感音效；pointerup 回弹
 *
 * 性能与无障碍（参考 .qoder/skills/ui-ux-pro-max/data/motion.csv）：
 * - 只动 transform（合成器友好），不触发布局属性；全宽按钮跳过缩放避免溢出
 * - prefers-reduced-motion 时整体停用（CSS 颜色反馈仍在）
 */
import gsap from "gsap";
import { playHoverTick, playPress } from "@/lib/uiSound";

/** 按压收缩比例（相对各元素 hover 尺寸） */
const PRESS_SCALE = 0.955;
/** 全宽按钮（表单提交/登录等）：不挤开邻居，放大收敛到 1.02 防溢出 */
const FULL_WIDTH_SCALE = 1.02;
/** 同排邻居边缘间距超过该值时视为不在同一组，不做挤开（按钮组 8px / 卡片行 16~20px，含浮点误差容差） */
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
  /** 缩放锚点（默认居中；侧栏项锚定左缘防溢出） */
  origin?: string;
  /** 是否挤开同排紧邻按钮/卡片（组内成员） */
  push?: boolean;
  /** 不做按压反馈（纯展示块：卡片、列表行等无点击语义的元素） */
  noPress?: boolean;
  /**
   * 纵向抬起像素（列表行专属，负值向上）。
   * 行不做横向缩放：transform 溢出会计入 .table-wrap 的 scrollWidth，
   * 令原本不滚动的表格出现滚动条（已实测），故行用纯纵移表达「浮起」。
   */
  lift?: number;
};

const HOVER_RULES: HoverRule[] = [
  { sel: ".nav-item", scale: 1.04, origin: "left center" },
  { sel: ".sidebar-profile", scale: 1.035, origin: "left center" },
  { sel: ".sidebar-github", scale: 1.1 },
  { sel: ".sidebar__home", scale: 1.03, origin: "left center" },
  { sel: ".sidebar__collapse", scale: 1.12 },
  { sel: ".sound-toggle", scale: 1.04, origin: "left center" },
  { sel: ".auth-input-wrap__peek", scale: 1.1 },
  { sel: ".btn-pill", scale: 1.05, push: true },
  // 列表行：微抬 + 音效（排序/拖拽模式的表格除外，避免干扰拖拽）
  { sel: ".data-table:not(.sort-table) tbody tr", scale: 1, lift: -1.5, noPress: true },
  // 卡片内导航行（快捷入口等）：同列行微抬语言
  { sel: ".placeholder-row", scale: 1, lift: -1.5, noPress: true },
  // 仪表盘：周期切换段控件（按钮组挤开）+ 统计卡行 / 内容卡片（卡片组挤开）
  { sel: ".range-toggle__btn", scale: 1.06, push: true },
  { sel: ".stat-card", scale: 1.03, push: true, noPress: true },
  { sel: ".section-card", scale: 1.02, push: true, noPress: true },
  // 自定义下拉的选项：左缘锚定放大（面板 overflow-x 已设为 hidden，吸收右侧溢出）
  { sel: ".admin-select__opt", scale: 1.035, origin: "left center" },
  // 时间范围选择器：触发器 / 预设按钮组（挤开）/ 月份导航小按钮 / 日历格子（网格密集，仅中心放大）
  { sel: ".date-range__trigger", scale: 1.03 },
  { sel: ".date-range__preset", scale: 1.06, push: true },
  { sel: ".date-range__nav-btn", scale: 1.12, push: true },
  { sel: ".date-range__day", scale: 1.15 },
  // 页面面包屑（子页面顶部）：上级链接
  { sel: ".page-crumb__link", scale: 1.05 },
  // 封面缩略图 / 编辑页封面预览（有图时可点开大图，按压带按钮音效）
  { sel: ".cover-thumb:has(img)", scale: 1.06 },
  { sel: ".cover-upload__preview:has(img)", scale: 1.06 },
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
          const rootState = current.parent ?? current;
          if (current !== rootState) restState(current); // 还原旧子级；current 即根时保持不动
          const state = buildState(el, rule, rootState);
          current = state;
          settleHover(state);
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
