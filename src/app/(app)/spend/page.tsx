"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useQueueStore } from "@/stores/queue-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { matchesSearch } from "@/lib/search";
import { filterByProjectAccess, isAdminRole, isManagementRole } from "@/lib/roles";
import {
  currentMonthKey,
  filterSpendByMonth,
  formatMonthKey,
  formatRub,
  getSpendLines,
  groupSpendByPost,
  groupSpendByProject,
  groupSpendByRole,
  spendLimitState,
  sumSpend,
  type SpendPostRow,
  type SpendProjectRow,
  type SpendRoleRow,
  type SpendRoleShare,
} from "@/lib/spend-tracker";
import type { UserRole } from "@/types";
import styles from "./spend.module.css";

export default function SpendPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const queue = useQueueStore((s) => s.tasks);
  const workflow = useWorkflowStore((s) => s.tasks);
  const projects = useProjectsStore((s) => s.projects);
  const units = useProjectsStore((s) => s.contentUnits);
  const aiSettings = useSettingsStore((s) => s.aiSettings);
  const updateAISettings = useSettingsStore((s) => s.updateAISettings);
  const { query } = useSearch();
  const [limitDraft, setLimitDraft] = useState("");
  const [view, setView] = useState<"roles" | "tasks" | "projects">("projects");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<UserRole | null>(null);

  const allowed = Boolean(currentUser && isManagementRole(currentUser.role));
  const isAdmin = Boolean(currentUser && isAdminRole(currentUser.role));

  useEffect(() => {
    if (currentUser && !isManagementRole(currentUser.role)) {
      router.replace("/projects");
    }
  }, [currentUser, router]);

  useEffect(() => {
    setLimitDraft(String(aiSettings.monthlySpendLimit ?? 0));
  }, [aiSettings.monthlySpendLimit]);

  const month = currentMonthKey();
  const lines = useMemo(
    () =>
      filterByProjectAccess(
        currentUser,
        getSpendLines(queue, workflow, users, projects, units)
      ),
    [currentUser, queue, workflow, users, projects, units]
  );
  const monthLines = useMemo(
    () =>
      filterSpendByMonth(lines, month).filter((line) =>
        matchesSearch(
          query,
          line.title,
          line.projectName,
          line.requesterLabel,
          line.roleLabel,
          line.typeLabel,
          line.formatLabel
        )
      ),
    [lines, month, query]
  );
  const roles = useMemo(() => groupSpendByRole(monthLines), [monthLines]);
  const posts = useMemo(() => groupSpendByPost(monthLines), [monthLines]);
  const projectRows = useMemo(
    () => groupSpendByProject(monthLines),
    [monthLines]
  );
  const spent = sumSpend(monthLines);
  const limit = aiSettings.monthlySpendLimit || 0;
  const { remaining, willAsk, isWarn, ratio } = spendLimitState(spent, limit);

  if (!currentUser || !allowed) return null;

  const saveLimit = () => {
    updateAISettings({
      monthlySpendLimit: Math.max(0, parseInt(limitDraft, 10) || 0),
    });
  };

  return (
    <AppShell breadcrumb="Счётчик расходов">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Счётчик расходов</h1>
          <p className={styles.pageDescription}>
            Расходы ИИ за месяц: по ролям, по задачам и по проектам. Лимит,
            после которого платформа спросит.
          </p>
        </div>
      </div>

      <section
        className={`${styles.summary} ${willAsk ? styles.summaryAsk : ""} ${isWarn ? styles.summaryWarn : ""}`}
      >
        <div>
          <p className={styles.summaryLabel}>{formatMonthKey(month)}</p>
          <p className={styles.summaryValue}>{formatRub(spent)}</p>
          <p className={styles.summaryMeta}>
            {formatGenerationCount(monthLines.length)} команды
          </p>
        </div>
        <div className={styles.limitBlock}>
          <p className={styles.summaryLabel}>Лимит месяца</p>
          {isAdmin ? (
            <div className={styles.limitEdit}>
              <Input
                type="number"
                min={0}
                value={limitDraft}
                onChange={(event) => setLimitDraft(event.target.value)}
                aria-label="Лимит расходов в месяц"
              />
              <Button size="small" onClick={saveLimit}>
                Сохранить
              </Button>
            </div>
          ) : (
            <p className={styles.summaryValue}>{formatRub(limit)}</p>
          )}
          <p className={styles.summaryMeta}>
            {willAsk
              ? "Лимит исчерпан — следующая генерация спросит подтверждение"
              : isWarn
                ? `Почти у лимита · осталось ${formatRub(remaining)}`
                : `Осталось ${formatRub(remaining)}`}
          </p>
          <div className={styles.bar} aria-hidden>
            <span
              className={styles.barFill}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </div>
        </div>
      </section>

      {monthLines.length === 0 ? (
        <EmptyState
          title="Нет расходов за этот месяц"
          description="Генерации команды появятся здесь"
        />
      ) : (
        <>
          {!projectId && !taskId && !roleId && (
            <Tabs
              tabs={[
                { id: "projects", label: "По проектам" },
                { id: "tasks", label: "По задачам" },
                { id: "roles", label: "По ролям" },
              ]}
              activeTab={view}
              onChange={(id) => setView(id as "roles" | "tasks" | "projects")}
            />
          )}

          {view === "roles" && (
            <RolesDrill
              roles={roles}
              roleId={roleId}
              onEnter={setRoleId}
              onBack={() => setRoleId(null)}
            />
          )}

          {view === "tasks" && (
            <TasksDrill
              posts={posts}
              taskId={taskId}
              onEnter={setTaskId}
              onBack={() => setTaskId(null)}
            />
          )}

          {view === "projects" && (
            <ProjectsDrill
              projects={projectRows}
              projectId={projectId}
              taskId={taskId}
              onEnterProject={(id) => {
                setProjectId(id);
                setTaskId(null);
              }}
              onEnterTask={setTaskId}
              onBack={() => {
                if (taskId) {
                  setTaskId(null);
                  return;
                }
                setProjectId(null);
              }}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

function projectNamesFromTasks(tasks: SpendPostRow[]): string {
  const names: string[] = [];
  const seen = new Set<string>();
  tasks.forEach((task) => {
    if (seen.has(task.projectName)) return;
    seen.add(task.projectName);
    names.push(task.projectName);
  });
  return names.join(", ");
}

function formatGenerationCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} генерация`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} генерации`;
  }
  return `${count} генераций`;
}

function RolesDrill({
  roles,
  roleId,
  onEnter,
  onBack,
}: {
  roles: SpendRoleRow[];
  roleId: UserRole | null;
  onEnter: (id: UserRole) => void;
  onBack: () => void;
}) {
  const role = roles.find((item) => item.role === roleId);
  if (role) {
    return (
      <section className={styles.stack} aria-label={`Расходы: ${role.label}`}>
        <DrillHead
          title={role.label}
          meta={`${formatGenerationCount(role.generations)} · ${formatRub(role.amount)}`}
          onBack={onBack}
        />
        <TaskList tasks={role.tasks} />
      </section>
    );
  }

  return (
    <section className={styles.stack} aria-label="Расходы по ролям">
      {roles.map((item) => (
        <DrillRow
          key={item.role}
          title={item.label}
          meta={projectNamesFromTasks(item.tasks)}
          generations={item.generations}
          amount={item.amount}
          onOpen={() => onEnter(item.role)}
        />
      ))}
    </section>
  );
}

function TasksDrill({
  posts,
  taskId,
  onEnter,
  onBack,
}: {
  posts: SpendPostRow[];
  taskId: string | null;
  onEnter: (id: string) => void;
  onBack: () => void;
}) {
  const task = posts.find((item) => item.contentUnitId === taskId);
  if (task) {
    return (
      <section className={styles.stack} aria-label={`Расходы: ${task.title}`}>
        <DrillHead
          title={task.title}
          meta={`${task.projectName} · ${task.formatLabel} · ${formatGenerationCount(task.generations)} · ${formatRub(task.amount)}`}
          href={task.href}
          onBack={onBack}
        />
        <ShareList shares={task.roles ?? []} />
      </section>
    );
  }

  return (
    <section className={styles.stack} aria-label="Расходы по задачам">
      {posts.map((item) => (
        <DrillRow
          key={item.contentUnitId}
          title={item.title}
          meta={`${item.projectName} · ${item.formatLabel}`}
          generations={item.generations}
          amount={item.amount}
          href={item.href}
          onOpen={() => onEnter(item.contentUnitId)}
        />
      ))}
    </section>
  );
}

function ProjectsDrill({
  projects,
  projectId,
  taskId,
  onEnterProject,
  onEnterTask,
  onBack,
}: {
  projects: SpendProjectRow[];
  projectId: string | null;
  taskId: string | null;
  onEnterProject: (id: string) => void;
  onEnterTask: (id: string) => void;
  onBack: () => void;
}) {
  const project = projects.find((item) => item.projectId === projectId);
  const task = project?.tasks.find((item) => item.contentUnitId === taskId);

  if (project && task) {
    return (
      <section className={styles.stack} aria-label={`Расходы: ${task.title}`}>
        <DrillHead
          title={task.title}
          meta={`${project.label} · ${task.formatLabel} · ${formatGenerationCount(task.generations)} · ${formatRub(task.amount)}`}
          href={task.href}
          onBack={onBack}
        />
        <ShareList shares={task.roles} />
      </section>
    );
  }

  if (project) {
    return (
      <section className={styles.stack} aria-label={`Расходы: ${project.label}`}>
        <DrillHead
          title={project.label}
          meta={`${formatGenerationCount(project.generations)} · ${formatRub(project.amount)}`}
          onBack={onBack}
        />
        {project.tasks.map((item) => (
          <DrillRow
            key={item.contentUnitId}
            title={item.title}
            meta={item.formatLabel}
            generations={item.generations}
            amount={item.amount}
            href={item.href}
            onOpen={() => onEnterTask(item.contentUnitId)}
          />
        ))}
      </section>
    );
  }

  return (
    <section className={styles.stack} aria-label="Расходы по проектам">
      {projects.map((item) => (
        <DrillRow
          key={item.projectId}
          title={item.label}
          generations={item.generations}
          amount={item.amount}
          onOpen={() => onEnterProject(item.projectId)}
        />
      ))}
    </section>
  );
}

function DrillHead({
  title,
  meta,
  href,
  onBack,
}: {
  title: string;
  meta: string;
  href?: string;
  onBack: () => void;
}) {
  return (
    <header className={styles.drillHead}>
      <div className={styles.drillBar}>
        <Button type="button" variant="ghost" size="small" onClick={onBack}>
          <CaretLeft size={16} aria-hidden />
          Назад
        </Button>
        {href && (
          <Link href={href}>
            <Button variant="muted" size="small">
              Открыть
            </Button>
          </Link>
        )}
      </div>
      <h2 className={styles.drillTitle}>{title}</h2>
      <p className={styles.drillMeta}>{meta}</p>
    </header>
  );
}

function DrillRow({
  title,
  meta,
  generations,
  amount,
  href,
  onOpen,
}: {
  title: string;
  meta?: string;
  generations: number;
  amount: number;
  href?: string;
  onOpen?: () => void;
}) {
  const stats = (
    <span className={styles.rowStats}>
      <span className={styles.gens}>{formatGenerationCount(generations)}</span>
      <span className={styles.time}>{formatRub(amount)}</span>
    </span>
  );

  return (
    <article className={styles.row}>
      {onOpen ? (
        <button type="button" className={styles.rowMain} onClick={onOpen}>
          <div className={styles.rowCopy}>
            <p className={styles.rowTitle}>{title}</p>
            {meta ? <p className={styles.rowMeta}>{meta}</p> : null}
          </div>
          {stats}
        </button>
      ) : (
        <div className={styles.rowMain}>
          <div className={styles.rowCopy}>
            <p className={styles.rowTitle}>{title}</p>
            {meta ? <p className={styles.rowMeta}>{meta}</p> : null}
          </div>
          {stats}
        </div>
      )}
      {href ? (
        <Link href={href} className={styles.rowOpen}>
          <Button variant="muted" size="small">
            Открыть
          </Button>
        </Link>
      ) : onOpen ? (
        <div className={styles.rowOpen}>
          <Button type="button" variant="muted" size="small" onClick={onOpen}>
            Открыть
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function TaskList({ tasks }: { tasks: SpendPostRow[] }) {
  return (
    <>
      {tasks.map((task) => (
        <DrillRow
          key={task.contentUnitId}
          title={task.title}
          meta={`${task.projectName} · ${task.formatLabel}`}
          generations={task.generations}
          amount={task.amount}
          href={task.href}
        />
      ))}
    </>
  );
}

function ShareList({ shares }: { shares: SpendRoleShare[] }) {
  return (
    <>
      {shares.map((share) => (
        <DrillRow
          key={share.role}
          title={share.label}
          generations={share.generations}
          amount={share.amount}
        />
      ))}
    </>
  );
}
