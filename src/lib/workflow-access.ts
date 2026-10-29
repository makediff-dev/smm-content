import {
  formatUsesCards,
  type CardsPhase,
  type ContentFormat,
  type ProductionTask,
  type User,
  type UserRole,
  type WizardStep,
  type WorkflowStage,
} from "@/types";
import { isAdminRole, isManagementRole } from "@/lib/roles";
import {
  getMoveTargetStages,
  getPreviousStages,
  stageToRole,
} from "@/lib/workflow";
import { isWaitingForReturnedFix } from "@/lib/role-workspace";
import {
  type BuildCapability,
  canEditCardsPhaseForStage,
  canUseBuildCapabilityForStage,
  getEditableWizardSteps,
  getStageStepAccess,
} from "@/lib/workflow-spec";

export function getInitialCardsPhaseForStage(
  stage: WorkflowStage | undefined,
  cards: { imageUrl?: string }[]
): CardsPhase {
  if (stage === "designer") return "images";
  if (stage === "copywriter") {
    return cards.length === 0 ? "phrases" : "edit";
  }
  if (stage === "editor") {
    return cards.length === 0 ? "phrases" : "edit";
  }
  if (cards.length === 0) return "phrases";
  if (cards.every((card) => card.imageUrl)) return "images";
  return "phrases";
}

export function isWorkflowOversightRole(role: UserRole): boolean {
  return isAdminRole(role);
}

export function isWorkflowPrivilegedRole(role: UserRole): boolean {
  return isAdminRole(role);
}

function isTaskAssignee(user: User, task: ProductionTask | undefined): boolean {
  if (!task?.assigneeId) return true;
  return task.assigneeId === user.id;
}

function isUserResponsibleForTaskStage(
  user: User,
  task: ProductionTask
): boolean {
  return (
    isTaskAssignee(user, task) &&
    user.role === stageToRole(task.currentStage)
  );
}

function canEditFormatStep(
  user: User,
  task: ProductionTask | undefined,
  formatConfirmed?: boolean
): boolean {
  if (formatConfirmed) return false;
  if (!task) return user.role === "copywriter";
  if (task.status === "done") return false;
  return (
    task.currentStage === "copywriter" &&
    user.role === "copywriter" &&
    isTaskAssignee(user, task)
  );
}

export function getWizardStepsForStage(
  stage: WorkflowStage,
  format: ContentFormat
): WizardStep[] {
  if (isManagementRole(stage as UserRole)) {
    return getEditableWizardSteps("project_manager", format);
  }

  return getEditableWizardSteps(stage, format);
}

export function canUserEditWizardStep(
  user: User | null | undefined,
  task: ProductionTask | undefined,
  step: WizardStep,
  format: ContentFormat,
  options?: {
    cardsPhase?: CardsPhase;
    formatConfirmed?: boolean;
  }
): boolean {
  if (!user) return false;

  if (isAdminRole(user.role)) return true;

  if (step === "format") {
    return canEditFormatStep(user, task, options?.formatConfirmed);
  }

  if (!task || task.status === "done") return false;
  if (!isUserResponsibleForTaskStage(user, task)) return false;

  const editableSteps = getEditableWizardSteps(task.currentStage, format);
  if (!editableSteps.includes(step)) return false;

  return true;
}

export function canUserEditCardsPhase(
  user: User | null | undefined,
  task: ProductionTask | undefined,
  format: ContentFormat,
  phase: CardsPhase
): boolean {
  if (!user || !task || task.status === "done") return false;

  if (isAdminRole(user.role)) return true;

  if (!isUserResponsibleForTaskStage(user, task)) return false;

  const editableSteps = getEditableWizardSteps(task.currentStage, format);
  if (!editableSteps.includes("cards")) return false;

  return canEditCardsPhaseForStage(task.currentStage, format, phase);
}

export function canUserUseBuildCapability(
  user: User | null | undefined,
  task: ProductionTask | undefined,
  format: ContentFormat,
  capability: BuildCapability
): boolean {
  if (!user || !task || task.status === "done") return false;

  if (isAdminRole(user.role)) return true;

  if (!isUserResponsibleForTaskStage(user, task)) return false;

  return canUseBuildCapabilityForStage(
    task.currentStage,
    format,
    capability
  );
}

export function canUserActOnWorkflowStage(
  user: User | null | undefined,
  task: ProductionTask | undefined,
  stage: WorkflowStage
): boolean {
  if (!user || !task) return false;
  if (isAdminRole(user.role)) return true;
  if (!isTaskAssignee(user, task)) return false;
  return user.role === stageToRole(stage) && task.currentStage === stage;
}

export function canUserApproveWorkflowTask(
  user: User | null | undefined,
  task: ProductionTask
): boolean {
  if (!user || task.status === "done") return false;
  if (isAdminRole(user.role)) return true;
  if (isWaitingForReturnedFix(user, task)) return false;
  if (
    task.currentStage === "copywriter" &&
    user.role === "project_manager"
  ) {
    return true;
  }
  if (!isUserResponsibleForTaskStage(user, task)) return false;
  return user.role === stageToRole(task.currentStage);
}

export function canUserReturnWorkflowTask(
  user: User | null | undefined,
  task: ProductionTask
): boolean {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (task.status === "done") return false;
  if (isWaitingForReturnedFix(user, task)) return false;

  if (
    task.currentStage === "copywriter" &&
    user.role === "project_manager"
  ) {
    return true;
  }

  if (!isUserResponsibleForTaskStage(user, task)) return false;
  if (user.role !== stageToRole(task.currentStage)) return false;

  return getReturnTargetStages(user, task).length > 0;
}

export function getReturnTargetStages(
  user: User,
  task: ProductionTask
): WorkflowStage[] {
  if (isAdminRole(user.role)) {
    return getMoveTargetStages(task.format, task.currentStage);
  }

  return getPreviousStages(task.format, task.currentStage, {
    designApproved: task.designApproved,
  }).filter((stage) => stage !== "posting_manager");
}

export function getWizardStepForStage(
  stage: WorkflowStage,
  format: ContentFormat
): WizardStep {
  if (stage === "project_manager" || stage === "posting_manager") {
    return "result";
  }

  if (stage === "designer") {
    return "cards";
  }

  if (stage === "editor") {
    return format === "video_meme" ? "text" : "cards";
  }

  const steps = getWizardStepsForStage(stage, format);
  return steps[0] ?? "source";
}

export function getStageAccessDescription(
  stage: WorkflowStage,
  format: ContentFormat
): string {
  return getStageStepAccess(stage, format).description;
}

export function canUserDownloadResult(
  user: User | null | undefined,
  task: ProductionTask | undefined
): boolean {
  if (!user || !task) return false;
  if (isManagementRole(user.role)) return true;
  if (task.status === "done") return true;
  return (
    task.currentStage === "posting_manager" &&
    user.role === "posting_manager" &&
    isTaskAssignee(user, task)
  );
}
