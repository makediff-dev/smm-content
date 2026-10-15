"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { canAccessUsersAndAiModels, isManagementRole } from "@/lib/roles";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !currentUser) {
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentUser]);

  if (!hydrated) return null;
  if (!currentUser) return null;

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) {
      router.replace("/login");
    } else if (!canAccessUsersAndAiModels(currentUser.role)) {
      router.replace("/projects");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentUser]);

  if (!hydrated) return null;
  if (!currentUser || !canAccessUsersAndAiModels(currentUser.role)) return null;

  return <>{children}</>;
}

export function ManagementGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) {
      router.replace("/login");
    } else if (!isManagementRole(currentUser.role)) {
      router.replace("/projects");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentUser]);

  if (!hydrated) return null;
  if (!currentUser || !isManagementRole(currentUser.role)) return null;

  return <>{children}</>;
}
