"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore } from "@/stores/queue-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableColumn, tableStyles } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { QueueTask } from "@/types";
import { QUEUE_TYPE_LABELS } from "@/types";
import { formatDate } from "@/lib/simulate-generation";
import styles from "./queue.module.css";

export default function QueuePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const getTasksForUser = useQueueStore((s) => s.getTasksForUser);
  const retryTask = useQueueStore((s) => s.retryTask);
  const projects = useProjectsStore((s) => s.projects);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const tasks = getTasksForUser(currentUser.id, isAdmin);

  const columns: TableColumn<QueueTask>[] = [
    {
      key: "label",
      header: "Задача",
      render: (row) => row.label,
    },
    {
      key: "type",
      header: "Тип",
      render: (row) => QUEUE_TYPE_LABELS[row.type],
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Создана",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "project",
      header: "Проект",
      render: (row) =>
        projects.find((p) => p.id === row.projectId)?.name ?? row.projectId,
    },
    {
      key: "manager",
      header: "Менеджер",
      render: (row) =>
        users.find((u) => u.id === row.managerId)?.name ?? row.managerId,
    },
    {
      key: "actions",
      header: "Действия",
      render: (row) => (
        <div className={tableStyles.actions}>
          <Link href={`/history/${row.contentUnitId}`}>
            <Button variant="ghost" size="small">
              Открыть
            </Button>
          </Link>
          {row.status === "error" && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => retryTask(row.id)}
            >
              Повторить
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell breadcrumb="Очередь задач">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Очередь задач</h1>
        <p className={styles.pageDescription}>
          {isAdmin ? "Все задачи агентства" : "Ваши задачи"}
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="Очередь пуста" description="Нет активных задач" />
      ) : (
        <Table columns={columns} data={tasks} keyField="id" />
      )}
    </AppShell>
  );
}
