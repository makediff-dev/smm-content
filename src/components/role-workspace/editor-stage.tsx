"use client";

import type { Card, ContentUnit } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { PreviewPhotos } from "@/components/role-workspace/preview-photos";
import { getDesignerSlides } from "@/lib/designer-slides";
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
  const slides = getDesignerSlides(content);
  const showTitles =
    content.format === "gallery" || content.format === "slideshow";

  const updateCardText = (cardId: string, shortText: string) => {
    const cards: Card[] = slides.map((card) =>
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
          <p className={styles.kicker}>Текст поста</p>
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
            {slides.map((card, index) =>
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
