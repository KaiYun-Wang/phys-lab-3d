"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { attachHoverMotion } from "@/lib/hoverMotion";
import { initSoundPreference, unlockAudio } from "@/lib/uiSound";

/** 全局微交互挂载（事件委托到 body，页面 JSX 零侵入）：hover 缩放/挤开 + 合成音效 */
export default function UserMotion() {
  const pathname = usePathname();

  useEffect(() => {
    initSoundPreference();
    // 登录/注册页：保留交互动效，但不播放音效（静态入口页保持克制）
    const quiet = pathname?.startsWith("/login") ?? false;
    const detach = attachHoverMotion(document.body, { sound: !quiet });

    // 浏览器 autoplay 策略：首次真实手势顺带解锁音频
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });

    return () => {
      detach();
      window.removeEventListener("pointerdown", unlock);
    };
  }, [pathname]);

  return null;
}
