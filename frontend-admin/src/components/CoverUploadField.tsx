"use client";

import { ChangeEvent, useCallback, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { uploadExperimentCover } from "@/lib/api";
import { resolveCoverUrl } from "@/lib/covers";
import {
  cropImageToBlob,
  cropSvgToBlob,
  prepareSvgForCrop,
  COVER_ASPECT,
  type SvgCropSource,
} from "@/lib/cropImage";
import { useToast } from "@/components/Toast";
import CoverLightbox from "@/components/CoverLightbox";

type CoverUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

/**
 * react-easy-crop v6 缩放语义：zoom = 1 即媒体恰好顶到取景框边（上下或左右到头），
 * 再缩小无意义；放大上限 3×。min/max 为常量，避免历史动态计算在首帧尺寸为 0
 * 时产出 NaN / Infinity 导致滑块受控值异常甚至页面崩溃。
 */
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function CoverUploadField({ value, onChange, disabled }: CoverUploadFieldProps) {
  const toast = useToast();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // SVG 矢量取景：原图文档与显示用的 blob URL（栅格图时为空）
  const svgSourceRef = useRef<SvgCropSource | null>(null);
  const [cropIsSvg, setCropIsSvg] = useState(false);
  // 封面大图查看（有值时显示）
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const previewSrc = resolveCoverUrl(value);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  function openFilePicker() {
    if (disabled || uploading) return;
    setError("");
    fileRef.current?.click();
  }

  // 清空封面（需随表单保存才持久化）；不删 MinIO 文件，与更换封面行为一致
  function handleRemoveCover() {
    if (disabled || uploading) return;
    setError("");
    onChange("");
  }

  function resetCropState() {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setCroppedArea(null);
  }

  function releaseSvgSource() {
    if (svgSourceRef.current) {
      URL.revokeObjectURL(svgSourceRef.current.url);
      svgSourceRef.current = null;
    }
    setCropIsSvg(false);
  }

  async function openSvgCropper(file: File) {
    try {
      const source = prepareSvgForCrop(await file.text());
      if (!source) {
        setError("无法解析该 SVG（需为有效矢量文件，且带 viewBox 或 px 宽高）");
        return;
      }
      releaseSvgSource();
      svgSourceRef.current = source;
      setCropIsSvg(true);
      resetCropState();
      setImageSrc(source.url);
    } catch {
      setError("SVG 读取失败");
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    // SVG 矢量图：同样 2:1 取景，但输出不栅格化（原图内容完整保留）
    if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
      if (file.size > 2 * 1024 * 1024) {
        setError("SVG 文件不能超过 2MB");
        return;
      }
      void openSvgCropper(file);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片不能超过 10MB");
      return;
    }
    releaseSvgSource();
    const reader = new FileReader();
    reader.onload = () => {
      resetCropState();
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function closeModal() {
    if (uploading) return;
    setImageSrc(null);
    setError("");
    releaseSvgSource();
  }

  async function confirmCrop() {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    setError("");
    try {
      const source = svgSourceRef.current;
      const blob = source ? cropSvgToBlob(source, croppedArea) : await cropImageToBlob(imageSrc, croppedArea);
      const { coverUrl } = await uploadExperimentCover(blob, source ? "cover.svg" : "cover.jpg");
      onChange(coverUrl);
      setImageSrc(null);
      releaseSvgSource();
      toast.success("封面上传成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cover-upload">
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="cover-upload__file-input"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden
      />

      <div className="cover-upload__preview" aria-label="封面预览">
        {previewSrc ? (
          <button
            type="button"
            className="cover-upload__preview-btn"
            onClick={() => setLightboxSrc(previewSrc)}
            aria-label="查看封面大图"
            data-tooltip="查看封面"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="" className="cover-upload__img" />
          </button>
        ) : (
          <div className="cover-upload__placeholder">
            <span>2:1</span>
            <span className="caption">暂无封面</span>
          </div>
        )}
      </div>

      <div className="cover-upload__controls">
        <div className="cover-upload__buttons">
          <button
            type="button"
            className="btn-pill btn-pill--outline btn-pill--sm"
            onClick={openFilePicker}
            disabled={disabled || uploading}
          >
            {uploading ? "上传中…" : value ? "更换封面" : "上传封面"}
          </button>
          {value ? (
            <button
              type="button"
              className="btn-pill btn-pill--outline btn-pill--sm"
              onClick={handleRemoveCover}
              disabled={disabled || uploading}
            >
              删除封面
            </button>
          ) : null}
        </div>
        <p className="field-hint">JPG / PNG / WebP / SVG，统一 2:1 取景（位图 ≤10MB，SVG ≤2MB）</p>
        {error && !imageSrc ? <p className="form-error">{error}</p> : null}
      </div>

      {imageSrc ? (
        <div className="modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="modal modal--crop card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-crop-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="cover-crop-title">
              {cropIsSvg ? "裁剪封面（2:1 矢量取景）" : "裁剪封面（2:1 · 800 × 400）"}
            </h3>
            <div className="cover-cropper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={COVER_ASPECT}
                objectFit="contain"
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="cover-cropper__zoom">
              <label htmlFor="cover-zoom">缩放</label>
              <input
                id="cover-zoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v)));
                }}
                disabled={uploading}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={closeModal}
                disabled={uploading}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--primary btn-pill--sm"
                onClick={confirmCrop}
                disabled={uploading || !croppedArea}
              >
                {uploading ? "上传中…" : "确认并上传"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CoverLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
