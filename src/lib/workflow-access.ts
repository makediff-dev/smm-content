import type {
  CardsPhase,
  ContentFormat,
  ProductionTask,
  User,
  UserRole,
  WizardStep,
  WorkflowStage,
} from "@/types";
import { isManagementRole } from "@/lib/roles";
import { getPreviousStages, stageToRole } from "@/lib/workflow";
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
  if (cards.length === 0) return stage === "designer" ? "edit" : "phrases";
  if (cards.every((card) => card.imageUrl)) return "images";
  if (stage === "designer") return "images";
  return "phrases";
}

export function isWorkflowOversightRole(role: UserRole): boolean {
  return isManagementRole(role);
}

export function isWorkflowPrivilegedRole(role: UserRole): boolean {
  return isManagementRole(role);
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

  if (isManagementRole(user.role)) return true;

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

  if (isManagementRole(user.role)) return true;

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

  if (isManagementRole(user.role)) return true;

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
  if (isManagementRole(user.role)) return true;
  if (!isTaskAssignee(user, task)) return false;
  return user.role === stageToRole(stage) && task.currentStage === stage;
}

export function canUserApproveWorkflowTask(
  user: User | null | undefined,
  task: ProductionTask
): boolean {
  if (!user || task.status === "done") return false;
  if (isManagementRole(user.role)) return true;
  if (!isUserResponsibleForTaskStage(user, task)) return false;
  return user.role === stageToRole(task.currentStage);
}

export function canUserReturnWorkflowTask(
  user: User | null | undefined,
  task: ProductionTask
): boolean {
  if (!user || task.status === "done") return false;

  if (isManagementRole(user.role)) {
    return getPreviousStages(task.format, task.currentStage).length > 0;
  }

  if (!isUserResponsibleForTaskStage(user, task)) return false;
  if (user.role !== "editor") return false;
  return task.currentStage === "editor";
}

export function getReturnTargetStages(
  user: User,
  task: ProductionTask
): WorkflowStage[] {
  const previousStages = getPreviousStages(task.format, task.currentStage);

  if (user.role === "editor" && task.currentStage === "editor") {
    return previousStages.filter(
      (stage) => stage === "copywriter" || stage === "designer"
    );
  }

  return previousStages;
}

export function getWizardStepForStage(
  stage: WorkflowStage,
  format: ContentFormat
): WizardStep {
  if (stage === "project_manager" || stage === "posting_manager") {
    return "result";
  }

  if (stage === "designer" && format !== "text") {
    return "cards";
  }

  if (stage === "editor" && format === "slideshow") {
    return "text";
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
