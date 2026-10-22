"use client";

import type { WorkflowStage } from "@/types";
import { Input } from "@/components/ui/input";
import { getRoleLabel } from "@/lib/roles";
import {
  CONFIGURABLE_SLA_STAGES,
  DEFAULT_ROLE_SLA_MINUTES,
  clampSlaMinutes,
} from "@/lib/task-deadline";
import styles from "./role-sla-fields.module.css";

interface RoleSlaFieldsProps {
  values: Partial<Record<WorkflowStage, number>>;
  onChange: (values: Record<WorkflowStage, number>) => void;
}

export function RoleSlaFields({ values, onChange }: RoleSlaFieldsProps) {
  const update = (stage: WorkflowStage, raw: string) => {
    const next = { ...DEFAULT_ROLE_SLA_MINUTES, ...values };
    next[stage] = clampSlaMinutes(
      Number(raw),
      DEFAULT_ROLE_SLA_MINUTES[stage]
    );
    onChange(next);
  };

  return (
    <div className={styles.block}>
      <p className={styles.lead}>
        Срок на роль в минутах. Отсчёт начинается, когда задача поступает
        исполнителю.
      </p>
      <div className={styles.grid}>
        {CONFIGURABLE_SLA_STAGES.map((stage) => (
          <Input
            key={stage}
            type="number"
            min={1}
            step={1}
            label={`${getRoleLabel(stage)}, мин`}
            value={values[stage] ?? DEFAULT_ROLE_SLA_MINUTES[stage]}
            onChange={(event) => update(stage, event.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
