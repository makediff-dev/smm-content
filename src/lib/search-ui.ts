export function getSearchPlaceholder(pathname: string): string {
  if (pathname === "/projects") return "Поиск по проектам…";
  if (pathname.startsWith("/projects/")) return "Поиск по проекту…";
  if (pathname === "/queue") return "Поиск по задачам…";
  if (pathname === "/admin/users") return "Поиск по пользователям…";
  if (pathname.startsWith("/admin/prompts")) return "Поиск по промптам…";
  return "Поиск…";
}

export { normalizeSearchQuery, matchesSearch } from "@/lib/search";
