"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import { simulateTask } from "@/lib/simulate-generation";
import { downloadNamedFile } from "@/lib/posting-packs";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import styles from "./gallery-step.module.css";

export function GalleryStep() {
  const disabled = useWizardStepDisabled();
  const currentUser = useAuthStore((s) => s.currentUser);
  const promptId = useWizardStore((s) => s.promptId);
  const generationPrompt = useWizardStore((s) => s.generationPrompt);
  const additionalInstructions = useWizardStore((s) => s.additionalInstructions);
  const postText = useWizardStore((s) => s.postText);
  const cards = useWizardStore((s) => s.cards);
  const buildOptions = useWizardStore((s) => s.buildOptions);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const prompts = useSettingsStore((s) => s.prompts);
  const skills = useSettingsStore((s) => s.skills);
  const [assembling, setAssembling] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const content = contentId ? getContentUnit(contentId) : undefined;
  const galleryReady =
    assembled ||
    Boolean(
      content?.actionLog.some((item) => item.action.includes("Сборка галереи"))
    );

  const basePrompt = prompts.find((prompt) => prompt.id === promptId);
  const haystack = `${generationPrompt} ${additionalInstructions} ${basePrompt?.text ?? ""}`;
  const calledSkills = skills.filter((skill) =>
    haystack.toLowerCase().includes(skill.name.toLowerCase())
  );

  const toggleArchive = () => {
    const next = { ...buildOptions, prepareArchive: !buildOptions.prepareArchive };
    setField("buildOptions", next);
    if (contentId) updateContentUnit(contentId, { buildOptions: next });
  };

  const assemble = async () => {
    if (disabled || assembling) return;
    setAssembling(true);
    await simulateTask(() => undefined, ["queued", "in_progress", "done"], 800);
    setAssembled(true);
    setAssembling(false);
    if (contentId && currentUser) {
      addActionLog(contentId, "Сборка галереи завершена", currentUser.name);
    }
  };

  const downloadGallery = () => {
    const lines = [
      postText.trim(),
      "",
      ...cards.map(
        (card, index) =>
          `${index + 1}. ${card.shortText}${card.imageUrl ? `\n${card.imageUrl}` : ""}`
      ),
    ].filter((line, index, list) => line !== "" || list[index - 1] !== "");
    downloadNamedFile("gallery.zip", lines.join("\n").trim() || "gallery");
  };

  return (
    <section aria-label="Финализация">
      <h2 className={styles.heading}>Финализация</h2>
      <p className={styles.subtitle}>
        {postText.trim()
          ? "Проверьте текст поста и карточки вместе"
          : "Текст появится после генерации"}
      </p>

      <div className={styles.previewCard}>
        <div className={styles.choiceRows}>
          <div className={styles.choiceRow}>
            <span className={styles.choiceLabel}>Промпт:</span>
            {basePrompt ? (
              <Link className={styles.choiceLink} href={`/admin/prompts?id=${basePrompt.id}`}>
                {basePrompt.name}
              </Link>
            ) : (
              <span className={styles.hint}>Не выбран</span>
            )}
          </div>
          <div className={styles.choiceRow}>
            <span className={styles.choiceLabel}>Скилл:</span>
            {calledSkills.length > 0 ? (
              <ul className={styles.choiceList}>
                {calledSkills.map((skill) => (
                  <li key={skill.id}>
                    <Link className={styles.choiceLink} href={`/admin/prompts?id=${skill.id}`}>
                      {skill.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className={styles.hint}>Не выбран</span>
            )}
          </div>
        </div>
      </div>

      <h2 className={`${styles.heading} ${styles.cardsTitle}`}>Карточки галереи</h2>
      <ul className={styles.galleryPreview}>
        {cards.length === 0 ? (
          <li className={styles.cardPreview}>
            <span className={styles.cardImage}>Карточки ещё не собраны</span>
          </li>
        ) : (
          cards.map((card) => (
            <li key={card.id} className={styles.cardPreview}>
              {card.imageUrl ? (
                <span className={styles.cardFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.cardImagePhoto} src={card.imageUrl} alt="" />
                  {card.headlineOnImage !== false && (
                    <span className={styles.cardOverlay}>{card.shortText}</span>
                  )}
                </span>
              ) : (
                <span className={styles.cardImage}>Изображение не задано</span>
              )}
              <p className={styles.cardPreviewText}>{card.shortText}</p>
            </li>
          ))
        )}
      </ul>

      <div className={styles.buildOptions}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={buildOptions.prepareArchive}
            disabled={disabled}
            onChange={toggleArchive}
          />
          Подготовить архив для скачивания
        </label>
      </div>

      <div className={styles.footer}>
        <span className={styles.back} aria-hidden>
          Назад
        </span>
        {galleryReady ? (
          <Button type="button" onClick={downloadGallery}>
            Скачать
          </Button>
        ) : (
          <Button type="button" disabled={disabled || assembling} onClick={assemble}>
            {assembling ? "Собираем…" : "Собрать галерею"}
          </Button>
        )}
      </div>
    </section>
  );
}
