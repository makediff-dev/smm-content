"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useQueueStore } from "@/stores/queue-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ContentUnitCard } from "@/components/projects/content-unit-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableColumn } from "@/components/ui/table";
import { tableStyles } from "@/components/ui/table";
import { LogoUploadSection } from "@/components/projects/logo-upload-section";
import type { LogoAsset, QueueTask, ContentFormat } from "@/types";
import { QUEUE_TYPE_LABELS } from "@/types";
import { formatDate } from "@/lib/simulate-generation";
import Link from "next/link";
import { ListBullets, SquaresFour } from "@phosphor-icons/react";
import styles from "./project.module.css";
import contentStyles from "@/components/projects/content-unit-card.module.css";
import { formatIconMap } from "@/lib/format-icons";

const PROJECT_TABS = [
  { id: "content", label: "Контент" },
  { id: "queue", label: "Очередь" },
  { id: "settings", label: "Настройки проекта" },
  { id: "members", label: "Участники" },
];

const FORMAT_TABS: { id: ContentFormat | "all"; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "gallery", label: "Галерея" },
  { id: "slideshow", label: "Слайд-шоу с озвучкой" },
  { id: "text", label: "Текстовый пост" },
];

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const updateUser = useAuthStore((s) => s.updateUser);
  const project = useProjectsStore((s) => s.getProject(projectId));
  const getContentForProject = useProjectsStore((s) => s.getContentForProject);
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const getTasksForProject = useQueueStore((s) => s.getTasksForProject);
  const retryTask = useQueueStore((s) => s.retryTask);
  const initWizard = useWizardStore((s) => s.initWizard);

  const [activeTab, setActiveTab] = useState("content");
  const [formatFilter, setFormatFilter] = useState<ContentFormat | "all">("all");
  const [contentView, setContentView] = useState<"list" | "grid">("list");
  const [saved, setSaved] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [logoAssets, setLogoAssets] = useState<LogoAsset[]>(
    project?.logoAssets ?? []
  );

  const [settings, setSettings] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    brandStyle: project?.brandStyle ?? "",
    defaultCopyright: project?.defaultCopyright ?? "",
    cardTemplates: project?.cardTemplates ?? "",
    imageRules: project?.imageRules ?? "",
    formattingRules: project?.formattingRules ?? "",
  });

  if (!project || !currentUser) return null;

  const availableMembers = users.filter(
    (user) => !project.managerIds.includes(user.id)
  );

  const handleOpenAddMember = () => {
    setSelectedMemberId(availableMembers[0]?.id ?? "");
    setAddMemberOpen(true);
  };

  const handleAddMember = () => {
    if (!selectedMemberId) return;

    const member = users.find((user) => user.id === selectedMemberId);
    if (!member) return;

    updateProject(projectId, {
      managerIds: [...project.managerIds, selectedMemberId],
    });

    if (!member.projectIds.includes(projectId)) {
      updateUser(selectedMemberId, {
        projectIds: [...member.projectIds, projectId],
      });
    }

    setAddMemberOpen(false);
    setSelectedMemberId("");
  };

  const allProjectContent = getContentForProject(projectId);

  const contentUnits = allProjectContent.filter((c) => {
    if (formatFilter !== "all" && c.format !== formatFilter) return false;
    return true;
  });

  const formatCounts = FORMAT_TABS.reduce(
    (acc, tab) => {
      acc[tab.id] =
        tab.id === "all"
          ? allProjectContent.length
          : allProjectContent.filter((c) => c.format === tab.id).length;
      return acc;
    },
    {} as Record<ContentFormat | "all", number>
  );

  const queueTasks = getTasksForProject(projectId);

  const handleCreateContent = () => {
    const contentId = createContentUnit(projectId);
    initWizard(projectId, contentId);
    router.push(`/projects/${projectId}/content/${contentId}/wizard/format`);
  };

  const handleSaveSettings = () => {
    updateProject(projectId, { ...settings, logoAssets });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const queueColumns: TableColumn<QueueTask>[] = [
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
    <AppShell projectId={projectId} breadcrumb="Контент проекта">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{project.name}</h1>
        <p className={styles.pageDescription}>{project.description}</p>
      </div>

      <Tabs tabs={PROJECT_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "content" && (
        <>
          <div className={contentStyles.toolbar}>
            <div className={contentStyles.toolbarFormats}>
              <span className={contentStyles.formatTabsLabel}>Формат</span>
              <div className={contentStyles.formatTabs}>
                {FORMAT_TABS.map((tab) => {
                  const TabIcon = formatIconMap[tab.id];
                  const isActive = formatFilter === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${contentStyles.formatTab} ${
                        isActive ? contentStyles.formatTabActive : ""
                      }`}
                      onClick={() => setFormatFilter(tab.id)}
                    >
                      <TabIcon
                        size={16}
                        weight={isActive ? "fill" : "regular"}
                        className={contentStyles.formatTabIcon}
                        aria-hidden
                      />
                      <span>{tab.label}</span>
                      <span className={contentStyles.formatTabCount}>
                        {formatCounts[tab.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={contentStyles.toolbarActions}>
              <div className={contentStyles.viewToggle} role="group" aria-label="Вид отображения">
                <button
                  type="button"
                  className={`${contentStyles.viewToggleBtn} ${
                    contentView === "list" ? contentStyles.viewToggleBtnActive : ""
                  }`}
                  onClick={() => setContentView("list")}
                  aria-pressed={contentView === "list"}
                  title="Список"
                >
                  <ListBullets size={18} weight={contentView === "list" ? "fill" : "regular"} />
                </button>
                <button
                  type="button"
                  className={`${contentStyles.viewToggleBtn} ${
                    contentView === "grid" ? contentStyles.viewToggleBtnActive : ""
                  }`}
                  onClick={() => setContentView("grid")}
                  aria-pressed={contentView === "grid"}
                  title="Карточки"
                >
                  <SquaresFour size={18} weight={contentView === "grid" ? "fill" : "regular"} />
                </button>
              </div>
              <Button onClick={handleCreateContent}>Создать контент</Button>
            </div>
          </div>

          {contentUnits.length === 0 ? (
            <EmptyState
              title="Контент не найден"
              description="Создайте первую контент-единицу для этого проекта"
              action={
                <Button onClick={handleCreateContent}>Создать контент</Button>
              }
            />
          ) : (
            <div
              className={
                contentView === "list" ? contentStyles.list : contentStyles.grid
              }
            >
              {contentUnits.map((c) => (
                <ContentUnitCard
                  key={c.id}
                  content={c}
                  projectId={projectId}
                  layout={contentView}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "queue" && (
        queueTasks.length === 0 ? (
          <EmptyState title="Очередь пуста" description="Нет задач для этого проекта" />
        ) : (
          <Table columns={queueColumns} data={queueTasks} keyField="id" />
        )
      )}

      {activeTab === "settings" && (
        <div>
          <div className={styles.settingsSection}>
            <h3 className={styles.settingsSectionTitle}>Основное</h3>
            <div className={styles.settingsGrid}>
              <Input
                label="Название проекта"
                value={settings.name}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Например: HubAgency"
              />
              <Textarea
                label="Описание"
                value={settings.description}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, description: e.target.value }))
                }
                rows={3}
                placeholder="Кратко опишите нишу и тип контента проекта"
              />
            </div>
            <LogoUploadSection
              placeholder={project.logoPlaceholder}
              assets={logoAssets}
              onChange={(assets) => {
                setLogoAssets(assets);
                updateProject(projectId, { logoAssets: assets });
              }}
            />
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsSectionTitle}>Фирменный стиль</h3>
            <Textarea
              label="Правила оформления"
              value={settings.brandStyle}
              onChange={(e) =>
                setSettings((s) => ({ ...s, brandStyle: e.target.value }))
              }
              placeholder="Шрифты, цвета, тон коммуникации, визуальные ограничения..."
            />
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsSectionTitle}>Шаблоны карточек</h3>
            <Textarea
              label="Шаблоны"
              value={settings.cardTemplates}
              onChange={(e) =>
                setSettings((s) => ({ ...s, cardTemplates: e.target.value }))
              }
              placeholder="Формат карточек, расположение текста, отступы..."
            />
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsSectionTitle}>Копирайты / подписи источника</h3>
            <Input
              label="Подпись источника по умолчанию"
              value={settings.defaultCopyright}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaultCopyright: e.target.value,
                }))
              }
              placeholder="Источник: example.com"
            />
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsSectionTitle}>Правила обработки изображений</h3>
            <Textarea
              label="Правила"
              value={settings.imageRules}
              onChange={(e) =>
                setSettings((s) => ({ ...s, imageRules: e.target.value }))
              }
              placeholder="Кадрирование, удаление водяных знаков, цветокоррекция..."
            />
            <Textarea
              label="Правила форматирования"
              value={settings.formattingRules}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  formattingRules: e.target.value,
                }))
              }
              placeholder="Логотип, подписи, хештеги, расположение элементов..."
            />
          </div>

          <div className={styles.saveBar}>
            <Button onClick={handleSaveSettings}>Сохранить</Button>
            {saved && (
              <span className={styles.savedMessage}>Настройки сохранены</span>
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <>
          <div className={styles.membersHeader}>
            <Button
              onClick={handleOpenAddMember}
              disabled={availableMembers.length === 0}
            >
              Добавить участника
            </Button>
          </div>

          <div className={styles.membersList}>
            {project.managerIds.map((managerId) => {
              const user = users.find((u) => u.id === managerId);
              if (!user) return null;
              return (
                <div key={managerId} className={styles.member}>
                  <div>
                    <div className={styles.memberName}>{user.name}</div>
                    <div className={styles.memberRole}>
                      {user.role === "admin" ? "Администратор" : "Менеджер"}
                    </div>
                  </div>
                  <span className={styles.memberTag}>{user.email}</span>
                </div>
              );
            })}
            {project.managerIds.length === 0 && (
              <EmptyState
                title="Нет участников"
                description="Добавьте менеджера или администратора в проект"
              />
            )}
          </div>

          <Modal
            title="Добавить участника"
            open={addMemberOpen}
            onClose={() => setAddMemberOpen(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setAddMemberOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddMember} disabled={!selectedMemberId}>
                  Добавить
                </Button>
              </>
            }
          >
            <Select
              label="Пользователь"
              options={availableMembers.map((user) => ({
                value: user.id,
                label: `${user.name} — ${user.email}`,
              }))}
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            />
          </Modal>
        </>
      )}
    </AppShell>
  );
}
