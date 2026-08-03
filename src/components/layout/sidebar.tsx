"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut, User } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";
import { useQueueStore } from "@/stores/queue-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { getNavigationForRole } from "@/lib/navigation";
import { getRoleLabel, isManagementRole } from "@/lib/roles";
import { navIconMap } from "@/lib/nav-icons";
import { NotificationsPanel } from "./notifications-panel";
import styles from "./sidebar.module.css";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const workflowCount = useWorkflowStore((s) =>
    currentUser ? s.getActiveCountForUser(currentUser) : 0
  );
  const isManagement = currentUser ? isManagementRole(currentUser.role) : false;
  const aiQueueCount = useQueueStore((s) =>
    currentUser
      ? s.getActiveCountForUser(currentUser.id, isManagement)
      : 0
  );
  const navItems = currentUser ? getNavigationForRole(currentUser.role) : [];
  const queueBadgeCount = isManagement
    ? workflowCount + aiQueueCount
    : workflowCount;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoText}>SMM Content</div>
        <div className={styles.logoSub}>UX-прототип</div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = navIconMap[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <Icon
                size={20}
                weight={isActive ? "fill" : "regular"}
                className={styles.navIcon}
              />
              <span className={styles.navLabel}>{item.label}</span>
              {item.href === "/queue" && queueBadgeCount > 0 && (
                <span className={styles.navBadge}>{queueBadgeCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {currentUser && (
        <div className={styles.account}>
          <div className={styles.accountInfo}>
            <div className={styles.avatar}>
              {getInitials(currentUser.name) || <User size={18} weight="bold" />}
            </div>
            <div className={styles.accountText}>
              <div className={styles.accountName}>{currentUser.name}</div>
              <div className={styles.accountEmail}>{currentUser.email}</div>
              <div className={styles.accountRole}>
                {getRoleLabel(currentUser.role)}
              </div>
            </div>
            <NotificationsPanel />
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <SignOut size={16} weight="bold" />
            Выйти
          </button>
        </div>
      )}
    </aside>
  );
}
