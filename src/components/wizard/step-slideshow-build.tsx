"use client";

import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore, createQueueTaskForType } from "@/stores/queue-store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableColumn } from "@/components/ui/table";
import { simulateTask } from "@/lib/simulate-generation";
import type { Card } from "@/types";
import styles from "./wizard.module.css";

interface StepSlideshowBuildProps {
  onComplete: () => void;
}

const VOICE_OPTIONS = [
  { value: "voice-female-1", label: "Женский голос 1" },
  { value: "voice-female-2", label: "Женский голос 2" },
  { value: "voice-male-1", label: "Мужской голос 1" },
  { value: "voice-male-2", label: "Мужской голос 2" },
];

export function StepSlideshowBuild({ onComplete }: StepSlideshowBuildProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addTask = useQueueStore((s) => s.addTask);
  const updateTask = useQueueStore((s) => s.updateTask);

  const cards = useWizardStore((s) => s.cards);
  const narrationText = useWizardStore((s) => s.narrationText);
  const voiceModel = useWizardStore((s) => s.voiceModel);
  const speechSpeed = useWizardStore((s) => s.speechSpeed);
  const isVoiceGenerated = useWizardStore((s) => s.isVoiceGenerated);
  const isBuilding = useWizardStore((s) => s.isBuilding);
  const buildProgress = useWizardStore((s) => s.buildProgress);
  const buildStatus = useWizardStore((s) => s.buildStatus);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);

  const cardsWithDuration = cards.map((c, i) => ({
    ...c,
    duration: c.duration ?? Math.max(3, Math.round(c.shortText.length / 10)),
    slideNum: i + 1,
  }));

  const slideColumns: TableColumn<Card & { slideNum: number }>[] = [
    { key: "slide", header: "Слайд", render: (r) => `#${(r as Card & { slideNum: number }).slideNum}` },
    { key: "text", header: "Текст", render: (r) => r.shortText },
    {
      key: "duration",
      header: "Длительность",
      render: (r) => `${r.duration ?? 3} сек`,
    },
  ];

  const handleGenerateVoice = async () => {
    setField("isBuilding", true);
    await simulateTask(() => {}, ["queued", "in_progress"], 800);
    const text = cards.map((c) => c.shortText).join(". ") + ".";
    setField("narrationText", text);
    setField("isVoiceGenerated", true);
    setField("isBuilding", false);
    if (contentId && currentUser) {
      addActionLog(contentId, "Генерация озвучки", currentUser.name);
    }
  };

  const handleBuildVideo = async () => {
    if (!contentId || !projectId || !currentUser) return;

    setField("isBuilding", true);
    setField("buildProgress", ["Задача в очереди"]);
    setField("buildStatus", "queued");

    const voiceTaskId = addTask(
      createQueueTaskForType(
        "voice_generation",
        projectId,
        currentUser.id,
        contentId,
        "Генерация аудио"
      )
    );

    await simulateTask(
      (status) => {
        updateTask(voiceTaskId, { status });
        if (status === "in_progress") {
          setField("buildProgress", ["Задача в очереди", "Генерация аудио"]);
        }
      },
      ["queued", "in_progress", "done"],
      800
    );

    const videoTaskId = addTask(
      createQueueTaskForType(
        "video_assembly",
        projectId,
        currentUser.id,
        contentId,
        "Сборка видео"
      )
    );

    setField("buildProgress", ["Задача в очереди", "Генерация аудио", "Сборка видео"]);

    await simulateTask(
      (status) => {
        setField("buildStatus", status);
        updateTask(videoTaskId, { status });
        if (contentId) updateContentUnit(contentId, { status });
        if (status === "done") {
          setField("buildProgress", [
            "Задача в очереди",
            "Генерация аудио",
            "Сборка видео",
            "Готовый MP4",
          ]);
        }
      },
      ["queued", "in_progress", "done"],
      1000
    );

    setField("isBuilding", false);
    addActionLog(contentId, "Сборка видео завершена", "Система");
    onComplete();
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Текст для озвучки</h3>
        <Textarea
          value={narrationText}
          onChange={(e) => setField("narrationText", e.target.value)}
          placeholder="Текст будет сгенерирован автоматически..."
          rows={4}
        />
      </div>

      <div className={styles.formGrid} style={{ marginBottom: 24 }}>
        <Select
          label="Голос / модель озвучки"
          options={VOICE_OPTIONS}
          value={voiceModel}
          onChange={(e) => setField("voiceModel", e.target.value)}
        />
        <div>
          <label className={styles.sectionTitle} style={{ fontSize: 13 }}>
            Скорость речи: {speechSpeed.toFixed(1)}x
          </label>
          <div className={styles.sliderRow}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechSpeed}
              onChange={(e) => setField("speechSpeed", parseFloat(e.target.value))}
              className={styles.slider}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>2x</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Тайминг слайдов</h3>
        <Table columns={slideColumns} data={cardsWithDuration} keyField="id" />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleGenerateVoice} disabled={isBuilding}>
          Сгенерировать озвучку
        </Button>
        <Button
          onClick={handleBuildVideo}
          disabled={isBuilding || !isVoiceGenerated}
        >
          {isBuilding ? "Сборка..." : "Собрать видео"}
        </Button>
      </div>

      {buildProgress.length > 0 && (
        <div className={styles.buildStatus}>
          <h4 className={styles.sectionTitle}>Прогресс</h4>
          {buildProgress.map((step, i) => (
            <div key={i} className={styles.buildStatusItem}>
              <span>{i < buildProgress.length - 1 ? "✓" : "→"}</span>
              <span>{step}</span>
              {i === buildProgress.length - 1 && buildStatus !== "idle" && (
                <StatusBadge status={buildStatus} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
