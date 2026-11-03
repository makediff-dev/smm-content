"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHomeHrefForRole } from "@/lib/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function HomePage() {
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
    router.replace(currentUser ? getHomeHrefForRole(currentUser.role) : "/login");
    // router identity can change every render in App Router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentUser]);

  return null;
}
