"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  ContentFormat,
  ContentPlanScenario,
  ProductionTask,
  User,
  UserRole,
  WorkflowStage,
} from "@/types";
import { SEED_WORKFLOW_TASKS } from "@/data/seed";
import { mergeSeedWorkflowTasks } from "@/lib/seed-sync";
import { isManagementRole } from "@/lib/roles";
import {
  canUserApproveWorkflowTask,
  canUserReturnWorkflowTask,
} from "@/lib/workflow-access";
import { generateId } from "@/lib/simulate-generation";
import {
  findAssigneeForStage,
  getNextStage,
  getStageLabel,
  stageToRole,
} from "@/lib/workflow";

interface WorkflowState {
  tasks: ProductionTask[];
  notifications: AppNotification[];
  getTaskByContentId: (contentUnitId: string) => ProductionTask | undefined;
  getTasksForUser: (user: User) => ProductionTask[];
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
  createTask: (
    data: Omit<
      ProductionTask,
      "id" | "createdAt" | "updatedAt" | "assigneeId" | "status"
    >,
    users: User[]
  ) => string;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;
  getNotificationsForUser: (userId: string) => AppNotification[];
  resetWorkflow: () => void;
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
        if (isManagementRole(user.role)) {
          return tasks.filter((task) => task.status !== "done");
        }

        return tasks.filter(
          (task) =>
            task.status !== "done" &&
            task.assigneeId === user.id &&
            user.role === stageToRole(task.currentStage)
        );
      },

      getActiveCountForUser: (user) => get().getTasksForUser(user).length,

      approveStage: (taskId, user, users, onLog) => {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;

        const nextStage = getNextStage(task.format, task.currentStage);
        const now = new Date().toISOString();
        const stageLabel = getStageLabel(task.currentStage);

        if (!nextStage) {
          set((state) => ({
            tasks: state.tasks.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    status: "done" as const,
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
                  assigneeId,
                  status: "in_progress" as const,
                  returnComment: undefined,
                  returnToStage: undefined,
                  updatedAt: now,
                }
              : item
          ),
          notifications:
            assigneeId != null
              ? pushNotification(state.notifications, {
                  userId: assigneeId,
                  taskId: task.id,
                  contentUnitId: task.contentUnitId,
                  title: task.title,
                  message: `Новая задача на этапе «${nextLabel}»`,
                })
              : state.notifications,
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
                  assigneeId,
                  status: "returned" as const,
                  returnComment: comment,
                  returnToStage: targetStage,
                  updatedAt: now,
                }
              : item
          ),
          notifications:
            assigneeId != null
              ? pushNotification(state.notifications, {
                  userId: assigneeId,
                  taskId: task.id,
                  contentUnitId: task.contentUnitId,
                  title: task.title,
                  message: `Возврат на этап «${targetLabel}»: ${comment}`,
                })
              : state.notifications,
        }));

        onLog?.(
          task.contentUnitId,
          `Возврат на этап «${targetLabel}»: ${comment}`,
          user.name
        );
      },

      createTask: (data, users) => {
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
        };

        set((state) => ({
          tasks: [...state.tasks, task],
          notifications:
            assigneeId != null
              ? pushNotification(state.notifications, {
                  userId: assigneeId,
                  taskId: id,
                  contentUnitId: data.contentUnitId,
                  title: data.title,
                  message: `Новая задача на этапе «${getStageLabel(data.currentStage)}»`,
                })
              : state.notifications,
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
