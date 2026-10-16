"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore } from "@/stores/queue-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Table, TableColumn, tableStyles } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { TaskCalendarPopover } from "@/components/queue/task-calendar-popover";
import type { ProductionTask, QueueTask } from "@/types";
import { FORMAT_LABELS, QUEUE_TYPE_LABELS, STATUS_LABELS } from "@/types";
import { formatDate, formatDateKey, toDateKey } from "@/lib/simulate-generation";
import { getAssigneeName, getStageLabel } from "@/lib/workflow";
import { formatTaskDeadlineLabel, isTaskDeadlineHot } from "@/lib/task-deadline";
import { matchesSearch, normalizeSearchQuery } from "@/lib/search";
import { isManagementRole } from "@/lib/roles";
import styles from "./queue.module.css";

const WORKFLOW_STATUS_LABELS: Record<ProductionTask["status"], string> = {
  in_progress: "В работе",
  returned: "Возвращено",
  done: "Завершено",
};

export default function QueuePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const getTasksForUser = useQueueStore((s) => s.getTasksForUser);
  const getAllActiveTasks = useWorkflowStore((s) => s.getAllActiveTasks);
  const retryTask = useQueueStore((s) => s.retryTask);
  const projects = useProjectsStore((s) => s.projects);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { query } = useSearch();

  const isManagement = currentUser ? isManagementRole(currentUser.role) : false;
  const aiTasks = currentUser
    ? getTasksForUser(currentUser.id, isManagement)
    : [];
  const workflowTasks = getAllActiveTasks();

  const filteredWorkflowTasks = useMemo(() => {
    return workflowTasks.filter((task) => {
      const projectName = projects.find((p) => p.id === task.projectId)?.name;
      const assigneeName = users.find((u) => u.id === task.assigneeId)?.name;

      return matchesSearch(
        query,
        task.title,
        getStageLabel(task.currentStage),
        WORKFLOW_STATUS_LABELS[task.status],
        FORMAT_LABELS[task.format],
        projectName,
        assigneeName
      );
    });
  }, [workflowTasks, query, projects, users]);

  const filteredAiTasks = useMemo(() => {
    const byDate = !selectedDate
      ? aiTasks
      : aiTasks.filter((task) => toDateKey(task.createdAt) === selectedDate);

    return byDate.filter((task) => {
      const projectName = projects.find((p) => p.id === task.projectId)?.name;
      const managerName = users.find((u) => u.id === task.managerId)?.name;

      return matchesSearch(
        query,
        task.label,
        QUEUE_TYPE_LABELS[task.type],
        STATUS_LABELS[task.status],
        projectName,
        managerName,
        formatDate(task.createdAt)
      );
    });
  }, [aiTasks, selectedDate, query, projects, users]);

  if (!currentUser) return null;

  const workflowColumns: TableColumn<ProductionTask>[] = [
    {
      key: "title",
      header: "Контент",
      render: (row) => row.title,
    },
    {
      key: "stage",
      header: "Этап",
      render: (row) => getStageLabel(row.currentStage),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => WORKFLOW_STATUS_LABELS[row.status],
    },
    {
      key: "format",
      header: "Формат",
      render: (row) => FORMAT_LABELS[row.format],
    },
    {
      key: "project",
      header: "Проект",
      render: (row) =>
        projects.find((p) => p.id === row.projectId)?.name ?? row.projectId,
    },
    {
      key: "assignee",
      header: "Ответственный",
      render: (row) => getAssigneeName(row.assigneeId, users),
    },
    {
      key: "dueAt",
      header: "Срок",
      render: (row) => (
        <span className={isTaskDeadlineHot(row) ? styles.dueHot : undefined}>
          {formatTaskDeadlineLabel(row)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Действия",
      render: (row) => (
        <Link href={`/projects/${row.projectId}/content/${row.contentUnitId}`}>
          <Button variant="ghost" size="small">
            Открыть
          </Button>
        </Link>
      ),
    },
  ];

  const aiColumns: TableColumn<QueueTask>[] = [
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

  const showAiQueue = isManagement;

  return (
    <AppShell breadcrumb="Все задачи">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Все задачи</h1>
          <p className={styles.pageDescription}>
            Все проекты и все роли в производстве
          </p>
        </div>
        <div className={styles.pageHeaderTools}>
          <PageSearchBar />
          {showAiQueue && (
            <TaskCalendarPopover
              tasks={aiTasks}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>
      </div>

      {showAiQueue && selectedDate && (
        <div className={styles.filterBadge}>
          AI-задачи за {formatDateKey(selectedDate)}
        </div>
      )}

      {workflowTasks.length === 0 ? (
        <EmptyState
          title="Нет задач"
          description="Пока нет задач в производстве"
        />
      ) : filteredWorkflowTasks.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить запрос"
        />
      ) : (
        <Table
          columns={workflowColumns}
          data={filteredWorkflowTasks}
          keyField="id"
        />
      )}

      {showAiQueue && (
        <>
          <h2 className={styles.sectionTitle}>AI-очередь</h2>
          {aiTasks.length === 0 ? (
            <EmptyState title="AI-очередь пуста" description="Нет активных задач" />
          ) : filteredAiTasks.length === 0 ? (
            <EmptyState
              title={
                normalizeSearchQuery(query)
                  ? "Ничего не найдено"
                  : "За эту дату задач нет"
              }
              description={
                normalizeSearchQuery(query)
                  ? "Попробуйте изменить запрос"
                  : "Выберите другой день в календаре или сбросьте фильтр"
              }
            />
          ) : (
            <Table columns={aiColumns} data={filteredAiTasks} keyField="id" />
          )}
        </>
      )}
    </AppShell>
  );
}
