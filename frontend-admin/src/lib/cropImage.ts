import type { Area, MediaSize, Size } from "react-easy-crop";

const SVG_NS = "http://www.w3.org/2000/svg";

export function computeCoverZoom(mediaSize: MediaSize, cropSize: Size): number {
  return Math.max(cropSize.width / mediaSize.width, cropSize.height / mediaSize.height);
}

/** 封面输出尺寸：与用户端实验卡预览窗的宽扁比例一致（2:1） */
export const COVER_ASPECT = 2 / 1;
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 400;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ── SVG 矢量取景 ──────────────────────────────────────────────
 * 不栅格化：原图内容完整保留，仅在展示层加一个 2:1 viewBox 取景窗。
 */

export type SvgCropSource = {
  /** 已清洗（去脚本/内联事件）并归一化宽高的原图文档，用于生成取景结果 */
  doc: Document;
  /** 原图 viewBox（坐标系原点可能与 0,0 不同） */
  box: { x: number; y: number; w: number; h: number };
  /** 给裁剪器显示的 blob URL（调用方负责 revoke） */
  url: string;
};

/** 只接受无单位或 px 的数值，百分比/物理单位无法建立取景坐标系 */
function parseLength(v: string | null): number | null {
  if (!v) return null;
  const m = v.trim().match(/^(\d+(?:\.\d+)?)(px)?$/i);
  return m ? parseFloat(m[1]) : null;
}

/** 解析 + 清洗 + 归一化 SVG；无法建立坐标系（无 viewBox 也无宽高）时返回 null */
export function prepareSvgForCrop(text: string): SvgCropSource | null {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") return null;
  if (doc.getElementsByTagName("parsererror").length > 0) return null;

  const box = (() => {
    const vb = (root.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
      return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    }
    const w = parseLength(root.getAttribute("width"));
    const h = parseLength(root.getAttribute("height"));
    if (w && h && w > 0 && h > 0) return { x: 0, y: 0, w, h };
    return null;
  })();
  if (!box) return null;

  // 安全清洗：不信任上传内容；serve 端另有 CSP sandbox 兜底
  doc.querySelectorAll("script").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      else if (/href$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });

  // 宽高归一为 viewBox 尺寸：让裁剪器的像素坐标 = 原图坐标系
  root.setAttribute("width", String(box.w));
  root.setAttribute("height", String(box.h));

  const cleaned = new XMLSerializer().serializeToString(doc);
  const url = URL.createObjectURL(new Blob([cleaned], { type: "image/svg+xml" }));
  return { doc, box, url };
}

function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * 生成「原图 + 2:1 取景窗」的新 SVG：
 * 外层 viewBox = 所选区域（画布坐标系，即内层原图被钉到 (0,0) 后的坐标），
 * 内层嵌套原图并钉在画布原点。原图内容一个字节都没删，只是展示窗口变了。
 */
export function cropSvgToBlob(source: SvgCropSource, pixelCrop: Area): Blob {
  const { box, doc } = source;
  const { x, y, width, height } = pixelCrop;

  const out = document.createElementNS(SVG_NS, "svg");
  // 内层钉到 (0,0) 后，画布坐标 = 原图坐标 − 原 viewBox 原点，
  // 故外层 viewBox 直接用裁剪像素值 (x y w h)，不能再叠加原 viewBox 原点偏移
  // （叠加会让非零原点 viewBox 的取景整体错位；已用 canvas 像素对比实测）
  out.setAttribute("viewBox", `${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)}`);
  out.setAttribute("width", String(Math.round(width)));
  out.setAttribute("height", String(Math.round(height)));

  const inner = doc.documentElement;
  inner.setAttribute("x", "0");
  inner.setAttribute("y", "0");
  inner.setAttribute("width", String(box.w));
  inner.setAttribute("height", String(box.h));
  out.appendChild(inner);

  let text = new XMLSerializer().serializeToString(out);
  // 保险：确保根元素带 SVG 命名空间（序列化器应自动输出，缺失则补）
  if (!text.includes(`xmlns="${SVG_NS}"`)) {
    text = text.replace("<svg", `<svg xmlns="${SVG_NS}"`);
  }
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${text}`], { type: "image/svg+xml" });
}

export async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("裁剪失败"))),
      "image/jpeg",
      0.92,
    );
  });
}
