import type { AppNotification, NotificationKind, User } from "@/types";

export function findProjectManagers(projectId: string, users: User[]): User[] {
  return users.filter(
    (user) =>
      user.role === "project_manager" && user.projectIds.includes(projectId)
  );
}

export function arrivalRecipientIds(
  projectId: string,
  assigneeId: string | null,
  users: User[]
): string[] {
  const ids = new Set<string>();
  if (assigneeId) ids.add(assigneeId);
  for (const manager of findProjectManagers(projectId, users)) {
    ids.add(manager.id);
  }
  return [...ids];
}

export function arrivalDrafts(params: {
  users: User[];
  projectId: string;
  assigneeId: string | null;
  taskId: string;
  contentUnitId: string;
  title: string;
  kind: NotificationKind;
  assigneeMessage: string;
  managerMessage: string;
}): Omit<AppNotification, "id" | "read" | "createdAt">[] {
  return arrivalRecipientIds(
    params.projectId,
    params.assigneeId,
    params.users
  ).map((userId) => ({
    userId,
    taskId: params.taskId,
    contentUnitId: params.contentUnitId,
    title: params.title,
    kind: params.kind,
    message:
      userId === params.assigneeId
        ? params.assigneeMessage
        : params.managerMessage,
  }));
}
