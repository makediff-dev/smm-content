"use client";

import { useState } from "react";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/shared/placeholder-image";
import { simulateTask } from "@/lib/simulate-generation";
import { getMockExtractionData, getMockPostText, getMockPostTextRegenerated } from "@/lib/mock-wizard-data";
import {
  countChars,
  generateMockPostText,
} from "@/lib/mock-text-generation";
import type { TextLength, TextTone } from "@/types";
import styles from "./wizard.module.css";

export function StepText() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);

  const format = useWizardStore((s) => s.format);
  const sourceUrl = useWizardStore((s) => s.sourceUrl);
  const extractedTitle = useWizardStore((s) => s.extractedTitle);
  const extractedText = useWizardStore((s) => s.extractedText);
  const extractedImages = useWizardStore((s) => s.extractedImages);
  const postText = useWizardStore((s) => s.postText);
  const isPostGenerated = useWizardStore((s) => s.isPostGenerated);
  const isGeneratingPost = useWizardStore((s) => s.isGeneratingPost);
  const isExtracting = useWizardStore((s) => s.isExtracting);
  const textTone = useWizardStore((s) => s.textTone);
  const textLength = useWizardStore((s) => s.textLength);
  const generationPrompt = useWizardStore((s) => s.generationPrompt);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);

  const isTextFormat = format === "text";

  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");

  const persistTextFields = (patch: {
    postText?: string;
    textTone?: TextTone;
    textLength?: TextLength;
    generationPrompt?: string;
  }) => {
    if (!contentId) return;
    updateContentUnit(contentId, patch);
  };

  const handleReextract = async () => {
    const mockData = getMockExtractionData(format);
    setField("isExtracting", true);
    await simulateTask(() => {}, ["queued", "in_progress"], 500);
    setField("extractedTitle", mockData.title);
    setField("extractedText", mockData.text);
    setField("extractedImages", mockData.images);
    setField("isExtracting", false);
    if (contentId) {
      updateContentUnit(contentId, {
        extractedTitle: mockData.title,
        extractedText: mockData.text,
        extractedImages: mockData.images,
      });
      if (currentUser) {
        addActionLog(contentId, "Перегенерация извлечения", currentUser.name);
      }
    }
  };

  const handleGeneratePost = async (extraPrompt?: string) => {
    setField("isGeneratingPost", true);
    await simulateTask(() => {}, ["queued", "in_progress"], 600);

    const trimmedExtra = extraPrompt?.trim() ?? "";
    const generated = isTextFormat
      ? generateMockPostText(
          textTone,
          textLength,
          trimmedExtra || generationPrompt || extractedText
        )
      : trimmedExtra
        ? getMockPostTextRegenerated(format, trimmedExtra)
        : getMockPostText(format);

    setField("postText", generated);
    setField("isPostGenerated", true);
    setField("isGeneratingPost", false);

    if (contentId) {
      persistTextFields({ postText: generated, textTone, textLength, generationPrompt });
      if (currentUser) {
        addActionLog(
          contentId,
          trimmedExtra ? "Перегенерация текста поста" : "Генерация текста поста",
          currentUser.name
        );
      }
    }
  };

  const handleOpenRegenerate = () => {
    setRegenerateOpen(true);
  };

  const handleCancelRegenerate = () => {
    setRegenerateOpen(false);
    setRegeneratePrompt("");
  };

  const handleConfirmRegenerate = async () => {
    setRegenerateOpen(false);
    await handleGeneratePost(regeneratePrompt);
    setRegeneratePrompt("");
  };

  return (
    <div>
      {isTextFormat && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Промпт для генерации</h3>
          <p className={styles.sectionHint}>
            Опишите, какой пост нужен — или оставьте пустым, чтобы использовать
            спаршенную новость как основу.
          </p>
          <Textarea
            label="Промпт"
            value={generationPrompt}
            onChange={(e) => {
              setField("generationPrompt", e.target.value);
              if (contentId) updateContentUnit(contentId, { generationPrompt: e.target.value });
            }}
            rows={3}
            placeholder="Например: сделай дайджест из 3 пунктов для LinkedIn, экспертный тон"
          />
        </div>
      )}

      {sourceUrl && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Исходная ссылка</h3>
          <div className={styles.linkBlock}>{sourceUrl}</div>
        </div>
      )}

      {(extractedTitle || extractedText || (!isTextFormat && extractedImages.length > 0)) && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Извлечённые данные</h3>

          {(extractedTitle || extractedText) && (
            <div className={styles.extractedBlock}>
              <div className={styles.extractedTitle}>{extractedTitle || "Заголовок"}</div>
              <div className={styles.extractedText}>
                {extractedText || "Текст не извлечён"}
              </div>
            </div>
          )}

          {!isTextFormat && extractedImages.length > 0 && (
            <div>
              <h4 className={styles.subsectionTitle}>Найденные изображения</h4>
              <div className={styles.imageGrid}>
                {extractedImages.map((img) => (
                  <PlaceholderImage key={img} variant="square" size="small" label={img} />
                ))}
              </div>
            </div>
          )}

          {extractedText && (
            <div className={styles.extractedActions}>
              <Button variant="secondary" onClick={handleReextract} disabled={isExtracting}>
                {isExtracting ? "Извлечение..." : "Перегенерировать извлечение"}
              </Button>
            </div>
          )}
        </div>
      )}

      {(extractedText || isPostGenerated) && (
        <div className={styles.section}>
          <div className={styles.textEditorHeader}>
            <span className={styles.sectionTitle}>Текст поста</span>
            {isPostGenerated && (
              <span className={styles.charCounter}>{countChars(postText)} симв.</span>
            )}
          </div>
          <Textarea
            value={postText}
            onChange={(e) => setField("postText", e.target.value)}
            rows={isTextFormat ? 8 : 5}
            placeholder="Текст поста появится после генерации — можно отредактировать вручную"
          />

          {isGeneratingPost && (
            <div className={`${styles.loading} ${styles.loadingPulse}`}>
              Генерация текста... В очереди → В работе
            </div>
          )}

          <div className={`${styles.actions} ${styles.textEditorActions}`}>
            {!isPostGenerated ? (
              <Button onClick={() => handleGeneratePost()} disabled={isGeneratingPost}>
                {isGeneratingPost ? "Генерация..." : "Сгенерировать текст поста"}
              </Button>
            ) : regenerateOpen ? (
              <div className={styles.regenerateInline}>
                <div className={styles.regenerateInputWrap}>
                  <Input
                    value={regeneratePrompt}
                    onChange={(e) => setRegeneratePrompt(e.target.value)}
                    placeholder="Уточнение для перегенерации: короче, другой тон, добавить CTA..."
                    autoFocus
                  />
                </div>
                <Button onClick={handleConfirmRegenerate} disabled={isGeneratingPost}>
                  {isGeneratingPost ? "Генерация..." : "Перегенерировать"}
                </Button>
                <Button variant="ghost" onClick={handleCancelRegenerate}>
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={handleOpenRegenerate}
                disabled={isGeneratingPost}
              >
                Перегенерировать
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
