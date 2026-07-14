"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import styles from "./app-shell.module.css";

interface AppShellProps {
  children: ReactNode;
  projectId?: string;
  breadcrumb?: string;
}

export function AppShell({ children, projectId, breadcrumb }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <TopBar projectId={projectId} breadcrumb={breadcrumb} />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
