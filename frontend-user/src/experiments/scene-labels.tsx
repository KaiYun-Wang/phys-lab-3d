"use client";

import { useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";

/**
 * 平台统一的 3D 场景悬浮标签 —— 与凸透镜实验「物 / 像 / F / 2F」同款样式：
 * 深色圆角胶囊底板 + 白色粗体文字，Sprite 始终面向相机、穿透遮挡显示。
 * 需要给场景元素补标注时，直接使用 <SceneLabelSprite />，勿再各写一份贴图。
 */

const FONT_PX = 34;
const PAD_X = 16;
/** 短标签保持与凸透镜胶囊一致的 120×58 基准 */
const MIN_W = 120;
const CAPSULE_H = 58;
const RADIUS = 14;
const FONT_STACK =
  '"Microsoft YaHei", "PingFang SC", system-ui, -apple-system, "Segoe UI", sans-serif';

export interface SceneLabelTexture {
  texture: THREE.CanvasTexture;
  /** 宽高比（宽 / 高）：按世界高度推算 Sprite 宽度 */
  aspect: number;
}

/** 生成「深色胶囊 + 白字」标签贴图，宽度随文字长度自适应 */
export function makeSceneLabelTexture(text: string): SceneLabelTexture {
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `bold ${FONT_PX}px ${FONT_STACK}`;
  const textW = Math.ceil(measure.measureText(text).width);
  const w = Math.max(MIN_W, textW + PAD_X * 2);
  const h = CAPSULE_H;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const r = RADIUS;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fill();

  ctx.font = `bold ${FONT_PX}px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return { texture, aspect: w / h };
}

export interface SceneLabelSpriteProps {
  text: string;
  position: [number, number, number];
  /** 世界单位下的胶囊高度，默认 1 */
  height?: number;
  opacity?: number;
  renderOrder?: number;
  /** 需要在外部动态调整位置时传入（如跟随液面高度的 ΔP 标签） */
  spriteRef?: Ref<THREE.Sprite>;
}

/** 单行文字悬浮标签；宽度按文字长度自适应 */
export function SceneLabelSprite({
  text,
  position,
  height = 1,
  opacity,
  renderOrder = 20,
  spriteRef,
}: SceneLabelSpriteProps) {
  const label = useMemo(() => makeSceneLabelTexture(text), [text]);
  useEffect(() => () => label.texture.dispose(), [label]);
  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[height * label.aspect, height, 1]}
      renderOrder={renderOrder}
    >
      <spriteMaterial
        map={label.texture}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}
