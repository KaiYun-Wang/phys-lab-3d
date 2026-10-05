"use client";

import { ChangeEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize, type Size } from "react-easy-crop";
import { uploadExperimentCover } from "@/lib/api";
import { resolveCoverUrl } from "@/lib/covers";
import {
  computeCoverZoom,
  cropImageToBlob,
  cropSvgToBlob,
  prepareSvgForCrop,
  COVER_ASPECT,
  type SvgCropSource,
} from "@/lib/cropImage";
import { useToast } from "@/components/Toast";

type CoverUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export default function CoverUploadField({ value, onChange, disabled }: CoverUploadFieldProps) {
  const toast = useToast();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [cropSize, setCropSize] = useState<Size | null>(null);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const coverInitializedRef = useRef(false);
  // SVG 矢量取景：原图文档与显示用的 blob URL（栅格图时为空）
  const svgSourceRef = useRef<SvgCropSource | null>(null);
  const [cropIsSvg, setCropIsSvg] = useState(false);

  const previewSrc = resolveCoverUrl(value);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const maxZoom = Math.max(minZoom * 2, 3);

  useEffect(() => {
    coverInitializedRef.current = false;
  }, [imageSrc]);

  useEffect(() => {
    if (!mediaSize || !cropSize || coverInitializedRef.current) return;
    const cover = computeCoverZoom(mediaSize, cropSize);
    setMinZoom(cover);
    setZoom(cover);
    setCrop({ x: 0, y: 0 });
    coverInitializedRef.current = true;
  }, [mediaSize, cropSize]);

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
    setZoom(1);
    setMinZoom(1);
    setMediaSize(null);
    setCropSize(null);
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="" className="cover-upload__img" />
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
                objectFit="cover"
                minZoom={minZoom}
                maxZoom={maxZoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                onMediaLoaded={setMediaSize}
                onCropSizeChange={setCropSize}
              />
            </div>
            <div className="cover-cropper__zoom">
              <label htmlFor="cover-zoom">缩放</label>
              <input
                id="cover-zoom"
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Math.max(minZoom, Number(e.target.value)))}
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
    </div>
  );
}
