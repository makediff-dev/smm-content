import type {
  ProductionTask,
  Project,
  User,
  WorkflowStage,
} from "@/types";
import { FORMAT_LABELS } from "@/types";
import { getAssigneeName, getStageLabel } from "@/lib/workflow";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import { formatDate } from "@/lib/simulate-generation";
import { createStageDueAt, formatTaskDeadline } from "@/lib/task-deadline";

export { STAGE_SLA_HOURS } from "@/lib/task-deadline";

const HOT_HOURS = 24;

export interface StuckTaskRow {
  id: string;
  title: string;
  stageLabel: string;
  assigneeLabel: string;
  assigneeId: string | null;
  hours: number;
  durationLabel: string;
  isReturned: boolean;
  isHot: boolean;
  href: string;
  updatedAt: string;
}

export function getStuckHours(updatedAt: string, now = Date.now()): number {
  return Math.max(0, (now - new Date(updatedAt).getTime()) / 3_600_000);
}

export function formatStuckDuration(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rest = Math.floor(hours % 24);
    return rest > 0 ? `${days} дн. ${rest} ч` : `${days} дн.`;
  }
  if (hours >= 1) return `${Math.floor(hours)} ч`;
  return `${Math.max(1, Math.round(hours * 60))} мин`;
}

export function getStuckTaskRows(
  tasks: ProductionTask[],
  users: User[],
  now = Date.now()
): StuckTaskRow[] {
  return tasks
    .filter((task) => task.status !== "done")
    .map((task) => {
      const hours = getStuckHours(task.updatedAt, now);
      const isReturned = task.status === "returned";
      return {
        id: task.id,
        title: task.title,
        stageLabel: getStageLabel(task.currentStage),
        assigneeLabel: getAssigneeName(task.assigneeId, users),
        assigneeId: task.assigneeId,
        hours,
        durationLabel: formatStuckDuration(hours),
        isReturned,
        isHot: isReturned || hours >= HOT_HOURS,
        href: getRoleWorkspaceHref(task.projectId, task.contentUnitId),
        updatedAt: task.updatedAt,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

export interface StuckPersonGroup {
  assigneeId: string | null;
  label: string;
  count: number;
  hotCount: number;
  longestLabel: string;
}

export function groupStuckByPerson(rows: StuckTaskRow[]): StuckPersonGroup[] {
  const map = new Map<string, StuckTaskRow[]>();
  rows.forEach((row) => {
    const key = row.assigneeId ?? "none";
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  });

  return [...map.entries()]
    .map(([, list]) => {
      const longest = list[0];
      return {
        assigneeId: longest.assigneeId,
        label: longest.assigneeLabel,
        count: list.length,
        hotCount: list.filter((item) => item.isHot).length,
        longestLabel: longest.durationLabel,
      };
    })
    .sort((a, b) => b.hotCount - a.hotCount || b.count - a.count);
}

export type Punctuality =
  | "done_on_time"
  | "done_late"
  | "open_on_time"
  | "overdue";

export const PUNCTUALITY_LABELS: Record<Punctuality, string> = {
  done_on_time: "Сдана в срок",
  done_late: "Сдана с опозданием",
  open_on_time: "Срок ещё идёт",
  overdue: "Просрочена",
};

export interface PersonTaskReport {
  id: string;
  title: string;
  projectName: string;
  formatLabel: string;
  stageLabel: string;
  isReturned: boolean;
  returnComment?: string;
  startedLabel: string;
  dueLabel: string;
  finishedLabel: string | null;
  durationLabel: string;
  verdict: Punctuality;
  verdictLabel: string;
  href: string;
}

export function getStageDueAt(
  startedAt: string,
  stage: WorkflowStage,
  project?: Project
): number {
  return new Date(createStageDueAt(stage, new Date(startedAt), project)).getTime();
}

function getPunctuality(
  isDone: boolean,
  finishedAt: number,
  dueAt: number
): Punctuality {
  if (isDone) return finishedAt <= dueAt ? "done_on_time" : "done_late";
  return finishedAt <= dueAt ? "open_on_time" : "overdue";
}

export function getPersonTaskReports(
  userId: string,
  tasks: ProductionTask[],
  projects: Project[],
  now = Date.now()
): PersonTaskReport[] {
  const assigneeId = userId === "none" ? null : userId;

  return tasks
    .filter((task) =>
      assigneeId === null ? !task.assigneeId : task.assigneeId === assigneeId
    )
    .map((task) => {
      const isDone = task.status === "done";
      const startedAt = isDone ? task.createdAt : task.updatedAt;
      const dueAt = task.dueAt
        ? new Date(task.dueAt).getTime()
        : getStageDueAt(
            startedAt,
            task.currentStage,
            projects.find((item) => item.id === task.projectId)
          );
      const finishedAt = isDone ? new Date(task.updatedAt).getTime() : now;
      const hours = Math.max(0, (finishedAt - new Date(startedAt).getTime()) / 3_600_000);
      const verdict = getPunctuality(isDone, finishedAt, dueAt);

      return {
        id: task.id,
        title: task.title,
        projectName:
          projects.find((project) => project.id === task.projectId)?.name ??
          task.projectId,
        formatLabel: FORMAT_LABELS[task.format],
        stageLabel: getStageLabel(task.currentStage),
        isReturned: task.status === "returned",
        returnComment: task.returnComment,
        startedLabel: formatDate(startedAt),
        dueLabel: formatTaskDeadline(new Date(dueAt)),
        finishedLabel: isDone ? formatDate(task.updatedAt) : null,
        durationLabel: formatStuckDuration(hours),
        verdict,
        verdictLabel: PUNCTUALITY_LABELS[verdict],
        href: getRoleWorkspaceHref(task.projectId, task.contentUnitId),
      };
    })
    .sort((a, b) => {
      const rank: Record<Punctuality, number> = {
        overdue: 0,
        done_late: 1,
        open_on_time: 2,
        done_on_time: 3,
      };
      return rank[a.verdict] - rank[b.verdict];
    });
}

export function countVerdicts(reports: PersonTaskReport[]) {
  return {
    onTime: reports.filter((item) => item.verdict === "done_on_time").length,
    late: reports.filter((item) => item.verdict === "done_late").length,
    overdue: reports.filter((item) => item.verdict === "overdue").length,
    open: reports.filter((item) => item.verdict === "open_on_time").length,
  };
}

export function getPersonHref(assigneeId: string | null): string {
  return `/stuck/${assigneeId ?? "none"}`;
}

export function groupTrackerByPerson(
  tasks: ProductionTask[],
  users: User[],
  now = Date.now()
): StuckPersonGroup[] {
  const active = getStuckTaskRows(tasks, users, now);
  const map = new Map<
    string,
    {
      assigneeId: string | null;
      label: string;
      total: number;
      active: StuckTaskRow[];
    }
  >();

  tasks.forEach((task) => {
    const key = task.assigneeId ?? "none";
    const current = map.get(key);
    if (current) {
      current.total += 1;
      return;
    }
    map.set(key, {
      assigneeId: task.assigneeId,
      label: getAssigneeName(task.assigneeId, users),
      total: 1,
      active: [],
    });
  });

  active.forEach((row) => {
    const key = row.assigneeId ?? "none";
    const current = map.get(key);
    if (current) current.active.push(row);
  });

  return [...map.values()]
    .map((entry) => ({
      assigneeId: entry.assigneeId,
      label: entry.label,
      count: entry.total,
      hotCount: entry.active.filter((item) => item.isHot).length,
      longestLabel: entry.active[0]?.durationLabel ?? "все сданы",
    }))
    .sort((a, b) => b.hotCount - a.hotCount || b.count - a.count);
}
