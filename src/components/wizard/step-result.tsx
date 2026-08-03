"use client";

import { useState } from "react";
import { CheckCircle, Copy } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Button } from "@/components/ui/button";
import { PlaceholderImage, VideoPlayerStub } from "@/components/shared/placeholder-image";
import { canUserDownloadResult } from "@/lib/workflow-access";
import type { ContentFormat } from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

interface StepResultProps {
  projectId: string;
  contentId: string;
}

function buildCopyText(options: {
  format: ContentFormat;
  displayPost: string;
  postText: string;
  cards: Array<{ shortText: string }>;
  narrationText: string;
  textOptions: {
    addSourceLink: boolean;
    includeHashtags: boolean;
  };
}): string {
  const { format, displayPost, postText, cards, narrationText, textOptions } = options;

  if (format === "text") {
    return displayPost;
  }

  const lines: string[] = [];

  if (postText.trim()) {
    lines.push(postText.trim());
  }

  if (cards.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Карточки:");
    cards.forEach((card, index) => {
      lines.push(`${index + 1}. ${card.shortText}`);
    });
  }

  if (format === "slideshow" && narrationText.trim()) {
    lines.push("");
    lines.push("Озвучка:");
    lines.push(narrationText.trim());
  }

  if (textOptions.addSourceLink) {
    lines.push("");
    lines.push("Источник: example.com");
  }

  if (textOptions.includeHashtags) {
    lines.push("");
    lines.push("#контент #новости");
  }

  return lines.join("\n").trim();
}

export function StepResult({ projectId, contentId }: StepResultProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  const format = useWizardStore((s) => s.format);
  const cards = useWizardStore((s) => s.cards);
  const postText = useWizardStore((s) => s.postText);
  const narrationText = useWizardStore((s) => s.narrationText);
  const textOptions = useWizardStore((s) => s.textOptions);
  const stepDisabled = useWizardStepDisabled();
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentId));
  const canDownload = canUserDownloadResult(currentUser, task);

  const displayPost = [
    postText,
    textOptions.addSourceLink ? "\n\nИсточник: example.com" : "",
    textOptions.includeHashtags ? "\n\n#контент #новости" : "",
    textOptions.includeEmoji ? " ✨" : "",
  ]
    .join("")
    .trim();

  const handleDownload = (type: string) => {
    alert(`[Прототип] Скачивание: ${type}`);
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  };

  const showCopyToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  };

  const handleCopy = async () => {
    const textToCopy = buildCopyText({
      format,
      displayPost,
      postText,
      cards,
      narrationText,
      textOptions,
    });

    if (!textToCopy) {
      showFeedback("Нечего копировать");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (currentUser) {
      addActionLog(contentId, "Копирование результата", currentUser.name);
    }

    showCopyToast();
  };

  const handleSave = () => {
    updateContentUnit(contentId, {
      postText,
      cards,
      status: "done",
    });

    if (currentUser) {
      addActionLog(contentId, "Сохранение результата", currentUser.name);
    }

    showFeedback("Сохранено");
  };

  const resultTitle =
    format === "gallery"
      ? "Готовая галерея"
      : format === "slideshow"
        ? "Готовое слайд-шоу"
        : "Готовый текстовый пост";

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{resultTitle}</h3>
      </div>

      {format === "text" ? (
        <div className={styles.postPreview}>
          <div className={styles.postPreviewHeader}>
            <div className={styles.postPreviewAvatar}>HA</div>
            <div>
              <div className={styles.postPreviewName}>HubAgency</div>
              <div className={styles.postPreviewMeta}>Опубликовано · Публично</div>
            </div>
          </div>
          <div className={styles.postPreviewBody}>{displayPost}</div>
        </div>
      ) : format === "gallery" ? (
        <>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Текст публикации</h3>
            <div className={styles.postPreview}>
              <div className={styles.postPreviewHeader}>
                <div className={styles.postPreviewAvatar}>HA</div>
                <div>
                  <div className={styles.postPreviewName}>HubAgency</div>
                  <div className={styles.postPreviewMeta}>Отдельно от карточек</div>
                </div>
              </div>
              <div className={styles.postPreviewBody}>{displayPost}</div>
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Карточки галереи</h3>
            <div className={styles.resultGrid}>
              {cards.map((card) => (
                <PlaceholderImage
                  key={card.id}
                  variant="vertical"
                  label={card.shortText.slice(0, 20)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.resultLayout}>
          <VideoPlayerStub />
          <div>
            <p className={styles.sectionHint}>Вертикальное видео 9:16, MP4</p>
            <div className={styles.resultGrid}>
              {cards.map((card) => (
                <PlaceholderImage
                  key={card.id}
                  variant="vertical"
                  size="small"
                  label={`#${card.shortText.slice(0, 10)}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.resultActions}>
        {format === "gallery" ? (
          <Button onClick={() => handleDownload("ZIP")} disabled={!canDownload}>
            Скачать ZIP
          </Button>
        ) : format === "slideshow" ? (
          <>
            <Button onClick={() => handleDownload("MP4")} disabled={!canDownload}>
              Скачать MP4
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload("Карточки ZIP")}
              disabled={!canDownload}
            >
              Скачать карточки
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => handleDownload("post.txt")} disabled={!canDownload}>
              Скачать TXT
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload("post.md")}
              disabled={!canDownload}
            >
              Скачать Markdown
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={handleSave} disabled={stepDisabled}>
          Сохранить
        </Button>
        <Button variant="secondary" onClick={handleCopy} disabled={stepDisabled}>
          <Copy size={16} />
          Скопировать
        </Button>
        {feedback && <span className={styles.resultFeedback}>{feedback}</span>}
      </div>

      {copyToast && (
        <div className={styles.copyToast} role="status" aria-live="polite">
          <CheckCircle size={20} weight="fill" className={styles.copyToastIcon} />
          <div>
            <div className={styles.copyToastTitle}>Скопировано</div>
            <div className={styles.copyToastText}>Текст результата скопирован в буфер обмена</div>
          </div>
        </div>
      )}
    </div>
  );
}
