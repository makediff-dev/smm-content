"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import {
  createProductionTaskForContent,
  useWorkflowStore,
} from "@/stores/workflow-store";

export function useCreateContentWithWorkflow(projectId: string) {
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const createTask = useWorkflowStore((s) => s.createTask);
  const users = useAuthStore((s) => s.users);

  return useCallback(() => {
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
        users
      );
    }

    return contentId;
  }, [projectId, createContentUnit, getContentUnit, createTask, users]);
}
