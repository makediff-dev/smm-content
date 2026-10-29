import type { ContentFormat, User, UserRole, WorkflowStage } from "@/types";
import { getFormatPath, getFormatPathCurrentIndex } from "@/lib/format-paths";
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
  project_manager: "Проверяет всю работу и ставит слот в КП",
  posting_manager: "Готовый пост и скачивание материалов",
};

const GALLERY_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "posting_manager",
];

const SLIDESHOW_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "video_editor",
  "posting_manager",
];

const TEXT_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "designer",
  "posting_manager",
];

const VIDEO_MEME_CHAIN: WorkflowStage[] = [
  "copywriter",
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
  returnedByStage?: WorkflowStage;
}

export function getReturnResumeStage(
  currentStage: WorkflowStage,
  returnedByStage?: WorkflowStage
): WorkflowStage | null {
  if (!returnedByStage || returnedByStage === currentStage) return null;
  return returnedByStage;
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
  const resume = getReturnResumeStage(currentStage, options?.returnedByStage);
  if (resume) return resume;

  if (format === "slideshow") {
    if (currentStage === "copywriter") return "editor";
    if (currentStage === "editor") return "designer";
    if (currentStage === "designer") return "video_editor";
    if (currentStage === "video_editor") return "project_manager";
    return null;
  }

  if (format === "video_meme") {
    if (currentStage === "copywriter") return "editor";
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
    return null;
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
  if (currentStage === "copywriter") return [];

  const steps = getFormatPath(format);
  const currentIndex =
    currentStage === "posting_manager"
      ? steps.length
      : getFormatPathCurrentIndex(format, currentStage, {
          designApproved: options?.designApproved,
        });

  const previous: WorkflowStage[] = [];
  for (let index = 0; index < currentIndex; index += 1) {
    const step = steps[index];
    if (step.kind !== "person" || !step.stage) continue;
    if (step.stage === currentStage || step.stage === "posting_manager") continue;
    if (previous.includes(step.stage)) continue;
    previous.push(step.stage);
  }
  return previous;
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

export function getIncomingStage(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: StagePathOptions
): WorkflowStage | null {
  if (options?.returnedByStage) return options.returnedByStage;

  if (currentStage === "copywriter") return "project_manager";
  if (currentStage === "editor") {
    return options?.designApproved ? "designer" : "copywriter";
  }
  if (currentStage === "designer") return "editor";
  if (currentStage === "video_editor") return "designer";
  if (currentStage === "project_manager") {
    if (format === "slideshow") return "video_editor";
    if (format === "video_meme") return "designer";
    return "editor";
  }
  if (currentStage === "posting_manager") return "project_manager";
  return null;
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
