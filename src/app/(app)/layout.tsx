"use client";

import { AuthGuard } from "@/components/layout/auth-guard";
import { SearchProvider } from "@/components/layout/search-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SearchProvider>{children}</SearchProvider>
    </AuthGuard>
  );
}
