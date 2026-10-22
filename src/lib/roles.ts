import type { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  copywriter: "Копирайтер",
  designer: "Дизайнер",
  editor: "Редактор",
  video_editor: "Видеомонтажёр",
  project_manager: "Менеджер проекта",
  posting_manager: "Менеджер постинга",
};

export const WORKFLOW_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "copywriter", label: ROLE_LABELS.copywriter },
  { value: "designer", label: ROLE_LABELS.designer },
  { value: "editor", label: ROLE_LABELS.editor },
  { value: "video_editor", label: ROLE_LABELS.video_editor },
  { value: "project_manager", label: ROLE_LABELS.project_manager },
  { value: "posting_manager", label: ROLE_LABELS.posting_manager },
];

export const ADMIN_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: ROLE_LABELS.admin },
  ...WORKFLOW_ROLE_OPTIONS,
];

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

/** Admin, project manager and posting manager share the same product access. */
export function isManagementRole(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "project_manager" ||
    role === "posting_manager"
  );
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

/** Who may start a production unit (theme and source). */
export function canCreateProductionTask(role: UserRole): boolean {
  return (
    role === "copywriter" ||
    role === "project_manager" ||
    role === "admin"
  );
}

export function canAccessProject(
  user: { role: UserRole; projectIds: string[] } | null | undefined,
  projectId: string
): boolean {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return user.projectIds.includes(projectId);
}

export function filterByProjectAccess<T extends { projectId: string }>(
  user: { role: UserRole; projectIds: string[] } | null | undefined,
  items: T[]
): T[] {
  if (!user) return [];
  if (isAdminRole(user.role)) return items;
  const allowed = new Set(user.projectIds);
  return items.filter((item) => allowed.has(item.projectId));
}

/** Users and AI models screens are admin-only. */
export function canAccessUsersAndAiModels(role: UserRole): boolean {
  return role === "admin";
}
