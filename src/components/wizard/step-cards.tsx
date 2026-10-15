"use client";

import { useEffect, useRef, useState } from "react";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { canUserEditCardsPhase } from "@/lib/workflow-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaceholderImage } from "@/components/shared/placeholder-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { generateId, simulateTask } from "@/lib/simulate-generation";
import { getMockCards, getMockCardsRegenerated } from "@/lib/mock-wizard-data";
import {
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  Crop,
  Eraser,
  LinkSimple,
  Palette,
  Sparkle,
  Swap,
  UploadSimple,
} from "@phosphor-icons/react";
import {
  CARDS_PHASE_LABELS,
  CARDS_PHASE_ORDER,
  COPYRIGHT_MAX_LENGTH,
  MAX_CARDS_COUNT,
  TITLE_MAX_LENGTH,
  type Card,
  type CardsPhase,
} from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

const PHASE_HINTS: Record<CardsPhase, string> = {
  phrases:
    "Сначала AI сгенерирует короткие заголовки для каждой карточки на основе текста поста.",
  edit: "Проверьте и отредактируйте заголовки и подписи — перед созданием изображений.",
  images:
    "Проверьте кадр, плашку и текст на изображении. Можно заменить фото, обрезать и применить фирменный стиль.",
};

export type StepCardsMode = "all" | "headlines" | "layout";

interface StepCardsProps {
  mode?: StepCardsMode;
}

function CardsPhaseStepper({
  currentPhase,
  onPhaseClick,
  phases,
}: {
  currentPhase: CardsPhase;
  onPhaseClick: (phase: CardsPhase) => void;
  phases: CardsPhase[];
}) {
  const currentIndex = Math.max(0, phases.indexOf(currentPhase));

  return (
    <ol className={styles.phaseStepper}>
      {phases.map((phase, index) => {
        const isActive = phase === currentPhase;
        const isCompleted = index < currentIndex;
        return (
          <li
            key={phase}
            className={`${styles.phaseStepperItem} ${isActive ? styles.phaseStepperItemActive : ""} ${
              isCompleted ? styles.phaseStepperItemDone : ""
            }`}
          >
            {index === phases.length - 1 && (
              <span className={styles.phaseStepperLine} aria-hidden />
            )}
            <button
              type="button"
              className={styles.phaseButton}
              disabled={index > currentIndex}
              onClick={() => index <= currentIndex && onPhaseClick(phase)}
            >
              <span className={styles.phaseStepperIndex}>{index + 1}</span>
              {CARDS_PHASE_LABELS[phase]}
            </button>
            {index === 0 && <span className={styles.phaseStepperLine} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function StepCards({ mode = "all" }: StepCardsProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);

  const cards = useWizardStore((s) => s.cards);
  const format = useWizardStore((s) => s.format);
  const cardsPhase = useWizardStore((s) => s.cardsPhase);
  const cardsCount = useWizardStore((s) => s.cardsCount);
  const buildOptions = useWizardStore((s) => s.buildOptions);
  const isGeneratingCardPhrases = useWizardStore((s) => s.isGeneratingCardPhrases);
  const isGeneratingCardImages = useWizardStore((s) => s.isGeneratingCardImages);
  const selectedCardId = useWizardStore((s) => s.selectedCardId);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const project = projectId ? getProject(projectId) : undefined;
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const hasCardImages = cards.length > 0 && cards.every((card) => card.imageUrl);
  const headlinePhases: CardsPhase[] = ["phrases", "edit"];
  const stepperPhases =
    mode === "headlines"
      ? headlinePhases
      : mode === "layout"
        ? []
        : CARDS_PHASE_ORDER;
  const stepperPhase: CardsPhase =
    mode === "headlines" && cardsPhase === "images"
      ? cards.length > 0
        ? "edit"
        : "phrases"
      : cardsPhase;
  const phaseIndex = Math.max(0, (stepperPhases.length ? stepperPhases : CARDS_PHASE_ORDER).indexOf(stepperPhase));

  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [crop, setCrop] = useState(false);
  const [plaque, setPlaque] = useState(false);
  const [dim, setDim] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showHeadlines = mode !== "layout";
  const showLayout = mode !== "headlines";
  const showStepper = stepperPhases.length > 0;
  const stepDisabled = useWizardStepDisabled();
  const task = useWorkflowStore((s) =>
    contentId ? s.getTaskByContentId(contentId) : undefined
  );
  const canEditPhrases = canUserEditCardsPhase(
    currentUser,
    task,
    format,
    cardsPhase === "edit" ? "edit" : "phrases"
  );
  const canEditImages = canUserEditCardsPhase(currentUser, task, format, "images");
  const phrasesDisabled = stepDisabled || !canEditPhrases;
  const imagesDisabled = stepDisabled || !canEditImages;

  useEffect(() => {
    const next =
      mode === "layout"
        ? "images"
        : mode === "headlines" && cardsPhase === "images"
          ? cards.length > 0
            ? "edit"
            : "phrases"
          : null;
    if (!next || useWizardStore.getState().cardsPhase === next) return;
    setField("cardsPhase", next);
  }, [mode, cardsPhase, cards.length, setField]);

  const updateCards = (newCards: Card[]) => {
    setField("cards", newCards);
    if (contentId) updateContentUnit(contentId, { cards: newCards });
  };

  const handlePhaseClick = (phase: CardsPhase) => {
    setField("cardsPhase", phase);
  };

  const handleGeneratePhrases = async (extraPrompt?: string, isRegenerate = false) => {
    const copyright = project?.defaultCopyright ?? "Источник";
    const trimmedExtra = extraPrompt?.trim() ?? "";
    setField("isGeneratingCardPhrases", true);

    await simulateTask(() => {}, ["queued", "in_progress"], 700);

    const sourceCards =
      isRegenerate && trimmedExtra
        ? getMockCardsRegenerated(format, copyright, trimmedExtra)
        : getMockCards(format, copyright);

    const count = Math.min(MAX_CARDS_COUNT, Math.max(1, cardsCount));
    const newCards: Card[] = Array.from({ length: count }, (_, index) => {
      const source = sourceCards[index % sourceCards.length];
      return {
        ...source,
        id: generateId("card"),
        headlineOnImage: source.headlineOnImage ?? true,
      };
    });

    updateCards(newCards);
    setField("selectedCardId", newCards[0]?.id ?? null);
    setField("cardsPhase", "edit");
    setField("isGeneratingCardPhrases", false);

    if (contentId && currentUser) {
      addActionLog(
        contentId,
        isRegenerate && trimmedExtra
          ? "Перегенерация заголовков для карточек"
          : "Генерация заголовков для карточек",
        currentUser.name
      );
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
    await handleGeneratePhrases(regeneratePrompt, true);
    setRegeneratePrompt("");
  };

  const handleUpdateCardById = (
    cardId: string,
    field: keyof Card,
    value: string | boolean
  ) => {
    const newCards = cards.map((card) =>
      card.id === cardId ? { ...card, [field]: value } : card
    );
    updateCards(newCards);
  };

  const handleDeleteCardById = (cardId: string) => {
    const newCards = cards.filter((card) => card.id !== cardId);
    updateCards(newCards);
    setField("selectedCardId", newCards[0]?.id ?? null);
  };

  const handleAddCard = () => {
    if (cards.length >= MAX_CARDS_COUNT) return;
    const newCard: Card = {
      id: generateId("card"),
      shortText: "Новая карточка",
      copyright: project?.defaultCopyright ?? "Источник",
      status: "needs_edit",
      headlineOnImage: true,
    };
    updateCards([...cards, newCard]);
    setField("selectedCardId", newCard.id);
  };

  const handleMoveCard = (cardId: string, direction: "up" | "down") => {
    const index = cards.findIndex((card) => card.id === cardId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    const nextCards = [...cards];
    [nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]];
    updateCards(nextCards);
  };

  const handleReplaceImage = (cardId: string, label: string) => {
    const nextCards = cards.map((card) =>
      card.id === cardId
        ? { ...card, imageUrl: label, status: "ready" as const }
        : card
    );
    updateCards(nextCards);

    if (contentId && currentUser) {
      addActionLog(contentId, "Загрузка изображения для карточки", currentUser.name);
    }
  };

  const handleUploadImageFile = (cardId: string, file?: File) => {
    if (!file) return;
    handleReplaceImage(cardId, file.name);
  };

  const handleUploadImageFromUrl = (cardId: string) => {
    const url = imageUrlInput.trim();
    if (!url) return;

    const label = url.replace(/^https?:\/\//, "").slice(0, 48);
    handleReplaceImage(cardId, label);
    setImageUrlInput("");
  };

  const handleProceedToImages = () => {
    setField("cardsPhase", "images");
  };

  const handleGenerateImages = async () => {
    setField("isGeneratingCardImages", true);

    await simulateTask(() => {}, ["queued", "in_progress", "done"], 900);

    const newCards = cards.map((card, index) => ({
      ...card,
      imageUrl: card.imageUrl ?? `card-img-${index + 1}`,
      status: "ready" as const,
    }));

    updateCards(newCards);
    setField("isGeneratingCardImages", false);

    if (contentId && currentUser) {
      addActionLog(contentId, "Генерация фотографий для карточек", currentUser.name);
    }
  };

  const renderCardList = () => (
    <div className={styles.cardList}>
      {cards.map((card, index) => (
        <div
          key={card.id}
          className={`${styles.cardListItem} ${
            selectedCardId === card.id ? styles.cardListItemActive : ""
          }`}
        >
          <button
            type="button"
            className={styles.cardListMain}
            onClick={() => setField("selectedCardId", card.id)}
          >
            <div>
              #{index + 1} {card.shortText.slice(0, 30)}
            </div>
            <StatusBadge status={card.status} />
          </button>
          <div className={styles.cardListReorder}>
            <button
              type="button"
              className={styles.reorderButton}
              onClick={() => handleMoveCard(card.id, "up")}
              disabled={imagesDisabled || index === 0}
              aria-label="Переместить выше"
            >
              <CaretUp size={14} />
            </button>
            <button
              type="button"
              className={styles.reorderButton}
              onClick={() => handleMoveCard(card.id, "down")}
              disabled={imagesDisabled || index === cards.length - 1}
              aria-label="Переместить ниже"
            >
              <CaretDown size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPhrasesEditor = () => (
    <>
      <ul className={`${styles.phraseList} ${isGeneratingCardPhrases ? styles.listBusy : ""}`}>
        {cards.map((card, index) => (
          <li key={card.id} className={styles.phraseRow}>
            <span className={styles.labelHeadline}>Заголовок</span>
            <span className={styles.labelCopyright}>Копирайт</span>
            <span className={styles.phraseIndex}>#{index + 1}</span>
            <label className={`${styles.inputWrap} ${styles.headlineField}`}>
              <span className={styles.srOnly}>Заголовок</span>
              <input
                className={styles.sourceInput}
                value={card.shortText}
                placeholder="До 8 слов для карточки"
                maxLength={TITLE_MAX_LENGTH}
                disabled={phrasesDisabled}
                onChange={(e) =>
                  handleUpdateCardById(card.id, "shortText", e.target.value)
                }
              />
            </label>
            <label className={`${styles.inputWrap} ${styles.copyrightField}`}>
              <span className={styles.srOnly}>Копирайт</span>
              <input
                className={styles.sourceInput}
                value={card.copyright}
                maxLength={COPYRIGHT_MAX_LENGTH}
                placeholder="Источник: example.com"
                disabled={phrasesDisabled}
                onChange={(e) =>
                  handleUpdateCardById(card.id, "copyright", e.target.value)
                }
              />
              <span className={styles.fieldCounter}>
                {card.copyright.length}/{COPYRIGHT_MAX_LENGTH}
              </span>
            </label>
            <div className={styles.phraseControls}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => handleMoveCard(card.id, "up")}
                disabled={phrasesDisabled || index === 0}
                aria-label="Переместить выше"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => handleMoveCard(card.id, "down")}
                disabled={phrasesDisabled || index === cards.length - 1}
                aria-label="Переместить ниже"
              >
                ↓
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => handleDeleteCardById(card.id)}
                disabled={phrasesDisabled || cards.length === 1}
                aria-label="Удалить карточку"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.cardsBar}>
        <div className={styles.cardsBarGroup}>
          <button
            type="button"
            className={styles.cardsGhost}
            onClick={handleAddCard}
            disabled={phrasesDisabled || cards.length >= MAX_CARDS_COUNT}
          >
            Добавить карточку
          </button>
          {regenerateOpen ? (
            <>
              <input
                className={`${styles.sourceInput} ${styles.refineInput}`}
                value={regeneratePrompt}
                autoFocus
                placeholder="Уточнение: короче, другой акцент, больше цифр…"
                onChange={(e) => setRegeneratePrompt(e.target.value)}
              />
              <Button
                variant="ghost"
                onClick={handleConfirmRegenerate}
                disabled={phrasesDisabled || isGeneratingCardPhrases}
              >
                <ArrowsClockwise size={16} aria-hidden />
                {isGeneratingCardPhrases ? "Генерация…" : "Перегенерировать"}
              </Button>
              <Button variant="ghost" onClick={handleCancelRegenerate} disabled={phrasesDisabled}>
                Отмена
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={handleOpenRegenerate}
              disabled={phrasesDisabled || isGeneratingCardPhrases}
            >
              <ArrowsClockwise size={16} aria-hidden />
              Перегенерировать все
            </Button>
          )}
        </div>
        {showLayout && (
          <Button
            onClick={handleProceedToImages}
            disabled={phrasesDisabled || cards.length === 0}
          >
            Перейти к фотографиям →
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div>
      {showStepper && (
        <CardsPhaseStepper
          currentPhase={stepperPhase}
          onPhaseClick={handlePhaseClick}
          phases={stepperPhases}
        />
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {mode === "layout"
            ? "Оформление"
            : `Шаг ${phaseIndex + 1}. ${CARDS_PHASE_LABELS[stepperPhase]}`}
        </h3>
        <p className={styles.sectionHint}>
          {mode === "layout"
            ? PHASE_HINTS.images
            : stepperPhase === "edit"
              ? "Проверьте заголовки: измените текст, удалите лишние или перегенерируйте"
              : PHASE_HINTS[stepperPhase]}
        </p>
      </div>

      {showHeadlines && stepperPhase === "phrases" && (
        <div className={styles.fields}>
          {isGeneratingCardPhrases && (
            <p className={styles.progress}>
              <span className={styles.spinner} />
              Генерируем заголовки…
            </p>
          )}
          <label className={styles.field} htmlFor="cards-count">
            <span className={styles.fieldLabel}>Сколько карточек</span>
            <input
              id="cards-count"
              className={styles.sourceInput}
              type="number"
              min={1}
              max={MAX_CARDS_COUNT}
              value={cardsCount}
              disabled={phrasesDisabled || isGeneratingCardPhrases}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next)) return;
                const count = Math.min(MAX_CARDS_COUNT, Math.max(1, Math.trunc(next)));
                setField("cardsCount", count);
                if (contentId) updateContentUnit(contentId, { cardsCount: count });
              }}
            />
          </label>
          <div className={styles.cardsBar}>
            <Button
              variant={cards.length > 0 ? "ghost" : "primary"}
              onClick={() => handleGeneratePhrases()}
              disabled={phrasesDisabled || isGeneratingCardPhrases}
            >
              <Sparkle size={16} weight="fill" aria-hidden />
              {isGeneratingCardPhrases
                ? "Генерация…"
                : cards.length > 0
                  ? "Сгенерировать заново"
                  : "Сгенерировать заголовки для карточек"}
            </Button>
            {cards.length > 0 && (
              <Button
                onClick={() => setField("cardsPhase", "edit")}
                disabled={isGeneratingCardPhrases}
              >
                Перейти к редактированию →
              </Button>
            )}
          </div>
        </div>
      )}

      {showHeadlines && stepperPhase === "edit" && (
        <div className={styles.cardsPhasePanel}>{renderPhrasesEditor()}</div>
      )}

      {showLayout && cardsPhase === "images" && (
        <>
          <div className={styles.section}>
            <Checkbox
              label="Правила обработки изображений проекта (фирменный стиль)"
              checked={buildOptions.applyBrandStyle}
              onChange={(e) => {
                const next = { ...buildOptions, applyBrandStyle: e.target.checked };
                setField("buildOptions", next);
                if (contentId) updateContentUnit(contentId, { buildOptions: next });
              }}
            />
            <Checkbox
              label="Подготовить архив для скачивания"
              checked={buildOptions.prepareArchive}
              onChange={(e) => {
                const next = { ...buildOptions, prepareArchive: e.target.checked };
                setField("buildOptions", next);
                if (contentId) updateContentUnit(contentId, { buildOptions: next });
              }}
            />
          </div>
          {!hasCardImages && (
            <div className={styles.cardsPhasePanel}>
              {isGeneratingCardImages && (
                <div className={`${styles.loading} ${styles.loadingPulse}`}>
                  Генерация фотографий... В очереди → В работе → Готово
                </div>
              )}
              <div className={styles.cardActionsBar}>
                <Button
                  onClick={handleGenerateImages}
                  disabled={imagesDisabled || isGeneratingCardImages || cards.length === 0}
                >
                  <Sparkle size={16} weight="fill" aria-hidden />
                  {isGeneratingCardImages
                    ? "Генерация..."
                    : "Сгенерировать фотографии для карточек"}
                </Button>
              </div>
            </div>
          )}

          {hasCardImages && (
            <>
              <div className={styles.splitLayout}>
                <div>
                  <h4 className={styles.subsectionTitle}>Список карточек</h4>
                  {renderCardList()}
                </div>

                <div className={styles.preview}>
                  {selectedCard ? (
                    <>
                      {selectedCard.imageUrl?.startsWith("http") ||
                      selectedCard.imageUrl?.startsWith("blob:") ? (
                        <div
                          className={`${styles.layoutPreviewPhoto} ${crop ? styles.layoutPreviewCrop : ""}`}
                          style={{ backgroundImage: `url(${selectedCard.imageUrl})` }}
                        >
                          {dim && <span className={styles.layoutPreviewDim} />}
                          {plaque && (
                            <span className={styles.layoutPreviewPlaque}>
                              {selectedCard.shortText}
                            </span>
                          )}
                        </div>
                      ) : (
                        <PlaceholderImage
                          variant="vertical"
                          label={selectedCard.imageUrl ?? "Изображение карточки"}
                        />
                      )}
                      <div className={styles.previewText}>{selectedCard.shortText}</div>
                      <div className={styles.previewCopyright}>{selectedCard.copyright}</div>
                      <StatusBadge status={selectedCard.status} />
                    </>
                  ) : (
                    <div className={styles.loading}>Выберите карточку</div>
                  )}
                </div>
              </div>

              <div className={styles.cardActionsBar}>
                <div className={styles.cardActionsGroup}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      if (selectedCard) {
                        handleUploadImageFile(selectedCard.id, e.target.files?.[0]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imagesDisabled || !selectedCard}
                  >
                    <UploadSimple size={16} aria-hidden />
                    С компьютера
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imagesDisabled || !selectedCard}
                  >
                    <Swap size={16} aria-hidden />
                    Заменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setCrop((value) => !value)}
                    disabled={imagesDisabled}
                  >
                    <Crop size={16} aria-hidden />
                    Обрезать
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setDim((value) => !value)}
                    disabled={imagesDisabled}
                  >
                    <Eraser size={16} aria-hidden />
                    Удалить область
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setPlaque((value) => !value)}
                    disabled={imagesDisabled}
                  >
                    <Palette size={16} aria-hidden />
                    Фирменный стиль
                  </Button>
                </div>
              </div>

              {selectedCard && (
                <div className={styles.imageUploadPanel}>
                  <div className={styles.imageUploadTitle}>
                    <LinkSimple size={16} />
                    Загрузить изображение по ссылке
                  </div>
                  <div className={styles.imageUploadRow}>
                    <Input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleUploadImageFromUrl(selectedCard.id)}
                      disabled={imagesDisabled || !imageUrlInput.trim()}
                    >
                      Применить
                    </Button>
                  </div>
                  <p className={styles.sectionHint}>
                    Можно менять порядок карточек, их количество и источник изображений.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
