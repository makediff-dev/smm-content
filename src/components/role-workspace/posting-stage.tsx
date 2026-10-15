"use client";

import { useMemo, useState } from "react";
import type { ContentPlanSlot, ContentUnit } from "@/types";
import { Button } from "@/components/ui/button";
import {
  copyTextToClipboard,
  downloadNamedFile,
  getPostingArchiveName,
  getPostingChecks,
  getPostingPacks,
} from "@/lib/posting-packs";
import styles from "./role-workspace.module.css";

function packBody(fileName: string, hint: string): string {
  return `HUB Content — пакет для постинга\n${fileName}\n${hint}\n`;
}

export function PostingPacks({
  content,
  slot,
}: {
  content: ContentUnit;
  slot: ContentPlanSlot;
}) {
  const packs = useMemo(
    () => getPostingPacks(content, slot.scheduledAt),
    [content, slot.scheduledAt]
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handlePack = (pack: (typeof packs)[number]) => {
    if (pack.action === "copy") {
      copyTextToClipboard(pack.copyText ?? content.postText);
      setCopiedId(pack.id);
      window.setTimeout(() => setCopiedId(null), 1600);
      return;
    }

    downloadNamedFile(
      pack.fileName ?? "pack.zip",
      packBody(pack.fileName ?? "pack.zip", pack.hint)
    );
  };

  return (
    <ul className={styles.packList}>
      {packs.map((pack) => (
        <li key={pack.id} className={styles.packRow}>
          <div>
            <p className={styles.packTitle}>{pack.title}</p>
            <p className={styles.packHint}>{pack.hint}</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => handlePack(pack)}>
            {pack.action === "copy"
              ? copiedId === pack.id
                ? "Скопировано"
                : "Копировать"
              : "Скачать"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

interface PostingSideProps {
  content: ContentUnit;
  slot: ContentPlanSlot;
  canOperate: boolean;
  alreadyPosted: boolean;
  onMarkPosted: () => void;
}

export function PostingSide({
  content,
  slot,
  canOperate,
  alreadyPosted,
  onMarkPosted,
}: PostingSideProps) {
  const archiveName = getPostingArchiveName(content.format, slot.scheduledAt);
  const checks = getPostingChecks();
  const packs = getPostingPacks(content, slot.scheduledAt);

  const handleDownloadAll = () => {
    downloadNamedFile(
      archiveName,
      packBody(
        archiveName,
        packs.map((pack) => `${pack.title}: ${pack.hint}`).join("\n")
      )
    );
  };

  return (
    <>
      <section className={styles.sideCard} aria-label="Весь набор">
        <h2 className={styles.sideTitle}>Весь набор одним архивом</h2>
        <p className={styles.archiveName}>{archiveName}</p>
      </section>

      <section className={styles.sideCard} aria-label="Проверено">
        <h2 className={styles.sideTitle}>Проверено</h2>
        <ul className={styles.checks}>
          {checks.map((item) => (
            <li
              key={item.text}
              className={`${styles.checkItem} ${item.ok ? styles.checkOk : styles.checkWarn}`}
            >
              <span className={styles.checkMark} aria-hidden>
                {item.ok ? "✓" : "!"}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        <Button onClick={handleDownloadAll}>Скачать всё</Button>
        {canOperate && !alreadyPosted ? (
          <Button variant="secondary" onClick={onMarkPosted}>
            Отметить «вышло»
          </Button>
        ) : (
          <p className={styles.note}>
            {alreadyPosted
              ? "Уже отмечено как вышедшее."
              : "Отметка «вышло» доступна менеджеру постинга."}
          </p>
        )}
      </div>
    </>
  );
}
