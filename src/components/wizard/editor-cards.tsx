"use client";

import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import { getMockCards, getMockCardsRegenerated } from "@/lib/mock-wizard-data";
import { generateId, simulateTask } from "@/lib/simulate-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import {
  COPYRIGHT_MAX_LENGTH,
  MAX_CARDS_COUNT,
  TITLE_MAX_LENGTH,
  type Card,
} from "@/types";
import styles from "./wizard.module.css";
import editorStyles from "./editor-cards.module.css";

export function EditorCards() {
  const disabled = useWizardStepDisabled();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);

  const cards = useWizardStore((s) => s.cards);
  const format = useWizardStore((s) => s.format);
  const cardsCount = useWizardStore((s) => s.cardsCount);
  const postText = useWizardStore((s) => s.postText);
  const extractedText = useWizardStore((s) => s.extractedText);
  const extractedTitle = useWizardStore((s) => s.extractedTitle);
  const isGenerating = useWizardStore((s) => s.isGeneratingCardPhrases);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const project = projectId ? getProject(projectId) : undefined;
  const copyright = project?.defaultCopyright ?? "Источник";
  const hasMaterial = Boolean(postText.trim() || extractedText.trim() || extractedTitle.trim());

  const persist = (next: Card[]) => {
    setField("cards", next);
    if (contentId) updateContentUnit(contentId, { cards: next });
  };

  const generate = async (count: number, extra = "") => {
    if (disabled || isGenerating) return;
    setField("isGeneratingCardPhrases", true);
    await simulateTask(() => undefined, ["queued", "in_progress"], 700);
    const source = extra.trim()
      ? getMockCardsRegenerated(format, copyright, extra)
      : getMockCards(format, copyright);
    const next = Array.from({ length: Math.min(MAX_CARDS_COUNT, Math.max(1, count)) }, (_, index) => {
      const card = source[index % source.length];
      return {
        ...card,
        id: generateId("card"),
        headlineOnImage: true,
      };
    });
    persist(next);
    setField("selectedCardId", next[0]?.id ?? null);
    setField("cardsPhase", "edit");
    setField("isGeneratingCardPhrases", false);
    if (contentId && currentUser) {
      addActionLog(
        contentId,
        extra.trim() ? "Перегенерация заголовков для карточек" : "Генерация заголовков для карточек",
        currentUser.name
      );
    }
  };

  const patchCard = (id: string, patch: Partial<Card>) => {
    persist(cards.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  return (
    <section className={editorStyles.block} aria-label="Карточки">
      <h2 className={editorStyles.heading}>Заголовки карточек</h2>
      <p className={editorStyles.subtitle}>
        Сгенерируйте короткие заголовки, поправьте текст, уберите лишние или добавьте свои
      </p>

      <div className={styles.fields}>
        <div className={editorStyles.countField}>
          <label className={styles.fieldLabel} htmlFor="copywriter-cards-count">
            Сколько карточек
          </label>
          <div className={editorStyles.countRow}>
            <input
              id="copywriter-cards-count"
              className={`${styles.sourceInput} ${editorStyles.countInput}`}
              type="number"
              min={1}
              max={MAX_CARDS_COUNT}
              value={cardsCount}
              disabled={disabled || isGenerating}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                const count = Math.min(MAX_CARDS_COUNT, Math.max(1, Math.trunc(next)));
                setField("cardsCount", count);
                if (contentId) updateContentUnit(contentId, { cardsCount: count });
              }}
            />
            <Button
              type="button"
              variant="primary"
              disabled={disabled || isGenerating || !hasMaterial}
              onClick={() => generate(cardsCount)}
            >
              <Sparkle size={16} weight="fill" aria-hidden />
              {isGenerating
                ? "Генерация…"
                : cards.length > 0
                  ? "Сгенерировать заново"
                  : "Сгенерировать заголовки"}
            </Button>
            {cards.length > 0 && (
              <button
                type="button"
                className={editorStyles.ghost}
                disabled={disabled || cards.length >= MAX_CARDS_COUNT}
                onClick={() => {
                  const card: Card = {
                    id: generateId("card"),
                    shortText: "Новая карточка",
                    copyright,
                    status: "needs_edit",
                    headlineOnImage: true,
                  };
                  persist([...cards, card]);
                }}
              >
                Добавить карточку
              </button>
            )}
          </div>
        </div>
        {!hasMaterial && (
          <p className={editorStyles.subtitle}>
            Чтобы сгенерировать заголовки, нужен текст поста или источник
          </p>
        )}
      </div>

      {cards.length > 0 && (
        <>
          <ul
            className={`${editorStyles.phraseList} ${
              isGenerating ? editorStyles.listBusy : ""
            }`}
          >
            {cards.map((card, index) => (
              <li key={card.id} className={`${editorStyles.phraseRow} ${editorStyles.phraseRowStack}`}>
                <span className={editorStyles.labelHeadline}>Заголовок</span>
                <span className={editorStyles.labelCopyright}>Копирайт</span>
                <span className={editorStyles.phraseIndex}>#{index + 1}</span>
                <label className={`${editorStyles.inputWrap} ${editorStyles.headlineField}`}>
                  <span className={editorStyles.srOnly}>Заголовок</span>
                  <input
                    className={editorStyles.input}
                    value={card.shortText}
                    placeholder="До 8 слов для карточки"
                    maxLength={TITLE_MAX_LENGTH}
                    disabled={disabled}
                    onChange={(event) =>
                      patchCard(card.id, { shortText: event.target.value })
                    }
                  />
                </label>
                <label className={`${editorStyles.inputWrap} ${editorStyles.copyrightField}`}>
                  <span className={editorStyles.srOnly}>Копирайт</span>
                  <input
                    className={editorStyles.input}
                    value={card.copyright}
                    placeholder={copyright}
                    maxLength={COPYRIGHT_MAX_LENGTH}
                    disabled={disabled}
                    onChange={(event) =>
                      patchCard(card.id, { copyright: event.target.value })
                    }
                  />
                  <span className={editorStyles.counter}>
                    {card.copyright.length}/{COPYRIGHT_MAX_LENGTH}
                  </span>
                </label>
                <div className={editorStyles.phraseControls}>
                  <button
                    type="button"
                    className={editorStyles.iconButton}
                    aria-label="Переместить выше"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={editorStyles.iconButton}
                    aria-label="Переместить ниже"
                    disabled={disabled || index === cards.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={editorStyles.iconButton}
                    aria-label="Удалить карточку"
                    disabled={disabled || cards.length === 1}
                    onClick={() => persist(cards.filter((item) => item.id !== card.id))}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {isGenerating && (
            <p className={styles.progress}>
              <span className={styles.spinner} />
              Генерируем заголовки…
            </p>
          )}
        </>
      )}
    </section>
  );
}
