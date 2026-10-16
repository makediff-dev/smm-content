"use client";

import { useQueueStore } from "@/stores/queue-store";
import { useProjectsStore } from "@/stores/projects-store";
import { PrototypeDisclaimer } from "@/components/shared/prototype-disclaimer";
import { Clock, List, X } from "@phosphor-icons/react";
import styles from "./top-bar.module.css";

interface TopBarProps {
  projectId?: string;
  breadcrumb?: string;
  navOpen?: boolean;
  onToggleNav?: () => void;
}

export function TopBar({
  projectId,
  breadcrumb,
  navOpen = false,
  onToggleNav,
}: TopBarProps) {
  const queuedCount = useQueueStore((s) => s.getQueuedCount());
  const project = useProjectsStore((s) =>
    projectId ? s.getProject(projectId) : undefined
  );

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {onToggleNav && (
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={navOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={navOpen}
            onClick={onToggleNav}
          >
            {navOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        )}
        {project && (
          <span className={styles.projectName}>{project.name}</span>
        )}
        {breadcrumb && (
          <span className={styles.breadcrumb}>{breadcrumb}</span>
        )}
      </div>
      <div className={styles.center}>
        <PrototypeDisclaimer />
      </div>
      <div className={styles.right}>
        {queuedCount > 0 && (
          <span className={styles.indicator}>
            <Clock size={14} weight="bold" />
            {queuedCount} в очереди
          </span>
        )}
      </div>
    </header>
  );
}
