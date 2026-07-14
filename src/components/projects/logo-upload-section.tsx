"use client";

import { useRef, useState } from "react";
import { UploadSimple, Trash, ArrowsClockwise } from "@phosphor-icons/react";
import type { LogoAsset, LogoFormat } from "@/types";
import { LOGO_FORMAT_META } from "@/types";
import { simulateTask } from "@/lib/simulate-generation";
import { Button } from "@/components/ui/button";
import styles from "./logo-upload-section.module.css";

const LOGO_FORMATS: LogoFormat[] = ["svg", "png", "jpg", "webp"];

interface LogoUploadSectionProps {
  placeholder: string;
  assets: LogoAsset[];
  onChange: (assets: LogoAsset[]) => void;
}

export function LogoUploadSection({
  placeholder,
  assets,
  onChange,
}: LogoUploadSectionProps) {
  const inputRefs = useRef<Partial<Record<LogoFormat, HTMLInputElement>>>({});
  const [uploadingFormat, setUploadingFormat] = useState<LogoFormat | null>(null);

  const getAsset = (format: LogoFormat) =>
    assets.find((asset) => asset.format === format);

  const handleUpload = async (format: LogoFormat, file?: File) => {
    setUploadingFormat(format);
    await simulateTask(() => {}, ["queued", "in_progress"], 700);

    const fileName =
      file?.name ?? `${placeholder.toLowerCase()}-logo.${format}`;
    const nextAsset: LogoAsset = {
      format,
      fileName,
      uploadedAt: new Date().toISOString(),
    };

    onChange([
      ...assets.filter((asset) => asset.format !== format),
      nextAsset,
    ]);
    setUploadingFormat(null);
  };

  const handleRemove = (format: LogoFormat) => {
    onChange(assets.filter((asset) => asset.format !== format));
  };

  const openFilePicker = (format: LogoFormat) => {
    inputRefs.current[format]?.click();
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <label className={styles.label}>Логотип</label>
        <p className={styles.hint}>
          Загрузите логотип в разных форматах — для карточек, веба и печати
        </p>
      </div>

      <div className={styles.grid}>
        {LOGO_FORMATS.map((format) => {
          const meta = LOGO_FORMAT_META[format];
          const asset = getAsset(format);
          const isUploading = uploadingFormat === format;

          return (
            <div key={format} className={styles.slot}>
              <input
                ref={(el) => {
                  if (el) inputRefs.current[format] = el;
                }}
                type="file"
                accept={meta.accept}
                className={styles.fileInput}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(format, file);
                  e.target.value = "";
                }}
              />

              <div className={styles.slotHeader}>
                <span className={styles.formatBadge}>{meta.label}</span>
                <span className={styles.formatHint}>{meta.hint}</span>
              </div>

              {asset ? (
                <div className={styles.uploaded}>
                  <div className={styles.preview}>
                    {placeholder}
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{asset.fileName}</span>
                    <span className={styles.fileMeta}>Загружен</span>
                  </div>
                  <div className={styles.slotActions}>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => openFilePicker(format)}
                      disabled={isUploading}
                    >
                      <ArrowsClockwise size={14} />
                      Заменить
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemove(format)}
                      disabled={isUploading}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.dropzone} ${isUploading ? styles.dropzoneLoading : ""}`}
                  onClick={() => openFilePicker(format)}
                  disabled={isUploading}
                >
                  <UploadSimple size={20} className={styles.dropzoneIcon} />
                  <span className={styles.dropzoneText}>
                    {isUploading ? "Загрузка..." : `Загрузить ${meta.label}`}
                  </span>
                  <span className={styles.dropzoneAccept}>{meta.accept}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
