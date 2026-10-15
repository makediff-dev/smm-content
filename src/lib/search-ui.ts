export function getSearchPlaceholder(pathname: string): string {
  if (pathname === "/projects") return "Поиск по задачам…";
  if (pathname.startsWith("/projects/")) return "Поиск по проекту…";
  if (pathname === "/queue") return "Поиск по задачам…";
  if (pathname === "/stuck" || pathname.startsWith("/stuck/")) {
    return "Поиск по задачам трекера…";
  }
  if (pathname === "/spend") return "Поиск по расходам…";
  if (pathname === "/admin/users") return "Поиск по пользователям…";
  if (pathname.startsWith("/admin/prompts")) return "Поиск по промптам…";
  return "Поиск…";
}

export { normalizeSearchQuery, matchesSearch } from "@/lib/search";
