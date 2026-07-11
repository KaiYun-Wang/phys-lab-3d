"use client";

import { ReactNode } from "react";
import { Html } from "@react-three/drei";

/** 与侧栏 text-sm 按钮视觉接近，随相机距离缩放 */
export const LABEL_FACTOR = 10;

export function WaveLabel({
  children,
  color,
  interactive = false,
}: {
  children: ReactNode;
  color: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`${interactive ? "pointer-events-auto cursor-pointer" : "pointer-events-none"} select-none px-3 py-1.5 rounded-lg font-medium whitespace-nowrap`}
      style={{
        fontSize: "14px",
        lineHeight: 1.35,
        color: "#ffffff",
        background: "rgba(6, 6, 20, 0.88)",
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 12px ${color}55, 0 2px 8px rgba(0,0,0,0.45)`,
      }}
    >
      {children}
    </div>
  );
}

export function WaveHtml({
  position,
  children,
  center = true,
  distanceFactor = LABEL_FACTOR,
}: {
  position: [number, number, number];
  children: ReactNode;
  center?: boolean;
  distanceFactor?: number;
}) {
  return (
    <Html
      position={position}
      center={center}
      distanceFactor={distanceFactor}
      zIndexRange={[200, 0]}
      style={{ pointerEvents: "none" }}
    >
      {children}
    </Html>
  );
}
