"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { PlaceholderImage, VideoPlayerStub } from "@/components/shared/placeholder-image";
import styles from "./wizard.module.css";

interface StepResultProps {
  projectId: string;
  contentId: string;
}

export function StepResult({ projectId, contentId }: StepResultProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);

  const [feedback, setFeedback] = useState<string | null>(null);

  const format = useWizardStore((s) => s.format);
  const cards = useWizardStore((s) => s.cards);
  const postText = useWizardStore((s) => s.postText);
  const textOptions = useWizardStore((s) => s.textOptions);

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
        <div className={styles.resultGrid}>
          {cards.map((card) => (
            <PlaceholderImage
              key={card.id}
              variant="vertical"
              label={card.shortText.slice(0, 20)}
            />
          ))}
        </div>
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
          <Button onClick={() => handleDownload("ZIP")}>Скачать ZIP</Button>
        ) : format === "slideshow" ? (
          <>
            <Button onClick={() => handleDownload("MP4")}>Скачать MP4</Button>
            <Button variant="secondary" onClick={() => handleDownload("Карточки ZIP")}>
              Скачать карточки
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => handleDownload("post.txt")}>Скачать TXT</Button>
            <Button variant="secondary" onClick={() => handleDownload("post.md")}>
              Скачать Markdown
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={handleSave}>
          Сохранить
        </Button>
        {feedback && <span className={styles.resultFeedback}>{feedback}</span>}
      </div>
    </div>
  );
}
