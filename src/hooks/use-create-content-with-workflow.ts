"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { canCreateProductionTask } from "@/lib/roles";
import {
  createProductionTaskForContent,
  useWorkflowStore,
} from "@/stores/workflow-store";

export function useCreateContentWithWorkflow(projectId: string) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const createTask = useWorkflowStore((s) => s.createTask);
  const users = useAuthStore((s) => s.users);

  return useCallback(() => {
    if (!currentUser || !canCreateProductionTask(currentUser.role)) {
      return "";
    }

    const contentId = createContentUnit(projectId);
    const content = getContentUnit(contentId);

    if (content) {
      createTask(
        createProductionTaskForContent(
          contentId,
          projectId,
          content.format,
          content.title
        ),
        users,
        currentUser
      );
    }

    return contentId;
  }, [
    projectId,
    currentUser,
    createContentUnit,
    getContentUnit,
    createTask,
    users,
  ]);
}
