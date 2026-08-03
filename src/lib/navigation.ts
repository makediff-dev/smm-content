import type { UserRole } from "@/types";
import type { Icon } from "@phosphor-icons/react";
import { canAccessUsersAndAiModels } from "@/lib/roles";

export type NavIconName =
  | "Folders"
  | "Clock"
  | "Calendar"
  | "TextAa"
  | "Cpu"
  | "Users";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  adminOnly?: boolean;
}

export const mainNavigation: NavItem[] = [
  { href: "/projects", label: "Проекты", icon: "Folders" },
  { href: "/queue", label: "Очередь", icon: "Clock" },
  { href: "/kp", label: "КП", icon: "Calendar" },
  { href: "/admin/prompts", label: "Промпты", icon: "TextAa" },
  {
    href: "/admin/ai-models",
    label: "AI-модели",
    icon: "Cpu",
    adminOnly: true,
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    icon: "Users",
    adminOnly: true,
  },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  return mainNavigation.filter((item) => {
    if (item.adminOnly) return canAccessUsersAndAiModels(role);
    return true;
  });
}

export const routeTitles: Record<string, string> = {
  "/projects": "Проекты",
  "/queue": "Очередь задач",
  "/kp": "КП",
  "/admin/prompts": "Настройки промптов",
  "/admin/ai-models": "Настройки AI-моделей",
  "/admin/users": "Пользователи и роли",
};

export type { Icon };
