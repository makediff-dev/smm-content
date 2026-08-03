"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Table, TableColumn, tableStyles } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import type { User, UserRole } from "@/types";
import { matchesSearch } from "@/lib/search";
import { ADMIN_ROLE_OPTIONS, getRoleLabel } from "@/lib/roles";
import styles from "../admin.module.css";

export default function UsersPage() {
  const users = useAuthStore((s) => s.users);
  const addUser = useAuthStore((s) => s.addUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const removeUser = useAuthStore((s) => s.removeUser);
  const projects = useProjectsStore((s) => s.projects);

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "demo",
    role: "copywriter" as UserRole,
    projectIds: [] as string[],
  });
  const { query } = useSearch();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const projectNames = user.projectIds
        .map((id) => projects.find((p) => p.id === id)?.name ?? "")
        .join(" ");

      return matchesSearch(
        query,
        user.name,
        user.email,
        getRoleLabel(user.role),
        projectNames
      );
    });
  }, [users, projects, query]);

  const openAdd = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "demo", role: "copywriter", projectIds: [] });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      projectIds: user.projectIds,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editUser) {
      updateUser(editUser.id, form);
    } else {
      addUser(form);
    }
    setModalOpen(false);
  };

  const toggleProject = (projectId: string) => {
    setForm((f) => ({
      ...f,
      projectIds: f.projectIds.includes(projectId)
        ? f.projectIds.filter((id) => id !== projectId)
        : [...f.projectIds, projectId],
    }));
  };

  const columns: TableColumn<User>[] = [
    { key: "name", header: "Имя", render: (r) => r.name },
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "role",
      header: "Роль",
      render: (r) => getRoleLabel(r.role),
    },
    {
      key: "projects",
      header: "Проекты",
      render: (r) =>
        r.projectIds
          .map((id) => projects.find((p) => p.id === id)?.name ?? id)
          .join(", ") || "—",
    },
    {
      key: "actions",
      header: "Действия",
      render: (r) => (
        <div className={tableStyles.actions}>
          <Button variant="ghost" size="small" onClick={() => openEdit(r)}>
            Изменить доступ
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              if (confirm(`Удалить ${r.name}?`)) removeUser(r.id);
            }}
          >
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell breadcrumb="Пользователи и роли">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Пользователи и роли</h1>
        <div className={styles.pageHeaderActions}>
          <PageSearchBar />
          <Button onClick={openAdd}>Добавить пользователя</Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить запрос"
        />
      ) : (
        <Table columns={columns} data={filteredUsers} keyField="id" />
      )}

      <Modal
        title={editUser ? "Изменить доступ" : "Добавить пользователя"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!form.name || !form.email}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Input
            label="Имя"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Иван Менеджер"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="manager@smm.local"
          />
          <Input
            label="Пароль"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="demo"
          />
          <Select
            label="Роль"
            options={ADMIN_ROLE_OPTIONS}
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as UserRole }))
            }
          />
          <div>
            <label className={styles.promptDesc} style={{ display: "block", marginBottom: 8 }}>
              Доступные проекты
            </label>
            {projects.map((p) => (
              <label key={p.id} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.projectIds.includes(p.id)}
                  onChange={() => toggleProject(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
