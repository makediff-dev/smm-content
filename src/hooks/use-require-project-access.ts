"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { canAccessProject } from "@/lib/roles";

export function useRequireProjectAccess(projectId: string | undefined) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const allowed = Boolean(
    currentUser && projectId && canAccessProject(currentUser, projectId)
  );

  useEffect(() => {
    if (!currentUser || !projectId) return;
    if (!canAccessProject(currentUser, projectId)) {
      router.replace("/projects");
    }
  }, [currentUser, projectId, router]);

  return allowed;
}
