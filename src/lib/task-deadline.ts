import type { ProductionTask, WorkflowStage } from "@/types";

/** Hours allowed on the current stage before the task is late. */
export const STAGE_SLA_HOURS: Record<WorkflowStage, number> = {
  copywriter: 24,
  designer: 24,
  editor: 16,
  video_editor: 24,
  project_manager: 16,
  posting_manager: 48,
};

export function createStageDueAt(
  stage: WorkflowStage,
  from: Date = new Date()
): string {
  return new Date(
    from.getTime() + STAGE_SLA_HOURS[stage] * 3_600_000
  ).toISOString();
}

export function resolveTaskDueAt(task: ProductionTask): Date {
  if (task.dueAt) return new Date(task.dueAt);
  const started = new Date(task.status === "done" ? task.createdAt : task.updatedAt);
  return new Date(createStageDueAt(task.currentStage, started));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatShortDate(date: Date): string {
  const day = date.getDate();
  const month = date
    .toLocaleDateString("ru-RU", { month: "short" })
    .replace(".", "")
    .replace("\u00a0", " ")
    .trim();
  return `${day} ${month}`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Today → «сегодня, 14:30»; tomorrow → «завтра»; later/past → «12 сен». */
export function formatTaskDeadline(isoOrDate: string | Date, now = new Date()): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const today = startOfDay(now);
  const target = startOfDay(date);
  const dayMs = 86_400_000;

  if (target === today) return `сегодня, ${formatClock(date)}`;
  if (target === today + dayMs) return "завтра";
  return formatShortDate(date);
}

export function formatTaskDeadlineLabel(task: ProductionTask, now = new Date()): string {
  return formatTaskDeadline(resolveTaskDueAt(task), now);
}

export type DeadlineTone = "overdue" | "today" | "tomorrow" | "later";

export function getDeadlineTone(task: ProductionTask, now = new Date()): DeadlineTone {
  if (task.status === "done") return "later";
  const due = resolveTaskDueAt(task);
  const today = startOfDay(now);
  const target = startOfDay(due);
  const dayMs = 86_400_000;
  if (due.getTime() < now.getTime() && target < today) return "overdue";
  if (target === today) return "today";
  if (target === today + dayMs) return "tomorrow";
  return "later";
}

export function isTaskDeadlineHot(task: ProductionTask, now = new Date()): boolean {
  const tone = getDeadlineTone(task, now);
  return tone === "overdue" || tone === "today";
}
