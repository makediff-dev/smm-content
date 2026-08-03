"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import {
  canUserEditWizardStep,
  isWorkflowOversightRole,
} from "@/lib/workflow-access";
import { getStageLabel } from "@/lib/workflow";
import type { WizardStep } from "@/types";

export function useWizardAccess(contentId: string, step: WizardStep) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentId));
  const format = useWizardStore((s) => s.format);
  const formatConfirmed = useWizardStore((s) => s.formatConfirmed);

  const canEdit = canUserEditWizardStep(currentUser, task, step, format, {
    formatConfirmed,
  });

  const isPrivileged = currentUser
    ? isWorkflowOversightRole(currentUser.role)
    : false;

  return {
    canEdit,
    readOnly: !canEdit,
    task,
    currentUser,
    isPrivileged,
    currentStageLabel: task ? getStageLabel(task.currentStage) : null,
  };
}
