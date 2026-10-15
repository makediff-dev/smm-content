import {
  SEED_CONTENT,
  SEED_PROJECTS,
  SEED_QUEUE,
  SEED_WORKFLOW_TASKS,
} from "@/data/seed";
import type { ContentUnit, ProductionTask, Project, QueueTask } from "@/types";

export function mergeSeedWorkflowTasks(
  storedTasks: ProductionTask[] = []
): ProductionTask[] {
  const seedIds = new Set(SEED_WORKFLOW_TASKS.map((task) => task.id));
  const customTasks = storedTasks.filter((task) => !seedIds.has(task.id));
  return [...SEED_WORKFLOW_TASKS, ...customTasks];
}

export function mergeSeedContentUnits(
  storedUnits: ContentUnit[] = []
): ContentUnit[] {
  const seedIds = new Set(SEED_CONTENT.map((unit) => unit.id));
  const customUnits = storedUnits.filter((unit) => !seedIds.has(unit.id));
  return [...SEED_CONTENT, ...customUnits];
}

export function mergeSeedQueue(storedTasks: QueueTask[] = []): QueueTask[] {
  const seedIds = new Set(SEED_QUEUE.map((task) => task.id));
  const customTasks = storedTasks.filter((task) => !seedIds.has(task.id));
  return [...SEED_QUEUE, ...customTasks];
}

export function mergeSeedProjects(storedProjects: Project[] = []): Project[] {
  const seedIds = new Set(SEED_PROJECTS.map((project) => project.id));
  const customProjects = storedProjects.filter(
    (project) => !seedIds.has(project.id)
  );
  return [...SEED_PROJECTS, ...customProjects];
}
