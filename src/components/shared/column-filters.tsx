"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FunnelSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import styles from "./column-filters.module.css";

export const ALL_FILTER = "all";

export interface ColumnFilterField {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface ColumnFilterGroup {
  id: string;
  label?: string;
  fields: ColumnFilterField[];
}

interface ColumnFiltersProps {
  groups: ColumnFilterGroup[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  extra?: ReactNode;
  extraLabel?: string;
  extraActive?: boolean;
}

export function uniqueFilterOptions(
  values: Array<string | null | undefined>
): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  values.forEach((raw) => {
    const value = (raw ?? "").trim() || "—";
    if (seen.has(value)) return;
    seen.add(value);
    options.push({ value, label: value });
  });
  return options.sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

export function filterValue(values: Record<string, string>, key: string) {
  return values[key] ?? ALL_FILTER;
}

export function matchesColumnFilter(
  values: Record<string, string>,
  key: string,
  actual: string | null | undefined
) {
  const selected = filterValue(values, key);
  if (selected === ALL_FILTER) return true;
  const value = (actual ?? "").trim() || "—";
  return selected === value;
}

export function activeFilterCount(values: Record<string, string>) {
  return Object.values(values).filter((value) => value && value !== ALL_FILTER)
    .length;
}

export function ColumnFilters({
  groups,
  values,
  onChange,
  onReset,
  extra,
  extraLabel,
  extraActive = false,
}: ColumnFiltersProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = activeFilterCount(values) + (extraActive ? 1 : 0);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <Button
        variant={active > 0 ? "primary" : "muted"}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FunnelSimple size={18} weight={active > 0 ? "fill" : "regular"} />
        Фильтры
        {active > 0 ? ` · ${active}` : ""}
      </Button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Фильтры">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Фильтры</span>
            <button
              type="button"
              className={styles.reset}
              onClick={onReset}
              disabled={active === 0}
            >
              Сбросить
            </button>
          </div>
          {groups.map((group) => (
            <div key={group.id} className={styles.group}>
              {group.label && <p className={styles.groupLabel}>{group.label}</p>}
              <div className={styles.fields}>
                {group.fields.map((field) => (
                  <Select
                    key={field.key}
                    label={field.label}
                    value={filterValue(values, field.key)}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    options={[
                      { value: ALL_FILTER, label: "Все" },
                      ...field.options,
                    ]}
                  />
                ))}
              </div>
            </div>
          ))}
          {extra && (
            <div className={styles.extra}>
              {extraLabel && <p className={styles.groupLabel}>{extraLabel}</p>}
              {extra}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
