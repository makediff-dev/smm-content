"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/stores/auth-store";
import { useContentPlanStore } from "@/stores/content-plan-store";
import { canAccessProject } from "@/lib/roles";
import type { ContentFormat, ContentPlanSlot } from "@/types";
import { FORMAT_LABELS } from "@/types";
import {
  FORMAT_LEGEND,
  FORMAT_STRIP,
  formatArchiveSince,
  getArchivedPlanSlots,
  toDateKey,
} from "@/lib/content-plan";
import styles from "../kp/kp.module.css";

const FILTERS: { id: "all" | ContentFormat; label: string }[] = [
  { id: "all", label: "Все" },
  ...FORMAT_LEGEND.map((item) => ({
    id: item.format,
    label: item.format === "video_meme" ? "Мем" : item.label.replace("Текстовый пост", "Пост"),
  })),
];

export default function ArchivePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const slots = useContentPlanStore((s) => s.slots);
  const placeSlotOnDate = useContentPlanStore((s) => s.placeSlotOnDate);
  const [filter, setFilter] = useState<"all" | ContentFormat>("all");
  const [placing, setPlacing] = useState<ContentPlanSlot | null>(null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState("12:00");

  const archived = useMemo(() => getArchivedPlanSlots(slots), [slots]);
  const visible = useMemo(
    () =>
      archived.filter((slot) => {
        if (currentUser && !canAccessProject(currentUser, slot.projectId)) {
          return false;
        }
        return filter === "all" ? true : slot.format === filter;
      }),
    [archived, filter, currentUser]
  );

  const openPlace = (slot: ContentPlanSlot) => {
    setPlacing(slot);
    setDate(toDateKey(new Date()));
    setTime("12:00");
  };

  const confirmPlace = () => {
    if (!placing || !date || !time) return;
    placeSlotOnDate(placing.id, date, time);
    setPlacing(null);
  };

  return (
    <AppShell breadcrumb="Архив">
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div>
            <h1 className={styles.pageTitle}>Архив контента</h1>
            <p className={styles.pageDescription}>
              Готовый контент, который ещё не вышел. Достали из архива —
              поставили на любой день плана.
            </p>
          </div>
          <Link href="/kp">
            <Button variant="secondary">К контент-плану</Button>
          </Link>
        </div>

        <section className={styles.board} aria-label="Архив">
          <div className={styles.boardHead}>
            <h2 className={styles.sectionTitle}>Архив · {archived.length}</h2>
            <div className={styles.filters}>
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.filterChip} ${
                    filter === item.id ? styles.filterChipActive : ""
                  }`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.id !== "all" && (
                    <span
                      className={styles.legendDot}
                      style={{
                        background: FORMAT_STRIP[item.id],
                        marginRight: 6,
                      }}
                    />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className={styles.empty}>В архиве нет таких постов.</p>
          ) : (
            <ul className={styles.archiveList}>
              {visible.map((slot) => (
                <li key={slot.id} className={styles.archiveRow}>
                  <div>
                    <p className={styles.archiveTitle}>
                      <span
                        className={styles.legendDot}
                        style={{ background: FORMAT_STRIP[slot.format] }}
                      />
                      {slot.title}
                    </p>
                    <p className={styles.archiveMeta}>
                      {FORMAT_LABELS[slot.format]} · готово ·{" "}
                      {formatArchiveSince(slot.archivedAt)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className={styles.placeButton}
                    onClick={() => openPlace(slot)}
                  >
                    Поставить на день
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <p className={styles.archiveNote}>
            Задачу можно отправить в архив из плана и вернуть обратно. Постинг
            и отметка «вышло» — следующим этапом.
          </p>
        </section>
      </div>

      <Modal
        title="Поставить в план"
        open={Boolean(placing)}
        onClose={() => setPlacing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPlacing(null)}>
              Отмена
            </Button>
            <Button onClick={confirmPlace} disabled={!date || !time}>
              Поставить
            </Button>
          </>
        }
      >
        {placing && (
          <p className={styles.modalHint}>{placing.title}</p>
        )}
        <div className={styles.modalForm}>
          <Input
            type="date"
            label="Дата"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Input
            type="time"
            label="Время"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </Modal>
    </AppShell>
  );
}
