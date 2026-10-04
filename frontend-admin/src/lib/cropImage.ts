import type { Area, MediaSize, Size } from "react-easy-crop";

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
