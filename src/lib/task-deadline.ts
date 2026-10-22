import type { ProductionTask, Project, WorkflowStage } from "@/types";

/** Roles whose SLA can be set on the project. */
export const CONFIGURABLE_SLA_STAGES: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "video_editor",
  "project_manager",
];

/** Default minutes per role when the project has no custom SLA. */
export const DEFAULT_ROLE_SLA_MINUTES: Record<WorkflowStage, number> = {
  copywriter: 30,
  editor: 10,
  designer: 15,
  video_editor: 30,
  project_manager: 30,
  posting_manager: 60,
};

export const STAGE_SLA_HOURS: Record<WorkflowStage, number> = {
  copywriter: DEFAULT_ROLE_SLA_MINUTES.copywriter / 60,
  designer: DEFAULT_ROLE_SLA_MINUTES.designer / 60,
  editor: DEFAULT_ROLE_SLA_MINUTES.editor / 60,
  video_editor: DEFAULT_ROLE_SLA_MINUTES.video_editor / 60,
  project_manager: DEFAULT_ROLE_SLA_MINUTES.project_manager / 60,
  posting_manager: DEFAULT_ROLE_SLA_MINUTES.posting_manager / 60,
};

export function clampSlaMinutes(value: number, fallback: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function normalizeRoleSlaMinutes(
  value?: Partial<Record<WorkflowStage, number>> | null
): Record<WorkflowStage, number> {
  const next = { ...DEFAULT_ROLE_SLA_MINUTES };
  (Object.keys(DEFAULT_ROLE_SLA_MINUTES) as WorkflowStage[]).forEach((stage) => {
    if (value?.[stage] != null) {
      next[stage] = clampSlaMinutes(value[stage] as number, next[stage]);
    }
  });
  return next;
}

export function slaMinutesForStage(
  stage: WorkflowStage,
  project?: Project | null
): number {
  return normalizeRoleSlaMinutes(project?.roleSlaMinutes)[stage];
}

export function createStageDueAt(
  stage: WorkflowStage,
  from: Date = new Date(),
  project?: Project | null
): string {
  return new Date(
    from.getTime() + slaMinutesForStage(stage, project) * 60_000
  ).toISOString();
}

export function resolveTaskDueAt(
  task: ProductionTask,
  project?: Project | null
): Date {
  if (task.dueAt) return new Date(task.dueAt);
  const started = new Date(task.status === "done" ? task.createdAt : task.updatedAt);
  return new Date(createStageDueAt(task.currentStage, started, project));
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

export function isTaskOverdue(task: ProductionTask, now = new Date()): boolean {
  if (task.status === "done") return false;
  return resolveTaskDueAt(task).getTime() <= now.getTime();
}

export function getDeadlineTone(task: ProductionTask, now = new Date()): DeadlineTone {
  if (task.status === "done") return "later";
  const due = resolveTaskDueAt(task);
  if (isTaskOverdue(task, now)) return "overdue";
  const today = startOfDay(now);
  const target = startOfDay(due);
  const dayMs = 86_400_000;
  if (target === today) return "today";
  if (target === today + dayMs) return "tomorrow";
  return "later";
}

export function isTaskDeadlineHot(task: ProductionTask, now = new Date()): boolean {
  const tone = getDeadlineTone(task, now);
  return tone === "overdue" || tone === "today";
}
