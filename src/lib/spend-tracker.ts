import type {
  ContentFormat,
  ContentUnit,
  ProductionTask,
  Project,
  QueueTask,
  QueueTaskType,
  User,
} from "@/types";
import { FORMAT_LABELS, QUEUE_TYPE_LABELS } from "@/types";
import { getRoleWorkspaceHref } from "@/lib/role-workspace";
import { getRoleLabel } from "@/lib/roles";

export const GENERATION_COST: Record<QueueTaskType, number> = {
  text_generation: 48,
  image_processing: 96,
  voice_generation: 140,
  video_assembly: 180,
  export: 15,
};

const FORMAT_GENERATIONS: Record<ContentFormat, QueueTaskType[]> = {
  text: ["text_generation", "image_processing"],
  gallery: ["text_generation", "image_processing"],
  slideshow: [
    "text_generation",
    "image_processing",
    "voice_generation",
    "video_assembly",
  ],
  video_meme: ["text_generation", "video_assembly"],
};

const REQUESTER_BY_TYPE: Record<QueueTaskType, string> = {
  text_generation: "user-copywriter",
  image_processing: "user-designer",
  voice_generation: "user-video",
  video_assembly: "user-video",
  export: "user-pm",
};

export interface SpendLine {
  id: string;
  contentUnitId: string;
  projectId: string;
  title: string;
  projectName: string;
  formatLabel: string;
  type: QueueTaskType;
  typeLabel: string;
  requesterId: string;
  requesterLabel: string;
  amount: number;
  createdAt: string;
  href: string;
}

export interface SpendPostRow {
  contentUnitId: string;
  title: string;
  projectName: string;
  formatLabel: string;
  amount: number;
  generations: number;
  href: string;
}

export interface SpendPersonRow {
  requesterId: string;
  label: string;
  amount: number;
  generations: number;
}

export function formatRub(amount: number): string {
  return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
}

export function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  return label;
}

function requesterLabel(userId: string, users: User[]): string {
  const user = users.find((item) => item.id === userId);
  if (!user) return "Команда";
  return `${user.name} (${getRoleLabel(user.role)})`;
}

export function getSpendLines(
  queue: QueueTask[],
  workflow: ProductionTask[],
  users: User[],
  projects: Project[],
  units: ContentUnit[]
): SpendLine[] {
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const projectName = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name ?? projectId;

  const fromQueue: SpendLine[] = queue.map((task) => {
    const unit = unitById.get(task.contentUnitId);
    const workflowTask = workflow.find(
      (item) => item.contentUnitId === task.contentUnitId
    );
    const title = unit?.title ?? workflowTask?.title ?? task.label;
    const format = unit?.format ?? workflowTask?.format ?? "text";
    return {
      id: task.id,
      contentUnitId: task.contentUnitId,
      projectId: task.projectId,
      title,
      projectName: projectName(task.projectId),
      formatLabel: FORMAT_LABELS[format],
      type: task.type,
      typeLabel: QUEUE_TYPE_LABELS[task.type],
      requesterId: task.managerId,
      requesterLabel: requesterLabel(task.managerId, users),
      amount: GENERATION_COST[task.type],
      createdAt: task.createdAt,
      href: getRoleWorkspaceHref(task.projectId, task.contentUnitId),
    };
  });

  const queuedKeys = new Set(
    fromQueue.map((line) => `${line.contentUnitId}:${line.type}`)
  );

  const fromWorkflow: SpendLine[] = workflow.flatMap((task) => {
    const types = FORMAT_GENERATIONS[task.format] ?? ["text_generation"];
    return types
      .filter((type) => !queuedKeys.has(`${task.contentUnitId}:${type}`))
      .map((type) => {
        const requesterId = REQUESTER_BY_TYPE[type];
        return {
          id: `est-${task.id}-${type}`,
          contentUnitId: task.contentUnitId,
          projectId: task.projectId,
          title: task.title,
          projectName: projectName(task.projectId),
          formatLabel: FORMAT_LABELS[task.format],
          type,
          typeLabel: QUEUE_TYPE_LABELS[type],
          requesterId,
          requesterLabel: requesterLabel(requesterId, users),
          amount: GENERATION_COST[type],
          createdAt: task.createdAt,
          href: getRoleWorkspaceHref(task.projectId, task.contentUnitId),
        };
      });
  });

  return [...fromQueue, ...fromWorkflow].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function filterSpendByMonth(
  lines: SpendLine[],
  key: string
): SpendLine[] {
  return lines.filter((line) => monthKey(line.createdAt) === key);
}

export function groupSpendByPost(lines: SpendLine[]): SpendPostRow[] {
  const map = new Map<string, SpendPostRow>();
  lines.forEach((line) => {
    const current = map.get(line.contentUnitId);
    if (current) {
      current.amount += line.amount;
      current.generations += 1;
      return;
    }
    map.set(line.contentUnitId, {
      contentUnitId: line.contentUnitId,
      title: line.title,
      projectName: line.projectName,
      formatLabel: line.formatLabel,
      amount: line.amount,
      generations: 1,
      href: line.href,
    });
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function groupSpendByPerson(lines: SpendLine[]): SpendPersonRow[] {
  const map = new Map<string, SpendPersonRow>();
  lines.forEach((line) => {
    const current = map.get(line.requesterId);
    if (current) {
      current.amount += line.amount;
      current.generations += 1;
      return;
    }
    map.set(line.requesterId, {
      requesterId: line.requesterId,
      label: line.requesterLabel,
      amount: line.amount,
      generations: 1,
    });
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function sumSpend(lines: SpendLine[]): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

export function spendLimitState(spent: number, limit: number) {
  const ratio = limit > 0 ? spent / limit : 0;
  const remaining = Math.max(0, limit - spent);
  const willAsk = spent >= limit;
  const isWarn = !willAsk && ratio >= 0.8;
  return { ratio, remaining, willAsk, isWarn };
}
