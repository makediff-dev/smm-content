"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QueueTask, QueueTaskType, TaskStatus } from "@/types";
import { SEED_QUEUE } from "@/data/seed";
import { mergeSeedQueue } from "@/lib/seed-sync";
import { generateId } from "@/lib/simulate-generation";

interface QueueState {
  tasks: QueueTask[];
  addTask: (task: Omit<QueueTask, "id" | "createdAt">) => string;
  updateTask: (id: string, data: Partial<QueueTask>) => void;
  retryTask: (id: string) => void;
  getTasksForUser: (userId: string, isAdmin: boolean) => QueueTask[];
  getTasksForProject: (projectId: string) => QueueTask[];
  getQueuedCount: () => number;
  getActiveCountForUser: (userId: string, isAdmin: boolean) => number;
  resetTasks: () => void;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      tasks: SEED_QUEUE,

      addTask: (taskData) => {
        const id = generateId("queue");
        const task: QueueTask = {
          ...taskData,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, data) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      retryTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status: "queued" as TaskStatus } : t
          ),
        }));
      },

      getTasksForUser: (userId, isAdmin) => {
        if (isAdmin) return get().tasks;
        return get().tasks.filter((t) => t.managerId === userId);
      },

      getTasksForProject: (projectId) =>
        get().tasks.filter((t) => t.projectId === projectId),

      getQueuedCount: () =>
        get().tasks.filter(
          (t) => t.status === "queued" || t.status === "in_progress"
        ).length,

      getActiveCountForUser: (userId, isAdmin) =>
        get()
          .getTasksForUser(userId, isAdmin)
          .filter(
            (task) =>
              task.status === "queued" ||
              task.status === "in_progress" ||
              task.status === "error"
          ).length,

      resetTasks: () => set({ tasks: SEED_QUEUE }),
    }),
    {
      name: "smm-queue",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<QueueState> | undefined;
        return {
          ...currentState,
          ...persisted,
          tasks: mergeSeedQueue(persisted?.tasks),
        };
      },
    }
  )
);

export function createQueueTaskForType(
  type: QueueTaskType,
  projectId: string,
  managerId: string,
  contentUnitId: string,
  label: string
): Omit<QueueTask, "id" | "createdAt"> {
  return {
    type,
    status: "queued",
    projectId,
    managerId,
    contentUnitId,
    label,
  };
}
