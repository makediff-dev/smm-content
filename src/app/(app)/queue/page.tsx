"use client";

import { useMemo, useState } from "react";
import { DueSortHeader, type DueSort } from "@/components/queue/due-sort-header";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Table, TableColumn } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { TaskCalendar } from "@/components/queue/task-calendar";
import type { ProductionTask } from "@/types";
import { FORMAT_LABELS } from "@/types";
import { formatDateKey, toDateKey } from "@/lib/simulate-generation";
import { getAssigneeName, getStageLabel } from "@/lib/workflow";
import {
  formatTaskDeadlineLabel,
  isTaskDeadlineHot,
  resolveTaskDueAt,
} from "@/lib/task-deadline";
import { matchesSearch } from "@/lib/search";
import { canAccessProject, isAdminRole } from "@/lib/roles";
import {
  ColumnFilters,
  matchesColumnFilter,
  uniqueFilterOptions,
} from "@/components/shared/column-filters";
import styles from "./queue.module.css";

const WORKFLOW_STATUS_LABELS: Record<ProductionTask["status"], string> = {
  in_progress: "В работе",
  returned: "Возвращено",
  done: "Завершено",
};

export default function QueuePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const getAllActiveTasks = useWorkflowStore((s) => s.getAllActiveTasks);
  const projects = useProjectsStore((s) => s.projects);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dueSort, setDueSort] = useState<DueSort>(null);
  const { query } = useSearch();

  const isAdmin = Boolean(currentUser && isAdminRole(currentUser.role));
  const workflowTasks = currentUser
    ? getAllActiveTasks().filter((task) =>
        canAccessProject(currentUser, task.projectId)
      )
    : [];

  const filteredWorkflowTasks = useMemo(() => {
    return workflowTasks.filter((task) => {
      const projectName =
        projects.find((p) => p.id === task.projectId)?.name ?? task.projectId;
      const assigneeName = getAssigneeName(task.assigneeId, users);
      const stageLabel = getStageLabel(task.currentStage);
      const statusLabel = WORKFLOW_STATUS_LABELS[task.status];
      const formatLabel = FORMAT_LABELS[task.format];
      const dueLabel = formatTaskDeadlineLabel(task);

      if (
        !matchesColumnFilter(columnFilters, "title", task.title) ||
        !matchesColumnFilter(columnFilters, "stage", stageLabel) ||
        !matchesColumnFilter(columnFilters, "status", statusLabel) ||
        !matchesColumnFilter(columnFilters, "format", formatLabel) ||
        !matchesColumnFilter(columnFilters, "project", projectName) ||
        !matchesColumnFilter(columnFilters, "assignee", assigneeName) ||
        !matchesColumnFilter(columnFilters, "dueAt", dueLabel)
      ) {
        return false;
      }

      if (
        selectedDate &&
        toDateKey(resolveTaskDueAt(task).toISOString()) !== selectedDate
      ) {
        return false;
      }

      return matchesSearch(
        query,
        task.title,
        stageLabel,
        statusLabel,
        formatLabel,
        projectName,
        assigneeName
      );
    });
  }, [workflowTasks, query, projects, users, columnFilters, selectedDate]);

  const sortedWorkflowTasks = useMemo(() => {
    if (!dueSort) return filteredWorkflowTasks;
    return [...filteredWorkflowTasks].sort((left, right) => {
      const delta =
        resolveTaskDueAt(left).getTime() - resolveTaskDueAt(right).getTime();
      return dueSort === "asc" ? delta : -delta;
    });
  }, [dueSort, filteredWorkflowTasks]);

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
      header: <DueSortHeader value={dueSort} onChange={setDueSort} />,
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
          <Button variant="muted" size="small">
            Открыть
          </Button>
        </Link>
      ),
    },
  ];

  const calendarTasks = useMemo(
    () =>
      workflowTasks.map((task) => ({
        createdAt: resolveTaskDueAt(task).toISOString(),
      })),
    [workflowTasks]
  );

  const filterGroups = useMemo(() => {
    return [
      {
        id: "workflow",
        fields: [
          {
            key: "title",
            label: "Контент",
            options: uniqueFilterOptions(workflowTasks.map((task) => task.title)),
          },
          {
            key: "stage",
            label: "Этап",
            options: uniqueFilterOptions(
              workflowTasks.map((task) => getStageLabel(task.currentStage))
            ),
          },
          {
            key: "status",
            label: "Статус",
            options: uniqueFilterOptions(
              workflowTasks.map((task) => WORKFLOW_STATUS_LABELS[task.status])
            ),
          },
          {
            key: "format",
            label: "Формат",
            options: uniqueFilterOptions(
              workflowTasks.map((task) => FORMAT_LABELS[task.format])
            ),
          },
          {
            key: "project",
            label: "Проект",
            options: uniqueFilterOptions(
              workflowTasks.map(
                (task) =>
                  projects.find((project) => project.id === task.projectId)?.name ??
                  task.projectId
              )
            ),
          },
          {
            key: "assignee",
            label: "Ответственный",
            options: uniqueFilterOptions(
              workflowTasks.map((task) => getAssigneeName(task.assigneeId, users))
            ),
          },
          {
            key: "dueAt",
            label: "Срок",
            options: uniqueFilterOptions(
              workflowTasks.map((task) => formatTaskDeadlineLabel(task))
            ),
          },
        ],
      },
    ];
  }, [projects, users, workflowTasks]);

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
          {isAdmin && (
            <ColumnFilters
              groups={filterGroups}
              values={columnFilters}
              onChange={(key, value) =>
                setColumnFilters((current) => ({ ...current, [key]: value }))
              }
              onReset={() => {
                setColumnFilters({});
                setSelectedDate(null);
              }}
              extra={
                <TaskCalendar
                  compact
                  embedded
                  tasks={calendarTasks}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              }
              extraActive={Boolean(selectedDate)}
            />
          )}
        </div>
      </div>

      {selectedDate && (
        <div className={styles.filterBadge}>
          Срок: {formatDateKey(selectedDate)}
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
          data={sortedWorkflowTasks}
          keyField="id"
        />
      )}
    </AppShell>
  );
}
