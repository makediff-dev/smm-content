"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { isTaskDeadlineHot } from "@/lib/task-deadline";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { matchesSearch, normalizeSearchQuery } from "@/lib/search";
import {
  canCreateProductionTask,
  isAdminRole,
  isManagementRole,
} from "@/lib/roles";
import { buildHomeQueueItems, getHomeTasksForUser } from "@/lib/my-projects-home";
import { RoleSlaFields } from "@/components/projects/role-sla-fields";
import {
  DEFAULT_ROLE_SLA_MINUTES,
  normalizeRoleSlaMinutes,
} from "@/lib/task-deadline";
import type { WorkflowStage } from "@/types";
import styles from "./projects.module.css";

export default function ProjectsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return null;
  if (isAdminRole(currentUser.role)) return <AdminProjectsHome />;
  return <RoleProjectsHome />;
}

function AdminProjectsHome() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const getProjectsForUser = useProjectsStore((s) => s.getProjectsForUser);
  const contentUnits = useProjectsStore((s) => s.contentUnits);
  const createProject = useProjectsStore((s) => s.createProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const { query } = useSearch();
  const [newSla, setNewSla] = useState(() =>
    normalizeRoleSlaMinutes(DEFAULT_ROLE_SLA_MINUTES)
  );

  const projects = currentUser
    ? getProjectsForUser(currentUser.id, true, currentUser.projectIds)
    : [];

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const memberNames = users
        .filter((user) => user.projectIds.includes(project.id))
        .map((user) => user.name)
        .join(" ");
      const recentTitles = contentUnits
        .filter((unit) => unit.projectId === project.id)
        .map((unit) => unit.title)
        .join(" ");

      return matchesSearch(
        query,
        project.name,
        project.description,
        memberNames,
        recentTitles
      );
    });
  }, [projects, query, users, contentUnits]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createProject({
      name: newName,
      description: newDesc,
      roleSlaMinutes: newSla,
    });
    setModalOpen(false);
    setNewName("");
    setNewDesc("");
    setNewSla(normalizeRoleSlaMinutes(DEFAULT_ROLE_SLA_MINUTES));
    router.push(`/projects/${id}`);
  };

  return (
    <AppShell breadcrumb="Все проекты">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Проекты</h1>
          <p className={styles.pageDescription}>Все проекты агентства</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <PageSearchBar placeholder="Поиск по проектам..." />
          <Button onClick={() => setModalOpen(true)}>Создать проект</Button>
        </div>
      </div>

      <div className={styles.grid}>
        {filteredProjects.length === 0 ? (
          <EmptyState
            title={
              normalizeSearchQuery(query)
                ? "Ничего не найдено"
                : "Проектов пока нет"
            }
            description={
              normalizeSearchQuery(query)
                ? "Попробуйте изменить запрос"
                : "Создайте первый проект"
            }
          />
        ) : (
          filteredProjects.map((project) => {
            const recentGenerations = contentUnits
              .filter((unit) => unit.projectId === project.id)
              .slice(0, 3)
              .map((unit) => unit.title);
            const memberNames = users
              .filter((user) => user.projectIds.includes(project.id))
              .map((user) => user.name);

            return (
              <ProjectCard
                key={project.id}
                project={project}
                recentGenerations={recentGenerations}
                managerNames={memberNames}
              />
            );
          })
        )}
      </div>

      <CreateProjectModal
        open={modalOpen}
        name={newName}
        description={newDesc}
        sla={newSla}
        onNameChange={setNewName}
        onDescriptionChange={setNewDesc}
        onSlaChange={setNewSla}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}

function RoleProjectsHome() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useWorkflowStore((s) => s.tasks);
  const getProjectsForUser = useProjectsStore((s) => s.getProjectsForUser);
  const createProject = useProjectsStore((s) => s.createProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSla, setNewSla] = useState(() =>
    normalizeRoleSlaMinutes(DEFAULT_ROLE_SLA_MINUTES)
  );

  const canManageAll = currentUser ? isManagementRole(currentUser.role) : false;
  const canCreateTask = currentUser
    ? canCreateProductionTask(currentUser.role)
    : false;
  const projects = currentUser
    ? getProjectsForUser(
        currentUser.id,
        isAdminRole(currentUser.role),
        currentUser.projectIds
      )
    : [];

  const homeTasks = useMemo(() => {
    if (!currentUser) return [];
    return getHomeTasksForUser(currentUser, tasks);
  }, [currentUser, tasks]);

  const waitingCount = homeTasks.filter((task) => task.status === "in_progress")
    .length;
  const returnedCount = homeTasks.filter((task) => task.status === "returned")
    .length;
  const hotCount = homeTasks.filter((task) => isTaskDeadlineHot(task)).length;

  const queueItems = useMemo(
    () => buildHomeQueueItems(homeTasks),
    [homeTasks]
  );

  if (!currentUser) return null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createProject({
      name: newName,
      description: newDesc,
      roleSlaMinutes: newSla,
    });
    setModalOpen(false);
    setNewName("");
    setNewDesc("");
    setNewSla(normalizeRoleSlaMinutes(DEFAULT_ROLE_SLA_MINUTES));
    router.push(`/projects/${id}`);
  };

  const goCreateTask = (projectId: string) => {
    router.push(`/projects/${projectId}/content/new`);
  };

  const handleCreateTask = () => {
    if (projects.length === 1) {
      goCreateTask(projects[0].id);
      return;
    }
    if (projects.length === 0) return;
    setTaskProjectId(projects[0].id);
    setTaskModalOpen(true);
  };

  return (
    <AppShell breadcrumb="Мои проекты">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Мои проекты</h1>
          <p className={styles.pageDescription}>
            Сразу видно, что ждёт именно вас
          </p>
        </div>
        {(canCreateTask || canManageAll) && (
          <div className={styles.pageHeaderActions}>
            {canCreateTask && (
              <Button
                onClick={handleCreateTask}
                disabled={projects.length === 0}
              >
                Создать задачу
              </Button>
            )}
            {canManageAll && (
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                Создать проект
              </Button>
            )}
          </div>
        )}
      </div>

      <section className={styles.board} aria-label="Мои проекты">
        <div className={styles.stats}>
          <article className={styles.stat}>
            <span className={styles.statLabel}>Ждут тебя</span>
            <strong className={styles.statValue}>{waitingCount}</strong>
          </article>
          <article className={`${styles.stat} ${styles.statReturned}`}>
            <span className={styles.statLabel}>Вернули тебе</span>
            <strong className={styles.statValue}>{returnedCount}</strong>
          </article>
          <article
            className={`${styles.stat} ${hotCount > 0 ? styles.statReturned : ""}`}
          >
            <span className={styles.statLabel}>Горит срок</span>
            <strong className={styles.statValue}>{hotCount}</strong>
          </article>
        </div>

        <div className={styles.queue}>
          <h2 className={styles.queueTitle}>Твоя очередь</h2>
          {queueItems.length === 0 ? (
            <p className={styles.queueEmpty}>
              Сейчас ничего не ждёт. Как появится задача на вашей роли — она
              будет здесь.
            </p>
          ) : (
            <ul className={styles.queueList}>
              {queueItems.map((item) => (
                <li key={item.id} className={styles.queueItem}>
                  <div className={styles.queueCopy}>
                    <p className={styles.queueName}>{item.title}</p>
                    <p className={styles.queueMeta}>
                      От: {item.fromLabel} · {item.formatLabel}
                      {item.isReturned ? " · повторно" : ""}
                    </p>
                  </div>
                  <div className={styles.queueActions}>
                    <span
                      className={`${styles.timeBadge} ${styles[`timeBadge_${item.deadlineTone}`]}`}
                    >
                      {item.timeLabel}
                    </span>
                    <Link href={item.href} className={styles.openButton}>
                      Открыть
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {canManageAll && projects.length > 0 && (
        <div className={styles.brands}>
          <h2 className={styles.brandsTitle}>Бренды</h2>
          <div className={styles.brandRow}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={styles.brandChip}
              >
                {project.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {canManageAll && (
        <CreateProjectModal
          open={modalOpen}
          name={newName}
          description={newDesc}
          sla={newSla}
          onNameChange={setNewName}
          onDescriptionChange={setNewDesc}
          onSlaChange={setNewSla}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}

      <Modal
        title="Создать задачу"
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTaskModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!taskProjectId) return;
                setTaskModalOpen(false);
                goCreateTask(taskProjectId);
              }}
              disabled={!taskProjectId}
            >
              Создать
            </Button>
          </>
        }
      >
        <Select
          id="home-task-project"
          label="Проект"
          value={taskProjectId}
          onChange={(event) => setTaskProjectId(event.target.value)}
          options={projects.map((project) => ({
            value: project.id,
            label: project.name,
          }))}
        />
      </Modal>
    </AppShell>
  );
}

function CreateProjectModal({
  open,
  name,
  description,
  sla,
  onNameChange,
  onDescriptionChange,
  onSlaChange,
  onClose,
  onCreate,
}: {
  open: boolean;
  name: string;
  description: string;
  sla: Record<WorkflowStage, number>;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSlaChange: (value: Record<WorkflowStage, number>) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <Modal
      title="Создать проект"
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onCreate} disabled={!name.trim()}>
            Создать
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          label="Название проекта"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Название бренда"
        />
        <Textarea
          label="Описание"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Краткое описание проекта"
        />
        <RoleSlaFields values={sla} onChange={onSlaChange} />
      </div>
    </Modal>
  );
}
