"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  ContentFormat,
  ContentPlanScenario,
  NotificationKind,
  ProductionTask,
  User,
  UserRole,
  WorkflowStage,
} from "@/types";
import { SEED_WORKFLOW_TASKS } from "@/data/seed";
import { mergeSeedWorkflowTasks } from "@/lib/seed-sync";
import { canAccessProject, canCreateProductionTask, isAdminRole } from "@/lib/roles";
import {
  canUserApproveWorkflowTask,
  canUserReturnWorkflowTask,
} from "@/lib/workflow-access";
import { generateId } from "@/lib/simulate-generation";
import { arrivalDrafts } from "@/lib/arrival-notifications";
import { createStageDueAt } from "@/lib/task-deadline";
import { buildOverdueNotificationDrafts } from "@/lib/overdue-notifications";
import { useProjectsStore } from "@/stores/projects-store";
import {
  getFormatPath,
  getDesignApprovedForPathIndex,
  getPersonStageForPathIndex,
  isAiPathCurrent,
  type AdminPathTarget,
} from "@/lib/format-paths";
import {
  findAssigneeForStage,
  getDesignApprovedAfterMove,
  getNextStage,
  getStageLabel,
  stageToRole,
} from "@/lib/workflow";

interface WorkflowState {
  tasks: ProductionTask[];
  notifications: AppNotification[];
  getTaskByContentId: (contentUnitId: string) => ProductionTask | undefined;
  getTasksForUser: (user: User) => ProductionTask[];
  getAllActiveTasks: () => ProductionTask[];
  getActiveCountForUser: (user: User) => number;
  approveStage: (
    taskId: string,
    user: User,
    users: User[],
    onLog?: (contentUnitId: string, message: string, userName: string) => void
  ) => void;
  returnStage: (
    taskId: string,
    targetStage: WorkflowStage,
    comment: string,
    user: User,
    users: User[],
    onLog?: (contentUnitId: string, message: string, userName: string) => void
  ) => void;
  moveStage: (
    taskId: string,
    targetStage: WorkflowStage,
    user: User,
    users: User[],
    onLog?: (contentUnitId: string, message: string, userName: string) => void
  ) => void;
  moveAlongPath: (
    taskId: string,
    target: AdminPathTarget,
    user: User,
    users: User[],
    onLog?: (contentUnitId: string, message: string, userName: string) => void,
    comment?: string
  ) => void;
  createTask: (
    data: Omit<
      ProductionTask,
      "id" | "createdAt" | "updatedAt" | "assigneeId" | "status"
    >,
    users: User[],
    actor?: User
  ) => string;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  notifyOverdueTasks: (users: User[]) => void;
  getUnreadCount: (userId: string) => number;
  getNotificationsForUser: (userId: string) => AppNotification[];
  resetWorkflow: () => void;
}

function dueAtForStage(projectId: string, stage: WorkflowStage, from = new Date()) {
  const project = useProjectsStore.getState().getProject(projectId);
  return createStageDueAt(stage, from, project);
}

function pushNotification(
  notifications: AppNotification[],
  data: Omit<AppNotification, "id" | "read" | "createdAt">
): AppNotification[] {
  const notification: AppNotification = {
    ...data,
    id: generateId("notif"),
    read: false,
    createdAt: new Date().toISOString(),
  };
  return [notification, ...notifications];
}

function pushArrivalNotifications(
  notifications: AppNotification[],
  params: {
    users: User[];
    projectId: string;
    assigneeId: string | null;
    taskId: string;
    contentUnitId: string;
    title: string;
    kind: NotificationKind;
    assigneeMessage: string;
    managerMessage: string;
  }
): AppNotification[] {
  let next = notifications;
  for (const draft of arrivalDrafts(params)) {
    next = pushNotification(next, draft);
  }
  return next;
}

function syncWorkflowState(
  state: Pick<WorkflowState, "tasks" | "notifications">
) {
  return {
    tasks: mergeSeedWorkflowTasks(state.tasks),
    notifications: state.notifications ?? [],
  };
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      tasks: SEED_WORKFLOW_TASKS,
      notifications: [],

      getTaskByContentId: (contentUnitId) =>
        get().tasks.find((task) => task.contentUnitId === contentUnitId),

      getTasksForUser: (user) => {
        const { tasks } = get();
        if (isAdminRole(user.role)) {
          return tasks.filter((task) => task.status !== "done");
        }

        return tasks.filter(
          (task) =>
            task.status !== "done" &&
            canAccessProject(user, task.projectId) &&
            !isAiPathCurrent(task.format, task.currentStage, task.currentPathId) &&
            user.role === stageToRole(task.currentStage)
        );
      },

      getAllActiveTasks: () =>
        get()
          .tasks.filter((task) => task.status !== "done")
          .slice()
          .sort((a, b) => {
            if (a.status === "returned" && b.status !== "returned") return -1;
            if (a.status !== "returned" && b.status === "returned") return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }),

      getActiveCountForUser: (user) => get().getTasksForUser(user).length,

      approveStage: (taskId, user, users, onLog) => {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;

        const nextStage = getNextStage(task.format, task.currentStage, {
          designApproved: task.designApproved,
          returnedByStage: task.returnedByStage,
        });
        const designApproved =
          task.currentStage === "designer" ? true : task.designApproved;
        const now = new Date().toISOString();
        const stageLabel = getStageLabel(task.currentStage);

        if (!nextStage) {
          set((state) => ({
            tasks: state.tasks.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    status: "done" as const,
                    currentPathId: undefined,
                    returnComment: undefined,
                    returnToStage: undefined,
                    returnedByUserId: undefined,
                    returnedByStage: undefined,
                    updatedAt: now,
                  }
                : item
            ),
          }));
          onLog?.(
            task.contentUnitId,
            `${stageLabel}: этап подтверждён, производство завершено`,
            user.name
          );
          return;
        }

        const assigneeId = findAssigneeForStage(nextStage, task.projectId, users);
        const nextLabel = getStageLabel(nextStage);

        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  currentStage: nextStage,
                  currentPathId: undefined,
                  designApproved,
                  assigneeId,
                  status: "in_progress" as const,
                  returnComment: undefined,
                  returnToStage: undefined,
                  returnedByUserId: undefined,
                  returnedByStage: undefined,
                  updatedAt: now,
                  dueAt: dueAtForStage(task.projectId, nextStage),
                }
              : item
          ),
          notifications: pushArrivalNotifications(state.notifications, {
            users,
            projectId: task.projectId,
            assigneeId,
            taskId: task.id,
            contentUnitId: task.contentUnitId,
            title: task.title,
            kind: "assignment",
            assigneeMessage: `Новая задача на этапе «${nextLabel}»`,
            managerMessage: `Исполнителю поступила задача «${task.title}» на этапе «${nextLabel}»`,
          }),
        }));

        onLog?.(
          task.contentUnitId,
          `${stageLabel}: этап подтверждён → ${nextLabel}`,
          user.name
        );
      },

      returnStage: (taskId, targetStage, comment, user, users, onLog) => {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;

        const assigneeId = findAssigneeForStage(
          targetStage,
          task.projectId,
          users
        );
        const now = new Date().toISOString();
        const targetLabel = getStageLabel(targetStage);

        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  currentStage: targetStage,
                  currentPathId: undefined,
                  designApproved:
                    targetStage === "copywriter"
                      ? false
                      : targetStage === "designer" ||
                          (targetStage === "editor" && task.currentStage === "designer")
                        ? true
                        : task.designApproved,
                  assigneeId,
                  status: "returned" as const,
                  returnComment: comment,
                  returnToStage: targetStage,
                  returnedByUserId: user.id,
                  returnedByStage: task.currentStage,
                  updatedAt: now,
                  dueAt: dueAtForStage(task.projectId, targetStage),
                }
              : item
          ),
          notifications: pushArrivalNotifications(state.notifications, {
            users,
            projectId: task.projectId,
            assigneeId,
            taskId: task.id,
            contentUnitId: task.contentUnitId,
            title: task.title,
            kind: "return",
            assigneeMessage: `Возврат на этап «${targetLabel}»: ${comment}`,
            managerMessage: `Задачу «${task.title}» вернули на этап «${targetLabel}»`,
          }),
        }));

        onLog?.(
          task.contentUnitId,
          `Возврат на этап «${targetLabel}»: ${comment}`,
          user.name
        );

        if (targetStage === task.currentStage) {
          window.setTimeout(() => {
            set((state) => ({
              tasks: state.tasks.map((item) =>
                item.id === taskId &&
                item.status === "returned" &&
                item.returnedByUserId === user.id
                  ? {
                      ...item,
                      status: "in_progress" as const,
                      returnedByUserId: undefined,
                      returnedByStage: undefined,
                      updatedAt: new Date().toISOString(),
                    }
                  : item
              ),
            }));
          }, 1600);
        }
      },

      moveStage: (taskId, targetStage, user, users, onLog) => {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task || task.currentStage === targetStage) return;
        if (!isAdminRole(user.role)) return;

        const assigneeId = findAssigneeForStage(
          targetStage,
          task.projectId,
          users
        );
        const now = new Date().toISOString();
        const fromLabel = getStageLabel(task.currentStage);
        const toLabel = getStageLabel(targetStage);
        const movingForward =
          getNextStage(task.format, task.currentStage, {
            designApproved: task.designApproved,
            returnedByStage: task.returnedByStage,
          }) === targetStage;

        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  currentStage: targetStage,
                  designApproved: getDesignApprovedAfterMove(
                    task.currentStage,
                    targetStage,
                    task.designApproved,
                    movingForward
                  ),
                  assigneeId,
                  status: "in_progress" as const,
                  returnComment: undefined,
                  returnToStage: undefined,
                  returnedByUserId: undefined,
                  returnedByStage: undefined,
                  updatedAt: now,
                  dueAt: dueAtForStage(task.projectId, targetStage),
                }
              : item
          ),
          notifications: pushArrivalNotifications(state.notifications, {
            users,
            projectId: task.projectId,
            assigneeId,
            taskId: task.id,
            contentUnitId: task.contentUnitId,
            title: task.title,
            kind: "move",
            assigneeMessage: `Задачу перенесли на этап «${toLabel}»`,
            managerMessage: `Задачу «${task.title}» перенесли на этап «${toLabel}»`,
          }),
        }));

        onLog?.(
          task.contentUnitId,
          `Админ: ${fromLabel} → ${toLabel}`,
          user.name
        );
      },

      moveAlongPath: (taskId, target, user, users, onLog, comment) => {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;
        if (!isAdminRole(user.role)) return;
        const note = comment?.trim() || undefined;

        const fromLabel =
          getFormatPath(task.format).find((step) => step.id === task.currentPathId)
            ?.label ?? getStageLabel(task.currentStage);
        const noteSuffix = note ? `: ${note}` : "";

        if (target.type === "posting") {
          const postingAssigneeId = findAssigneeForStage(
            "posting_manager",
            task.projectId,
            users
          );
          set((state) => ({
            tasks: state.tasks.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    currentStage: "posting_manager" as const,
                    currentPathId: undefined,
                    designApproved: true,
                    assigneeId: postingAssigneeId,
                    status: "in_progress" as const,
                    returnComment: note,
                    returnToStage: undefined,
                    returnedByUserId: undefined,
                    returnedByStage: undefined,
                    updatedAt: new Date().toISOString(),
                    dueAt: dueAtForStage(task.projectId, "posting_manager"),
                  }
                : item
            ),
            notifications: pushArrivalNotifications(state.notifications, {
              users,
              projectId: task.projectId,
              assigneeId: postingAssigneeId,
              taskId: task.id,
              contentUnitId: task.contentUnitId,
              title: task.title,
              kind: "move",
              assigneeMessage: `Задачу перенесли на этап «Менеджер постинга»${noteSuffix}`,
              managerMessage: `Задачу «${task.title}» перенесли на этап «Менеджер постинга»${noteSuffix}`,
            }),
          }));
          onLog?.(
            task.contentUnitId,
            `Админ: ${fromLabel} → Менеджер постинга${noteSuffix}`,
            user.name
          );
          return;
        }

        const nextStage = getPersonStageForPathIndex(task.format, target.index);
        const assigneeId =
          target.step.kind === "ai"
            ? null
            : findAssigneeForStage(nextStage, task.projectId, users);
        const toLabel = target.step.label;
        const now = new Date().toISOString();

        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  currentStage: nextStage,
                  currentPathId: target.step.id,
                  designApproved: getDesignApprovedForPathIndex(
                    task.format,
                    target.index
                  ),
                  assigneeId,
                  status: "in_progress" as const,
                  returnComment: note,
                  returnToStage: undefined,
                  returnedByUserId: undefined,
                  returnedByStage: undefined,
                  updatedAt: now,
                  dueAt: dueAtForStage(task.projectId, nextStage),
                }
              : item
          ),
          notifications: pushArrivalNotifications(state.notifications, {
            users,
            projectId: task.projectId,
            assigneeId,
            taskId: task.id,
            contentUnitId: task.contentUnitId,
            title: task.title,
            kind: "move",
            assigneeMessage: `Задачу перенесли на этап «${toLabel}»${noteSuffix}`,
            managerMessage: `Задачу «${task.title}» перенесли на этап «${toLabel}»${noteSuffix}`,
          }),
        }));

        onLog?.(
          task.contentUnitId,
          `Админ: ${fromLabel} → ${toLabel}${noteSuffix}`,
          user.name
        );
      },

      createTask: (data, users, actor) => {
        if (actor && !canCreateProductionTask(actor.role)) return "";
        if (actor && !canAccessProject(actor, data.projectId)) return "";

        const id = generateId("wf");
        const assigneeId = findAssigneeForStage(
          data.currentStage,
          data.projectId,
          users
        );
        const now = new Date().toISOString();
        const task: ProductionTask = {
          ...data,
          id,
          assigneeId,
          status: "in_progress",
          createdAt: now,
          updatedAt: now,
          dueAt: data.dueAt ?? dueAtForStage(data.projectId, data.currentStage),
        };

        set((state) => ({
          tasks: [...state.tasks, task],
          notifications: pushArrivalNotifications(state.notifications, {
            users,
            projectId: data.projectId,
            assigneeId,
            taskId: id,
            contentUnitId: data.contentUnitId,
            title: data.title,
            kind: "assignment",
            assigneeMessage: `Новая задача на этапе «${getStageLabel(data.currentStage)}»`,
            managerMessage: `Исполнителю поступила задача «${data.title}» на этапе «${getStageLabel(data.currentStage)}»`,
          }),
        }));

        return id;
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        }));
      },

      markAllNotificationsRead: (userId) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.userId === userId ? { ...item, read: true } : item
          ),
        }));
      },

      notifyOverdueTasks: (users) => {
        const { tasks, notifications } = get();
        const drafts = buildOverdueNotificationDrafts(
          tasks,
          notifications,
          users
        );
        if (drafts.length === 0) return;

        set((state) => {
          let next = state.notifications;
          for (const draft of drafts) {
            if (
              next.some(
                (item) =>
                  item.kind === "overdue" &&
                  item.taskId === draft.taskId &&
                  item.dueAt === draft.dueAt &&
                  item.userId === draft.userId
              )
            ) {
              continue;
            }
            next = pushNotification(next, draft);
          }
          return next === state.notifications ? state : { notifications: next };
        });
      },

      getUnreadCount: (userId) =>
        get().notifications.filter((item) => item.userId === userId && !item.read)
          .length,

      getNotificationsForUser: (userId) =>
        get()
          .notifications.filter((item) => item.userId === userId)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),

      resetWorkflow: () =>
        set({ tasks: SEED_WORKFLOW_TASKS, notifications: [] }),
    }),
    {
      name: "smm-workflow",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Pick<
          WorkflowState,
          "tasks" | "notifications"
        >;
        return syncWorkflowState(state);
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const synced = syncWorkflowState(state);
        state.tasks = synced.tasks;
      },
    }
  )
);

export function createProductionTaskForContent(
  contentUnitId: string,
  projectId: string,
  format: ContentFormat,
  title: string,
  scenario: ContentPlanScenario = "scheduled"
): Omit<
  ProductionTask,
  "id" | "createdAt" | "updatedAt" | "assigneeId" | "status"
> {
  return {
    contentUnitId,
    projectId,
    format,
    scenario,
    title,
    currentStage: "copywriter",
  };
}

export function canUserApproveTask(user: User, task: ProductionTask): boolean {
  return canUserApproveWorkflowTask(user, task);
}

export function canUserReturnTask(user: User, task: ProductionTask): boolean {
  return canUserReturnWorkflowTask(user, task);
}
