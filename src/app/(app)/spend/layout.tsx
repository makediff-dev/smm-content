"use client";

import { ManagementGuard } from "@/components/layout/auth-guard";

export default function SpendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagementGuard>{children}</ManagementGuard>;
}
