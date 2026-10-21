"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { matchesSearch } from "@/lib/search";
import { isAdminRole, isManagementRole } from "@/lib/roles";
import {
  currentMonthKey,
  filterSpendByMonth,
  formatMonthKey,
  formatRub,
  getSpendLines,
  groupSpendByPerson,
  groupSpendByPost,
  spendLimitState,
  sumSpend,
} from "@/lib/spend-tracker";
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
    () => getSpendLines(queue, workflow, users, projects, units),
    [queue, workflow, users, projects, units]
  );
  const monthLines = useMemo(
    () =>
      filterSpendByMonth(lines, month).filter((line) =>
        matchesSearch(
          query,
          line.title,
          line.projectName,
          line.requesterLabel,
          line.typeLabel,
          line.formatLabel
        )
      ),
    [lines, month, query]
  );
  const people = useMemo(() => groupSpendByPerson(monthLines), [monthLines]);
  const posts = useMemo(() => groupSpendByPost(monthLines), [monthLines]);
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
            Сколько стоил каждый пост и месяц. Лимит, после которого платформа
            спросит.
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
          <section className={styles.people} aria-label="Расходы команды">
            {people.map((person) => (
              <article key={person.requesterId} className={styles.personCard}>
                <h2 className={styles.personName}>{person.label}</h2>
                <p className={styles.personAmount}>{formatRub(person.amount)}</p>
                <p className={styles.personMeta}>
                  {formatGenerationCount(person.generations)}
                </p>
              </article>
            ))}
          </section>

          <section className={styles.list} aria-label="Посты">
            <h2 className={styles.listTitle}>Сколько стоил пост</h2>
            <ul className={styles.rows}>
              {posts.map((post) => (
                <li key={post.contentUnitId} className={styles.row}>
                  <div className={styles.rowCopy}>
                    <p className={styles.rowTitle}>{post.title}</p>
                    <p className={styles.rowMeta}>
                      {post.projectName} · {post.formatLabel} ·{" "}
                      {post.generations} ген.
                    </p>
                  </div>
                  <span className={styles.time}>{formatRub(post.amount)}</span>
                  <Link href={post.href} className={styles.open}>
                    <Button variant="secondary">Открыть</Button>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
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
