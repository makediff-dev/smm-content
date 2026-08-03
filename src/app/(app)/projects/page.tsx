"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { matchesSearch, normalizeSearchQuery } from "@/lib/search";
import { isManagementRole } from "@/lib/roles";
import styles from "./projects.module.css";

export default function ProjectsPage() {
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

  const canManageAll = currentUser ? isManagementRole(currentUser.role) : false;
  const projects = currentUser
    ? getProjectsForUser(currentUser.id, canManageAll, currentUser.projectIds)
    : [];

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const managerNames = project.managerIds
        .map((id) => users.find((u) => u.id === id)?.name ?? "")
        .join(" ");
      const recentTitles = contentUnits
        .filter((c) => c.projectId === project.id)
        .map((c) => c.title)
        .join(" ");

      return matchesSearch(
        query,
        project.name,
        project.description,
        managerNames,
        recentTitles
      );
    });
  }, [projects, query, users, contentUnits]);

  if (!currentUser) return null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createProject({ name: newName, description: newDesc });
    setModalOpen(false);
    setNewName("");
    setNewDesc("");
    router.push(`/projects/${id}`);
  };

  return (
    <AppShell breadcrumb="Все проекты">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Проекты</h1>
          <p className={styles.pageDescription}>
            {canManageAll ? "Все проекты агентства" : "Ваши проекты"}
          </p>
        </div>
        <div className={styles.pageHeaderActions}>
          <PageSearchBar />
          {canManageAll && (
            <Button onClick={() => setModalOpen(true)}>Создать проект</Button>
          )}
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
            const projectContent = contentUnits
              .filter((c) => c.projectId === project.id)
              .slice(0, 3);
            const recentGenerations = projectContent.map((c) => c.title);
            const managerNames = project.managerIds
              .map((id) => users.find((u) => u.id === id)?.name ?? id)
              .filter(Boolean);

            return (
              <ProjectCard
                key={project.id}
                project={project}
                recentGenerations={recentGenerations}
                managerNames={managerNames}
              />
            );
          })
        )}
      </div>

      <Modal
        title="Создать проект"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Создать
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Input
            label="Название проекта"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название бренда"
          />
          <Textarea
            label="Описание"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Краткое описание проекта"
          />
        </div>
      </Modal>
    </AppShell>
  );
}
