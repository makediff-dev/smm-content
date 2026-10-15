"use client";

import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { formatIconMap } from "@/lib/format-icons";
import {
  FORMAT_DESCRIPTIONS,
  FORMAT_LABELS,
  type ContentFormat,
} from "@/types";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import styles from "./wizard.module.css";

const FORMAT_OPTIONS: ContentFormat[] = [
  "text",
  "gallery",
  "slideshow",
  "video_meme",
];

export function StepFormat() {
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const format = useWizardStore((s) => s.format);
  const selectedFormats = useWizardStore((s) => s.selectedFormats);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);
  const stepDisabled = useWizardStepDisabled();

  const handleSelect = (nextFormat: ContentFormat) => {
    if (stepDisabled) return;
    const selected = selectedFormats.includes(nextFormat)
      ? selectedFormats.filter((item) => item !== nextFormat)
      : [...selectedFormats, nextFormat];
    setField("selectedFormats", selected);
    const primary = selected.includes(format) ? format : (selected[0] ?? format);
    if (primary !== format) setField("format", primary);
    if (contentId && selected.length > 0) {
      updateContentUnit(contentId, { format: primary });
    }
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Выберите тип контента</h3>
        <p className={styles.sectionHint}>
          Можно выбрать несколько типов — нажмите, чтобы подсветить, ещё раз,
          чтобы снять. Для каждого выбранного формата пойдёт своя цепочка.
        </p>
      </div>

      <div className={styles.formatCards}>
        {FORMAT_OPTIONS.map((option) => {
          const Icon = formatIconMap[option];
          const isActive = selectedFormats.includes(option);

          return (
            <button
              key={option}
              type="button"
              className={`${styles.formatCard} ${isActive ? styles.formatCardActive : ""}`}
              aria-pressed={isActive}
              onClick={() => handleSelect(option)}
              disabled={stepDisabled}
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
    </div>
  );
}
