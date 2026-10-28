import {
  formatUsesCards,
  type CardsPhase,
  type ContentFormat,
  type WizardStep,
  type WorkflowStage,
} from "@/types";

export type BuildCapability = "narration" | "voice" | "assembly";

export interface StageStepAccess {
  editableSteps: WizardStep[];
  cardsPhases: CardsPhase[] | null;
  buildCapabilities: BuildCapability[] | null;
  description: string;
}

const STAGE_ACCESS: Record<
  ContentFormat,
  Partial<Record<WorkflowStage, StageStepAccess>>
> = {
  gallery: {
    copywriter: {
      editableSteps: ["source", "text", "cards"],
      cardsPhases: ["phrases", "edit"],
      buildCapabilities: null,
      description: "Источник, текст поста, заголовки карточек",
    },
    designer: {
      editableSteps: ["cards"],
      cardsPhases: ["images"],
      buildCapabilities: null,
      description: "Проверка кадра, плашки и замена изображений",
    },
    editor: {
      editableSteps: ["text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Вычитка текста копирайтера, затем всего с картинками",
    },
    project_manager: {
      editableSteps: ["source", "text", "cards", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Проверяет всю работу и ставит слот в КП"
    },
    posting_manager: {
      editableSteps: ["result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Готовый пост и скачивание",
    },
  },
  slideshow: {
    copywriter: {
      editableSteps: ["source", "text", "cards"],
      cardsPhases: ["phrases", "edit"],
      buildCapabilities: null,
      description: "Источник, текст и заголовки слайдов",
    },
    designer: {
      editableSteps: ["cards"],
      cardsPhases: ["images"],
      buildCapabilities: null,
      description: "Проверка кадра, плашки и замена изображений",
    },
    editor: {
      editableSteps: ["text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Вычитка текста копирайтера и заголовков слайдов",
    },
    video_editor: {
      editableSteps: ["build"],
      cardsPhases: null,
      buildCapabilities: ["narration", "voice", "assembly"],
      description: "Сборка видео, голос, темп, произношение",
    },
    project_manager: {
      editableSteps: ["source", "text", "cards", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Проверяет всю работу и ставит слот в КП"
    },
    posting_manager: {
      editableSteps: ["result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Готовый пост и скачивание",
    },
  },
  text: {
    copywriter: {
      editableSteps: ["source", "text", "cards"],
      cardsPhases: ["phrases", "edit"],
      buildCapabilities: null,
      description: "Источник, текст поста и заголовки карточек",
    },
    editor: {
      editableSteps: ["text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Вычитка текста копирайтера, затем всего с картинками",
    },
    designer: {
      editableSteps: ["cards"],
      cardsPhases: ["images"],
      buildCapabilities: null,
      description: "Проверка кадра, плашки и замена изображений",
    },
    project_manager: {
      editableSteps: ["source", "text", "cards", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Проверяет всю работу и ставит слот в КП"
    },
    posting_manager: {
      editableSteps: ["result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Готовый пост и скачивание",
    },
  },
  video_meme: {
    copywriter: {
      editableSteps: ["source", "text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Находит видео и пишет подводку",
    },
    editor: {
      editableSteps: ["text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Вычитка подводки",
    },
    designer: {
      editableSteps: ["cards", "build"],
      cardsPhases: ["images"],
      buildCapabilities: ["assembly"],
      description: "Вёрстка мема, другие файлы и музыка",
    },
    project_manager: {
      editableSteps: ["source", "text", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Проверяет всю работу и ставит слот в КП"
    },
  },
};

export function getStageStepAccess(
  stage: WorkflowStage,
  format: ContentFormat
): StageStepAccess {
  const formatAccess = STAGE_ACCESS[format][stage];
  if (formatAccess) return formatAccess;

  return {
    editableSteps: [],
    cardsPhases: null,
    buildCapabilities: null,
    description: "",
  };
}

export function getEditableWizardSteps(
  stage: WorkflowStage,
  format: ContentFormat
): WizardStep[] {
  const allowed =
    formatUsesCards(format) || format === "text"
      ? (["source", "text", "cards", "build", "result"] as WizardStep[])
      : (["source", "text", "build", "result"] as WizardStep[]);

  if (stage === "project_manager" || stage === "posting_manager") {
    return getStageStepAccess(stage, format).editableSteps.filter((step) =>
      allowed.includes(step)
    );
  }

  return getStageStepAccess(stage, format).editableSteps.filter((step) =>
    allowed.includes(step)
  );
}

export function canEditCardsPhaseForStage(
  stage: WorkflowStage,
  format: ContentFormat,
  phase: CardsPhase
): boolean {
  const access = getStageStepAccess(stage, format);
  if (!access.cardsPhases) return false;
  if (access.cardsPhases.includes(phase)) return true;
  // "phrases" and "edit" share the same card-title UI on the copywriter.
  if (phase === "phrases" && access.cardsPhases.includes("edit")) return true;
  return false;
}

export function canUseBuildCapabilityForStage(
  stage: WorkflowStage,
  format: ContentFormat,
  capability: BuildCapability
): boolean {
  const access = getStageStepAccess(stage, format);
  if (!access.buildCapabilities) return false;
  return access.buildCapabilities.includes(capability);
}
