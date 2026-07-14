"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const projects = getProjectsForUser(currentUser.id, isAdmin);

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
            {isAdmin ? "Все проекты агентства" : "Ваши проекты"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)}>Создать проект</Button>
        )}
      </div>

      <div className={styles.grid}>
        {projects.map((project) => {
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
        })}
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
