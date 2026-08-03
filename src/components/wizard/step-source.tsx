"use client";

import { useRef, useState } from "react";
import { FileText, LinkSimple, Trash, UploadSimple } from "@phosphor-icons/react";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { simulateTask } from "@/lib/simulate-generation";
import {
  DEMO_SOURCE_URL,
  getMockExtractionData,
  getMockExtractionDataFromFile,
} from "@/lib/mock-wizard-data";
import type { SourceType } from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

const SOURCE_FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md,.rtf";

export function StepSource() {
  const prompts = useSettingsStore((s) => s.prompts);
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);

  const format = useWizardStore((s) => s.format);
  const sourceType = useWizardStore((s) => s.sourceType);
  const sourceUrl = useWizardStore((s) => s.sourceUrl);
  const sourceFileName = useWizardStore((s) => s.sourceFileName);
  const promptId = useWizardStore((s) => s.promptId);
  const additionalInstructions = useWizardStore((s) => s.additionalInstructions);
  const isExtracting = useWizardStore((s) => s.isExtracting);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const stepDisabled = useWizardStepDisabled();

  const promptOptions = prompts.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handleSourceTypeChange = (nextType: SourceType) => {
    setFileError("");
    setField("sourceType", nextType);
    if (contentId) {
      updateContentUnit(contentId, { sourceType: nextType });
    }
  };

  const handleFileSelect = (file?: File) => {
    if (!file) return;

    setFileError("");
    setSelectedFile(file);
    setField("sourceFileName", file.name);
    setField("sourceUrl", "");

    if (contentId) {
      updateContentUnit(contentId, {
        sourceFileName: file.name,
        sourceUrl: "",
        sourceType: "file",
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError("");
    setField("sourceFileName", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (contentId) {
      updateContentUnit(contentId, { sourceFileName: "" });
    }
  };

  const runExtraction = async (
    mockData: ReturnType<typeof getMockExtractionData>,
    actionLabel: string,
    patch: {
      sourceType: SourceType;
      sourceUrl?: string;
      sourceFileName?: string;
    }
  ) => {
    if (!contentId || isExtracting) return;

    setField("isExtracting", true);
    setField("sourceType", patch.sourceType);

    updateContentUnit(contentId, {
      ...patch,
      format,
      promptId,
      additionalInstructions,
      status: "in_progress",
    });

    await simulateTask(
      (status) => {
        updateContentUnit(contentId, { status: status === "done" ? "draft" : status });
      },
      ["queued", "in_progress", "done"],
      500
    );

    setField("extractedTitle", mockData.title);
    setField("extractedText", mockData.text);
    setField("extractedImages", mockData.images);
    setField("isExtracted", true);
    setField("isExtracting", false);

    updateContentUnit(contentId, {
      extractedTitle: mockData.title,
      extractedText: mockData.text,
      extractedImages: mockData.images,
      status: "draft",
    });

    if (currentUser) {
      addActionLog(contentId, actionLabel, currentUser.name);
    }
  };

  const handleExtractFromUrl = async () => {
    const savedUrl = sourceUrl.trim() || DEMO_SOURCE_URL;
    const mockData = getMockExtractionData(format);

    setField("sourceUrl", savedUrl);
    setField("sourceFileName", "");

    await runExtraction(mockData, "Извлечение данных из ссылки", {
      sourceType: "url",
      sourceUrl: savedUrl,
      sourceFileName: "",
    });
  };

  const handleExtractFromFile = async () => {
    const fileName = selectedFile?.name ?? sourceFileName.trim();

    if (!fileName) {
      setFileError("Выберите файл для извлечения данных");
      return;
    }

    const mockData = getMockExtractionDataFromFile(format, fileName);

    setField("sourceFileName", fileName);
    setField("sourceUrl", "");

    await runExtraction(mockData, "Извлечение данных из файла", {
      sourceType: "file",
      sourceUrl: "",
      sourceFileName: fileName,
    });
  };

  const handleExtract =
    sourceType === "file" ? handleExtractFromFile : handleExtractFromUrl;

  const activeFileName = selectedFile?.name ?? sourceFileName;

  return (
    <div>
      <div className={styles.section}>
        <p className={styles.sectionHint}>
          Демо-режим: независимо от ссылки или файла будут подставлены одинаковые
          тестовые данные для выбранного формата.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Тип источника</h3>
        <div className={styles.radioGroup}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "url"}
              onChange={() => handleSourceTypeChange("url")}
            />
            <LinkSimple size={18} />
            Ссылка на материал
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "file"}
              onChange={() => handleSourceTypeChange("file")}
            />
            <FileText size={18} />
            Файл
          </label>
        </div>
      </div>

      <div className={styles.formGrid}>
        {sourceType === "url" ? (
          <Input
            label="Ссылка на материал"
            value={sourceUrl}
            onChange={(e) => setField("sourceUrl", e.target.value)}
            placeholder="https://example.com/article"
          />
        ) : (
          <div className={styles.fileUploadField}>
            <span className={styles.fileUploadLabel}>Файл с материалом</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={SOURCE_FILE_ACCEPT}
              className={styles.fileInputHidden}
              onChange={(e) => {
                handleFileSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {activeFileName ? (
              <div className={styles.fileSelected}>
                <div className={styles.fileSelectedInfo}>
                  <FileText size={20} className={styles.fileSelectedIcon} />
                  <div>
                    <div className={styles.fileSelectedName}>{activeFileName}</div>
                    <div className={styles.fileSelectedMeta}>Готов к извлечению</div>
                  </div>
                </div>
                <div className={styles.fileSelectedActions}>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={stepDisabled || isExtracting}
                  >
                    Заменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleRemoveFile}
                    disabled={stepDisabled || isExtracting}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.fileDropzone}
                onClick={() => fileInputRef.current?.click()}
                disabled={stepDisabled || isExtracting}
              >
                <UploadSimple size={22} className={styles.fileDropzoneIcon} />
                <span className={styles.fileDropzoneText}>Выберите или перетащите файл</span>
                <span className={styles.fileDropzoneHint}>
                  PDF, DOC, DOCX, TXT, MD, RTF
                </span>
              </button>
            )}

            {fileError && <div className={styles.fileError}>{fileError}</div>}
          </div>
        )}

        <Select
          label="Базовый промпт"
          options={promptOptions}
          value={promptId}
          onChange={(e) => setField("promptId", e.target.value)}
        />
        <Textarea
          label="Дополнительные указания для этой задачи"
          value={additionalInstructions}
          onChange={(e) => setField("additionalInstructions", e.target.value)}
          placeholder="Особые требования к этому контенту..."
        />
      </div>

      {isExtracting && (
        <div className={`${styles.loading} ${styles.loadingPulse}`}>
          Извлечение данных... В очереди → В работе → Готово
        </div>
      )}

      <div className={styles.actions} style={{ marginTop: 24 }}>
        <Button onClick={handleExtract} disabled={stepDisabled || isExtracting}>
          {isExtracting
            ? "Извлечение..."
            : sourceType === "file"
              ? "Извлечь данные из файла"
              : "Извлечь данные"}
        </Button>
      </div>
    </div>
  );
}
