"use client";

import { useEffect } from "react";
import { playPress } from "@/lib/uiSound";

type CoverLightboxProps = {
  /** 有值时显示大图层；null 表示关闭 */
  src: string | null;
  onClose: () => void;
  /** 大图语义标签（封面 / 头像等复用场景） */
  label?: string;
};

/**
 * 封面大图查看层（实验列表 / 编辑页 / 个人中心头像共用）：
 * 点遮罩关闭、右上角关闭按钮、Esc 关闭；打开音由封面按钮的按压反馈提供（hoverMotion），
 * 关闭动作这里补按钮式按压音，保持点击全程「有响」。
 */
export default function CoverLightbox({ src, onClose, label = "封面大图预览" }: CoverLightboxProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playPress();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  const close = () => {
    playPress();
    onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={close}>
      <div
        className="cover-lightbox__frame"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="cover-lightbox__img" />
        <button type="button" className="cover-lightbox__close" aria-label="关闭预览" onClick={close}>
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>
      </div>
    </div>
  );
}
