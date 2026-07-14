import type { UserRole } from "@/types";
import type { Icon } from "@phosphor-icons/react";

export type NavIconName =
  | "Folders"
  | "Clock"
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
  { href: "/admin/prompts", label: "Промпты", icon: "TextAa", adminOnly: true },
  { href: "/admin/ai-models", label: "AI-модели", icon: "Cpu", adminOnly: true },
  { href: "/admin/users", label: "Пользователи", icon: "Users", adminOnly: true },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === "admin") return mainNavigation;
  return mainNavigation.filter((item) => !item.adminOnly);
}

export const routeTitles: Record<string, string> = {
  "/projects": "Проекты",
  "/queue": "Очередь задач",
  "/admin/prompts": "Настройки промптов",
  "/admin/ai-models": "Настройки AI-моделей",
  "/admin/users": "Пользователи и роли",
};

export type { Icon };
