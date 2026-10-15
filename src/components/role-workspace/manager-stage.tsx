"use client";

import { useMemo, useState } from "react";
import type { ContentUnit, ProductionTask } from "@/types";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDesignerSlides } from "@/lib/designer-slides";
import {
  downloadNamedFile,
  getManagerPackBody,
  getManagerPackFileName,
} from "@/lib/posting-packs";
import { getManagerTtx } from "@/lib/role-workspace";
import styles from "./role-workspace.module.css";

const PLATFORM_OPTIONS = ["VK", "IG", "OK", "Дзен", "сторис"];

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTime() {
  return "12:00";
}

export function ManagerPreview({
  content,
  task,
}: {
  content: ContentUnit;
  task: ProductionTask;
}) {
  const slides = useMemo(() => getDesignerSlides(content), [content]);
  const ttx = useMemo(
    () => getManagerTtx(content, task.scenario),
    [content, task.scenario]
  );

  return (
    <div className={styles.stackPreview}>
      {content.format === "video_meme" ? (
        <div>
          <VideoPlayerStub src={content.sourceUrl || undefined} />
          <p className={styles.visualLabel}>Видео-мем</p>
        </div>
      ) : (
        <div>
          <div className={styles.photoGrid}>
            {slides.map((slide) => (
              <div key={slide.id} className={styles.photoTile}>
                {slide.imageUrl ? (
                  <span
                    className={styles.slidePhoto}
                    style={{ backgroundImage: `url(${slide.imageUrl})` }}
                  />
                ) : (
                  <span className={styles.photoFallback}>
                    {slide.shortText.slice(0, 16)}
                  </span>
                )}
                <span className={styles.slidePlaque}>{slide.shortText}</span>
              </div>
            ))}
          </div>
          <p className={styles.visualLabel}>
            {content.format === "gallery" || content.format === "text"
              ? `${content.format === "gallery" ? "Галерея" : "Текстовый пост"} · ${slides.length} слайдов + сторис`
              : content.format === "slideshow"
                ? `Слайд-шоу · ${slides.length} кадров`
                : "Сторис"}
          </p>
        </div>
      )}

      <div className={`${styles.copy} ${styles.ttxBlock}`}>
        <div className={styles.copyGroup}>
        <h2 className={styles.kicker}>Основные ТТХ</h2>
        <ul className={styles.checks}>
          {ttx.map((item) => (
            <li
              key={item.text}
              className={`${styles.checkItem} ${item.ok ? styles.checkOk : styles.checkWarn}`}
            >
              <span className={styles.checkMark} aria-hidden>
                {item.ok ? "✓" : "!"}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className={styles.ttxDownload}>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              downloadNamedFile(
                getManagerPackFileName(content),
                getManagerPackBody(content)
              )
            }
          >
            Скачать все файлы
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}

interface ManagerPlanProps {
  content: ContentUnit;
  canOperate: boolean;
  alreadyDone: boolean;
  onApproveToPlan: (payload: {
    date: string;
    time: string;
    platforms: string[];
  }) => void;
  onRework: (comment: string) => void;
}

export function ManagerPlan({
  content,
  canOperate,
  alreadyDone,
  onApproveToPlan,
  onRework,
}: ManagerPlanProps) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [platforms, setPlatforms] = useState<string[]>(
    content.format === "text" ? ["VK", "IG", "сторис"] : [...PLATFORM_OPTIONS]
  );
  const [reworkComment, setReworkComment] = useState("");

  const togglePlatform = (name: string) => {
    setPlatforms((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  return (
    <>
    <section className={styles.sideCard} aria-label="Поставить в план">
      <h2 className={styles.sideTitle}>Поставить в план</h2>
      <div className={styles.planRow}>
        <Input
          type="date"
          label="Дата"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={!canOperate || alreadyDone}
        />
        <Input
          type="time"
          label="Время"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          disabled={!canOperate || alreadyDone}
        />
      </div>
      <div className={`${styles.toolRow} ${styles.planPlatforms}`}>
        {PLATFORM_OPTIONS.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.toolChip} ${platforms.includes(name) ? styles.toolChipActive : ""}`}
            disabled={!canOperate || alreadyDone}
            onClick={() => togglePlatform(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <Textarea
        label="Комментарий"
        rows={3}
        placeholder="Обязателен, если на доработку"
        value={reworkComment}
        onChange={(event) => setReworkComment(event.target.value)}
        disabled={!canOperate || alreadyDone}
      />

    </section>
      {canOperate && !alreadyDone ? (
        <div className={styles.actions}>
          <Button
            onClick={() => onApproveToPlan({ date, time, platforms })}
            disabled={!date || !time || platforms.length === 0}
          >
            Согласовать и в план
          </Button>
          <Button
            variant="danger"
            onClick={() => onRework(reworkComment.trim())}
            disabled={!reworkComment.trim()}
          >
            Отправить на доработку
          </Button>
        </div>
      ) : (
        <p className={styles.note}>
          {alreadyDone
            ? "Уже в плане."
            : "Согласование доступно менеджеру проекта на этом этапе."}
        </p>
      )}
    </>
  );
}
