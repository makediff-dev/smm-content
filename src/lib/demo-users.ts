import type { User } from "@/types";
import { SEED_USERS } from "@/data/seed";

const DEMO_EMAILS = new Set(SEED_USERS.map((user) => user.email));

const LEGACY_EMAIL_ALIASES: Record<string, string> = {
  "manager@smm.local": "pm@smm.local",
};

export function normalizeDemoEmail(email: string): string {
  return LEGACY_EMAIL_ALIASES[email] ?? email;
}

/** Demo accounts always come from seed; custom users are preserved. */
export function mergeSeedUsers(storedUsers: User[] = []): User[] {
  const customUsers = storedUsers.filter(
    (user) => !DEMO_EMAILS.has(normalizeDemoEmail(user.email))
  );
  return [...SEED_USERS, ...customUsers];
}

export function findDemoUser(email: string, password: string): User | undefined {
  const normalizedEmail = normalizeDemoEmail(email);
  return SEED_USERS.find(
    (user) => user.email === normalizedEmail && user.password === password
  );
}

export function resolveStoredUser(
  users: User[],
  currentUser: User | null
): User | null {
  if (!currentUser) return null;

  const email = normalizeDemoEmail(currentUser.email);
  return (
    users.find((user) => user.email === email) ??
    users.find((user) => user.id === currentUser.id) ??
    null
  );
}
