"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, DownloadSimple } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  buildScheduledAt,
  useContentPlanStore,
} from "@/stores/content-plan-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ContentFormat, ContentPlanScenario, ContentPlanSlot } from "@/types";
import {
  FORMAT_LEGEND,
  FORMAT_STRIP,
  addDays,
  downloadWeekPlan,
  formatPublicationTime,
  formatWeekRange,
  getPlanItemStatus,
  getWeekStart,
  toDateKey,
} from "@/lib/content-plan";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import styles from "./kp.module.css";

const FORMAT_OPTIONS = [
  { value: "gallery", label: "Галерея" },
  { value: "slideshow", label: "Слайд-шоу с озвучкой" },
  { value: "text", label: "Текстовый пост" },
  { value: "video_meme", label: "Видео-мем" },
];

function getDefaultTime() {
  return "12:00";
}

function formatAddDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isSameDay(date: Date, other: Date) {
  return toDateKey(date) === toDateKey(other);
}

export default function ContentPlanPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDateKey, setAddDateKey] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    time: getDefaultTime(),
    projectId: "",
    contentUnitId: "",
    title: "",
    format: "gallery" as ContentFormat,
    scenario: "scheduled" as ContentPlanScenario,
    comment: "",
  });

  const slots = useContentPlanStore((s) => s.slots);
  const addSlot = useContentPlanStore((s) => s.addSlot);
  const moveSlotToDate = useContentPlanStore((s) => s.moveSlotToDate);
  const projects = useProjectsStore((s) => s.projects);
  const contentUnits = useProjectsStore((s) => s.contentUnits);
  const getTaskByContentId = useWorkflowStore((s) => s.getTaskByContentId);

  const projectContent = useMemo(() => {
    if (!addForm.projectId) return [];
    return contentUnits.filter((unit) => unit.projectId === addForm.projectId);
  }, [contentUnits, addForm.projectId]);

  const selectedContent = projectContent.find(
    (unit) => unit.id === addForm.contentUnitId
  );

  const weekStart = useMemo(() => {
    const start = getWeekStart(new Date());
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const activeSlots = useMemo(
    () => slots.filter((slot) => !slot.archived),
    [slots]
  );

  const weekSlots = useMemo(
    () =>
      activeSlots.filter((slot) => {
        const date = new Date(slot.scheduledAt);
        return date >= weekStart && date < addDays(weekStart, 7);
      }),
    [activeSlots, weekStart]
  );

  const openAddModal = (dateKey: string) => {
    setAddDateKey(dateKey);
    setAddForm({
      time: getDefaultTime(),
      projectId: projects[0]?.id ?? "",
      contentUnitId: "",
      title: "",
      format: "gallery",
      scenario: "scheduled",
      comment: "",
    });
    setAddModalOpen(true);
  };

  const handleAddSlot = () => {
    if (!addDateKey || !addForm.projectId || !addForm.time.trim()) return;
    if (!addForm.contentUnitId && !addForm.title.trim()) return;

    const title = selectedContent?.title ?? addForm.title.trim();
    const format = selectedContent?.format ?? addForm.format;

    addSlot({
      projectId: addForm.projectId,
      contentUnitId: addForm.contentUnitId || undefined,
      scheduledAt: buildScheduledAt(addDateKey, addForm.time),
      title,
      format,
      scenario: addForm.scenario,
      comment: addForm.comment.trim(),
      hasText: Boolean(selectedContent?.postText || addForm.title),
      hasZip: format === "gallery",
      hasVisual: format !== "text",
    });

    setAddModalOpen(false);
    setAddDateKey(null);
  };

  const canSubmit =
    !!addDateKey &&
    !!addForm.projectId &&
    !!addForm.time &&
    (!!addForm.contentUnitId || !!addForm.title.trim());

  const slotsForDay = (dateKey: string) =>
    weekSlots
      .filter((slot) => toDateKey(new Date(slot.scheduledAt)) === dateKey)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );

  return (
    <AppShell breadcrumb="Контент-план">
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div>
            <h1 className={styles.pageTitle}>Контент-план</h1>
            <p className={styles.pageDescription}>
              Неделя на одном экране. Цвет полоски — формат, подпись — статус.
              Карточку можно перетащить на другой день.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/archive">
              <Button variant="secondary">Архив</Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => downloadWeekPlan(weekStart, weekSlots)}
            >
              <DownloadSimple size={16} />
              Скачать контент-план
            </Button>
          </div>
        </div>

        <section className={styles.board} aria-label="Неделя">
          <div className={styles.boardHead}>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.weekNow}
                onClick={() => setWeekOffset(0)}
              >
                Эта неделя
              </button>
              <button
                type="button"
                className={styles.weekButton}
                onClick={() => setWeekOffset((value) => value - 1)}
                aria-label="Предыдущая неделя"
              >
                <CaretLeft size={16} />
              </button>
              <span className={styles.weekRange}>{formatWeekRange(weekStart)}</span>
              <button
                type="button"
                className={styles.weekButton}
                onClick={() => setWeekOffset((value) => value + 1)}
                aria-label="Следующая неделя"
              >
                <CaretRight size={16} />
              </button>
            </div>
            <div className={styles.legend}>
              {FORMAT_LEGEND.map((item) => (
                <span key={item.format} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: FORMAT_STRIP[item.format] }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.weekGrid}>
            {weekDays.map((day) => {
              const dateKey = toDateKey(day);
              const today = isSameDay(day, new Date());
              const items = slotsForDay(dateKey);

              return (
                <div
                  key={dateKey}
                  className={`${styles.dayCol} ${today ? styles.dayToday : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain") || dragId;
                    if (id) moveSlotToDate(id, dateKey);
                    setDragId(null);
                  }}
                >
                  <div className={styles.dayHead}>
                    <span className={styles.dayName}>
                      {day
                        .toLocaleDateString("ru-RU", { weekday: "short" })
                        .replace(".", "")
                        .toUpperCase()}{" "}
                      {day.getDate()}
                    </span>
                    {today && <span className={styles.todayMark}>сегодня</span>}
                    <button
                      type="button"
                      className={styles.addDay}
                      onClick={() => openAddModal(dateKey)}
                    >
                      +
                    </button>
                  </div>

                  <div className={styles.dayList}>
                    {items.length === 0 ? (
                      <p className={styles.dayEmpty}>
                        Пусто. Нейросеть может предложить тему.
                      </p>
                    ) : (
                      items.map((slot) => (
                        <PlanCard
                          key={slot.id}
                          slot={slot}
                          status={getPlanItemStatus(
                            slot,
                            slot.contentUnitId
                              ? getTaskByContentId(slot.contentUnitId)
                              : undefined
                          )}
                          onDragStart={() => setDragId(slot.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Modal
        title="Добавить в план"
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddSlot} disabled={!canSubmit}>
              Добавить
            </Button>
          </>
        }
      >
        {addDateKey && (
          <p className={styles.modalHint}>
            Дата публикации: {formatAddDateLabel(addDateKey)}
          </p>
        )}
        <div className={styles.modalForm}>
          <Input
            label="Время публикации"
            type="time"
            value={addForm.time}
            onChange={(e) => setAddForm((form) => ({ ...form, time: e.target.value }))}
          />
          <Select
            label="Проект"
            options={projects.map((project) => ({
              value: project.id,
              label: project.name,
            }))}
            value={addForm.projectId}
            onChange={(e) =>
              setAddForm((form) => ({
                ...form,
                projectId: e.target.value,
                contentUnitId: "",
                title: "",
              }))
            }
          />
          <Select
            label="Контент"
            options={[
              { value: "", label: "— Указать вручную —" },
              ...projectContent.map((unit) => ({
                value: unit.id,
                label: unit.title,
              })),
            ]}
            value={addForm.contentUnitId}
            onChange={(e) => {
              const content = projectContent.find((unit) => unit.id === e.target.value);
              setAddForm((form) => ({
                ...form,
                contentUnitId: e.target.value,
                title: content?.title ?? form.title,
                format: content?.format ?? form.format,
              }));
            }}
          />
          {!addForm.contentUnitId && (
            <>
              <Input
                label="Название"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm((form) => ({ ...form, title: e.target.value }))
                }
                placeholder="Название публикации"
              />
              <Select
                label="Формат"
                options={FORMAT_OPTIONS}
                value={addForm.format}
                onChange={(e) =>
                  setAddForm((form) => ({
                    ...form,
                    format: e.target.value as ContentFormat,
                  }))
                }
              />
            </>
          )}
          <Textarea
            label="Комментарий"
            value={addForm.comment}
            onChange={(e) =>
              setAddForm((form) => ({ ...form, comment: e.target.value }))
            }
            rows={2}
            placeholder="Необязательно"
          />
        </div>
      </Modal>
    </AppShell>
  );
}

function PlanCard({
  slot,
  status,
  onDragStart,
}: {
  slot: ContentPlanSlot;
  status: string;
  onDragStart: () => void;
}) {
  const href = slot.contentUnitId
    ? getRoleWorkspaceHref(slot.projectId, slot.contentUnitId)
    : null;

  return (
    <article
      className={styles.planCard}
      style={{ borderLeftColor: FORMAT_STRIP[slot.format] }}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", slot.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
    >
      <p className={styles.planTime}>{formatPublicationTime(slot.scheduledAt)}</p>
      {href ? (
        <Link href={href} className={styles.planTitle}>
          {slot.title}
        </Link>
      ) : (
        <p className={styles.planTitle}>{slot.title}</p>
      )}
      <p className={styles.planStatus}>{status}</p>
    </article>
  );
}
