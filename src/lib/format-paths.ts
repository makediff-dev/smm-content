import type { ContentFormat, WorkflowStage } from "@/types";

export type PathStepKind = "person" | "ai";

export interface FormatPathStep {
  id: string;
  kind: PathStepKind;
  stage: WorkflowStage | null;
  label: string;
  hint: string;
}

const TEXT_PATH: FormatPathStep[] = [
  {
    id: "text-1",
    kind: "person",
    stage: "copywriter",
    label: "Копирайтер",
    hint: "тема, источник, текст",
  },
  {
    id: "text-5",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "вычитка",
  },
  {
    id: "text-7",
    kind: "person",
    stage: "designer",
    label: "Дизайнер",
    hint: "кадр, плашка, сторис",
  },
  {
    id: "text-8",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "текст и картинки вместе",
  },
  {
    id: "text-9",
    kind: "person",
    stage: "project_manager",
    label: "Менеджер проекта",
    hint: "ставит в план",
  },
];

const GALLERY_PATH: FormatPathStep[] = [
  {
    id: "gallery-1",
    kind: "person",
    stage: "copywriter",
    label: "Копирайтер",
    hint: "тема, источник, текст",
  },
  {
    id: "gallery-5",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "вычитка",
  },
  {
    id: "gallery-7",
    kind: "person",
    stage: "designer",
    label: "Дизайнер",
    hint: "порядок и вёрстка",
  },
  {
    id: "gallery-8",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "слайды и пост вместе",
  },
  {
    id: "gallery-9",
    kind: "person",
    stage: "project_manager",
    label: "Менеджер проекта",
    hint: "ставит в план",
  },
];

const SLIDESHOW_PATH: FormatPathStep[] = [
  {
    id: "slideshow-1",
    kind: "person",
    stage: "copywriter",
    label: "Копирайтер",
    hint: "тема, источник, текст",
  },
  {
    id: "slideshow-5",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "вычитка",
  },
  {
    id: "slideshow-7",
    kind: "person",
    stage: "designer",
    label: "Дизайнер",
    hint: "кадр, плашка, переносы",
  },
  {
    id: "slideshow-9",
    kind: "person",
    stage: "video_editor",
    label: "Видеомонтажёр",
    hint: "ударения, темп, эффекты",
  },
  {
    id: "slideshow-10",
    kind: "person",
    stage: "project_manager",
    label: "Менеджер проекта",
    hint: "ставит в план",
  },
];

const VIDEO_MEME_PATH: FormatPathStep[] = [
  {
    id: "meme-1",
    kind: "person",
    stage: "copywriter",
    label: "Копирайтер",
    hint: "видео и подводка",
  },
  {
    id: "meme-3",
    kind: "person",
    stage: "editor",
    label: "Редактор",
    hint: "вычитка",
  },
  {
    id: "meme-5",
    kind: "person",
    stage: "designer",
    label: "Дизайнер",
    hint: "текст, файлы, музыка",
  },
  {
    id: "meme-6",
    kind: "person",
    stage: "project_manager",
    label: "Менеджер проекта",
    hint: "ставит в план",
  },
];

export function getFormatPath(format: ContentFormat): FormatPathStep[] {
  if (format === "text") return TEXT_PATH;
  if (format === "gallery") return GALLERY_PATH;
  if (format === "slideshow") return SLIDESHOW_PATH;
  return VIDEO_MEME_PATH;
}

export function getFormatPathCurrentIndex(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: { hasText?: boolean; isComplete?: boolean; designApproved?: boolean }
): number {
  const steps = getFormatPath(format);
  if (options?.isComplete || currentStage === "posting_manager") {
    return steps.length - 1;
  }

  const matches = steps
    .map((step, index) => (step.stage === currentStage ? index : -1))
    .filter((index) => index >= 0);

  if (matches.length === 0) return 0;
  if (matches.length === 1) return matches[0];

  if (currentStage === "copywriter") {
    return options?.hasText ? matches[matches.length - 1] : matches[0];
  }

  if (currentStage === "editor") {
    if (options?.designApproved) return matches[matches.length - 1];
    return matches[0];
  }

  if (currentStage === "project_manager") {
    return options?.designApproved ? matches[matches.length - 1] : matches[0];
  }

  return matches[0];
}

export function resolveFormatPathIndex(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: {
    hasText?: boolean;
    isComplete?: boolean;
    designApproved?: boolean;
    pathId?: string | null;
  }
): number {
  const steps = getFormatPath(format);
  if (options?.pathId) {
    const byId = steps.findIndex((step) => step.id === options.pathId);
    if (byId >= 0) return byId;
  }
  return getFormatPathCurrentIndex(format, currentStage, options);
}

export function getDesignApprovedForPathIndex(
  format: ContentFormat,
  index: number
): boolean {
  const designerIndex = getFormatPath(format).findIndex(
    (step) => step.stage === "designer"
  );
  if (designerIndex < 0) return false;
  return index > designerIndex;
}

export function getPersonStageForPathIndex(
  format: ContentFormat,
  index: number
): WorkflowStage {
  const steps = getFormatPath(format);
  const current = steps[index];
  if (current?.stage) return current.stage;
  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = steps[i].stage;
    if (previous) return previous;
  }
  return "copywriter";
}

export type AdminPathTarget =
  | { type: "path"; step: FormatPathStep; index: number }
  | { type: "posting" };

export function getAdminPathNeighbors(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: {
    hasText?: boolean;
    isComplete?: boolean;
    designApproved?: boolean;
    pathId?: string | null;
  }
): {
  currentIndex: number;
  previous: AdminPathTarget | null;
  next: AdminPathTarget | null;
} {
  const steps = getFormatPath(format);
  if (currentStage === "posting_manager") {
    const last = steps[steps.length - 1];
    return {
      currentIndex: steps.length - 1,
      previous: last
        ? { type: "path", step: last, index: steps.length - 1 }
        : null,
      next: null,
    };
  }

  const currentIndex = resolveFormatPathIndex(format, currentStage, options);
  const prevStep = steps[currentIndex - 1];
  const nextStep = steps[currentIndex + 1];

  return {
    currentIndex,
    previous: prevStep
      ? { type: "path", step: prevStep, index: currentIndex - 1 }
      : null,
    next: nextStep
      ? { type: "path", step: nextStep, index: currentIndex + 1 }
      : { type: "posting" },
  };
}

export function getAdminPathTargetLabel(target: AdminPathTarget): string {
  if (target.type === "posting") return "Менеджер постинга";
  return target.step.label;
}

export function getAdminRollbackOptionLabel(target: AdminPathTarget): string {
  if (target.type === "posting") return "Менеджер постинга";
  return target.step.hint
    ? `${target.step.label} — ${target.step.hint}`
    : target.step.label;
}

/** Previous person steps, nearest first. AI steps are skipped. */
export function getAdminRollbackTargets(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: {
    hasText?: boolean;
    isComplete?: boolean;
    designApproved?: boolean;
    pathId?: string | null;
  }
): Extract<AdminPathTarget, { type: "path" }>[] {
  const steps = getFormatPath(format);
  const currentIndex =
    currentStage === "posting_manager"
      ? steps.length
      : resolveFormatPathIndex(format, currentStage, options);

  const targets: Extract<AdminPathTarget, { type: "path" }>[] = [];
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.kind !== "person") continue;
    targets.push({ type: "path", step, index });
  }
  return targets;
}

export function isAiPathCurrent(
  format: ContentFormat,
  currentStage: WorkflowStage,
  pathId?: string | null
): boolean {
  if (!pathId || currentStage === "posting_manager") return false;
  const step = getFormatPath(format).find((item) => item.id === pathId);
  return step?.kind === "ai";
}
