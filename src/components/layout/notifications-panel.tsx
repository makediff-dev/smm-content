"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { canAccessProject } from "@/lib/roles";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import { formatDate } from "@/lib/simulate-generation";
import styles from "./notifications-panel.module.css";

export function NotificationsPanel() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const getNotificationsForUser = useWorkflowStore((s) => s.getNotificationsForUser);
  const markNotificationRead = useWorkflowStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useWorkflowStore((s) => s.markAllNotificationsRead);
  const getTaskByContentId = useWorkflowStore((s) => s.getTaskByContentId);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const notifications = currentUser
    ? getNotificationsForUser(currentUser.id).filter((item) => {
        const task = getTaskByContentId(item.contentUnitId);
        return !task || canAccessProject(currentUser, task.projectId);
      })
    : [];
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const handleOpenNotification = (id: string, contentUnitId: string) => {
    markNotificationRead(id);
    setOpen(false);
    const task = getTaskByContentId(contentUnitId);
    if (task && task.status !== "done") {
      router.push(getRoleWorkspaceHref(task.projectId, contentUnitId));
      return;
    }
    router.push(`/history/${contentUnitId}`);
  };

  return (
    <div className={styles.notificationsWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.toggle}
        aria-label="Уведомления"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} weight="bold" />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Уведомления</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(currentUser.id)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#2563eb",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Прочитать все
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className={styles.empty}>Новых уведомлений нет</div>
          ) : (
            <div className={styles.list}>
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.item} ${!item.read ? styles.itemUnread : ""}`}
                  onClick={() => handleOpenNotification(item.id, item.contentUnitId)}
                >
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemMessage}>{item.message}</span>
                  <span className={styles.itemTime}>{formatDate(item.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
