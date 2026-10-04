"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 世界空间文字标签（Sprite + CanvasTexture）。
 *
 * 这里原先用 drei 的 <Html>：它会给每个标签单独 createRoot 一个 React 根，
 * 在视图切换 / HMR 时会撞上 React 的
 * "Attempted to synchronously unmount a root while React was already rendering"。
 * 改成纯 3D 的 Sprite 文字后不再产生额外 React 根，标签仍随相机朝向、可点击聚焦。
 */

/** 与侧栏 text-sm 按钮视觉接近 */
export const LABEL_FACTOR = 10;

/** Sprite 每世界单位对应的像素密度（再乘 DPR，保证文字清晰） */
const PX_PER_UNIT = 96;
const FONT_PX = 14;
const PAD_X = 12;
const PAD_Y = 6;
const BORDER = 1.5;
const RADIUS = 8;
const FONT_STACK =
  '"Microsoft YaHei", "PingFang SC", system-ui, -apple-system, "Segoe UI", sans-serif';

interface LabelTexture {
  texture: THREE.CanvasTexture;
  /** 世界单位下的宽高 */
  width: number;
  height: number;
}

/** 生成黑底彩色描边的胶囊标签贴图 */
function makeLabelTexture(
  text: string,
  color: string,
  highlighted: boolean,
  dpr: number,
): LabelTexture {
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `500 ${FONT_PX}px ${FONT_STACK}`;
  const textW = Math.ceil(measure.measureText(text).width);

  const cssW = (textW + PAD_X * 2) / PX_PER_UNIT;
  const cssH = (FONT_PX * 1.35 + PAD_Y * 2) / PX_PER_UNIT;

  const scale = Math.max(1, dpr);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(cssW * PX_PER_UNIT * scale));
  canvas.height = Math.max(2, Math.round(cssH * PX_PER_UNIT * scale));
  const W = canvas.width;
  const H = canvas.height;

  const ctx = canvas.getContext("2d")!;
  const r = RADIUS * scale;
  const bw = BORDER * scale;
  ctx.beginPath();
  ctx.moveTo(r + bw, bw);
  ctx.lineTo(W - r - bw, bw);
  ctx.quadraticCurveTo(W - bw, bw, W - bw, r + bw);
  ctx.lineTo(W - bw, H - r - bw);
  ctx.quadraticCurveTo(W - bw, H - bw, W - r - bw, H - bw);
  ctx.lineTo(r + bw, H - bw);
  ctx.quadraticCurveTo(bw, H - bw, bw, H - r - bw);
  ctx.lineTo(bw, r + bw);
  ctx.quadraticCurveTo(bw, bw, r + bw, bw);
  ctx.closePath();
  ctx.fillStyle = highlighted ? "rgba(20, 24, 52, 0.95)" : "rgba(6, 6, 20, 0.88)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = bw;
  ctx.stroke();

  ctx.font = `${FONT_PX * scale}px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + 1 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return { texture, width: cssW, height: cssH };
}

export interface WaveSpriteProps {
  text: string;
  /** 标签主色（描边色） */
  color: string;
  position: [number, number, number];
  /** 可点击样式 + 指针拾取（用于"横波/纵波"聚焦标签） */
  interactive?: boolean;
  /** 世界单位下的高度，默认 0.5（相机默认距离下约 21px 高，与原来的 DOM 标签接近） */
  size?: number;
  opacity?: number;
  onClick?: () => void;
}

/** 世界空间文字标签；可点击时用 3D 射线拾取，等价于原来的按钮 */
export function WaveSprite({
  text,
  color,
  position,
  interactive = false,
  size = 0.5,
  opacity = 1,
  onClick,
}: WaveSpriteProps) {
  const [hovered, setHovered] = useState(false);
  const dpr = useMemo(
    () => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2)),
    [],
  );

  const label = useMemo(
    () => makeLabelTexture(text, color, interactive && hovered, dpr),
    [text, color, interactive, hovered, dpr],
  );
  useEffect(() => () => label.texture.dispose(), [label]);

  const groupRef = useRef<THREE.Group>(null);
  const baseY = position[1];

  // 轻微上下浮动
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.4) * 0.04;
    }
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const scaleY = size * (hovered ? 1.08 : 1);
  const scaleX = scaleY * (label.width / label.height);

  return (
    <group ref={groupRef} position={position}>
      <sprite
        scale={[scaleX, scaleY, 1]}
        renderOrder={30}
        onPointerOver={
          interactive
            ? (e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          interactive
            ? () => {
                setHovered(false);
                document.body.style.cursor = "";
              }
            : undefined
        }
        onClick={
          interactive && onClick
            ? (e) => {
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
      >
        <spriteMaterial
          map={label.texture}
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
