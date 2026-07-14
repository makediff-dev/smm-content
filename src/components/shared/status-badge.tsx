"use client";

import {
  Check,
  Clock,
  WarningCircle,
  CircleNotch,
  PencilSimple,
  type Icon,
} from "@phosphor-icons/react";
import type { CardStatus, TaskStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import styles from "./status-badge.module.css";

type BadgeStatus = TaskStatus | CardStatus | "connected" | "disconnected" | "testing";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  variant?: "badge" | "tag";
}

const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  ready: "Готово",
  needs_edit: "Требует правки",
};

const CONNECTION_LABELS = {
  connected: "Подключено",
  disconnected: "Не подключено",
  testing: "Тестирование",
};

const STATUS_ICONS: Partial<Record<BadgeStatus, Icon>> = {
  draft: PencilSimple,
  queued: Clock,
  in_progress: CircleNotch,
  done: Check,
  error: WarningCircle,
  ready: Check,
  needs_edit: PencilSimple,
  connected: Check,
  disconnected: WarningCircle,
  testing: CircleNotch,
};

export function StatusBadge({
  status,
  label,
  variant = "badge",
}: StatusBadgeProps) {
  const displayLabel =
    label ??
    (status in STATUS_LABELS
      ? STATUS_LABELS[status as TaskStatus]
      : status in CARD_STATUS_LABELS
        ? CARD_STATUS_LABELS[status as CardStatus]
        : CONNECTION_LABELS[status as keyof typeof CONNECTION_LABELS] ?? status);

  const IconComponent = STATUS_ICONS[status];
  const className = [
    variant === "tag" ? styles.tag : styles.badge,
    styles[status] ?? "",
    variant === "tag" ? styles.tagVariant : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className}>
      {variant === "tag" && IconComponent && (
        <IconComponent size={12} weight="bold" className={styles.tagIcon} aria-hidden />
      )}
      {displayLabel}
    </span>
  );
}
