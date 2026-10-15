import type {
  ContentFormat,
  ContentPlanSlot,
  ProductionTask,
  User,
} from "@/types";
import { FORMAT_LABELS } from "@/types";
import { isAdminRole, isManagementRole } from "@/lib/roles";
import { getPreviousStages, getStageLabel, stageToRole } from "@/lib/workflow";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import { toDateKey } from "@/lib/content-plan";

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
  timeLabel: string | null;
}

export function getHomeTasksForUser(
  user: User,
  tasks: ProductionTask[]
): ProductionTask[] {
  const active = tasks.filter((task) => task.status !== "done");

  if (isAdminRole(user.role)) {
    return active;
  }

  if (isManagementRole(user.role)) {
    return active.filter(
      (task) => stageToRole(task.currentStage) === user.role
    );
  }

  return active.filter(
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

function formatSlotTime(iso: string): string {
  const date = new Date(iso);
  const today = toDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateKey(tomorrowDate);
  const key = toDateKey(date);

  if (key === tomorrow) return "завтра";
  if (key === today) {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function buildHomeQueueItems(
  tasks: ProductionTask[],
  slots: ContentPlanSlot[]
): HomeQueueItem[] {
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "returned" && b.status !== "returned") return -1;
    if (a.status !== "returned" && b.status === "returned") return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return sorted.map((task) => {
    const slot = slots.find((item) => item.contentUnitId === task.contentUnitId);

    return {
      id: task.id,
      title: task.title,
      fromLabel: getSenderLabel(task),
      formatLabel: SHORT_FORMAT_LABELS[task.format] ?? FORMAT_LABELS[task.format],
      isReturned: task.status === "returned",
      href: getTaskOpenHref(task),
      timeLabel: slot ? formatSlotTime(slot.scheduledAt) : null,
    };
  });
}
