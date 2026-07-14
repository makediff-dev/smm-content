"use client";

import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore, createQueueTaskForType } from "@/stores/queue-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { simulateTask } from "@/lib/simulate-generation";
import { countChars } from "@/lib/mock-text-generation";
import styles from "./wizard.module.css";

interface StepTextBuildProps {
  onComplete: () => void;
}

export function StepTextBuild({ onComplete }: StepTextBuildProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addTask = useQueueStore((s) => s.addTask);
  const updateTask = useQueueStore((s) => s.updateTask);

  const postText = useWizardStore((s) => s.postText);
  const textOptions = useWizardStore((s) => s.textOptions);
  const buildStatus = useWizardStore((s) => s.buildStatus);
  const isBuilding = useWizardStore((s) => s.isBuilding);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const previewText = [
    postText,
    textOptions.addSourceLink ? "\n\nИсточник: example.com" : "",
    textOptions.includeHashtags ? "\n\n#контент #новости" : "",
    textOptions.includeEmoji ? " ✨" : "",
  ]
    .join("")
    .trim();

  const handleFinalize = async () => {
    if (!contentId || !projectId || !currentUser) return;

    setField("isBuilding", true);
    setField("buildStatus", "queued");

    const taskId = addTask(
      createQueueTaskForType(
        "text_generation",
        projectId,
        currentUser.id,
        contentId,
        "Финализация текстового поста"
      )
    );

    await simulateTask(
      (status) => {
        setField("buildStatus", status);
        updateTask(taskId, { status });
        if (contentId) updateContentUnit(contentId, { status });
      },
      ["queued", "in_progress", "done"],
      900
    );

    updateContentUnit(contentId, {
      postText,
      textOptions,
      status: "done",
    });

    setField("isBuilding", false);
    addActionLog(contentId, "Финализация текстового поста", "Система");
    onComplete();
  };

  const updateOption = (
    key: keyof typeof textOptions,
    value: boolean
  ) => {
    const next = { ...textOptions, [key]: value };
    setField("textOptions", next);
    if (contentId) updateContentUnit(contentId, { textOptions: next });
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Предпросмотр поста</h3>
        <p className={styles.sectionHint}>
          Как будет выглядеть текст в соцсети ({countChars(previewText)} симв.)
        </p>
        <div className={`${styles.postPreview} ${isBuilding ? styles.postPreviewBuilding : ""}`}>
          <div className={styles.postPreviewHeader}>
            <div className={styles.postPreviewAvatar}>HA</div>
            <div>
              <div className={styles.postPreviewName}>HubAgency</div>
              <div className={styles.postPreviewMeta}>Только что · Публично</div>
            </div>
          </div>
          <div className={styles.postPreviewBody}>
            {previewText || "Текст поста появится здесь после генерации"}
          </div>
        </div>
      </div>

      <div className={styles.buildOptions}>
        <Checkbox
          label="Добавить ссылку на источник"
          checked={textOptions.addSourceLink}
          onChange={(e) => updateOption("addSourceLink", e.target.checked)}
        />
        <Checkbox
          label="Добавить хештеги"
          checked={textOptions.includeHashtags}
          onChange={(e) => updateOption("includeHashtags", e.target.checked)}
        />
        <Checkbox
          label="Добавить эмодзи"
          checked={textOptions.includeEmoji}
          onChange={(e) => updateOption("includeEmoji", e.target.checked)}
        />
      </div>

      <Button onClick={handleFinalize} disabled={isBuilding || !postText.trim()}>
        {isBuilding ? "Финализация..." : "Завершить и сохранить"}
      </Button>

      {buildStatus !== "idle" && (
        <div className={styles.buildStatus}>
          <div className={styles.buildStatusItem}>
            <span>Статус:</span>
            <StatusBadge status={buildStatus} />
          </div>
          {isBuilding && (
            <div className={styles.buildProgressList}>
              <div className={styles.buildProgressItem}>Проверка форматирования...</div>
              <div className={styles.buildProgressItem}>Подготовка файлов...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
