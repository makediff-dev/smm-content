"use client";

import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { simulateTask } from "@/lib/simulate-generation";
import { DEMO_SOURCE_URL, getMockExtractionData } from "@/lib/mock-wizard-data";
import styles from "./wizard.module.css";

interface StepSourceProps {
  onNext: () => void;
}

export function StepSource({ onNext }: StepSourceProps) {
  const prompts = useSettingsStore((s) => s.prompts);
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);

  const format = useWizardStore((s) => s.format);
  const sourceUrl = useWizardStore((s) => s.sourceUrl);
  const promptId = useWizardStore((s) => s.promptId);
  const additionalInstructions = useWizardStore((s) => s.additionalInstructions);
  const isExtracting = useWizardStore((s) => s.isExtracting);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);

  const promptOptions = prompts.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handleExtract = async () => {
    if (!contentId || isExtracting) return;

    const savedUrl = sourceUrl.trim() || DEMO_SOURCE_URL;
    const mockData = getMockExtractionData(format);

    setField("isExtracting", true);
    setField("sourceUrl", savedUrl);

    updateContentUnit(contentId, {
      sourceUrl: savedUrl,
      format,
      promptId,
      additionalInstructions,
      status: "in_progress",
    });

    await simulateTask(
      (status) => {
        updateContentUnit(contentId, { status: status === "done" ? "draft" : status });
      },
      ["queued", "in_progress", "done"],
      500
    );

    setField("extractedTitle", mockData.title);
    setField("extractedText", mockData.text);
    setField("extractedImages", mockData.images);
    setField("isExtracted", true);
    setField("isExtracting", false);

    updateContentUnit(contentId, {
      extractedTitle: mockData.title,
      extractedText: mockData.text,
      extractedImages: mockData.images,
      status: "draft",
    });

    if (currentUser) {
      addActionLog(contentId, "Извлечение данных из ссылки", currentUser.name);
    }

    onNext();
  };

  return (
    <div>
      <div className={styles.section}>
        <p className={styles.sectionHint}>
          Демо-режим: независимо от ссылки будут подставлены одинаковые тестовые данные для
          выбранного формата.
        </p>
      </div>

      <div className={styles.formGrid}>
        <Input
          label="Ссылка на материал"
          value={sourceUrl}
          onChange={(e) => setField("sourceUrl", e.target.value)}
          placeholder="https://example.com/article"
        />
        <Select
          label="Базовый промпт"
          options={promptOptions}
          value={promptId}
          onChange={(e) => setField("promptId", e.target.value)}
        />
        <Textarea
          label="Дополнительные указания для этой задачи"
          value={additionalInstructions}
          onChange={(e) => setField("additionalInstructions", e.target.value)}
          placeholder="Особые требования к этому контенту..."
        />
      </div>

      {isExtracting && (
        <div className={`${styles.loading} ${styles.loadingPulse}`}>
          Извлечение данных... В очереди → В работе → Готово
        </div>
      )}

      <div className={styles.actions} style={{ marginTop: 24 }}>
        <Button onClick={handleExtract} disabled={isExtracting}>
          {isExtracting ? "Извлечение..." : "Извлечь данные"}
        </Button>
      </div>
    </div>
  );
}
