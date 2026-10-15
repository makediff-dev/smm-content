"use client";

import Link from "next/link";
import type { ContentUnit } from "@/types";
import { FORMAT_LABELS } from "@/types";
import { formatIconMap } from "@/lib/format-icons";
import { formatDate } from "@/lib/simulate-generation";
import { StatusBadge } from "@/components/shared/status-badge";
import styles from "./content-unit-card.module.css";

interface ContentUnitCardProps {
  content: ContentUnit;
  projectId: string;
  layout?: "list" | "grid";
}

export function ContentUnitCard({
  content,
  projectId,
  layout = "list",
}: ContentUnitCardProps) {
  const FormatIcon = formatIconMap[content.format];
  const openHref =
    content.status === "done"
      ? `/history/${content.id}`
      : `/projects/${projectId}/content/${content.id}`;

  return (
    <Link
      href={openHref}
      className={`${styles.item} ${layout === "grid" ? styles.itemGrid : ""}`}
    >
      <div className={styles.info}>
        <div className={styles.title}>{content.title}</div>
        <div className={styles.meta}>
          <StatusBadge status={content.status} variant="tag" />
          <span className={styles.metaTag}>
            <FormatIcon size={12} weight="regular" className={styles.metaTagIcon} aria-hidden />
            {FORMAT_LABELS[content.format]}
          </span>
          {(content.sourceType === "file" ? content.sourceFileName : content.sourceUrl) && (
            <span className={styles.metaTag}>
              {content.sourceType === "file"
                ? content.sourceFileName
                : layout === "grid"
                  ? content.sourceUrl.replace(/^https?:\/\//, "").slice(0, 28)
                  : `${content.sourceUrl.slice(0, 36)}...`}
            </span>
          )}
          <span className={styles.metaTag}>
            {formatDate(content.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
