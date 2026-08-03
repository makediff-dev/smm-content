"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import styles from "./search-input.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Поиск…",
  className,
  "aria-label": ariaLabel = "Поиск",
}: SearchInputProps) {
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <MagnifyingGlass size={16} weight="bold" className={styles.icon} aria-hidden />
      <input
        type="text"
        role="searchbox"
        enterKeyHint="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}
