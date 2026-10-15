import type {
  ContentFormat,
  ContentPlanSlot,
  ProductionTask,
} from "@/types";
import { FORMAT_LABELS } from "@/types";

export const ROWS_PER_DAY = 5;

export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const endLabel = weekEnd.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} — ${endLabel}`;
}

export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
  });
}

export const FORMAT_STRIP: Record<ContentFormat, string> = {
  text: "#3b82f6",
  gallery: "#a855f7",
  slideshow: "#f59e0b",
  video_meme: "#22c55e",
};

export const FORMAT_LEGEND: { format: ContentFormat; label: string }[] = [
  { format: "text", label: "Текстовый пост" },
  { format: "gallery", label: "Галерея" },
  { format: "slideshow", label: "Слайд-шоу" },
  { format: "video_meme", label: "Видео-мем" },
];

export type PlanItemStatus =
  | "в плане"
  | "на доработке"
  | "ждёт проверки"
  | "архив";

export function getPlanItemStatus(
  slot: ContentPlanSlot,
  task?: ProductionTask
): PlanItemStatus {
  if (slot.archived) return "архив";
  if (!task || task.status === "done") return "в плане";
  if (task.status === "returned") return "на доработке";
  return "ждёт проверки";
}

export function getActivePlanSlots(slots: ContentPlanSlot[]): ContentPlanSlot[] {
  return slots.filter((slot) => !slot.archived);
}

export function getArchivedPlanSlots(slots: ContentPlanSlot[]): ContentPlanSlot[] {
  return slots.filter((slot) => slot.archived);
}

export function formatArchiveSince(iso?: string): string {
  if (!iso) return "в архиве";
  const label = new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  return `в архиве с ${label}`;
}

export function downloadWeekPlan(
  weekStart: Date,
  slots: ContentPlanSlot[]
): void {
  const weekEnd = addDays(weekStart, 6);
  const lines = [
    `Контент-план ${formatWeekRange(weekStart)}`,
    "",
    ...Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index);
      const key = toDateKey(day);
      const daySlots = slots
        .filter((slot) => !slot.archived && toDateKey(new Date(slot.scheduledAt)) === key)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      const header = day.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (daySlots.length === 0) return `${header}\n— пусто\n`;
      return [
        header,
        ...daySlots.map(
          (slot) =>
            `${formatPublicationTime(slot.scheduledAt)} · ${FORMAT_LABELS[slot.format]} · ${slot.title}`
        ),
        "",
      ].join("\n");
    }),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `контент-план_${toDateKey(weekStart)}_${toDateKey(weekEnd)}.txt`;
  link.click();
  URL.revokeObjectURL(href);
}

export function formatPublicationTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface ContentPlanRow {
  id: string;
  rowNumber: number;
  slot?: ContentPlanSlot;
}

export function buildDayRows(
  dateKey: string,
  slots: ContentPlanSlot[],
  rowOffset: number
): ContentPlanRow[] {
  const daySlots = slots
    .filter((slot) => toDateKey(new Date(slot.scheduledAt)) === dateKey)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  return Array.from({ length: ROWS_PER_DAY }, (_, index) => ({
    id: `${dateKey}-${index}`,
    rowNumber: rowOffset + index + 1,
    slot: daySlots[index],
  }));
}

export function getKpZipFileName(format: ContentFormat): string | null {
  if (format === "gallery") return "gallery.zip";
  if (format === "slideshow") return "cards.zip";
  return null;
}

export function getKpVisualFileName(format: ContentFormat): string | null {
  if (format === "gallery") return "cards.zip";
  if (format === "slideshow" || format === "video_meme") return "video.mp4";
  return null;
}

export function getSlotZipFileName(slot: ContentPlanSlot): string | null {
  if (!slot.hasZip) return null;
  return slot.zipFileName ?? getKpZipFileName(slot.format);
}

export function getSlotVisualFiles(slot: ContentPlanSlot): string[] {
  if (!slot.hasVisual) return [];

  const files: string[] = [];
  if (slot.visualFileName) files.push(slot.visualFileName);
  if (slot.attachmentFiles?.length) {
    for (const file of slot.attachmentFiles) {
      if (!files.includes(file)) files.push(file);
    }
  }
  if (files.length > 0) return files;

  const fallback = getKpVisualFileName(slot.format);
  return fallback ? [fallback] : [];
}
