export type UserRole =
  | "admin"
  | "copywriter"
  | "designer"
  | "editor"
  | "video_editor"
  | "project_manager"
  | "posting_manager";

export type WorkflowStage =
  | "copywriter"
  | "designer"
  | "editor"
  | "video_editor"
  | "project_manager"
  | "posting_manager";

export type WorkflowStatus = "in_progress" | "returned" | "done";

export interface ProductionTask {
  id: string;
  contentUnitId: string;
  projectId: string;
  format: ContentFormat;
  scenario: ContentPlanScenario;
  title: string;
  currentStage: WorkflowStage;
  assigneeId: string | null;
  status: WorkflowStatus;
  returnComment?: string;
  returnToStage?: WorkflowStage;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  taskId: string;
  contentUnitId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type TaskStatus = "draft" | "queued" | "in_progress" | "done" | "error";

export type ContentFormat = "gallery" | "slideshow" | "text";

export type SourceType = "url" | "file";

export type TextTone = "friendly" | "expert" | "formal" | "casual";

export type TextLength = "short" | "medium" | "long";

export type TextTransformAction =
  | "shorten"
  | "expand"
  | "formal"
  | "casual"
  | "bullets"
  | "regenerate";

export type CardStatus = "ready" | "needs_edit";

export type QueueTaskType =
  | "text_generation"
  | "image_processing"
  | "voice_generation"
  | "video_assembly"
  | "export";

export type PromptCategory =
  | "extraction"
  | "post"
  | "card_phrases"
  | "image_processing"
  | "voiceover";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  projectIds: string[];
}

export interface LogoAsset {
  format: LogoFormat;
  fileName: string;
  uploadedAt: string;
}

export type LogoFormat = "svg" | "png" | "jpg" | "webp";

export const LOGO_FORMAT_META: Record<
  LogoFormat,
  { label: string; hint: string; accept: string }
> = {
  svg: { label: "SVG", hint: "Вектор, масштабирование", accept: ".svg" },
  png: { label: "PNG", hint: "Прозрачный фон", accept: ".png" },
  jpg: { label: "JPG", hint: "Универсальный", accept: ".jpg,.jpeg" },
  webp: { label: "WebP", hint: "Оптимизация для web", accept: ".webp" },
};

export interface Project {
  id: string;
  name: string;
  description: string;
  logoPlaceholder: string;
  logoAssets: LogoAsset[];
  contentCount: number;
  managerIds: string[];
  brandStyle: string;
  defaultCopyright: string;
  cardTemplates: string;
  imageRules: string;
  formattingRules: string;
}

export interface Card {
  id: string;
  imageUrl?: string;
  shortText: string;
  copyright: string;
  status: CardStatus;
  duration?: number;
}

export type CardsPhase = "phrases" | "edit" | "images";

export const CARDS_PHASE_LABELS: Record<CardsPhase, string> = {
  phrases: "Заголовки",
  edit: "Редактирование",
  images: "Фотографии",
};

export const CARDS_PHASE_ORDER: CardsPhase[] = ["phrases", "edit", "images"];

export function inferCardsPhase(cards: Card[]): CardsPhase {
  if (cards.length === 0) return "phrases";
  if (cards.every((card) => card.imageUrl)) return "images";
  return "phrases";
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
}

export interface ContentUnit {
  id: string;
  projectId: string;
  title: string;
  format: ContentFormat;
  formatConfirmed: boolean;
  sourceType: SourceType;
  sourceUrl: string;
  sourceFileName: string;
  status: TaskStatus;
  createdAt: string;
  cards: Card[];
  postText: string;
  promptId: string;
  extractedTitle: string;
  extractedText: string;
  extractedImages: string[];
  additionalInstructions: string;
  voiceModel: string;
  speechSpeed: number;
  narrationText: string;
  actionLog: ActionLogEntry[];
  buildOptions: {
    addCopyright: boolean;
    applyBrandStyle: boolean;
    prepareArchive: boolean;
  };
  textTone: TextTone;
  textLength: TextLength;
  textOptions: {
    includeHashtags: boolean;
    includeEmoji: boolean;
    addSourceLink: boolean;
  };
  generationPrompt: string;
}

export type ContentPlanScenario = "news" | "scheduled";

export interface ContentPlanSlot {
  id: string;
  projectId: string;
  contentUnitId?: string;
  scheduledAt: string;
  title: string;
  format: ContentFormat;
  scenario: ContentPlanScenario;
  comment: string;
  hasText: boolean;
  hasZip: boolean;
  hasVisual: boolean;
  zipFileName?: string;
  visualFileName?: string;
  attachmentFiles?: string[];
}

export interface QueueTask {
  id: string;
  type: QueueTaskType;
  status: TaskStatus;
  projectId: string;
  managerId: string;
  contentUnitId: string;
  createdAt: string;
  label: string;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  text: string;
  category: PromptCategory;
}

export type SkillCategory = "extraction" | "generation" | "visual" | "assembly";

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  tools: string;
  instructions: string;
}

export type AIProvider = "openrouter" | "router_ai" | "other";

export interface AIModelSettings {
  provider: AIProvider;
  apiKey: string;
  textModel: string;
  imageModel: string;
  voiceModel: string;
  generationLimit: number;
  connectionStatus: "connected" | "disconnected" | "testing";
}

export type WizardStep = "format" | "source" | "text" | "cards" | "build" | "result";

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: "format", label: "Формат" },
  { id: "source", label: "Источник" },
  { id: "text", label: "Текст" },
  { id: "cards", label: "Карточки" },
  { id: "build", label: "Галерея / Видео" },
  { id: "result", label: "Результат" },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Черновик",
  queued: "В очереди",
  in_progress: "В работе",
  done: "Готово",
  error: "Ошибка",
};

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  gallery: "Галерея",
  slideshow: "Слайд-шоу с озвучкой",
  text: "Текстовый пост",
};

export function getStepOrderForFormat(format: ContentFormat): WizardStep[] {
  const flow: WizardStep[] =
    format === "text"
      ? ["source", "text", "build", "result"]
      : ["source", "text", "cards", "build", "result"];
  return ["format", ...flow];
}

export function getWizardStepsForFormat(
  format: ContentFormat
): { id: WizardStep; label: string }[] {
  const buildLabel =
    format === "text"
      ? "Финализация"
      : format === "gallery"
        ? "Галерея"
        : "Видео";

  return [
    { id: "format", label: "Формат" },
    { id: "source", label: "Источник" },
    { id: "text", label: "Текст" },
    ...(format !== "text" ? [{ id: "cards" as WizardStep, label: "Карточки" }] : []),
    { id: "build", label: buildLabel },
    { id: "result", label: "Результат" },
  ];
}

export const FORMAT_DESCRIPTIONS: Record<ContentFormat, string> = {
  gallery: "Вертикальные карточки для соцсетей из статьи",
  slideshow: "Видео слайд-шоу с озвучкой и таймингом слайдов",
  text: "Текст поста из новости или по заданному промпту",
};

export const QUEUE_TYPE_LABELS: Record<QueueTaskType, string> = {
  text_generation: "Генерация текста",
  image_processing: "Обработка изображений",
  voice_generation: "Генерация озвучки",
  video_assembly: "Сборка видео",
  export: "Экспорт результата",
};
