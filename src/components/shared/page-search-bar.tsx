"use client";

import { usePathname } from "next/navigation";
import { SearchInput } from "@/components/shared/search-input";
import { useSearch } from "@/components/layout/search-context";
import { getSearchPlaceholder } from "@/lib/search-ui";
import styles from "./page-search-bar.module.css";

interface PageSearchBarProps {
  placeholder?: string;
  className?: string;
}

export function PageSearchBar({ placeholder, className }: PageSearchBarProps) {
  const pathname = usePathname();
  const { query, setQuery, isSearchEnabled } = useSearch();

  if (!isSearchEnabled) return null;

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      placeholder={placeholder ?? getSearchPlaceholder(pathname)}
      className={`${styles.bar} ${className ?? ""}`}
    />
  );
}
