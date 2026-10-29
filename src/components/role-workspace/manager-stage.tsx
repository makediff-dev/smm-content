"use client";

import { useMemo } from "react";
import type { ContentPlanSlot, ContentUnit, ProductionTask } from "@/types";
import { toDateKey } from "@/lib/content-plan";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDesignerSlides } from "@/lib/designer-slides";
import {
  downloadNamedFile,
  getManagerPackBody,
  getManagerPackFileName,
} from "@/lib/posting-packs";
import { getManagerTtx } from "@/lib/role-workspace";
import styles from "./role-workspace.module.css";

export const MANAGER_PLATFORM_OPTIONS = ["VK", "IG", "OK", "Дзен", "сторис"];

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTime() {
  return "12:00";
}

export interface ManagerPlanPayload {
  date: string;
  time: string;
  platforms: string[];
}

export function getDefaultManagerPlan(content: ContentUnit): ManagerPlanPayload {
  return {
    date: defaultDate(),
    time: defaultTime(),
    platforms:
      content.format === "text"
        ? ["VK", "IG", "сторис"]
        : [...MANAGER_PLATFORM_OPTIONS],
  };
}

export function planFromSlot(slot: ContentPlanSlot): ManagerPlanPayload {
  const at = new Date(slot.scheduledAt);
  return {
    date: toDateKey(at),
    time: `${String(at.getHours()).padStart(2, "0")}:${String(
      at.getMinutes()
    ).padStart(2, "0")}`,
    platforms: slot.platforms?.length
      ? [...slot.platforms]
      : [...MANAGER_PLATFORM_OPTIONS],
  };
}

export function ManagerPreview({
  content,
  task,
  visit = "full",
}: {
  content: ContentUnit;
  task: ProductionTask;
  visit?: "text" | "full";
}) {
  const slides = useMemo(() => getDesignerSlides(content), [content]);
  const ttx = useMemo(
    () => getManagerTtx(content, task.scenario),
    [content, task.scenario]
  );
  const sourceLabel =
    content.sourceUrl || content.sourceFileName || "Источник не указан";
  const showTitles =
    content.format === "gallery" || content.format === "slideshow";

  if (visit === "text") {
    return (
      <div className={styles.stackPreview}>
        {content.format === "video_meme" && (
          <div>
            <VideoPlayerStub src={content.sourceUrl || undefined} />
            <p className={styles.visualLabel}>Видео на согласование</p>
          </div>
        )}
        <div className={styles.copy}>
          <div className={styles.copyGroup}>
            <h2 className={styles.kicker}>
              {content.format === "video_meme"
                ? "Подводка копирайтера"
                : "Текст копирайтера"}
            </h2>
            {content.format !== "video_meme" && (
              <p className={styles.visualLabel}>{sourceLabel}</p>
            )}
            <p className={styles.postText}>
              {content.postText ||
                (content.format === "video_meme"
                  ? "Нет подводки."
                  : "Нет текста для согласования.")}
            </p>
          </div>
          {showTitles && (
            <div className={styles.titleList}>
              <p className={styles.kicker}>Заголовки слайдов</p>
              {slides.map((slide, index) => (
                <p key={slide.id} className={styles.postText}>
                  {index + 1}. {slide.shortText || "Без заголовка"}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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

interface ManagerApproveProps {
  format: ContentUnit["format"];
}

export function ManagerApprove({ format }: ManagerApproveProps) {
  const isMeme = format === "video_meme";

  return (
    <section className={styles.sideCard} aria-label="Согласовать текст">
      <h2 className={styles.sideTitle}>
        {isMeme ? "Согласовать видео и текст" : "Согласовать текст"}
      </h2>
      <p className={styles.note}>
        {isMeme
          ? "Решаете, можно ли брать ролик, и проверяете подводку копирайтера. Всю сборку смотрите позже."
          : "Проверяете тему, факты и текст копирайтера. Всю работу — визуал, вёрстку, сборку — смотрите на финальном шаге."}
      </p>
    </section>
  );
}

interface ManagerPlanProps {
  value: ManagerPlanPayload;
  canOperate: boolean;
  alreadyDone: boolean;
  alreadyArchived?: boolean;
  onChange: (payload: ManagerPlanPayload) => void;
  onApprove: () => void;
  onArchive: () => void;
}

export function ManagerPlan({
  value,
  canOperate,
  alreadyDone,
  alreadyArchived = false,
  onChange,
  onApprove,
  onArchive,
}: ManagerPlanProps) {
  const togglePlatform = (name: string) => {
    onChange({
      ...value,
      platforms: value.platforms.includes(name)
        ? value.platforms.filter((item) => item !== name)
        : [...value.platforms, name],
    });
  };

  return (
    <section className={styles.sideCard} aria-label="Поставить в КП">
      <h2 className={styles.sideTitle}>Проверить всё и поставить в КП</h2>
      <p className={styles.note}>
        Здесь смотрите уже весь пакет: текст, визуал и сборку. Если всё сходится
        — слот в КП. Если публикация не нужна, отправьте в архив.
      </p>
      <div className={styles.planRow}>
        <Input
          type="date"
          label="Дата"
          value={value.date}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
          disabled={!canOperate || alreadyDone}
        />
        <Input
          type="time"
          label="Время"
          value={value.time}
          onChange={(event) => onChange({ ...value, time: event.target.value })}
          disabled={!canOperate || alreadyDone}
        />
      </div>
      <div className={`${styles.toolRow} ${styles.planPlatforms}`}>
        {MANAGER_PLATFORM_OPTIONS.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.toolChip} ${styles.planChip} ${
              value.platforms.includes(name) ? styles.planChipOn : ""
            }`}
            disabled={!canOperate || alreadyDone}
            onClick={() => togglePlatform(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {alreadyDone ? (
        <p className={styles.note}>
          {alreadyArchived ? "Уже в архиве." : "Уже в КП."}
        </p>
      ) : !canOperate ? (
        <p className={styles.note}>
          Согласование доступно менеджеру проекта на этом этапе.
        </p>
      ) : (
        <div className={styles.planActions}>
          <Button
            onClick={onApprove}
            disabled={
              !value.date || !value.time || value.platforms.length === 0
            }
          >
            В КП
          </Button>
          <Button variant="secondary" onClick={onArchive}>
            В архив
          </Button>
        </div>
      )}
    </section>
  );
}
