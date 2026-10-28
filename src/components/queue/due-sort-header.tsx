"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import styles from "./due-sort-header.module.css";

export type DueSort = "asc" | "desc" | null;

interface DueSortHeaderProps {
  value: DueSort;
  onChange: (value: DueSort) => void;
}

export function DueSortHeader({ value, onChange }: DueSortHeaderProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${value ? styles.triggerActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Срок
        <CaretDown size={12} weight="bold" />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            className={`${styles.item} ${value === "asc" ? styles.itemActive : ""}`}
            role="menuitem"
            onClick={() => {
              onChange("asc");
              setOpen(false);
            }}
          >
            По возрастанию
          </button>
          <button
            type="button"
            className={`${styles.item} ${value === "desc" ? styles.itemActive : ""}`}
            role="menuitem"
            onClick={() => {
              onChange("desc");
              setOpen(false);
            }}
          >
            По убыванию
          </button>
        </div>
      )}
    </div>
  );
}
