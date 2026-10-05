"use client";

import { useEffect, useState } from "react";
import { initSoundPreference, setSoundOn, subscribeSound } from "@/lib/uiSound";

/** 顶栏音效开关：小喇叭（默认开，偏好 localStorage 持久化） */
export default function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    initSoundPreference();
    return subscribeSound(setOn);
  }, []);

  return (
    <button
      type="button"
      className={`kh-sound${on ? " is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "关闭界面音效" : "开启界面音效"}
      data-tooltip={on ? "界面音效：开" : "界面音效：关"}
      onClick={() => setSoundOn(!on)}
    >
      <i className={`fa-solid ${on ? "fa-volume-high" : "fa-volume-xmark"}`} aria-hidden />
    </button>
  );
}
