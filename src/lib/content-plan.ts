import type { ContentFormat, ContentPlanSlot } from "@/types";

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
    month: "short",
  });
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
  if (format === "slideshow") return "video.mp4";
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
