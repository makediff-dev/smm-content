"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { matchesSearch } from "@/lib/search";
import { isManagementRole } from "@/lib/roles";
import {
  getPersonHref,
  getStuckTaskRows,
  groupTrackerByPerson,
  type StuckTaskRow,
} from "@/lib/stuck-tracker";
import styles from "./stuck.module.css";

export default function StuckPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const tasks = useWorkflowStore((s) => s.tasks);
  const { query } = useSearch();

  const allowed = Boolean(currentUser && isManagementRole(currentUser.role));

  useEffect(() => {
    if (currentUser && !isManagementRole(currentUser.role)) {
      router.replace("/projects");
    }
  }, [currentUser, router]);

  const rows = useMemo(() => {
    const all = getStuckTaskRows(tasks, users);
    return all.filter((row) =>
      matchesSearch(
        query,
        row.title,
        row.assigneeLabel,
        row.stageLabel,
        row.isReturned ? "возврат" : "",
        row.isHot ? "горит" : ""
      )
    );
  }, [tasks, users, query]);
  const people = useMemo(() => groupTrackerByPerson(tasks, users), [tasks, users]);
  const hot = rows.filter((row) => row.isHot);
  const rest = rows.filter((row) => !row.isHot);

  if (!currentUser || !allowed) return null;

  return (
    <AppShell breadcrumb="Таск-трекер">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Таск-трекер</h1>
          <p className={styles.pageDescription}>
            Сводка к журналу очереди: на ком задачи висят дольше всего и что
            горит. Откройте человека — там отчёт по срокам каждой задачи.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Ничего не зависло"
          description="Сейчас нет задач в производстве"
        />
      ) : (
        <>
          <section className={styles.people} aria-label="Команда">
            {people.map((person) => (
              <Link
                key={person.assigneeId ?? "none"}
                href={getPersonHref(person.assigneeId)}
                className={styles.personCard}
              >
                <h2 className={styles.personName}>{person.label}</h2>
                <p className={styles.personMeta}>
                  {formatTaskCount(person.count)}
                  {person.hotCount > 0 ? ` · горит ${person.hotCount}` : ""}
                </p>
                <p className={styles.personWait}>
                  Дольше всего: {person.longestLabel}
                </p>
              </Link>
            ))}
          </section>

          {hot.length > 0 && (
            <section className={styles.list} aria-label="Горит">
              <h2 className={styles.listTitle}>Горит · {hot.length}</h2>
              <ul className={styles.rows}>
                {hot.map((row) => (
                  <StuckRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section className={styles.list} aria-label="Остальные">
              <h2 className={styles.listTitle}>
                {hot.length > 0 ? "Остальные" : "Все активные"}
              </h2>
              <ul className={styles.rows}>
                {rest.map((row) => (
                  <StuckRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}

function formatTaskCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} задачи`;
  }
  return `${count} задач`;
}

function StuckRow({ row }: { row: StuckTaskRow }) {
  return (
    <li className={`${styles.row} ${row.isHot ? styles.rowHot : ""}`}>
      <div className={styles.rowCopy}>
        <p className={styles.rowTitle}>{row.title}</p>
        <p className={styles.rowMeta}>
          {row.assigneeLabel} · {row.stageLabel}
          {row.isReturned ? " · возврат" : ""}
        </p>
      </div>
      <span className={styles.time}>{row.durationLabel}</span>
      <Link href={row.href} className={styles.open}>
        <Button variant="secondary">Открыть</Button>
      </Link>
    </li>
  );
}
