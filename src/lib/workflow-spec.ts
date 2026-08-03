import type {
  CardsPhase,
  ContentFormat,
  WizardStep,
  WorkflowStage,
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
      cardsPhases: ["phrases"],
      buildCapabilities: null,
      description: "Источник, текст поста, генерация заголовков карточек",
    },
    designer: {
      editableSteps: ["cards"],
      cardsPhases: ["phrases", "edit", "images"],
      buildCapabilities: null,
      description: "Заголовки, визуал, загрузка и замена изображений",
    },
    editor: {
      editableSteps: ["text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Проверка текста и превью карточек 1080×1080",
    },
    project_manager: {
      editableSteps: ["source", "text", "cards", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Итоговая проверка, возврат на любой этап, слот в КП",
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
      cardsPhases: ["phrases"],
      buildCapabilities: null,
      description: "Источник, текст + картинка, заголовки слайдов",
    },
    designer: {
      editableSteps: ["cards"],
      cardsPhases: ["phrases", "edit", "images"],
      buildCapabilities: null,
      description: "Оценка, скачивание, замена и добавление изображений",
    },
    editor: {
      editableSteps: ["text", "build"],
      cardsPhases: null,
      buildCapabilities: ["narration"],
      description: "Текст для озвучки, готовые слайды, возврат копирайтеру/дизайнеру",
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
      description: "Итоговая проверка, возврат на любой этап, слот в КП",
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
      editableSteps: ["source", "text"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Источник и текст поста (длинный / сокращённый)",
    },
    editor: {
      editableSteps: ["text", "build"],
      cardsPhases: null,
      buildCapabilities: ["assembly"],
      description: "Проверка текста и финализация перед менеджером",
    },
    project_manager: {
      editableSteps: ["source", "text", "build", "result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Итоговая проверка, возврат на любой этап, слот в КП",
    },
    posting_manager: {
      editableSteps: ["result"],
      cardsPhases: null,
      buildCapabilities: null,
      description: "Готовый пост и скачивание",
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
    format === "text"
      ? (["source", "text", "build", "result"] as WizardStep[])
      : (["source", "text", "cards", "build", "result"] as WizardStep[]);

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
  // "phrases" and "edit" share the same card-title UI; designer edits titles after copywriter.
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
