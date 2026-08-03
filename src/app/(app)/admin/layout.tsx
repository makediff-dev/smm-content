"use client";

import { AuthGuard } from "@/components/layout/auth-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
