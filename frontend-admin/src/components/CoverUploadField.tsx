"use client";

import { ChangeEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize, type Size } from "react-easy-crop";
import { uploadExperimentCover } from "@/lib/api";
import { resolveCoverUrl } from "@/lib/covers";
import { computeCoverZoom, cropImageToBlob } from "@/lib/cropImage";
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setMinZoom(1);
      setMediaSize(null);
      setCropSize(null);
      setCroppedArea(null);
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function closeModal() {
    if (uploading) return;
    setImageSrc(null);
    setError("");
  }

  async function confirmCrop() {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    setError("");
    try {
      const blob = await cropImageToBlob(imageSrc, croppedArea);
      const { coverUrl } = await uploadExperimentCover(blob);
      onChange(coverUrl);
      setImageSrc(null);
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
        accept="image/jpeg,image/png,image/webp"
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
            <span>4:3</span>
            <span className="caption">暂无封面</span>
          </div>
        )}
      </div>

      <div className="cover-upload__controls">
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm"
          onClick={openFilePicker}
          disabled={disabled || uploading}
        >
          {uploading ? "上传中…" : value ? "更换封面" : "上传封面"}
        </button>
        <p className="field-hint">固定 4:3 比例裁剪，支持 JPG / PNG / WebP，上传后不超过 2MB</p>
        <label htmlFor="coverUrl" className="cover-upload__url-label">
          或手动填写 URL
        </label>
        <input
          className="text-input"
          id="coverUrl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="留空则用户端显示实验名称"
          disabled={disabled || uploading}
        />
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
              裁剪封面（4:3）
            </h3>
            <div className="cover-cropper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
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
