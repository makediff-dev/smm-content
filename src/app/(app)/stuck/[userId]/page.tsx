"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { matchesSearch } from "@/lib/search";
import { isManagementRole } from "@/lib/roles";
import { getAssigneeName } from "@/lib/workflow";
import {
  countVerdicts,
  getPersonTaskReports,
  type PersonTaskReport,
  type Punctuality,
} from "@/lib/stuck-tracker";
import styles from "../stuck.module.css";

const VERDICT_CLASS: Record<Punctuality, string> = {
  done_on_time: styles.verdictOnTime,
  done_late: styles.verdictLate,
  open_on_time: styles.verdictOpen,
  overdue: styles.verdictOverdue,
};

export default function TrackerPersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const tasks = useWorkflowStore((s) => s.tasks);
  const projects = useProjectsStore((s) => s.projects);
  const { query } = useSearch();

  const allowed = Boolean(currentUser && isManagementRole(currentUser.role));

  useEffect(() => {
    if (currentUser && !isManagementRole(currentUser.role)) {
      router.replace("/projects");
    }
  }, [currentUser, router]);

  const personLabel =
    userId === "none" ? "Не назначен" : getAssigneeName(userId, users);

  const reports = useMemo(() => {
    return getPersonTaskReports(userId, tasks, projects).filter((report) =>
      matchesSearch(
        query,
        report.title,
        report.projectName,
        report.stageLabel,
        report.formatLabel,
        report.verdictLabel,
        report.returnComment
      )
    );
  }, [userId, tasks, projects, query]);

  const totals = useMemo(() => countVerdicts(reports), [reports]);

  if (!currentUser || !allowed) return null;

  return (
    <AppShell breadcrumb="Таск-трекер">
      <Link href="/stuck" className={styles.back}>
        Все сотрудники
      </Link>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{personLabel}</h1>
          <p className={styles.pageDescription}>
            По каждой задаче видно, сдана она в срок или нет.
          </p>
        </div>
      </div>

      <section className={styles.stats} aria-label="Сводка по срокам">
        <article className={styles.stat}>
          <span className={styles.statLabel}>В срок</span>
          <strong className={styles.statValue}>{totals.onTime}</strong>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>С опозданием</span>
          <strong className={styles.statValue}>{totals.late}</strong>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Просрочены</span>
          <strong className={styles.statValue}>{totals.overdue}</strong>
        </article>
        <article className={styles.stat}>
          <span className={styles.statLabel}>Срок ещё идёт</span>
          <strong className={styles.statValue}>{totals.open}</strong>
        </article>
      </section>

      {reports.length === 0 ? (
        <EmptyState
          title="Задач нет"
          description="У этого человека пока нет задач в отчёте"
        />
      ) : (
        <ul className={styles.report}>
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function ReportCard({ report }: { report: PersonTaskReport }) {
  return (
    <li className={styles.reportCard}>
      <div className={styles.reportHead}>
        <div>
          <p className={styles.rowTitle}>{report.title}</p>
          <p className={styles.rowMeta}>
            {report.projectName} · {report.formatLabel} · {report.stageLabel}
            {report.isReturned ? " · возврат" : ""}
          </p>
        </div>
        <span className={`${styles.verdict} ${VERDICT_CLASS[report.verdict]}`}>
          {report.verdictLabel}
        </span>
      </div>
      <div className={styles.facts}>
        <div>
          <p className={styles.factLabel}>Взята</p>
          <p className={styles.factValue}>{report.startedLabel}</p>
        </div>
        <div>
          <p className={styles.factLabel}>Срок</p>
          <p className={styles.factValue}>{report.dueLabel}</p>
        </div>
        <div>
          <p className={styles.factLabel}>Сдана</p>
          <p className={styles.factValue}>{report.finishedLabel ?? "Ещё в работе"}</p>
        </div>
        <div>
          <p className={styles.factLabel}>Длительность</p>
          <p className={styles.factValue}>{report.durationLabel}</p>
        </div>
      </div>
      {report.returnComment && (
        <p className={styles.comment}>Возврат: {report.returnComment}</p>
      )}
      {report.href && (
        <div className={styles.comment}>
          <Link href={report.href}>
            <Button variant="ghost" size="small">
              Открыть задачу
            </Button>
          </Link>
        </div>
      )}
    </li>
  );
}
