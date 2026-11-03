"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretDown, Check, X } from "@phosphor-icons/react";
import type { Prompt } from "@/types";
import { uniquePromptIds } from "@/lib/prompt-ids";
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
  value: string[];
  onChange: (value: string[]) => void;
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
  const selectedIds = uniquePromptIds(value);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("shared");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = selectedIds
    .map((itemId) => prompts.find((prompt) => prompt.id === itemId))
    .filter((prompt): prompt is Prompt => Boolean(prompt));
  const visible = prompts.filter((prompt) =>
    scope === "own" ? isOwn(prompt) : !isOwn(prompt)
  );
  const previewed =
    visible.find((prompt) => prompt.id === hoveredId) ??
    visible.find((prompt) => selectedIds.includes(prompt.id)) ??
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

  const toggleOpen = () => {
    const first = selected[0];
    if (first) {
      setScope(isOwn(first) ? "own" : "shared");
    }
    setOpen((current) => !current);
  };

  const clear = () => {
    onChange([]);
  };

  const toggleId = (promptId: string) => {
    onChange(
      selectedIds.includes(promptId)
        ? selectedIds.filter((item) => item !== promptId)
        : [...selectedIds, promptId]
    );
  };

  return (
    <div className={styles.picker} ref={rootRef}>
      <div
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-multiselectable="true"
        className={`${styles.pickerTrigger} ${open ? styles.pickerTriggerOpen : ""} ${
          disabled ? styles.pickerTriggerDisabled : ""
        }`}
        onClick={() => {
          if (!disabled) toggleOpen();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }
        }}
      >
        <span className={styles.pickerValues}>
          {selected.length === 0 ? (
            <span className={styles.pickerPlaceholder}>Выберите промпты</span>
          ) : (
            selected.map((prompt) => (
              <span key={prompt.id} className={styles.pickerChip}>
                {prompt.name}
                <button
                  type="button"
                  aria-label={`Убрать «${prompt.name}»`}
                  className={styles.pickerChipRemove}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleId(prompt.id);
                  }}
                >
                  <X size={10} weight="bold" />
                </button>
              </span>
            ))
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            aria-label="Убрать все промпты"
            className={styles.pickerClear}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
          >
            <X size={12} weight="bold" />
          </button>
        )}
        <CaretDown
          size={16}
          className={`${styles.pickerChevron} ${open ? styles.pickerChevronOpen : ""}`}
        />
      </div>

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
            <ul className={styles.pickerList} role="listbox" aria-multiselectable="true">
              {visible.length === 0 && (
                <li className={styles.pickerEmpty}>{EMPTY_LABELS[scope]}</li>
              )}
              {visible.map((prompt) => {
                const checked = selectedIds.includes(prompt.id);
                return (
                  <li key={prompt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      className={`${styles.pickerOption} ${
                        checked ? styles.pickerOptionSelected : ""
                      }`}
                      onMouseEnter={() => setHoveredId(prompt.id)}
                      onFocus={() => setHoveredId(prompt.id)}
                      onClick={() => toggleId(prompt.id)}
                    >
                      <span
                        className={`${styles.pickerCheck} ${
                          checked ? styles.pickerCheckOn : ""
                        }`}
                        aria-hidden
                      >
                        {checked ? <Check size={11} weight="bold" /> : null}
                      </span>
                      <span className={styles.pickerOptionCopy}>
                        <span className={styles.pickerOptionTitle}>{prompt.name}</span>
                        {prompt.description && (
                          <span className={styles.pickerOptionHint}>{prompt.description}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
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
