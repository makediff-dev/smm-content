"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  isSearchEnabled: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

function isSearchDisabledPath(pathname: string): boolean {
  if (pathname.startsWith("/kp")) return true;
  if (pathname.startsWith("/admin/ai-models")) return true;
  if (pathname.startsWith("/history/")) return true;
  if (pathname.includes("/wizard/")) return true;
  return false;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const isSearchEnabled = !isSearchDisabledPath(pathname);

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return (
    <SearchContext.Provider
      value={{
        query: isSearchEnabled ? query : "",
        setQuery,
        isSearchEnabled,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
