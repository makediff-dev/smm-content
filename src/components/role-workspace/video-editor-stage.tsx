"use client";

import { useState } from "react";
import type { Card, ContentUnit } from "@/types";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDesignerSlides } from "@/lib/designer-slides";
import { simulateTask } from "@/lib/simulate-generation";
import { buildNarrationFromCards } from "@/lib/workspace-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { createQueueTaskForType, useQueueStore } from "@/stores/queue-store";
import styles from "./role-workspace.module.css";

const TEMPO_OPTIONS = [
  { value: 0.85, label: "Медленнее" },
  { value: 1, label: "Норма" },
  { value: 1.15, label: "Быстрее" },
  { value: 1.3, label: "Ещё быстрее" },
];

const EFFECT_OPTIONS = ["Переходы", "Звуки", "Музыка"] as const;

const VOICE_OPTIONS = [
  { value: "voice-female-1", label: "Женский голос 1" },
  { value: "voice-female-2", label: "Женский голос 2" },
  { value: "voice-male-1", label: "Мужской голос 1" },
  { value: "voice-male-2", label: "Мужской голос 2" },
];

interface VideoEditorStageProps {
  content: ContentUnit;
  canOperate: boolean;
  canEdit: boolean;
  onChange: (patch: Partial<ContentUnit>) => void;
}

export function VideoEditorStage({
  content,
  canOperate,
  canEdit,
  onChange,
}: VideoEditorStageProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const addQueueTask = useQueueStore((s) => s.addTask);
  const updateQueueTask = useQueueStore((s) => s.updateTask);
  const slides = getDesignerSlides(content);
  const [effects, setEffects] = useState<string[]>(["Переходы", "Музыка"]);
  const [busy, setBusy] = useState<string | null>(null);
  const [assembled, setAssembled] = useState(false);

  const toggleEffect = (name: string) => {
    if (!canEdit) return;
    setEffects((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const handleGenerateVoice = async () => {
    if (!canOperate) return;
    setBusy("Генерация озвучки…");
    await simulateTask(() => {}, ["queued", "in_progress"], 700);
    const narrationText =
      content.narrationText.trim() || buildNarrationFromCards(slides);
    onChange({ narrationText });
    if (currentUser) addActionLog(content.id, "Генерация озвучки", currentUser.name);
    setBusy(null);
  };

  const handleAssemble = async () => {
    if (!canOperate || !currentUser) return;
    setBusy("Сборка ролика…");
    const voiceId = addQueueTask(
      createQueueTaskForType(
        "voice_generation",
        content.projectId,
        currentUser.id,
        content.id,
        "Генерация аудио"
      )
    );
    await simulateTask(
      (status) => updateQueueTask(voiceId, { status }),
      ["queued", "in_progress", "done"],
      500
    );
    const videoId = addQueueTask(
      createQueueTaskForType(
        "video_assembly",
        content.projectId,
        currentUser.id,
        content.id,
        "Сборка видео"
      )
    );
    await simulateTask(
      (status) => updateQueueTask(videoId, { status }),
      ["queued", "in_progress", "done"],
      700
    );
    setAssembled(true);
    addActionLog(content.id, "Сборка видео из шаблона", currentUser.name);
    setBusy(null);
  };

  const updateDuration = (cardId: string, duration: number) => {
    const cards: Card[] = slides.map((slide) =>
      slide.id === cardId ? { ...slide, duration } : slide
    );
    onChange({ cards });
  };

  return (
    <div className={styles.stackPreview}>
      <div className={styles.playerCol}>
        <VideoPlayerStub className={styles.playerWide} />
        <p className={styles.visualLabel}>Ролик из шаблона · до 90 сек</p>
      </div>

      <div className={styles.copy}>
        <div className={styles.copyGroup}>
          <p className={styles.kicker}>Озвучка</p>
          {canEdit ? (
            <Textarea
              value={content.narrationText}
              rows={6}
              onChange={(event) =>
                onChange({ narrationText: event.target.value })
              }
            />
          ) : (
            <p className={styles.postText}>
              {content.narrationText || "Нет текста озвучки."}
            </p>
          )}
        </div>

        {canOperate && (
          <div className={styles.copyGroup}>
            <Select
              label="Голос"
              options={VOICE_OPTIONS}
              value={content.voiceModel || "voice-female-1"}
              onChange={(event) => onChange({ voiceModel: event.target.value })}
            />
            <div className={styles.aiRow}>
              <Button
                size="small"
                disabled={Boolean(busy)}
                onClick={handleGenerateVoice}
              >
                Сгенерировать озвучку
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={Boolean(busy)}
                onClick={handleAssemble}
              >
                Собрать ролик
              </Button>
            </div>
            {assembled && (
              <p className={styles.note}>Ролик собран из шаблона. Можно слушать и править темп.</p>
            )}
          </div>
        )}

        <div>
          <p className={styles.kicker}>Темп</p>
          <div className={styles.toolRow}>
            {TEMPO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.toolChip} ${
                  content.speechSpeed === option.value ? styles.toolChipActive : ""
                }`}
                disabled={!canEdit}
                onClick={() => onChange({ speechSpeed: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={styles.kicker}>Эффекты</p>
          <div className={styles.toolRow}>
            {EFFECT_OPTIONS.map((name) => (
              <button
                key={name}
                type="button"
                className={`${styles.toolChip} ${
                  effects.includes(name) ? styles.toolChipActive : ""
                }`}
                disabled={!canEdit}
                onClick={() => toggleEffect(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.durationList}>
          <p className={styles.kicker}>Кадры и длительность</p>
          {slides.slice(0, 6).map((slide, index) => (
            <div key={slide.id} className={styles.durationRow}>
              <span>
                {index + 1}. {slide.shortText}
              </span>
              {canEdit ? (
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={slide.duration ?? 3}
                  onChange={(event) =>
                    updateDuration(slide.id, Number(event.target.value) || 3)
                  }
                  aria-label={`Длительность кадра ${index + 1}`}
                />
              ) : (
                <span className={styles.packHint}>{slide.duration ?? 3} с</span>
              )}
            </div>
          ))}
        </div>
        {busy && <p className={styles.busyNote}>{busy}</p>}
      </div>
    </div>
  );
}
