"use client";

import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { formatIconMap } from "@/lib/format-icons";
import {
  FORMAT_DESCRIPTIONS,
  FORMAT_LABELS,
  type ContentFormat,
} from "@/types";
import styles from "./wizard.module.css";

const FORMAT_OPTIONS: ContentFormat[] = ["text", "gallery", "slideshow"];

interface StepFormatProps {
  onNext: () => void;
}

export function StepFormat({ onNext }: StepFormatProps) {
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const format = useWizardStore((s) => s.format);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);

  const handleSelect = (nextFormat: ContentFormat) => {
    setField("format", nextFormat);
    if (contentId) {
      updateContentUnit(contentId, { format: nextFormat });
    }
  };

  const handleContinue = () => {
    if (!contentId) return;
    updateContentUnit(contentId, { format, formatConfirmed: true });
    setField("formatConfirmed", true);
    onNext();
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Выберите тип контента</h3>
        <p className={styles.sectionHint}>
          От выбранного формата зависит сценарий создания и шаги мастера
        </p>
      </div>

      <div className={styles.formatCards}>
        {FORMAT_OPTIONS.map((option) => {
          const Icon = formatIconMap[option];
          const isActive = format === option;

          return (
            <button
              key={option}
              type="button"
              className={`${styles.formatCard} ${isActive ? styles.formatCardActive : ""}`}
              onClick={() => handleSelect(option)}
            >
              <div className={styles.formatCardIcon}>
                <Icon size={28} weight={isActive ? "fill" : "regular"} />
              </div>
              <div className={styles.formatCardTitle}>{FORMAT_LABELS[option]}</div>
              <div className={styles.formatCardDesc}>
                {FORMAT_DESCRIPTIONS[option]}
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.actions} style={{ marginTop: 24 }}>
        <Button onClick={handleContinue}>Продолжить</Button>
      </div>
    </div>
  );
}
