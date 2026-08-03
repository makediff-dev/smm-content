"use client";

import { AdminGuard } from "@/components/layout/auth-guard";

export default function AdminAiModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
