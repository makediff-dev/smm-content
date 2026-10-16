"use client";

import { useRef, useState } from "react";
import {
  ArrowsClockwise,
  LinkSimple,
  Sparkle,
  TextT,
  UploadSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import { getMockCards, getMockCardsRegenerated } from "@/lib/mock-wizard-data";
import { generateId, simulateTask } from "@/lib/simulate-generation";
import { buildGeneratedPhotos } from "@/lib/workspace-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import {
  COPYRIGHT_MAX_LENGTH,
  MAX_CARDS_COUNT,
  TITLE_MAX_LENGTH,
  type Card,
  type CardsPhase,
} from "@/types";
import styles from "./wizard.module.css";
import editorStyles from "./editor-cards.module.css";

const CARD_PHASES: { id: CardsPhase; label: string }[] = [
  { id: "phrases", label: "Заголовки" },
  { id: "edit", label: "Редактирование" },
  { id: "images", label: "Фотографии" },
];

const HINTS: Record<CardsPhase, string> = {
  phrases:
    "Сначала AI сгенерирует короткие заголовки для каждой карточки на основе текста поста",
  edit: "Проверьте заголовки: измените текст, удалите лишние или перегенерируйте",
  images: "На основе утверждённых заголовков будут сгенерированы фотографии для карточек",
};

const STATUS_LABELS: Record<Card["status"], string> = {
  ready: "Готово",
  needs_edit: "Нужна правка",
};

export function EditorCards() {
  const disabled = useWizardStepDisabled();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);

  const cards = useWizardStore((s) => s.cards);
  const format = useWizardStore((s) => s.format);
  const cardsPhase = useWizardStore((s) => s.cardsPhase);
  const cardsCount = useWizardStore((s) => s.cardsCount);
  const postText = useWizardStore((s) => s.postText);
  const extractedText = useWizardStore((s) => s.extractedText);
  const extractedTitle = useWizardStore((s) => s.extractedTitle);
  const isGenerating = useWizardStore((s) => s.isGeneratingCardPhrases);
  const isGeneratingImages = useWizardStore((s) => s.isGeneratingCardImages);
  const selectedCardId = useWizardStore((s) => s.selectedCardId);
  const buildOptions = useWizardStore((s) => s.buildOptions);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const project = projectId ? getProject(projectId) : undefined;
  const copyright = project?.defaultCopyright ?? "Источник";
  const hasMaterial = Boolean(postText.trim() || extractedText.trim() || extractedTitle.trim());
  const phase: CardsPhase =
    cardsPhase === "images" || cardsPhase === "edit" || cardsPhase === "phrases"
      ? cardsPhase
      : cards.length > 0
        ? "edit"
        : "phrases";
  const phaseIndex = CARD_PHASES.findIndex((item) => item.id === phase);
  const selected = cards.find((card) => card.id === selectedCardId) ?? cards[0];
  const needsPhotos = cards.some((card) => !card.imageUrl);

  const [refineOpen, setRefineOpen] = useState(false);
  const [refine, setRefine] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persist = (next: Card[]) => {
    setField("cards", next);
    if (contentId) updateContentUnit(contentId, { cards: next });
  };

  const setPhase = (next: CardsPhase) => setField("cardsPhase", next);

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
    setPhase("edit");
    setField("isGeneratingCardPhrases", false);
    setRefineOpen(false);
    setRefine("");
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

  const generatePhotos = async (onlyMissing = false) => {
    if (disabled || isGeneratingImages || cards.length === 0) return;
    setField("isGeneratingCardImages", true);
    await simulateTask(() => undefined, ["queued", "in_progress", "done"], 700);
    const generated = buildGeneratedPhotos(cards, contentId ?? "editor", format);
    persist(
      cards.map((card, index) =>
        onlyMissing && card.imageUrl ? card : generated[index] ?? card
      )
    );
    setField("isGeneratingCardImages", false);
    if (contentId && currentUser) {
      addActionLog(contentId, "Генерация фотографий для карточек", currentUser.name);
    }
  };

  const regenerateSelected = async () => {
    if (!selected || disabled) return;
    setField("isGeneratingCardImages", true);
    await simulateTask(() => undefined, ["queued", "in_progress", "done"], 500);
    const [updated] = buildGeneratedPhotos(
      [selected],
      `${contentId ?? "editor"}-one`,
      format
    );
    persist(cards.map((card) => (card.id === selected.id ? updated : card)));
    setField("isGeneratingCardImages", false);
    setReplaceOpen(false);
  };

  const applyFile = (file?: File) => {
    if (!file || !selected) return;
    const url = URL.createObjectURL(file);
    persist(
      cards.map((card) =>
        card.id === selected.id ? { ...card, imageUrl: url, status: "ready" } : card
      )
    );
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || !selected) return;
    persist(
      cards.map((card) =>
        card.id === selected.id ? { ...card, imageUrl: url, status: "ready" } : card
      )
    );
    setLinkOpen(false);
    setLinkUrl("");
  };

  const addHeadline = () => {
    if (!selected?.imageUrl) return;
    persist(
      cards.map((card) =>
        card.id === selected.id ? { ...card, headlineOnImage: true } : card
      )
    );
  };

  return (
    <section className={editorStyles.block} aria-label="Карточки">
      <ol className={styles.phaseStepper}>
        {CARD_PHASES.map((item, index) => (
          <li
            key={item.id}
            className={`${styles.phaseStepperItem} ${
              item.id === phase ? styles.phaseStepperItemActive : ""
            }`}
          >
            {index === CARD_PHASES.length - 1 && (
              <span className={styles.phaseStepperLine} aria-hidden />
            )}
            <button
              type="button"
              className={styles.phaseButton}
              disabled={index > phaseIndex}
              onClick={() => setPhase(item.id)}
            >
              <span className={styles.phaseStepperIndex}>{index + 1}</span>
              {item.label}
            </button>
            {index === 0 && <span className={styles.phaseStepperLine} aria-hidden />}
          </li>
        ))}
      </ol>

      <h2 className={editorStyles.heading}>
        Шаг {phaseIndex + 1}. {CARD_PHASES[phaseIndex].label}
      </h2>
      <p className={editorStyles.subtitle}>{HINTS[phase]}</p>

      {phase === "images" ? (
        <>
          <label className={editorStyles.checkRow}>
            <input
              type="checkbox"
              className={editorStyles.check}
              checked={buildOptions.applyBrandStyle}
              disabled={disabled}
              onChange={(event) => {
                const next = { ...buildOptions, applyBrandStyle: event.target.checked };
                setField("buildOptions", next);
                if (contentId) updateContentUnit(contentId, { buildOptions: next });
              }}
            />
            Фирменный стиль
          </label>

          {needsPhotos && (
            <div className={styles.cardsBar}>
              <Button
                type="button"
                disabled={disabled || isGeneratingImages}
                onClick={() => generatePhotos(true)}
              >
                <Sparkle size={16} weight="fill" aria-hidden />
                {isGeneratingImages
                  ? "Генерация…"
                  : cards.every((card) => !card.imageUrl)
                    ? "Сгенерировать фотографии для карточек"
                    : "Сгенерировать недостающие фотографии"}
              </Button>
            </div>
          )}

          <div className={editorStyles.split}>
            <div>
              <p className={editorStyles.listLabel}>Список карточек</p>
              <ul className={editorStyles.cardList}>
                {cards.map((card, index) => (
                  <li
                    key={card.id}
                    className={`${editorStyles.cardListItem} ${
                      card.id === selected?.id ? editorStyles.cardListItemActive : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={editorStyles.cardListMain}
                      onClick={() => setField("selectedCardId", card.id)}
                    >
                      {card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={editorStyles.cardThumb} src={card.imageUrl} alt="" />
                      ) : (
                        <span className={editorStyles.cardThumb} aria-hidden />
                      )}
                      <span className={editorStyles.cardListText}>
                        #{index + 1} {card.shortText}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Вставить ссылку на изображение"
                      disabled={disabled}
                      onClick={() => {
                        setField("selectedCardId", card.id);
                        setLinkUrl("");
                        setLinkOpen(true);
                      }}
                    >
                      <LinkSimple size={16} />
                    </button>
                    <span
                      className={`${editorStyles.cardBadge} ${
                        card.imageUrl ? editorStyles.ready : editorStyles.needs_edit
                      }`}
                    >
                      {card.imageUrl ? STATUS_LABELS[card.status] : "Нет фото"}
                    </span>
                    <div className={styles.phraseControls}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Переместить выше"
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Переместить ниже"
                        disabled={disabled || index === cards.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={editorStyles.listLabel}>Превью карточки</p>
              {selected ? (
                <figure className={editorStyles.preview}>
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={editorStyles.previewImage}
                      src={selected.imageUrl}
                      alt={selected.shortText}
                    />
                  ) : (
                    <span className={editorStyles.previewEmpty}>
                      Фотография ещё не сгенерирована
                    </span>
                  )}
                  <figcaption className={editorStyles.previewCaption}>
                    {selected.shortText}
                  </figcaption>
                </figure>
              ) : (
                <p className={editorStyles.subtitle}>Выберите карточку</p>
              )}
            </div>
          </div>

          <div className={editorStyles.tools}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                applyFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className={editorStyles.hugButton}
              disabled={disabled || !selected}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={16} aria-hidden />
              С компьютера
            </Button>
            {replaceOpen ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className={editorStyles.hugButton}
                  disabled={disabled || isGeneratingImages || !selected}
                  onClick={() => regenerateSelected()}
                >
                  <ArrowsClockwise size={16} aria-hidden />
                  {isGeneratingImages ? "Отправляем…" : "Переделать"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={editorStyles.hugButton}
                  onClick={() => setReplaceOpen(false)}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className={editorStyles.hugButton}
                disabled={disabled || !selected}
                onClick={() => setReplaceOpen(true)}
              >
                <ArrowsClockwise size={16} aria-hidden />
                Перегенерировать
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className={editorStyles.hugButton}
              disabled={disabled || !selected?.imageUrl}
              onClick={addHeadline}
            >
              <TextT size={16} aria-hidden />
              Добавить заголовок
            </Button>
          </div>
          <div className={editorStyles.footer}>
            <button
              type="button"
              className={editorStyles.back}
              onClick={() => setPhase("edit")}
            >
              Назад
            </button>
          </div>

          {linkOpen && (
            <Modal title="Ссылка на изображение" open onClose={() => setLinkOpen(false)}>
              <div className={editorStyles.linkRow}>
                <input
                  value={linkUrl}
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && linkUrl.trim()) applyLink();
                  }}
                />
                <Button type="button" disabled={!linkUrl.trim()} onClick={applyLink}>
                  Применить
                </Button>
              </div>
            </Modal>
          )}
        </>
      ) : phase === "phrases" ? (
        <div className={styles.fields}>
          {isGenerating && (
            <p className={styles.progress}>
              <span className={styles.spinner} />
              Генерируем заголовки…
            </p>
          )}
          <label className={styles.field} htmlFor="editor-cards-count">
            <span className={styles.fieldLabel}>Сколько карточек</span>
            <input
              id="editor-cards-count"
              className={styles.sourceInput}
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
          </label>
          <div className={styles.cardsBar}>
            <Button
              type="button"
              variant={cards.length > 0 ? "ghost" : "primary"}
              disabled={disabled || isGenerating || !hasMaterial}
              onClick={() => generate(cardsCount)}
            >
              <Sparkle size={16} weight="fill" aria-hidden />
              {isGenerating
                ? "Генерация…"
                : cards.length > 0
                  ? "Сгенерировать заново"
                  : "Сгенерировать заголовки для карточек"}
            </Button>
            {cards.length > 0 && (
              <Button type="button" disabled={isGenerating} onClick={() => setPhase("edit")}>
                Перейти к редактированию →
              </Button>
            )}
          </div>
          {!hasMaterial && (
            <p className={editorStyles.subtitle}>
              Чтобы сгенерировать заголовки, нужен текст поста или источник
            </p>
          )}
        </div>
      ) : (
        <>
          <ul
            className={`${editorStyles.phraseList} ${isGenerating ? editorStyles.listBusy : ""}`}
          >
            {cards.map((card, index) => (
              <li key={card.id} className={editorStyles.phraseRow}>
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

          <div className={editorStyles.bar}>
            <div className={editorStyles.barGroup}>
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
              {refineOpen ? (
                <>
                  <input
                    className={`${editorStyles.input} ${editorStyles.refineInput}`}
                    value={refine}
                    autoFocus
                    placeholder="Уточнение: короче, другой акцент, больше цифр…"
                    onChange={(event) => setRefine(event.target.value)}
                  />
                  <button
                    type="button"
                    className={editorStyles.ghost}
                    disabled={disabled || isGenerating || !hasMaterial}
                    onClick={() => generate(Math.max(cards.length, 1), refine)}
                  >
                    <ArrowsClockwise size={16} aria-hidden />
                    {isGenerating ? "Генерация…" : "Перегенерировать"}
                  </button>
                  <button
                    type="button"
                    className={editorStyles.ghost}
                    onClick={() => {
                      setRefineOpen(false);
                      setRefine("");
                    }}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={editorStyles.ghost}
                  disabled={disabled || isGenerating || !hasMaterial}
                  onClick={() => setRefineOpen(true)}
                >
                  <ArrowsClockwise size={16} aria-hidden />
                  {isGenerating ? "Генерация…" : "Перегенерировать все"}
                </button>
              )}
            </div>
          </div>
          <div className={editorStyles.footer}>
            <button
              type="button"
              className={editorStyles.back}
              onClick={() => setPhase("phrases")}
            >
              Назад
            </button>
            <Button
              type="button"
              disabled={disabled || cards.length === 0}
              onClick={() => setPhase("images")}
            >
              Перейти к фотографиям →
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
