"use client";

import { useRef, useState } from "react";
import { FileText, LinkSimple, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BasePromptSelect } from "@/components/wizard/base-prompt-select";
import { simulateTask } from "@/lib/simulate-generation";
import { getMockExtractionData, getMockExtractionDataFromFile } from "@/lib/mock-wizard-data";
import {
  detectLinkKind,
  doneHint,
  loadingHint,
} from "@/lib/source-fields";
import {
  formatUsesCards,
  MAX_SOURCE_FILES,
  MAX_SOURCE_LINKS,
  TITLE_MAX_LENGTH,
  type SourceExtract,
  type SourceFileRef,
} from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

const SOURCE_FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md,.rtf,.ppt,.pptx,.xls,.xlsx,image/*";
const VIDEO_MEME_FILE_ACCEPT = ".mp4,.mov,.webm,.mkv";

export function StepSource() {
  const prompts = useSettingsStore((s) => s.prompts);
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);

  const format = useWizardStore((s) => s.format);
  const sourceUseLink = useWizardStore((s) => s.sourceUseLink);
  const sourceUseFile = useWizardStore((s) => s.sourceUseFile);
  const sourceNotesEnabled = useWizardStore((s) => s.sourceNotesEnabled);
  const sourceNotes = useWizardStore((s) => s.sourceNotes);
  const sourceLinks = useWizardStore((s) => s.sourceLinks);
  const sourceFiles = useWizardStore((s) => s.sourceFiles);
  const sourceExtracts = useWizardStore((s) => s.sourceExtracts);
  const promptId = useWizardStore((s) => s.promptId);
  const generationPrompt = useWizardStore((s) => s.generationPrompt);
  const isExtracting = useWizardStore((s) => s.isExtracting);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);
  const stepDisabled = useWizardStepDisabled();
  const title = contentId ? getContentUnit(contentId)?.title ?? "" : "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const withCards = formatUsesCards(format);
  const isMeme = format === "video_meme";

  const persist = (patch: Parameters<typeof updateContentUnit>[1]) => {
    if (contentId) updateContentUnit(contentId, patch);
  };

  const persistSource = (patch: {
    sourceUseLink?: boolean;
    sourceUseFile?: boolean;
    sourceNotesEnabled?: boolean;
    sourceNotes?: string;
    sourceLinks?: string[];
    sourceFiles?: SourceFileRef[];
    sourceExtracts?: Record<string, SourceExtract>;
    sourceType?: "url" | "file";
    sourceUrl?: string;
    sourceFileName?: string;
  }) => {
    Object.entries(patch).forEach(([key, value]) => {
      setField(key as keyof typeof patch, value as never);
    });
    const nextLink = patch.sourceUseLink ?? sourceUseLink;
    const nextFile = patch.sourceUseFile ?? sourceUseFile;
    const links = patch.sourceLinks ?? sourceLinks;
    const files = patch.sourceFiles ?? sourceFiles;
    persist({
      ...patch,
      sourceType: nextFile && !nextLink ? "file" : "url",
      sourceUrl: links.find((link) => link.trim())?.trim() ?? "",
      sourceFileName: files[0]?.name ?? "",
    });
  };

  const toggleLink = () => persistSource({ sourceUseLink: !sourceUseLink });
  const toggleFile = () => persistSource({ sourceUseFile: !sourceUseFile });
  const toggleNotes = () =>
    persistSource({ sourceNotesEnabled: !sourceNotesEnabled });

  const setLink = (index: number, next: string) => {
    const previous = sourceLinks[index]?.trim();
    const nextUrl = next.trim();
    let extracts = sourceExtracts;

    if (previous && previous !== nextUrl) {
      const kept = new Set(
        sourceLinks
          .map((link, position) => (position === index ? nextUrl : link.trim()))
          .filter(Boolean)
      );
      extracts = Object.fromEntries(
        Object.entries(sourceExtracts).filter(([url]) => kept.has(url))
      );
    }

    persistSource({
      sourceLinks: sourceLinks.map((link, position) =>
        position === index ? next : link
      ),
      sourceExtracts: extracts,
    });
  };

  const removeLink = (index: number) => {
    const removed = sourceLinks[index]?.trim();
    const extracts = { ...sourceExtracts };
    if (removed) delete extracts[removed];
    persistSource({
      sourceLinks: sourceLinks.filter((_, position) => position !== index),
      sourceExtracts: extracts,
    });
  };

  const readLink = async (raw: string) => {
    const url = raw.trim();
    if (!url || stepDisabled || isExtracting) return;
    if (sourceExtracts[url]?.status === "done" || sourceExtracts[url]?.status === "loading") {
      return;
    }

    const extracts = { ...sourceExtracts, [url]: { status: "loading" as const } };
    persistSource({ sourceExtracts: extracts });
    setField("isExtracting", true);

    await simulateTask(() => undefined, ["queued", "in_progress"], 500);

    const mock = getMockExtractionData(format);
    const kind = detectLinkKind(url);
    persistSource({
      sourceExtracts: {
        ...extracts,
        [url]: {
          status: "done",
          kind,
          title: mock.title,
          text: mock.text,
          images: mock.images,
        },
      },
    });
    setField("extractedTitle", mock.title);
    setField("extractedText", mock.text);
    setField("extractedImages", mock.images);
    setField("isExtracted", true);
    setField("isExtracting", false);
    persist({
      extractedTitle: mock.title,
      extractedText: mock.text,
      extractedImages: mock.images,
    });
    if (contentId && currentUser) {
      addActionLog(contentId, "Извлечение данных из ссылки", currentUser.name);
    }
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    setFileError("");
    const next = [...sourceFiles];
    Array.from(list).forEach((file) => {
      if (next.length >= MAX_SOURCE_FILES) return;
      next.push({ id: `${file.name}-${file.size}`, name: file.name });
    });
    persistSource({ sourceFiles: next.slice(0, MAX_SOURCE_FILES), sourceUseFile: true });
  };

  const extractFiles = async () => {
    if (sourceFiles.length === 0) {
      setFileError("Выберите файл для извлечения данных");
      return;
    }
    setField("isExtracting", true);
    await simulateTask(() => undefined, ["queued", "in_progress"], 500);
    const mock = getMockExtractionDataFromFile(format, sourceFiles[0].name);
    setField("extractedTitle", mock.title);
    setField("extractedText", mock.text);
    setField("extractedImages", mock.images);
    setField("isExtracted", true);
    setField("isExtracting", false);
    persist({
      extractedTitle: mock.title,
      extractedText: mock.text,
      extractedImages: mock.images,
    });
    if (contentId && currentUser) {
      addActionLog(contentId, "Извлечение данных из файла", currentUser.name);
    }
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Источник материала</h3>
        <p className={styles.sectionHint}>
          Выберите один или несколько источников для генерации
        </p>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Тип источника</span>
          <div className={styles.sourceTypes}>
            <label
              className={`${styles.sourceOption} ${sourceUseLink ? styles.sourceOptionChecked : ""}`}
            >
              <input
                type="checkbox"
                checked={sourceUseLink}
                onChange={toggleLink}
                disabled={stepDisabled}
              />
              <span className={styles.sourceOptionIcon}>
                <LinkSimple size={20} />
              </span>
              <span className={styles.sourceOptionLabel}>
                {isMeme ? "Ссылка на видео" : "Ссылка на материал"}
              </span>
            </label>
            <label
              className={`${styles.sourceOption} ${sourceUseFile ? styles.sourceOptionChecked : ""}`}
            >
              <input
                type="checkbox"
                checked={sourceUseFile}
                onChange={toggleFile}
                disabled={stepDisabled}
              />
              <span className={styles.sourceOptionIcon}>
                <FileText size={20} />
              </span>
              <span className={styles.sourceOptionLabel}>
                {isMeme ? "Файл видео" : "Файл"}
              </span>
            </label>
            {!isMeme && (
              <label
                className={`${styles.sourceOption} ${sourceNotesEnabled ? styles.sourceOptionChecked : ""}`}
              >
                <input
                  type="checkbox"
                  checked={sourceNotesEnabled}
                  onChange={toggleNotes}
                  disabled={stepDisabled}
                />
                <span className={styles.sourceOptionIcon}>
                  <FileText size={20} />
                </span>
                <span className={styles.sourceOptionLabel}>Текст для рерайта</span>
              </label>
            )}
          </div>
        </div>

        {sourceUseLink && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>
              Ссылки на материал (до {MAX_SOURCE_LINKS})
            </span>
            {sourceLinks.map((link, index) => {
              const extract = sourceExtracts[link.trim()];
              return (
                <div key={index} className={styles.sourceLinkBlock}>
                  <div className={styles.sourceRow}>
                    <input
                      className={styles.sourceInput}
                      value={link}
                      placeholder={
                        isMeme
                          ? "https://... ссылка на видео"
                          : "https://t.me/канал/123 или статья"
                      }
                      disabled={stepDisabled}
                      onChange={(event) => setLink(index, event.target.value)}
                      onBlur={() => {
                        if (!isMeme) readLink(link);
                      }}
                      onPaste={(event) => {
                        if (isMeme) return;
                        const pasted = event.clipboardData.getData("text");
                        if (pasted.trim()) readLink(pasted);
                      }}
                    />
                    {sourceLinks.length > 1 && (
                      <button
                        type="button"
                        className={styles.sourceIconButton}
                        onClick={() => removeLink(index)}
                        disabled={stepDisabled}
                        aria-label="Удалить ссылку"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  {extract?.status === "loading" && (
                    <p className={styles.sourceHint}>{loadingHint(link)}</p>
                  )}
                  {extract?.status === "done" && (
                    <p className={styles.sourceHint}>{doneHint(extract)}</p>
                  )}
                  {extract?.status === "error" && (
                    <p className={styles.sourceHint}>{extract.error}</p>
                  )}
                </div>
              );
            })}
            {sourceLinks.length < MAX_SOURCE_LINKS && (
              <button
                type="button"
                className={styles.sourceAddLink}
                onClick={() => persistSource({ sourceLinks: [...sourceLinks, ""] })}
                disabled={stepDisabled}
              >
                + Добавить ссылку
              </button>
            )}
            <p className={styles.sourceHint}>
              {withCards
                ? "Публичная статья, пост Telegram или ВКонтакте — заберём текст для нейросети и фото материала. Посты мессенджеров модель не путает со статьёй. Рекламу и чужие баннеры пропускаем. Прямая ссылка на изображение по-прежнему станет фото карточки."
                : isMeme
                  ? "Ссылка на ролик: копирайтер находит видео, нейросеть его не ищет."
                  : "Публичная статья, пост Telegram или ВКонтакте — заберём текст и отдадим нейросети как материал, а не как статью сайта. Меню, кнопки и рекламу пропускаем."}
            </p>
          </div>
        )}

        {sourceUseFile && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>
              Файлы с материалом (до {MAX_SOURCE_FILES})
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple={!isMeme}
              accept={isMeme ? VIDEO_MEME_FILE_ACCEPT : SOURCE_FILE_ACCEPT}
              className={styles.fileInputHidden}
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
            {sourceFiles.length > 0 && (
              <ul className={styles.fileList}>
                {sourceFiles.map((file) => (
                  <li key={file.id} className={styles.fileSelected}>
                    <div className={styles.fileSelectedInfo}>
                      <FileText size={20} />
                      <div>
                        <div className={styles.fileSelectedName}>{file.name}</div>
                        <div className={styles.fileSelectedMeta}>
                          {isMeme ? "Видео загружено" : "Готов к извлечению"}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="small"
                      disabled={stepDisabled}
                      onClick={() =>
                        persistSource({
                          sourceFiles: sourceFiles.filter((item) => item.id !== file.id),
                        })
                      }
                    >
                      <Trash size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {sourceFiles.length < MAX_SOURCE_FILES && (
              <button
                type="button"
                className={styles.fileDropzone}
                onClick={() => fileInputRef.current?.click()}
                disabled={stepDisabled}
              >
                <UploadSimple size={22} className={styles.fileDropzoneIcon} />
                <span className={styles.fileDropzoneText}>
                  {sourceFiles.length > 0
                    ? `Добавить ещё (осталось ${MAX_SOURCE_FILES - sourceFiles.length})`
                    : "Выберите или перетащите файлы"}
                </span>
                <span className={styles.fileDropzoneHint}>
                  {isMeme ? "MP4, MOV, WEBM, MKV" : "Документы, тексты и изображения"}
                </span>
              </button>
            )}
            {fileError && <div className={styles.fileError}>{fileError}</div>}
            {!isMeme && (
              <div className={styles.actions} style={{ marginTop: 8 }}>
                <Button onClick={extractFiles} disabled={stepDisabled || isExtracting}>
                  {isExtracting ? "Извлечение..." : "Извлечь данные из файла"}
                </Button>
              </div>
            )}
          </div>
        )}

        {sourceNotesEnabled && !isMeme && (
          <div className={styles.field}>
            <Textarea
              label="Текст для рерайта"
              value={sourceNotes}
              rows={4}
              placeholder="Поле для текста"
              disabled={stepDisabled}
              onChange={(event) => persistSource({ sourceNotes: event.target.value })}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="base-prompt">
            Базовый промпт
          </label>
          <BasePromptSelect
            id="base-prompt"
            value={promptId}
            prompts={prompts}
            disabled={stepDisabled}
            onChange={(next) => {
              setField("promptId", next);
              persist({ promptId: next });
            }}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="source-title">
            Название
            <span className={styles.fieldCounter}>
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </label>
          <input
            id="source-title"
            className={styles.sourceInput}
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            placeholder="Можно оставить пустым — возьмём из текста"
            disabled={stepDisabled}
            onChange={(event) => persist({ title: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <Textarea
            label="Задание"
            value={generationPrompt}
            rows={5}
            placeholder="Что сделать с материалом. Скилл — через @имя"
            disabled={stepDisabled}
            onChange={(event) => {
              setField("generationPrompt", event.target.value);
              persist({ generationPrompt: event.target.value });
            }}
          />
        </div>
      </div>
    </div>
  );
}
