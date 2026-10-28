"use client";

import type { Card, ContentUnit } from "@/types";
import { TITLE_MAX_LENGTH } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { PreviewPhotos } from "@/components/role-workspace/preview-photos";
import { countChars } from "@/lib/mock-text-generation";
import styles from "./role-workspace.module.css";

interface EditorStageProps {
  content: ContentUnit;
  canEdit: boolean;
  showVisuals?: boolean;
  onChange: (patch: Partial<ContentUnit>) => void;
}

export function EditorStage({
  content,
  canEdit,
  showVisuals = true,
  onChange,
}: EditorStageProps) {
  const titleCards = content.cards;
  const showTitles =
    titleCards.length > 0 &&
    (content.format === "gallery" ||
      content.format === "slideshow" ||
      content.format === "text");

  const updateCardText = (cardId: string, shortText: string) => {
    const cards: Card[] = content.cards.map((card) =>
      card.id === cardId ? { ...card, shortText } : card
    );
    onChange({ cards });
  };

  const isMeme = content.format === "video_meme";

  return (
    <div
      className={
        isMeme && showVisuals ? styles.editorMemeLayout : styles.stackPreview
      }
    >
      {showVisuals &&
        (content.format === "slideshow" || isMeme ? (
          <div className={styles.visualCol}>
            <VideoPlayerStub
              className={isMeme ? styles.editorMemePlayer : styles.playerWide}
              src={content.sourceUrl || undefined}
            />
            <p className={styles.visualLabel}>Визуал к вычитке</p>
          </div>
        ) : (
          <PreviewPhotos content={content} />
        ))}

      <div className={styles.copy}>
        <div className={styles.copyGroup}>
          <div className={styles.reviewHead}>
            <p className={styles.kicker}>Название</p>
            <span className={styles.reviewCounter}>
              {content.title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>
          {canEdit ? (
            <Input
              value={content.title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          ) : (
            <p className={styles.postText}>
              {content.title || "Нет названия."}
            </p>
          )}
        </div>

        <div className={styles.copyGroup}>
          <div className={styles.reviewHead}>
            <p className={styles.kicker}>Текст поста</p>
            <span className={styles.reviewCounter}>
              {countChars(content.postText)} симв.
            </span>
          </div>
          {canEdit ? (
            <Textarea
              value={content.postText}
              rows={isMeme ? 16 : 10}
              className={isMeme ? styles.editorMemeText : undefined}
              onChange={(event) => onChange({ postText: event.target.value })}
            />
          ) : (
            <p className={styles.postText}>
              {content.postText || "Нет текста для вычитки."}
            </p>
          )}
        </div>

        {showTitles && (
          <div className={styles.titleList}>
            <p className={styles.kicker}>Текст на слайдах</p>
            {titleCards.map((card, index) =>
              canEdit ? (
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
          </div>
        )}

        {content.format === "slideshow" && (
          <div className={styles.copyGroup}>
            <p className={styles.kicker}>Озвучка</p>
            {canEdit ? (
              <Textarea
                value={content.narrationText}
                rows={5}
                onChange={(event) =>
                  onChange({ narrationText: event.target.value })
                }
              />
            ) : (
              <p className={styles.postText}>
                {content.narrationText || "Нет текста озвучки."}
              </p>
            )}
          </div>
        )}

        {!canEdit && (
          <p className={styles.note}>
            Вычитка: ошибки, тон и оформление. Генерацию делает нейросеть,
            при сбое — «Вернуть».
          </p>
        )}
      </div>
    </div>
  );
}
