import type { ContentFormat, User, UserRole, WorkflowStage } from "@/types";
import { getRoleLabel, isManagementRole } from "@/lib/roles";

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
  editor: "Текст, озвучка (слайд-шоу), превью слайдов, возврат на доработку",
  video_editor: "Сборка видео, голос, темп, музыка и произношение",
  project_manager: "Итоговая проверка, возврат на любой этап, слот в КП",
  posting_manager: "Готовый пост и скачивание материалов",
};

const GALLERY_CHAIN: WorkflowStage[] = [
  "copywriter",
  "designer",
  "editor",
  "project_manager",
  "posting_manager",
];

const SLIDESHOW_CHAIN: WorkflowStage[] = [
  "copywriter",
  "designer",
  "editor",
  "video_editor",
  "project_manager",
  "posting_manager",
];

const TEXT_CHAIN: WorkflowStage[] = [
  "copywriter",
  "editor",
  "project_manager",
  "posting_manager",
];

export function getStageChain(format: ContentFormat): WorkflowStage[] {
  if (format === "slideshow") return SLIDESHOW_CHAIN;
  if (format === "text") return TEXT_CHAIN;
  return GALLERY_CHAIN;
}

export function getStageLabel(stage: WorkflowStage): string {
  return WORKFLOW_STAGE_LABELS[stage];
}

export function getNextStage(
  format: ContentFormat,
  currentStage: WorkflowStage
): WorkflowStage | null {
  const chain = getStageChain(format);
  const index = chain.indexOf(currentStage);
  if (index === -1 || index >= chain.length - 1) return null;
  return chain[index + 1];
}

export function getPreviousStages(
  format: ContentFormat,
  currentStage: WorkflowStage
): WorkflowStage[] {
  const chain = getStageChain(format);
  const index = chain.indexOf(currentStage);
  if (index <= 0) return [];
  return chain.slice(0, index);
}

export function stageToRole(stage: WorkflowStage): UserRole {
  return stage;
}

export function canUserActOnStage(role: UserRole, stage: WorkflowStage): boolean {
  if (isManagementRole(role)) {
    return true;
  }
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
