import type { UserRole } from "@/types";
import type { Icon } from "@phosphor-icons/react";
import {
  canAccessUsersAndAiModels,
  isAdminRole,
  isManagementRole,
} from "@/lib/roles";

export type NavIconName =
  | "Folders"
  | "Clock"
  | "Calendar"
  | "TextAa"
  | "Cpu"
  | "Users"
  | "Warning"
  | "Wallet";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  adminOnly?: boolean;
  managersOnly?: boolean;
}

export const mainNavigation: NavItem[] = [
  { href: "/projects", label: "Мои проекты", icon: "Folders" },
  { href: "/queue", label: "Все задачи", icon: "Clock" },
  { href: "/kp", label: "КП", icon: "Calendar" },
  { href: "/admin/prompts", label: "Промпты", icon: "TextAa" },
  {
    href: "/admin/ai-models",
    label: "AI-модели",
    icon: "Cpu",
    adminOnly: true,
  },
  {
    href: "/stuck",
    label: "Таск-трекер",
    icon: "Warning",
    managersOnly: true,
  },
  {
    href: "/spend",
    label: "Счётчик расходов",
    icon: "Wallet",
    managersOnly: true,
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    icon: "Users",
    adminOnly: true,
  },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  return mainNavigation
    .filter((item) => {
      if (item.adminOnly) return canAccessUsersAndAiModels(role);
      if (item.managersOnly) return isManagementRole(role);
      return true;
    })
    .map((item) =>
      item.href === "/projects" && isAdminRole(role)
        ? { ...item, label: "Проекты" }
        : item
    );
}

export const routeTitles: Record<string, string> = {
  "/projects": "Мои проекты",
  "/queue": "Все задачи",
  "/stuck": "Таск-трекер",
  "/spend": "Счётчик расходов",
  "/kp": "Контент-план",
  "/archive": "Архив",
  "/admin/prompts": "Настройки промптов",
  "/admin/ai-models": "Настройки AI-моделей",
  "/admin/users": "Пользователи и роли",
};

export type { Icon };
