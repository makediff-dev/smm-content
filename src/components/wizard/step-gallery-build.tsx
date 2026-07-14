"use client";

import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore, createQueueTaskForType } from "@/stores/queue-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlaceholderImage } from "@/components/shared/placeholder-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { simulateTask } from "@/lib/simulate-generation";
import styles from "./wizard.module.css";

interface StepGalleryBuildProps {
  onComplete: () => void;
}

export function StepGalleryBuild({ onComplete }: StepGalleryBuildProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addTask = useQueueStore((s) => s.addTask);
  const updateTask = useQueueStore((s) => s.updateTask);

  const cards = useWizardStore((s) => s.cards);
  const buildOptions = useWizardStore((s) => s.buildOptions);
  const buildStatus = useWizardStore((s) => s.buildStatus);
  const isBuilding = useWizardStore((s) => s.isBuilding);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const handleBuild = async () => {
    if (!contentId || !projectId || !currentUser) return;

    setField("isBuilding", true);
    setField("buildStatus", "queued");

    const taskId = addTask(
      createQueueTaskForType(
        "export",
        projectId,
        currentUser.id,
        contentId,
        "Сборка галереи"
      )
    );

    await simulateTask(
      (status) => {
        setField("buildStatus", status);
        updateTask(taskId, { status });
        if (contentId) updateContentUnit(contentId, { status });
      },
      ["queued", "in_progress", "done"],
      1000
    );

    setField("isBuilding", false);
    addActionLog(contentId, "Сборка галереи завершена", "Система");
    onComplete();
  };

  const updateOption = (key: keyof typeof buildOptions, value: boolean) => {
    setField("buildOptions", { ...buildOptions, [key]: value });
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Предпросмотр карточек</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Вертикальный формат для соцсетей (4:5)
        </p>
        <div className={styles.galleryPreview}>
          {cards.map((card) => (
            <div key={card.id}>
              <PlaceholderImage variant="vertical" label={card.shortText.slice(0, 15)} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.buildOptions}>
        <Checkbox
          label="Добавить копирайт источника"
          checked={buildOptions.addCopyright}
          onChange={(e) => updateOption("addCopyright", e.target.checked)}
        />
        <Checkbox
          label="Применить фирменный стиль"
          checked={buildOptions.applyBrandStyle}
          onChange={(e) => updateOption("applyBrandStyle", e.target.checked)}
        />
        <Checkbox
          label="Подготовить архив для скачивания"
          checked={buildOptions.prepareArchive}
          onChange={(e) => updateOption("prepareArchive", e.target.checked)}
        />
      </div>

      <Button onClick={handleBuild} disabled={isBuilding || cards.length === 0}>
        {isBuilding ? "Сборка..." : "Собрать галерею"}
      </Button>

      {buildStatus !== "idle" && (
        <div className={styles.buildStatus}>
          <div className={styles.buildStatusItem}>
            <span>Статус сборки:</span>
            <StatusBadge status={buildStatus} />
          </div>
        </div>
      )}
    </div>
  );
}
