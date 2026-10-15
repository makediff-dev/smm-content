"use client";

import { ManagementGuard } from "@/components/layout/auth-guard";

export default function StuckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagementGuard>{children}</ManagementGuard>;
}
