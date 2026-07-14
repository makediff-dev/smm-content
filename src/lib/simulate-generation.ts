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
