"use client";

import { useState } from "react";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useAuthStore } from "@/stores/auth-store";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlaceholderImage } from "@/components/shared/placeholder-image";
import { simulateTask } from "@/lib/simulate-generation";
import {
  getMockExtractionData,
  getMockPostText,
  getMockPostTextRegenerated,
} from "@/lib/mock-wizard-data";
import {
  countChars,
  generateMockPostText,
} from "@/lib/mock-text-generation";
import type { TextLength, TextTone } from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

interface StepTextProps {
  hideSource?: boolean;
}

export function StepText({ hideSource = false }: StepTextProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);

  const format = useWizardStore((s) => s.format);
  const sourceType = useWizardStore((s) => s.sourceType);
  const sourceUrl = useWizardStore((s) => s.sourceUrl);
  const sourceFileName = useWizardStore((s) => s.sourceFileName);
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
  const textOptions = useWizardStore((s) => s.textOptions);
  const contentId = useWizardStore((s) => s.contentId);
  const cards = useWizardStore((s) => s.cards);
  const setField = useWizardStore((s) => s.setField);
  const stepDisabled = useWizardStepDisabled();

  const isTextFormat = format === "text";
  const isGalleryFormat = format === "gallery";
  const isSlideshowFormat = format === "slideshow";

  const publicationPreview = [
    postText,
    textOptions.addSourceLink ? "\n\nИсточник: example.com" : "",
    textOptions.includeHashtags ? "\n\n#контент #новости" : "",
    textOptions.includeEmoji ? " ✨" : "",
  ]
    .join("")
    .trim();

  const updateTextOption = (
    key: keyof typeof textOptions,
    value: boolean
  ) => {
    const next = { ...textOptions, [key]: value };
    setField("textOptions", next);
    if (contentId) updateContentUnit(contentId, { textOptions: next });
  };

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
    if (contentId && postText) {
      const stage = useWorkflowStore.getState().getTaskByContentId(contentId)
        ?.currentStage;
      if (stage) {
        useProjectsStore.getState().captureStageVersion(contentId, stage);
      }
    }
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
      {isTextFormat && !hideSource && (
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

      {!hideSource && sourceType === "url" && sourceUrl && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Исходная ссылка</h3>
          <div className={styles.linkBlock}>{sourceUrl}</div>
        </div>
      )}

      {!hideSource && sourceType === "file" && sourceFileName && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Исходный файл</h3>
          <div className={styles.linkBlock}>{sourceFileName}</div>
        </div>
      )}

      {!hideSource && (extractedTitle || extractedText || (!isTextFormat && extractedImages.length > 0)) && (
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
              <Button
                variant="secondary"
                onClick={handleReextract}
                disabled={stepDisabled || isExtracting}
              >
                {isExtracting ? "Извлечение..." : "Перегенерировать извлечение"}
              </Button>
            </div>
          )}
        </div>
      )}

      {(hideSource || extractedText || isPostGenerated) && (
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
              <Button
                onClick={() => handleGeneratePost()}
                disabled={stepDisabled || isGeneratingPost}
              >
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
                <Button
                  onClick={handleConfirmRegenerate}
                  disabled={stepDisabled || isGeneratingPost}
                >
                  {isGeneratingPost ? "Генерация..." : "Перегенерировать"}
                </Button>
                <Button variant="ghost" onClick={handleCancelRegenerate} disabled={stepDisabled}>
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={handleOpenRegenerate}
                disabled={stepDisabled || isGeneratingPost}
              >
                Перегенерировать
              </Button>
            )}
          </div>

          {isGalleryFormat && isPostGenerated && (
            <>
              <div className={styles.section} style={{ marginTop: 24, marginBottom: 0 }}>
                <h3 className={styles.sectionTitle}>Текст публикации отдельно от карточек</h3>
                <p className={styles.sectionHint}>
                  Основной текст, хештеги и эмодзи настраиваются отдельно — они не
                  дублируются на изображениях галереи.
                </p>
                <div className={styles.buildOptions}>
                  <Checkbox
                    label="Добавить ссылку на источник"
                    checked={textOptions.addSourceLink}
                    onChange={(e) => updateTextOption("addSourceLink", e.target.checked)}
                  />
                  <Checkbox
                    label="Добавить хештеги"
                    checked={textOptions.includeHashtags}
                    onChange={(e) => updateTextOption("includeHashtags", e.target.checked)}
                  />
                  <Checkbox
                    label="Добавить эмодзи"
                    checked={textOptions.includeEmoji}
                    onChange={(e) => updateTextOption("includeEmoji", e.target.checked)}
                  />
                </div>
              </div>

              <div className={styles.postPreview} style={{ marginTop: 16 }}>
                <div className={styles.postPreviewHeader}>
                  <div className={styles.postPreviewAvatar}>HA</div>
                  <div>
                    <div className={styles.postPreviewName}>HubAgency</div>
                    <div className={styles.postPreviewMeta}>Текст публикации · отдельно</div>
                  </div>
                </div>
                <div className={styles.postPreviewBody}>
                  {publicationPreview || "Текст публикации появится здесь"}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!hideSource && isSlideshowFormat && cards.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Готовые слайды</h3>
          <p className={styles.sectionHint}>Превью 1080×1080 — только просмотр на этом шаге.</p>
          <div className={styles.imageGrid}>
            {cards.map((card) => (
              <div key={card.id}>
                <PlaceholderImage
                  variant="square"
                  size="small"
                  label={card.shortText.slice(0, 16) || card.id}
                />
                <div className={styles.subsectionTitle} style={{ marginTop: 8 }}>
                  {card.shortText || "Без заголовка"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideSource && isGalleryFormat && cards.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Превью карточек 1080×1080</h3>
          <p className={styles.sectionHint}>
            Редактор проверяет текст поста вместе с готовыми карточками.
          </p>
          <div className={styles.imageGrid}>
            {cards.map((card) => (
              <div key={card.id}>
                <PlaceholderImage
                  variant="square"
                  size="small"
                  label={card.shortText.slice(0, 16) || card.id}
                />
                <div className={styles.subsectionTitle} style={{ marginTop: 8 }}>
                  {card.shortText || "Без заголовка"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
