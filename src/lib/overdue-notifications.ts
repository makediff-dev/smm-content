import type { AppNotification, ProductionTask, User } from "@/types";
import { findProjectManagers } from "@/lib/arrival-notifications";
import { isAiPathCurrent } from "@/lib/format-paths";
import { isTaskOverdue, resolveTaskDueAt } from "@/lib/task-deadline";
import { findAssigneeForStage, getStageLabel } from "@/lib/workflow";

export type OverdueNoticeDraft = Omit<AppNotification, "id" | "read" | "createdAt">;

function workerIdForTask(task: ProductionTask, users: User[]): string | null {
  if (isAiPathCurrent(task.format, task.currentStage, task.currentPathId)) {
    return null;
  }
  if (task.assigneeId) return task.assigneeId;
  return findAssigneeForStage(task.currentStage, task.projectId, users);
}

function recipientIdsForOverdue(
  task: ProductionTask,
  users: User[],
  workerId: string | null
): string[] {
  const ids = new Set<string>();
  if (workerId) ids.add(workerId);
  for (const manager of findProjectManagers(task.projectId, users)) {
    ids.add(manager.id);
  }
  return [...ids];
}

function alreadyNotified(
  notifications: AppNotification[],
  taskId: string,
  dueAt: string,
  userId: string
): boolean {
  return notifications.some(
    (item) =>
      item.kind === "overdue" &&
      item.taskId === taskId &&
      item.dueAt === dueAt &&
      item.userId === userId
  );
}

export function buildOverdueNotificationDrafts(
  tasks: ProductionTask[],
  notifications: AppNotification[],
  users: User[],
  now = new Date()
): OverdueNoticeDraft[] {
  const drafts: OverdueNoticeDraft[] = [];

  for (const task of tasks) {
    if (!isTaskOverdue(task, now)) continue;

    const dueAt = resolveTaskDueAt(task).toISOString();
    const stageLabel = getStageLabel(task.currentStage);
    const workerId = workerIdForTask(task, users);
    const recipientIds = recipientIdsForOverdue(task, users, workerId);

    for (const userId of recipientIds) {
      if (alreadyNotified(notifications, task.id, dueAt, userId)) continue;
      if (
        drafts.some(
          (item) =>
            item.taskId === task.id &&
            item.dueAt === dueAt &&
            item.userId === userId
        )
      ) {
        continue;
      }

      const user = users.find((item) => item.id === userId);
      const isWorker = userId === workerId;
      const isManager = user?.role === "project_manager";
      const message =
        isWorker && !isManager
          ? `Наступил срок вашего этапа «${stageLabel}»`
          : `Наступил срок задачи на этапе «${stageLabel}»`;

      drafts.push({
        userId,
        taskId: task.id,
        contentUnitId: task.contentUnitId,
        title: task.title,
        message,
        kind: "overdue",
        dueAt,
      });
    }
  }

  return drafts;
}
