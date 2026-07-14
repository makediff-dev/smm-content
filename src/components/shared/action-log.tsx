import type { ActionLogEntry } from "@/types";
import { formatDate } from "@/lib/simulate-generation";
import styles from "./action-log.module.css";

interface ActionLogProps {
  entries: ActionLogEntry[];
}

export function ActionLog({ entries }: ActionLogProps) {
  if (entries.length === 0) {
    return <div className={styles.empty}>История действий пуста</div>;
  }

  return (
    <div className={styles.log}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          <span className={styles.time}>{formatDate(entry.timestamp)}</span>
          <span className={styles.action}>{entry.action}</span>
          <span className={styles.user}>{entry.user}</span>
        </div>
      ))}
    </div>
  );
}
