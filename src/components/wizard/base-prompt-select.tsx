"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretDown, X } from "@phosphor-icons/react";
import type { Prompt } from "@/types";
import styles from "./wizard.module.css";

type Scope = "shared" | "own";

const SCOPE_TABS: { id: Scope; label: string }[] = [
  { id: "shared", label: "Базовые" },
  { id: "own", label: "Мои" },
];

const EMPTY_LABELS: Record<Scope, string> = {
  shared: "Общих промптов пока нет",
  own: "У вас пока нет своих промптов",
};

const isOwn = (prompt: Prompt) => Boolean(prompt.ownerId);

interface BasePromptSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  prompts: Prompt[];
  disabled?: boolean;
}

export function BasePromptSelect({
  id,
  value,
  onChange,
  prompts,
  disabled,
}: BasePromptSelectProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("shared");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = prompts.find((prompt) => prompt.id === value);
  const visible = prompts.filter((prompt) =>
    scope === "own" ? isOwn(prompt) : !isOwn(prompt)
  );
  const previewed =
    visible.find((prompt) => prompt.id === hoveredId) ??
    visible.find((prompt) => prompt.id === value) ??
    visible[0];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const toggle = () => {
    if (selected) {
      setScope(isOwn(selected) ? "own" : "shared");
    }
    setOpen((current) => !current);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div className={styles.picker} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`${styles.pickerTrigger} ${open ? styles.pickerTriggerOpen : ""}`}
        disabled={disabled}
        onClick={toggle}
      >
        <span className={selected ? undefined : styles.pickerPlaceholder}>
          {selected ? selected.name : "Выберите промпт"}
        </span>
        {selected && (
          <span className={styles.pickerBadge}>
            {isOwn(selected) ? "Мой" : "Базовый"}
          </span>
        )}
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Убрать базовый промпт"
            className={styles.pickerClear}
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                clear();
              }
            }}
          >
            <X size={12} weight="bold" />
          </span>
        )}
        <CaretDown
          size={16}
          className={`${styles.pickerChevron} ${open ? styles.pickerChevronOpen : ""}`}
        />
      </button>

      {open && (
        <div className={styles.pickerPanel}>
          <div className={styles.pickerTabs}>
            {SCOPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.pickerTab} ${tab.id === scope ? styles.pickerTabActive : ""}`}
                onClick={() => {
                  setScope(tab.id);
                  setHoveredId(null);
                }}
              >
                {tab.label}
                <span className={styles.pickerTabCount}>
                  {prompts.filter((prompt) => isOwn(prompt) === (tab.id === "own")).length}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.pickerBody}>
            <ul className={styles.pickerList} role="listbox">
              {visible.length === 0 && (
                <li className={styles.pickerEmpty}>{EMPTY_LABELS[scope]}</li>
              )}
              {visible.map((prompt) => (
                <li key={prompt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={prompt.id === value}
                    className={`${styles.pickerOption} ${
                      prompt.id === value ? styles.pickerOptionSelected : ""
                    }`}
                    onMouseEnter={() => setHoveredId(prompt.id)}
                    onFocus={() => setHoveredId(prompt.id)}
                    onClick={() => {
                      onChange(prompt.id);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.pickerOptionTitle}>{prompt.name}</span>
                    {prompt.description && (
                      <span className={styles.pickerOptionHint}>{prompt.description}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className={styles.pickerPreview}>
              {previewed ? (
                <>
                  <p className={styles.pickerPreviewTitle}>{previewed.name}</p>
                  <pre className={styles.pickerPreviewBody}>{previewed.text}</pre>
                </>
              ) : (
                <p className={styles.pickerEmpty}>
                  Наведите на промпт, чтобы увидеть текст
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
