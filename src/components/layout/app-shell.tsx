"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import styles from "./app-shell.module.css";

interface AppShellProps {
  children: ReactNode;
  projectId?: string;
  breadcrumb?: string;
}

export function AppShell({ children, projectId, breadcrumb }: AppShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    const run = () => {
      if (
        !useAuthStore.persist.hasHydrated() ||
        !useWorkflowStore.persist.hasHydrated()
      ) {
        return;
      }
      const users = useAuthStore.getState().users;
      useWorkflowStore.getState().notifyOverdueTasks(users);
    };

    const unsubAuth = useAuthStore.persist.onFinishHydration(run);
    const unsubWorkflow = useWorkflowStore.persist.onFinishHydration(run);
    run();
    const intervalId = window.setInterval(run, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubAuth();
      unsubWorkflow();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div className={styles.shell}>
      <TopBar
        projectId={projectId}
        breadcrumb={breadcrumb}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
      />
      <div className={styles.body}>
        {navOpen && (
          <button
            type="button"
            className={styles.navBackdrop}
            aria-label="Закрыть меню"
            onClick={() => setNavOpen(false)}
          />
        )}
        <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
