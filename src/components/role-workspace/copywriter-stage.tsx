"use client";

import { useRef, useState } from "react";
import { FileText, LinkSimple, Trash, UploadSimple } from "@phosphor-icons/react";
import type {
  Card,
  ContentFormat,
  ContentUnit,
  SourceType,
  TextLength,
  TextTone,
} from "@/types";
import { FORMAT_DESCRIPTIONS, FORMAT_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { PreviewPhotos } from "@/components/role-workspace/preview-photos";
import { formatIconMap } from "@/lib/format-icons";
import { simulateTask } from "@/lib/simulate-generation";
import {
  DEMO_SOURCE_URL,
  getMockExtractionDataFromFile,
} from "@/lib/mock-wizard-data";
import {
  buildGeneratedCards,
  buildGeneratedExtraction,
  buildGeneratedPost,
} from "@/lib/workspace-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import styles from "./role-workspace.module.css";

const SOURCE_FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md,.rtf";
const VIDEO_MEME_FILE_ACCEPT = ".mp4,.mov,.webm,.mkv";

const FORMAT_OPTIONS: ContentFormat[] = [
  "text",
  "gallery",
  "slideshow",
  "video_meme",
];

const TONE_OPTIONS: { value: TextTone; label: string }[] = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "expert", label: "Экспертный" },
  { value: "formal", label: "Формальный" },
  { value: "casual", label: "Разговорный" },
];

const LENGTH_OPTIONS: { value: TextLength; label: string }[] = [
  { value: "short", label: "Короткий" },
  { value: "medium", label: "Средний" },
  { value: "long", label: "Длинный" },
];

interface CopywriterStageProps {
  content: ContentUnit;
  canOperate: boolean;
  canEdit: boolean;
  canChangeFormat: boolean;
  onChange: (patch: Partial<ContentUnit>) => void;
}

export function CopywriterStage({
  content,
  canOperate,
  canEdit,
  canChangeFormat,
  onChange,
}: CopywriterStageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const prompts = useSettingsStore((s) => s.prompts);
  const [busy, setBusy] = useState<string | null>(null);
  const [regenOpen, setRegenOpen] = useState<"post" | "titles" | null>(null);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [fileError, setFileError] = useState("");
  const promptOptions = prompts.map((prompt) => ({
    value: prompt.id,
    label: prompt.name,
  }));

  const isMeme = content.format === "video_meme";
  const showTitles =
    content.format === "gallery" || content.format === "slideshow";
  const canSetBrief = canOperate;
  const canFixText = canEdit;

  const log = (action: string) => {
    if (currentUser) addActionLog(content.id, action, currentUser.name);
  };

  const runAi = async (label: string, work: () => void | Partial<ContentUnit>) => {
    setBusy(label);
    await simulateTask(() => {}, ["queued", "in_progress"], 500);
    const patch = work();
    if (patch) onChange(patch);
    setBusy(null);
  };

  const updateCardText = (cardId: string, shortText: string) => {
    const cards: Card[] = content.cards.map((card) =>
      card.id === cardId ? { ...card, shortText } : card
    );
    onChange({ cards });
  };

  const handleExtract = () => {
    if (content.sourceType === "file" && !content.sourceFileName.trim()) {
      setFileError("Выберите файл для извлечения данных");
      return;
    }
    setFileError("");
    return runAi("Извлечение данных…", () => {
      const fromFile = content.sourceType === "file";
      const data = fromFile
        ? getMockExtractionDataFromFile(content.format, content.sourceFileName)
        : buildGeneratedExtraction(content);
      log(fromFile ? "Извлечение данных из файла" : "Извлечение данных из ссылки");
      const sourceUrl =
        fromFile ? "" : content.sourceUrl.trim() || DEMO_SOURCE_URL;
      return {
        sourceType: fromFile ? "file" : "url",
        sourceUrl,
        sourceFileName: fromFile ? content.sourceFileName : "",
        extractedTitle: data.title,
        extractedText: data.text,
        extractedImages: data.images,
        title: content.title.trim() ? content.title : data.title,
      };
    });
  };

  const handleGeneratePost = (extra?: string) =>
    runAi("Генерация текста…", () => {
      const postText = buildGeneratedPost(content, extra);
      log(extra?.trim() ? "Перегенерация текста" : "Генерация текста");
      return { postText };
    });

  const handleGenerateTitles = (extra?: string) =>
    runAi("Генерация заголовков…", () => {
      const cards = buildGeneratedCards(content, extra);
      log(extra?.trim() ? "Перегенерация заголовков слайдов" : "Генерация заголовков слайдов");
      return { cards };
    });

  const confirmRegen = async () => {
    const kind = regenOpen;
    const prompt = regenPrompt;
    setRegenOpen(null);
    setRegenPrompt("");
    if (kind === "post") await handleGeneratePost(prompt);
    if (kind === "titles") await handleGenerateTitles(prompt);
  };

  return (
    <div className={styles.copywriterLayout}>
      {canChangeFormat && (
        <div className={styles.formatGrid}>
          {FORMAT_OPTIONS.map((option) => {
            const Icon = formatIconMap[option];
            const active = content.format === option;
            return (
              <button
                key={option}
                type="button"
                className={`${styles.formatCard} ${active ? styles.formatCardActive : ""}`}
                onClick={() => onChange({ format: option, formatConfirmed: false })}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <div className={styles.formatCardTitle}>{FORMAT_LABELS[option]}</div>
                <div className={styles.formatCardDesc}>
                  {FORMAT_DESCRIPTIONS[option]}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.stackPreview}>
        {isMeme || content.format === "slideshow" ? (
          <div>
            <VideoPlayerStub className={styles.playerWide} />
            <p className={styles.visualLabel}>
              {isMeme ? "Ролик нашли вы" : "Ролик из шаблона"}
            </p>
          </div>
        ) : (
          <PreviewPhotos content={content} />
        )}

        <div className={styles.copy}>
          <div className={styles.copyGroup}>
            {canSetBrief ? (
              <Input
                label="Тема"
                value={content.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            ) : (
              <p className={styles.metaLine}>
                <span className={styles.kicker}>Тема</span>
                {content.title || content.extractedTitle || "не указана"}
              </p>
            )}
          </div>

          <div className={styles.copyGroup}>
            {canSetBrief && <p className={styles.kicker}>Тип источника</p>}
            {canSetBrief ? (
              <>
                <div className={styles.sourceTypeList}>
                  <label
                    className={`${styles.sourceType} ${
                      content.sourceType === "url" ? styles.sourceTypeActive : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="sourceType"
                      checked={content.sourceType === "url"}
                      onChange={() =>
                        onChange({ sourceType: "url" as SourceType })
                      }
                    />
                    <LinkSimple size={18} />
                    {isMeme ? "Ссылка на видео" : "Ссылка на материал"}
                  </label>
                  <label
                    className={`${styles.sourceType} ${
                      content.sourceType === "file" ? styles.sourceTypeActive : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="sourceType"
                      checked={content.sourceType === "file"}
                      onChange={() =>
                        onChange({ sourceType: "file" as SourceType })
                      }
                    />
                    <FileText size={18} />
                    {isMeme ? "Файл видео" : "Файл"}
                  </label>
                </div>

                {content.sourceType === "file" ? (
                  <div>
                    <input
                      ref={fileRef}
                      className={styles.fileHidden}
                      type="file"
                      accept={isMeme ? VIDEO_MEME_FILE_ACCEPT : SOURCE_FILE_ACCEPT}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setFileError("");
                        onChange({
                          sourceFileName: file.name,
                          sourceType: "file",
                          sourceUrl: "",
                        });
                        event.target.value = "";
                      }}
                    />
                    {content.sourceFileName ? (
                      <div className={styles.fileSelected}>
                        <div className={styles.fileSelectedInfo}>
                          <FileText size={20} />
                          <div>
                            <p className={styles.fileSelectedName}>
                              {content.sourceFileName}
                            </p>
                            <p className={styles.fileSelectedMeta}>Готов к извлечению</p>
                          </div>
                        </div>
                        <div className={styles.fileSelectedActions}>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => fileRef.current?.click()}
                            disabled={Boolean(busy)}
                          >
                            Заменить
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => {
                              onChange({ sourceFileName: "" });
                              setFileError("");
                            }}
                            disabled={Boolean(busy)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.fileDropzone}
                        onClick={() => fileRef.current?.click()}
                        disabled={Boolean(busy)}
                      >
                        <UploadSimple size={22} />
                        <span>Выберите или перетащите файл</span>
                        <span className={styles.fileDropzoneHint}>
                          {isMeme
                            ? "MP4, MOV, WEBM, MKV"
                            : "PDF, DOC, DOCX, TXT, MD, RTF"}
                        </span>
                      </button>
                    )}
                    {fileError && <p className={styles.fileError}>{fileError}</p>}
                  </div>
                ) : (
                  <Input
                    label={isMeme ? "Ссылка на видео" : "Ссылка на материал"}
                    value={content.sourceUrl}
                    onChange={(event) =>
                      onChange({ sourceUrl: event.target.value, sourceType: "url" })
                    }
                    placeholder="https://example.com/article"
                  />
                )}

                <Select
                  label="Базовый промпт"
                  options={
                    promptOptions.length > 0
                      ? promptOptions
                      : [{ value: content.promptId || "prompt-post", label: "Генерация поста" }]
                  }
                  value={content.promptId || promptOptions[0]?.value}
                  onChange={(event) => onChange({ promptId: event.target.value })}
                />
                <Textarea
                  label="Дополнительные указания для этой задачи"
                  rows={3}
                  value={content.additionalInstructions}
                  placeholder="Особые требования к этому контенту..."
                  onChange={(event) =>
                    onChange({ additionalInstructions: event.target.value })
                  }
                />
                <div className={styles.aiRow}>
                  <Button disabled={Boolean(busy)} onClick={handleExtract}>
                    {busy
                      ? "Извлечение..."
                      : content.sourceType === "file"
                        ? "Извлечь данные из файла"
                        : "Извлечь данные"}
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.metaLine}>
                <span className={styles.kicker}>Источник</span>
                <span className={styles.metaValue}>
                  {content.sourceUrl || content.sourceFileName || "не указан"}
                </span>
              </p>
            )}
          </div>

          {content.extractedText && (
            <div className={styles.extractedBlock}>
              <p className={styles.extractedTitle}>
                {content.extractedTitle || "Заголовок"}
              </p>
              <p className={styles.sourceExcerpt}>{content.extractedText}</p>
            </div>
          )}

          {!isMeme && canOperate && (
            <div className={styles.copyGroup}>
              <p className={styles.kicker}>Тон и длина для нейросети</p>
              <div className={styles.toolRow}>
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.toolChip} ${
                      content.textTone === option.value ? styles.toolChipActive : ""
                    }`}
                    onClick={() => onChange({ textTone: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className={styles.toolRow}>
                {LENGTH_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.toolChip} ${
                      content.textLength === option.value ? styles.toolChipActive : ""
                    }`}
                    onClick={() => onChange({ textLength: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.copyGroup}>
            <p className={styles.kicker}>{isMeme ? "Подводка" : "Текст"}</p>
            {canFixText ? (
              <Textarea
                value={content.postText}
                rows={10}
                onChange={(event) => onChange({ postText: event.target.value })}
              />
            ) : (
              <p className={styles.postText}>
                {content.postText ||
                  "Пока нет текста — сгенерируйте или дождитесь нейросеть."}
              </p>
            )}
            {canOperate && (
              <>
                {regenOpen === "post" ? (
                  <div className={styles.aiRow}>
                    <Input
                      value={regenPrompt}
                      placeholder="Уточнение: короче, другой тон, цифры точнее"
                      onChange={(event) => setRegenPrompt(event.target.value)}
                    />
                    <Button size="small" disabled={Boolean(busy)} onClick={confirmRegen}>
                      Перегенерировать
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => {
                        setRegenOpen(null);
                        setRegenPrompt("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <div className={styles.aiRow}>
                    <Button
                      size="small"
                      disabled={Boolean(busy)}
                      onClick={() => handleGeneratePost()}
                    >
                      {content.postText ? "Сгенерировать ещё раз" : "Сгенерировать текст"}
                    </Button>
                    {content.postText ? (
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={Boolean(busy)}
                        onClick={() => setRegenOpen("post")}
                      >
                        С уточнением
                      </Button>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>

          {showTitles && (
            <div className={styles.titleList}>
              <p className={styles.kicker}>Заголовки слайдов</p>
              {(content.cards.length > 0 ? content.cards : []).map((card, index) =>
                canFixText ? (
                  <Input
                    key={card.id}
                    label={`Слайд ${index + 1}`}
                    value={card.shortText}
                    onChange={(event) =>
                      updateCardText(card.id, event.target.value)
                    }
                  />
                ) : (
                  <p key={card.id} className={styles.titleItem}>
                    <span className={styles.titleIndex}>{index + 1}.</span>
                    {card.shortText}
                  </p>
                )
              )}
              {content.cards.length === 0 && (
                <p className={styles.note}>Заголовков ещё нет — сгенерируйте их.</p>
              )}
              {canOperate &&
                (regenOpen === "titles" ? (
                  <div className={styles.aiRow}>
                    <Input
                      value={regenPrompt}
                      placeholder="Уточнение к заголовкам слайдов"
                      onChange={(event) => setRegenPrompt(event.target.value)}
                    />
                    <Button size="small" disabled={Boolean(busy)} onClick={confirmRegen}>
                      Перегенерировать
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => {
                        setRegenOpen(null);
                        setRegenPrompt("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <div className={styles.aiRow}>
                    <Button
                      size="small"
                      disabled={Boolean(busy)}
                      onClick={() => handleGenerateTitles()}
                    >
                      Сгенерировать заголовки
                    </Button>
                    {content.cards.length > 0 ? (
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={Boolean(busy)}
                        onClick={() => setRegenOpen("titles")}
                      >
                        С уточнением
                      </Button>
                    ) : null}
                  </div>
                ))}
            </div>
          )}

          {busy && <p className={styles.busyNote}>{busy}</p>}
        </div>
      </div>
    </div>
  );
}
