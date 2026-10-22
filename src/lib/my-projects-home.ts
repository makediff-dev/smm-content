import type { ContentFormat, ProductionTask, User } from "@/types";
import { FORMAT_LABELS } from "@/types";
import { canAccessProject, isAdminRole, isManagementRole } from "@/lib/roles";
import { getPreviousStages, getStageLabel, stageToRole } from "@/lib/workflow";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import {
  formatTaskDeadlineLabel,
  getDeadlineTone,
  isTaskDeadlineHot,
  resolveTaskDueAt,
  type DeadlineTone,
} from "@/lib/task-deadline";

const SHORT_FORMAT_LABELS: Record<ContentFormat, string> = {
  gallery: "Галерея",
  slideshow: "Слайд-шоу",
  text: "Текстовый пост",
  video_meme: "Видео-мем",
};

export interface HomeQueueItem {
  id: string;
  title: string;
  fromLabel: string;
  formatLabel: string;
  isReturned: boolean;
  href: string;
  timeLabel: string;
  deadlineHot: boolean;
  deadlineTone: DeadlineTone;
}

export function getHomeTasksForUser(
  user: User,
  tasks: ProductionTask[]
): ProductionTask[] {
  const active = tasks.filter((task) => task.status !== "done");

  if (isAdminRole(user.role)) {
    return active;
  }

  const inProjects = active.filter((task) =>
    canAccessProject(user, task.projectId)
  );

  if (isManagementRole(user.role)) {
    return inProjects.filter(
      (task) => stageToRole(task.currentStage) === user.role
    );
  }

  return inProjects.filter(
    (task) =>
      task.assigneeId === user.id &&
      stageToRole(task.currentStage) === user.role
  );
}

export function getSenderLabel(task: ProductionTask): string {
  if (task.status === "returned") {
    const previous = getPreviousStages(task.format, task.currentStage, {
      designApproved: task.designApproved,
    });
    const fromStage = previous[previous.length - 1];
    if (fromStage) return getStageLabel(fromStage);
    return "Проверка";
  }

  const previous = getPreviousStages(task.format, task.currentStage, {
    designApproved: task.designApproved,
  });
  const fromStage = previous[previous.length - 1];
  if (fromStage) return getStageLabel(fromStage);
  return "Менеджер проекта";
}

export function getTaskOpenHref(task: ProductionTask): string {
  return getRoleWorkspaceHref(task.projectId, task.contentUnitId);
}

export function buildHomeQueueItems(tasks: ProductionTask[]): HomeQueueItem[] {
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "returned" && b.status !== "returned") return -1;
    if (a.status !== "returned" && b.status === "returned") return 1;
    return resolveTaskDueAt(a).getTime() - resolveTaskDueAt(b).getTime();
  });

  return sorted.map((task) => ({
    id: task.id,
    title: task.title,
    fromLabel: getSenderLabel(task),
    formatLabel: SHORT_FORMAT_LABELS[task.format] ?? FORMAT_LABELS[task.format],
    isReturned: task.status === "returned",
    href: getTaskOpenHref(task),
    timeLabel: formatTaskDeadlineLabel(task),
    deadlineHot: isTaskDeadlineHot(task),
    deadlineTone: getDeadlineTone(task),
  }));
}
