import type { ContentFormat, User, UserRole, WorkflowStage } from "@/types";
import { getRoleLabel, isAdminRole } from "@/lib/roles";

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  copywriter: "Копирайтер",
  designer: "Дизайнер",
  editor: "Редактор",
  video_editor: "Видеомонтажёр",
  project_manager: "Менеджер проекта",
  posting_manager: "Менеджер постинга",
};

export const WORKFLOW_STAGE_HINTS: Record<WorkflowStage, string> = {
  copywriter: "Источник, текст поста, заголовки карточек / слайдов",
  designer: "Изображения: оценка, скачивание, замена и добавление",
  editor: "Текст, превью слайдов, возврат на доработку",
  video_editor: "Сборка видео, голос, темп, музыка и произношение",
  project_manager: "Итоговая проверка, возврат на любой этап, слот в КП",
  posting_manager: "Готовый пост и скачивание материалов",
};

const GALLERY_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "project_manager",
  "posting_manager",
];

const SLIDESHOW_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "video_editor",
  "project_manager",
  "posting_manager",
];

const TEXT_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "project_manager",
  "posting_manager",
];

const VIDEO_MEME_CHAIN: WorkflowStage[] = [
  "copywriter",
  "project_manager",
  "editor",
  "designer",
];

export function getStageChain(format: ContentFormat): WorkflowStage[] {
  if (format === "slideshow") return SLIDESHOW_CHAIN;
  if (format === "text") return TEXT_CHAIN;
  if (format === "video_meme") return VIDEO_MEME_CHAIN;
  return GALLERY_CHAIN;
}

export function getStageLabel(stage: WorkflowStage): string {
  return WORKFLOW_STAGE_LABELS[stage];
}

export interface StagePathOptions {
  designApproved?: boolean;
}

export function formatHasEditorFinalReview(format: ContentFormat): boolean {
  return format === "gallery" || format === "text";
}

export function isEditorFinalReview(
  format: ContentFormat,
  currentStage: WorkflowStage,
  designApproved?: boolean
): boolean {
  return (
    formatHasEditorFinalReview(format) &&
    currentStage === "editor" &&
    Boolean(designApproved)
  );
}

export function getNextStage(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage | null {
  if (format === "slideshow") {
    if (currentStage === "copywriter") return "editor";
    if (currentStage === "editor") return "designer";
    if (currentStage === "designer") return "video_editor";
    if (currentStage === "video_editor") return "project_manager";
    return null;
  }

  if (format === "video_meme") {
    if (currentStage === "copywriter") return "project_manager";
    if (currentStage === "project_manager") {
      return options?.designApproved ? null : "editor";
    }
    if (currentStage === "editor") return "designer";
    if (currentStage === "designer") return "project_manager";
    return null;
  }

  if (formatHasEditorFinalReview(format)) {
    if (currentStage === "copywriter") return "editor";
    if (currentStage === "editor") {
      return options?.designApproved ? "project_manager" : "designer";
    }
    if (currentStage === "designer") return "editor";
    if (currentStage === "project_manager") return null;
  }

  const chain = getStageChain(format);
  const index = chain.indexOf(currentStage);
  if (index === -1 || index >= chain.length - 1) return null;
  const next = chain[index + 1];
  if (next === "posting_manager") return null;
  return next;
}

export function getPreviousStages(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage[] {
  if (format === "slideshow") {
    if (currentStage === "editor") return ["copywriter"];
    if (currentStage === "designer") return ["copywriter", "editor"];
    if (currentStage === "video_editor") {
      return ["copywriter", "editor", "designer"];
    }
    if (currentStage === "project_manager") {
      return ["copywriter", "editor", "designer", "video_editor"];
    }
    return [];
  }

  if (format === "video_meme") {
    if (currentStage === "project_manager" && options?.designApproved) {
      return ["copywriter", "project_manager", "editor", "designer"];
    }
    if (currentStage === "project_manager") return ["copywriter"];
    if (currentStage === "editor") return ["copywriter", "project_manager"];
    if (currentStage === "designer") {
      return ["copywriter", "project_manager", "editor"];
    }
    return [];
  }

  if (formatHasEditorFinalReview(format)) {
    if (currentStage === "editor" && options?.designApproved) {
      return ["copywriter", "editor", "designer"];
    }
    if (currentStage === "editor") return ["copywriter"];
    if (currentStage === "designer") return ["copywriter", "editor"];
    if (currentStage === "project_manager") {
      return ["copywriter", "editor", "designer"];
    }
  }

  const chain = getStageChain(format);
  const index = chain.indexOf(currentStage);
  if (index <= 0) return [];
  return chain.slice(0, index);
}

export function getPreviousStage(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage | null {
  if (currentStage === "posting_manager") return "project_manager";
  const previous = getPreviousStages(format, currentStage, options);
  return previous[previous.length - 1] ?? null;
}

export function getAdminNextStage(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage | null {
  const next = getNextStage(format, currentStage, options);
  if (next) return next;
  if (currentStage === "project_manager") return "posting_manager";
  return null;
}

export function getAdminPreviousStage(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage | null {
  return getPreviousStage(format, currentStage, options);
}

export function getDesignApprovedAfterMove(
  from: WorkflowStage,
  to: WorkflowStage,
  currentApproved: boolean | undefined,
  movingForward: boolean
): boolean {
  if (to === "copywriter") return false;
  if (movingForward) {
    return from === "designer" ? true : Boolean(currentApproved);
  }
  if (from === "project_manager" && to === "editor") {
    return Boolean(currentApproved);
  }
  if (from === "designer" && to === "editor") return false;
  if (from === "editor" && to === "designer") return true;
  if (to === "video_editor" || from === "video_editor") {
    return Boolean(currentApproved) || from === "project_manager";
  }
  return Boolean(currentApproved);
}

export function getMoveTargetStages(
  format: ContentFormat,
  currentStage: WorkflowStage
): WorkflowStage[] {
  return getStageChain(format).filter(
    (stage) => stage !== currentStage && stage !== "posting_manager"
  );
}

export function stageToRole(stage: WorkflowStage): UserRole {
  return stage;
}

export function canUserActOnStage(role: UserRole, stage: WorkflowStage): boolean {
  if (isAdminRole(role)) return true;
  return role === stageToRole(stage);
}

export function findAssigneeForStage(
  stage: WorkflowStage,
  projectId: string,
  users: User[]
): string | null {
  const role = stageToRole(stage);
  const inProject = users.find(
    (user) => user.role === role && user.projectIds.includes(projectId)
  );
  if (inProject) return inProject.id;

  const anyRoleUser = users.find((user) => user.role === role);
  return anyRoleUser?.id ?? null;
}

export function getStageHint(stage: WorkflowStage): string {
  return WORKFLOW_STAGE_HINTS[stage];
}

export function getAssigneeName(
  assigneeId: string | null,
  users: User[]
): string {
  if (!assigneeId) return "Не назначен";
  const user = users.find((item) => item.id === assigneeId);
  return user ? `${user.name} (${getRoleLabel(user.role)})` : assigneeId;
}
