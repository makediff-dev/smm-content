"use client";

import { useRef, useState } from "react";
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
  ArrowRight,
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  Crop,
  Eraser,
  LinkSimple,
  Palette,
  Plus,
  Sparkle,
  Swap,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import {
  CARDS_PHASE_LABELS,
  CARDS_PHASE_ORDER,
  type Card,
  type CardsPhase,
} from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

const PHASE_HINTS: Record<CardsPhase, string> = {
  phrases:
    "Сначала AI сгенерирует короткие заголовки для каждой карточки на основе текста поста.",
  edit: "Проверьте и отредактируйте заголовки и подписи — перед созданием изображений.",
  images:
    "На основе утверждённых заголовков будут сгенерированы фотографии для карточек.",
};

function CardsPhaseStepper({
  currentPhase,
  onPhaseClick,
}: {
  currentPhase: CardsPhase;
  onPhaseClick: (phase: CardsPhase) => void;
}) {
  const currentIndex = CARDS_PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className={styles.cardsPhaseStepper}>
      {CARDS_PHASE_ORDER.map((phase, index) => {
        const isActive = phase === currentPhase;
        const isCompleted = index < currentIndex;
        const isClickable = isCompleted;

        return (
          <div
            key={phase}
            className={`${styles.cardsPhaseStep} ${isActive ? styles.cardsPhaseStepActive : ""} ${
              isCompleted ? styles.cardsPhaseStepCompleted : ""
            } ${isClickable ? styles.cardsPhaseStepClickable : ""}`}
            onClick={() => isClickable && onPhaseClick(phase)}
          >
            <div className={styles.cardsPhaseDot}>{index + 1}</div>
            <span className={styles.cardsPhaseLabel}>{CARDS_PHASE_LABELS[phase]}</span>
            {index < CARDS_PHASE_ORDER.length - 1 && (
              <div className={styles.cardsPhaseConnector} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StepCards() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);

  const cards = useWizardStore((s) => s.cards);
  const format = useWizardStore((s) => s.format);
  const cardsPhase = useWizardStore((s) => s.cardsPhase);
  const isGeneratingCardPhrases = useWizardStore((s) => s.isGeneratingCardPhrases);
  const isGeneratingCardImages = useWizardStore((s) => s.isGeneratingCardImages);
  const selectedCardId = useWizardStore((s) => s.selectedCardId);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const project = projectId ? getProject(projectId) : undefined;
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const hasCardImages = cards.length > 0 && cards.every((card) => card.imageUrl);
  const stepperPhase: CardsPhase = cardsPhase === "edit" ? "phrases" : cardsPhase;
  const phaseIndex = CARDS_PHASE_ORDER.indexOf(stepperPhase);

  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const updateCards = (newCards: Card[]) => {
    setField("cards", newCards);
    if (contentId) updateContentUnit(contentId, { cards: newCards });
  };

  const handlePhaseClick = (phase: CardsPhase) => {
    setField("cardsPhase", phase === "edit" ? "phrases" : phase);
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

    const newCards: Card[] = sourceCards.map((card) => ({
      ...card,
      id: generateId("card"),
    }));

    updateCards(newCards);
    setField("selectedCardId", newCards[0]?.id ?? null);
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

  const handleUpdateCardById = (cardId: string, field: keyof Card, value: string) => {
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
    const newCard: Card = {
      id: generateId("card"),
      shortText: "Новая карточка",
      copyright: project?.defaultCopyright ?? "Источник",
      status: "needs_edit",
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
      <div className={styles.cardPhrasesList}>
        {cards.map((card, index) => (
          <div key={card.id} className={styles.cardPhraseRow}>
            <span className={styles.cardPhraseIndex}>#{index + 1}</span>
            <div className={styles.cardPhraseFields}>
              <Input
                label="Заголовок"
                value={card.shortText}
                onChange={(e) => handleUpdateCardById(card.id, "shortText", e.target.value)}
                placeholder="До 8 слов для карточки"
              />
              <Input
                label="Копирайт"
                value={card.copyright}
                onChange={(e) => handleUpdateCardById(card.id, "copyright", e.target.value)}
                placeholder="Источник: example.com"
              />
            </div>
            <Button
              variant="ghost"
              size="small"
              className={styles.dangerAction}
              onClick={() => handleDeleteCardById(card.id)}
              disabled={phrasesDisabled || cards.length === 1}
            >
              <Trash size={16} aria-hidden />
              Удалить
            </Button>
            <div className={styles.cardPhraseReorder}>
              <button
                type="button"
                className={styles.reorderButton}
                onClick={() => handleMoveCard(card.id, "up")}
                disabled={phrasesDisabled || index === 0}
                aria-label="Переместить выше"
              >
                <CaretUp size={14} />
              </button>
              <button
                type="button"
                className={styles.reorderButton}
                onClick={() => handleMoveCard(card.id, "down")}
                disabled={phrasesDisabled || index === cards.length - 1}
                aria-label="Переместить ниже"
              >
                <CaretDown size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.cardActionsBar}>
        <div className={styles.cardActionsGroup}>
          <Button variant="secondary" onClick={handleAddCard} disabled={phrasesDisabled}>
            <Plus size={16} weight="bold" aria-hidden />
            Добавить карточку
          </Button>
          {regenerateOpen ? (
            <div className={styles.regenerateInline}>
              <div className={styles.regenerateInputWrap}>
                <Input
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  placeholder="Уточнение: короче, другой акцент, больше цифр..."
                  autoFocus
                />
              </div>
              <Button
                onClick={handleConfirmRegenerate}
                disabled={phrasesDisabled || isGeneratingCardPhrases}
              >
                <ArrowsClockwise size={16} aria-hidden />
                {isGeneratingCardPhrases ? "Генерация..." : "Перегенерировать"}
              </Button>
              <Button variant="ghost" onClick={handleCancelRegenerate} disabled={phrasesDisabled}>
                Отмена
              </Button>
            </div>
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
        <Button
          onClick={handleProceedToImages}
          disabled={phrasesDisabled || cards.length === 0}
        >
          Перейти к фотографиям
          <ArrowRight size={16} weight="bold" aria-hidden />
        </Button>
      </div>
    </>
  );

  return (
    <div>
      <CardsPhaseStepper currentPhase={stepperPhase} onPhaseClick={handlePhaseClick} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Шаг {phaseIndex + 1}. {CARDS_PHASE_LABELS[stepperPhase]}
        </h3>
        <p className={styles.sectionHint}>
          {(cardsPhase === "phrases" || cardsPhase === "edit") && cards.length > 0
            ? "Проверьте заголовки: измените текст, добавьте или удалите карточки."
            : PHASE_HINTS[cardsPhase]}
        </p>
      </div>

      {(cardsPhase === "phrases" || cardsPhase === "edit") && (
        <div className={styles.cardsPhasePanel}>
          {isGeneratingCardPhrases && (
            <div className={`${styles.loading} ${styles.loadingPulse}`}>
              Генерация заголовков... В очереди → В работе
            </div>
          )}

          {cards.length === 0 ? (
            <div className={styles.cardActionsBar}>
              <Button
                onClick={() => handleGeneratePhrases()}
                disabled={phrasesDisabled || isGeneratingCardPhrases}
              >
                <Sparkle size={16} weight="fill" aria-hidden />
                {isGeneratingCardPhrases
                  ? "Генерация..."
                  : "Сгенерировать заголовки для карточек"}
              </Button>
            </div>
          ) : (
            renderPhrasesEditor()
          )}
        </div>
      )}

      {cardsPhase === "images" && (
        <>
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
                      <PlaceholderImage
                        variant="vertical"
                        label={selectedCard.imageUrl ?? "Изображение карточки"}
                      />
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
                    onClick={() => {}}
                    disabled={imagesDisabled || !selectedCard}
                  >
                    <Swap size={16} aria-hidden />
                    Заменить
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => {}} disabled={imagesDisabled}>
                    <Crop size={16} aria-hidden />
                    Обрезать
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => {}} disabled={imagesDisabled}>
                    <Eraser size={16} aria-hidden />
                    Удалить область
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => {}} disabled={imagesDisabled}>
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
