import type { TaskStatus } from "@/types";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulateTask(
  onStatusChange: (status: TaskStatus) => void,
  steps: TaskStatus[] = ["queued", "in_progress", "done"],
  stepDelay = 1200
): Promise<void> {
  for (const status of steps) {
    onStatusChange(status);
    if (status !== steps[steps.length - 1]) {
      await delay(stepDelay);
    }
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSameDateKey(a: string, b: string): boolean {
  return a === b;
}
