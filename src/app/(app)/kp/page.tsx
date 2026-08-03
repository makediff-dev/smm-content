"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CaretLeft,
  CaretRight,
  DownloadSimple,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { ContentFormat, ContentPlanScenario, ContentUnit } from "@/types";
import { FORMAT_LABELS } from "@/types";
import {
  ROWS_PER_DAY,
  addDays,
  buildDayRows,
  formatDayHeader,
  formatPublicationTime,
  formatWeekRange,
  getKpVisualFileName,
  getKpZipFileName,
  getSlotVisualFiles,
  getSlotZipFileName,
  getWeekStart,
  toDateKey,
} from "@/lib/content-plan";
import styles from "./kp.module.css";

const FORMAT_OPTIONS = [
  { value: "gallery", label: "Галерея" },
  { value: "slideshow", label: "Слайд-шоу с озвучкой" },
  { value: "text", label: "Текстовый пост" },
];

const SCENARIO_OPTIONS = [
  { value: "scheduled", label: "По расписанию" },
  { value: "news", label: "Новость" },
];

function getDefaultTime() {
  return "12:00";
}

function getSlotAssets(content: ContentUnit | undefined, format: ContentFormat) {
  if (content) {
    return {
      hasText: !!content.postText,
      hasZip: content.format === "gallery" && content.status === "done",
      hasVisual:
        content.format !== "text" &&
        content.cards.length > 0 &&
        content.cards.every((card) => card.imageUrl),
    };
  }

  return {
    hasText: true,
    hasZip: format === "gallery",
    hasVisual: format !== "text",
  };
}

function formatAddDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function handleAssetDownload(fileName: string) {
  alert(`[Прототип] Скачать ${fileName}`);
}

function renderAssetDownload(hasAsset: boolean, fileName: string | null) {
  if (!hasAsset || !fileName) {
    return <span className={styles.assetEmpty}>—</span>;
  }

  return renderAssetDownloads([fileName]);
}

function renderAssetDownloads(fileNames: string[]) {
  if (!fileNames.length) {
    return <span className={styles.assetEmpty}>—</span>;
  }

  return (
    <div className={styles.assetList}>
      {fileNames.map((fileName) => (
        <button
          key={fileName}
          type="button"
          className={styles.assetDownload}
          onClick={() => handleAssetDownload(fileName)}
          title={`Скачать ${fileName}`}
        >
          <DownloadSimple size={14} weight="bold" />
          {fileName}
        </button>
      ))}
    </div>
  );
}

export default function ContentPlanPage() {
  const [weekOffset, setWeekOffset] = useState(0);
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
    zipFileName: "",
    visualFileName: "",
    attachmentFiles: [] as string[],
  });

  const zipInputRef = useRef<HTMLInputElement>(null);
  const visualInputRef = useRef<HTMLInputElement>(null);
  const attachmentsInputRef = useRef<HTMLInputElement>(null);

  const slots = useContentPlanStore((s) => s.slots);
  const addSlot = useContentPlanStore((s) => s.addSlot);
  const readyForProofreading = useContentPlanStore((s) => s.readyForProofreading);
  const setReadyForProofreading = useContentPlanStore((s) => s.setReadyForProofreading);
  const projects = useProjectsStore((s) => s.projects);
  const contentUnits = useProjectsStore((s) => s.contentUnits);
  const getProject = useProjectsStore((s) => s.getProject);

  const projectContent = useMemo(() => {
    if (!addForm.projectId) return [];
    return contentUnits.filter((unit) => unit.projectId === addForm.projectId);
  }, [contentUnits, addForm.projectId]);

  const selectedContent = projectContent.find(
    (unit) => unit.id === addForm.contentUnitId
  );

  const openAddModal = (dateKey: string) => {
    const defaultProjectId = projects[0]?.id ?? "";
    setAddDateKey(dateKey);
    setAddForm({
      time: getDefaultTime(),
      projectId: defaultProjectId,
      contentUnitId: "",
      title: "",
      format: "gallery",
      scenario: "scheduled",
      comment: "",
      zipFileName: "",
      visualFileName: "",
      attachmentFiles: [],
    });
    setAddModalOpen(true);
  };

  const handleProjectChange = (projectId: string) => {
    setAddForm((form) => ({
      ...form,
      projectId,
      contentUnitId: "",
      title: "",
      format: "gallery",
    }));
  };

  const handleContentChange = (contentUnitId: string) => {
    const content = projectContent.find((unit) => unit.id === contentUnitId);
    const format = content?.format ?? addForm.format;
    setAddForm((form) => ({
      ...form,
      contentUnitId,
      title: content?.title ?? form.title,
      format,
      zipFileName: "",
      visualFileName: "",
      attachmentFiles: [],
    }));
  };

  const handleZipUpload = (file?: File) => {
    if (!file) return;
    setAddForm((form) => ({ ...form, zipFileName: file.name }));
  };

  const handleVisualUpload = (file?: File) => {
    if (!file) return;
    setAddForm((form) => ({ ...form, visualFileName: file.name }));
  };

  const handleAttachmentsUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const names = Array.from(files).map((file) => file.name);
    setAddForm((form) => ({
      ...form,
      attachmentFiles: [...form.attachmentFiles, ...names],
    }));
  };

  const removeAttachment = (fileName: string) => {
    setAddForm((form) => ({
      ...form,
      attachmentFiles: form.attachmentFiles.filter((name) => name !== fileName),
    }));
  };

  const handleAddSlot = () => {
    if (!addDateKey || !addForm.projectId || !addForm.time.trim()) return;
    if (!addForm.contentUnitId && !addForm.title.trim()) return;

    const title = selectedContent?.title ?? addForm.title.trim();
    const format = selectedContent?.format ?? addForm.format;
    const assets = getSlotAssets(selectedContent, format);
    const hasUploadedZip = !!addForm.zipFileName;
    const hasUploadedVisual =
      !!addForm.visualFileName || addForm.attachmentFiles.length > 0;

    addSlot({
      projectId: addForm.projectId,
      contentUnitId: addForm.contentUnitId || undefined,
      scheduledAt: buildScheduledAt(addDateKey, addForm.time),
      title,
      format,
      scenario: addForm.scenario,
      comment: addForm.comment.trim(),
      hasText: assets.hasText,
      hasZip: hasUploadedZip || assets.hasZip,
      hasVisual: hasUploadedVisual || assets.hasVisual,
      zipFileName: addForm.zipFileName || undefined,
      visualFileName: addForm.visualFileName || undefined,
      attachmentFiles: addForm.attachmentFiles.length
        ? addForm.attachmentFiles
        : undefined,
    });

    setAddModalOpen(false);
    setAddDateKey(null);
  };

  const canSubmit =
    !!addDateKey &&
    !!addForm.projectId &&
    !!addForm.time &&
    (!!addForm.contentUnitId || !!addForm.title.trim());

  const weekStart = useMemo(() => {
    const start = getWeekStart(new Date());
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const weekSlots = useMemo(
    () =>
      slots.filter((slot) => {
        const date = new Date(slot.scheduledAt);
        const end = addDays(weekStart, 7);
        return date >= weekStart && date < end;
      }),
    [slots, weekStart]
  );

  let rowCounter = 0;

  return (
    <AppShell breadcrumb="КП">
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <h1 className={styles.pageTitle}>КП</h1>
          <div className={styles.toolbarRight}>
            <Button variant="secondary" onClick={() => setWeekOffset(0)}>
              Эта неделя
            </Button>
            <div className={styles.weekNav}>
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
          </div>
        </div>

        <div className={styles.metaBar}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            КП формируется
          </div>
          <Checkbox
            label="КП готово к вычитке"
            checked={readyForProofreading}
            onChange={(e) => setReadyForProofreading(e.target.checked)}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Время публикации</th>
                <th className={styles.th}>Текст</th>
                <th className={styles.th}>ZIP</th>
                <th className={styles.th}>Визуал</th>
                <th className={styles.th}>Комментарии</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day) => {
                const dateKey = toDateKey(day);
                const dayRows = buildDayRows(dateKey, weekSlots, rowCounter);
                rowCounter += ROWS_PER_DAY;

                return (
                  <Fragment key={dateKey}>
                    <tr className={styles.dayHeaderRow}>
                      <td colSpan={6}>{formatDayHeader(day)}</td>
                    </tr>
                    {dayRows.map((row) => {
                      const project = row.slot
                        ? getProject(row.slot.projectId)
                        : undefined;

                      return (
                        <tr key={row.id} className={styles.dataRow}>
                          <td className={styles.tdMuted}>{row.rowNumber}</td>
                          <td className={styles.tdTime}>
                            {row.slot ? formatPublicationTime(row.slot.scheduledAt) : "—"}
                          </td>
                          <td className={styles.tdText}>
                            {row.slot ? (
                              <div className={styles.slotText}>
                                {row.slot.contentUnitId ? (
                                  <Link
                                    href={`/history/${row.slot.contentUnitId}?from=kp`}
                                    className={styles.slotLink}
                                  >
                                    {row.slot.title}
                                  </Link>
                                ) : (
                                  <span>{row.slot.title}</span>
                                )}
                                <span className={styles.slotMeta}>
                                  {project?.name ?? "Проект"} ·{" "}
                                  {FORMAT_LABELS[row.slot.format]}
                                  {row.slot.scenario === "news" ? " · новость" : ""}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={styles.addButton}
                                onClick={() => openAddModal(dateKey)}
                              >
                                <Plus size={14} weight="bold" />
                                Добавить
                              </button>
                            )}
                          </td>
                          <td className={styles.tdAsset}>
                            {row.slot
                              ? renderAssetDownload(
                                  row.slot.hasZip,
                                  getSlotZipFileName(row.slot)
                                )
                              : renderAssetDownload(false, null)}
                          </td>
                          <td className={styles.tdAsset}>
                            {row.slot
                              ? renderAssetDownloads(getSlotVisualFiles(row.slot))
                              : renderAssetDownloads([])}
                          </td>
                          <td className={styles.tdComment}>
                            {row.slot?.comment || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title="Добавить в КП"
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
            onChange={(e) => handleProjectChange(e.target.value)}
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
            onChange={(e) => handleContentChange(e.target.value)}
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
          <Select
            label="Сценарий"
            options={SCENARIO_OPTIONS}
            value={addForm.scenario}
            onChange={(e) =>
              setAddForm((form) => ({
                ...form,
                scenario: e.target.value as ContentPlanScenario,
              }))
            }
          />
          <Textarea
            label="Комментарий"
            value={addForm.comment}
            onChange={(e) =>
              setAddForm((form) => ({ ...form, comment: e.target.value }))
            }
            rows={2}
            placeholder="Необязательно"
          />

          <div className={styles.fileUploadSection}>
            <div className={styles.fileUploadTitle}>Файлы для слота</div>
            <p className={styles.fileUploadHint}>
              Можно прикрепить ZIP, видео, изображения и другие файлы вручную —
              они появятся в колонках таблицы.
            </p>

            <div className={styles.fileUploadField}>
              <span className={styles.fileUploadLabel}>ZIP-архив</span>
              {addForm.zipFileName ? (
                <div className={styles.fileChip}>
                  <span>{addForm.zipFileName}</span>
                  <button
                    type="button"
                    className={styles.fileChipRemove}
                    onClick={() =>
                      setAddForm((form) => ({ ...form, zipFileName: "" }))
                    }
                    aria-label="Удалить ZIP"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => zipInputRef.current?.click()}
                >
                  <UploadSimple size={16} />
                  Выбрать ZIP
                </Button>
              )}
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip"
                className={styles.hiddenFileInput}
                onChange={(e) => {
                  handleZipUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            <div className={styles.fileUploadField}>
              <span className={styles.fileUploadLabel}>Визуал / видео</span>
              {addForm.visualFileName ? (
                <div className={styles.fileChip}>
                  <span>{addForm.visualFileName}</span>
                  <button
                    type="button"
                    className={styles.fileChipRemove}
                    onClick={() =>
                      setAddForm((form) => ({ ...form, visualFileName: "" }))
                    }
                    aria-label="Удалить файл визуала"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => visualInputRef.current?.click()}
                >
                  <UploadSimple size={16} />
                  Выбрать файл
                </Button>
              )}
              <input
                ref={visualInputRef}
                type="file"
                accept="video/*,image/*,.mp4,.mov,.png,.jpg,.jpeg,.webp,.zip"
                className={styles.hiddenFileInput}
                onChange={(e) => {
                  handleVisualUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            <div className={styles.fileUploadField}>
              <span className={styles.fileUploadLabel}>Дополнительные файлы</span>
              <Button
                variant="ghost"
                size="small"
                onClick={() => attachmentsInputRef.current?.click()}
              >
                <Plus size={14} weight="bold" />
                Добавить файлы
              </Button>
              <input
                ref={attachmentsInputRef}
                type="file"
                multiple
                accept=".zip,.mp4,.mov,.png,.jpg,.jpeg,.webp,.pdf,.txt,.md,audio/*,video/*,image/*"
                className={styles.hiddenFileInput}
                onChange={(e) => {
                  handleAttachmentsUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              {addForm.attachmentFiles.length > 0 && (
                <div className={styles.fileChipList}>
                  {addForm.attachmentFiles.map((fileName) => (
                    <div key={fileName} className={styles.fileChip}>
                      <span>{fileName}</span>
                      <button
                        type="button"
                        className={styles.fileChipRemove}
                        onClick={() => removeAttachment(fileName)}
                        aria-label={`Удалить ${fileName}`}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!addForm.zipFileName &&
              !addForm.visualFileName &&
              addForm.attachmentFiles.length === 0 &&
              (selectedContent || addForm.format) && (
                <p className={styles.fileUploadDefaults}>
                  Без загрузки будут использованы стандартные имена:{" "}
                  {getKpZipFileName(selectedContent?.format ?? addForm.format) ??
                    "—"}{" "}
                  /{" "}
                  {getKpVisualFileName(selectedContent?.format ?? addForm.format) ??
                    "—"}
                </p>
              )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
