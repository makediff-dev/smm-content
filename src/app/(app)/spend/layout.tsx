"use client";

import { SpendGuard } from "@/components/layout/auth-guard";

export default function SpendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SpendGuard>{children}</SpendGuard>;
}
