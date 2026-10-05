"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** 提示与触发元素之间的间距 */
const GAP = 8;
/** 提示与视口边缘的安全距离 */
const EDGE = 8;

function findAnchor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-tooltip]");
}

/**
 * 全局悬浮提示层（替代原先的 [data-tooltip]::after 伪元素方案）：
 * - 提示统一渲染到顶层容器（body；全屏时跟随全屏元素，避免被顶层渲染契约挡住），
 *   不再被画布 / 侧栏 overflow / 局部 z-index 裁剪；
 * - 默认出现在触发元素正上方，仅当上方没有空间时才翻到下方；
 * - 通过事件委托监听整个文档，鼠标移入 / 键盘聚焦即显示。
 */
export default function TooltipLayer() {
  const tipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // 全屏时浏览器只渲染全屏元素子树，门户需要跟着切换容器
  useEffect(() => {
    const sync = () =>
      setContainer((document.fullscreenElement as HTMLElement | null) ?? document.body);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const tip = tipRef.current;
    if (!tip || !container) return;

    const hide = () => {
      anchorRef.current = null;
      tip.classList.remove("is-on");
    };

    const show = (anchor: HTMLElement) => {
      const text = anchor.getAttribute("data-tooltip");
      if (!text) return;
      tip.textContent = text;
      const r = anchor.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      // 默认在按钮上方；只有上方放不下（如顶栏按钮）才翻到下方
      let below = false;
      let top = r.top - GAP - th;
      if (top < EDGE) {
        below = true;
        top = r.bottom + GAP;
      }
      const half = tw / 2;
      const left = Math.min(
        Math.max(r.left + r.width / 2, half + EDGE),
        window.innerWidth - half - EDGE,
      );
      tip.dataset.side = below ? "below" : "above";
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      // 换目标时等定位生效再淡入，避免先在旧位置闪一下；
      // 若淡入前指针已离开（锚点被清空），则不再显示
      requestAnimationFrame(() => {
        if (anchorRef.current === anchor) tip.classList.add("is-on");
      });
    };

    const onPointerOver = (e: PointerEvent) => {
      // 触摸无 hover；按住鼠标拖拽（如拖拽调整宽度）时不弹提示
      if (e.pointerType === "touch" || e.buttons !== 0) return;
      const anchor = findAnchor(e.target);
      if (!anchor || anchor === anchorRef.current) return;
      anchorRef.current = anchor;
      show(anchor);
    };
    const onPointerOut = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const anchor = anchorRef.current;
      if (!anchor) return;
      if (e.relatedTarget instanceof Node && anchor.contains(e.relatedTarget)) return;
      hide();
    };
    const onPointerDown = () => hide();
    const onFocusIn = (e: FocusEvent) => {
      const anchor = findAnchor(e.target);
      if (!anchor || anchor === anchorRef.current) return;
      anchorRef.current = anchor;
      show(anchor);
    };
    const onFocusOut = () => hide();
    const onScroll = () => hide();
    const onResize = () => hide();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [container]);

  if (!container) return null;
  return createPortal(
    <div ref={tipRef} className="ui-tooltip" role="tooltip" aria-hidden />,
    container,
  );
}
