import type {
  ContentFormat,
  ContentPlanScenario,
  ContentUnit,
  ProductionTask,
  User,
  WorkflowStage,
} from "@/types";
import { isAdminRole } from "@/lib/roles";
import {
  getFormatPath,
  isAiPathCurrent,
  resolveFormatPathIndex,
} from "@/lib/format-paths";
import { getStageChain, stageToRole } from "@/lib/workflow";
import {
  getDesignerFrameLabel,
  getDesignerSlides,
  getProblemSlideIndex,
} from "@/lib/designer-slides";

export type WorkspaceChainState = "done" | "current" | "upcoming";

export interface WorkspaceChainItem {
  id: string;
  kind: "person" | "ai";
  stage: WorkflowStage | null;
  label: string;
  hint: string;
  state: WorkspaceChainState;
}

export interface AutoCheckItem {
  ok: boolean;
  text: string;
}

const ROLE_FIELD_LABEL: Record<WorkflowStage, string> = {
  copywriter: "Тема, источник и текст",
  designer: "Кадр, плашка, вёрстка",
  editor: "Ошибки, тон, оформление",
  video_editor: "Ударения, темп, эффекты",
  project_manager: "Проверка всей работы и слот в план",
  posting_manager: "Публикация",
};

export function getRoleWorkspaceHref(
  projectId: string,
  contentUnitId: string
): string {
  return `/projects/${projectId}/content/${contentUnitId}`;
}

export function getVisibleStageChain(format: ContentFormat): WorkflowStage[] {
  return getStageChain(format).filter((stage) => stage !== "posting_manager");
}

export function getWorkspaceChain(
  format: ContentFormat,
  currentStage: WorkflowStage,
  options?: {
    hasText?: boolean;
    isComplete?: boolean;
    designApproved?: boolean;
    pathId?: string | null;
  }
): WorkspaceChainItem[] {
  const steps = getFormatPath(format);
  const currentIndex = resolveFormatPathIndex(format, currentStage, options);

  return steps
    .map((step, index) => {
      let state: WorkspaceChainState = "upcoming";
      if (options?.isComplete || currentStage === "posting_manager") {
        state = "done";
      } else if (index < currentIndex) {
        state = "done";
      } else if (index === currentIndex) {
        state = "current";
      }

      return {
        id: step.id,
        kind: step.kind,
        stage: step.stage,
        label: step.label,
        hint: step.hint,
        state,
      };
    })
    .filter((item) => item.kind !== "ai");
}

export function getPersonChainItems(items: WorkspaceChainItem[]) {
  return items.filter(
    (item): item is WorkspaceChainItem & { stage: WorkflowStage } =>
      Boolean(item.stage)
  );
}

export function isLastVisitOfStage(
  items: WorkspaceChainItem[],
  pathId: string | null,
  stage: WorkflowStage
): boolean {
  const visits = items.filter((item) => item.stage === stage);
  if (visits.length === 0) return false;
  const selected =
    (pathId ? visits.find((item) => item.id === pathId) : undefined) ??
    visits.find((item) => item.state === "current") ??
    visits[visits.length - 1];
  return selected.id === visits[visits.length - 1].id;
}

export function getRoleFieldLabel(stage: WorkflowStage): string {
  return ROLE_FIELD_LABEL[stage];
}

export function isWaitingForReturnedFix(
  user: User | null | undefined,
  task: ProductionTask | undefined
): boolean {
  if (!user || !task || task.status !== "returned") return false;
  if (isAdminRole(user.role)) return false;
  if (task.returnedByUserId === user.id) return true;
  return (
    task.returnedByStage === user.role &&
    task.currentStage !== stageToRole(user.role)
  );
}

export function getPinnedWorkspaceStage(
  user: User | null | undefined,
  task: ProductionTask | undefined,
  adminView: WorkflowStage | null
): WorkflowStage | undefined {
  if (!task) return undefined;
  if (user && isAdminRole(user.role)) {
    return adminView ?? (task.status === "done" ? "project_manager" : task.currentStage);
  }
  if (task.status === "done") return "project_manager";
  if (canUserOperateCurrentStage(user, task)) {
    return task.currentStage;
  }
  const ownStage = user?.role as WorkflowStage | undefined;
  if (ownStage && getStageChain(task.format).includes(ownStage)) {
    return ownStage;
  }
  return task.currentStage;
}

export function canUserOperateCurrentStage(
  user: User | null | undefined,
  task: ProductionTask | undefined
): boolean {
  if (!user || !task) return false;
  if (isAdminRole(user.role)) return true;
  if (task.status === "done") return false;
  if (isAiPathCurrent(task.format, task.currentStage, task.currentPathId)) {
    return false;
  }
  if (isWaitingForReturnedFix(user, task)) return false;
  if (user.role === stageToRole(task.currentStage)) return true;
  return (
    task.currentStage === "copywriter" && user.role === "project_manager"
  );
}

export function canEditTextOnStage(stage: WorkflowStage): boolean {
  return stage === "copywriter" || stage === "editor";
}

export function canEditSourceOnStage(stage: WorkflowStage): boolean {
  return stage === "copywriter";
}

export function canEditVisualOnStage(stage: WorkflowStage): boolean {
  return stage === "designer";
}

export function canEditNarrationOnStage(stage: WorkflowStage): boolean {
  return stage === "video_editor";
}

export function getWorkspaceStatusLabel(
  status: ProductionTask["status"],
  stage?: WorkflowStage,
  options?: { aiWorking?: boolean }
): string {
  if (status === "returned") return "На доработке";
  if (status === "done") return "В плане";
  if (options?.aiWorking) return "Делает нейросеть";
  if (stage === "project_manager") return "Ждёт согласования";
  return "Ждёт проверки";
}

export function getManagerTtx(
  content: ContentUnit,
  scenario: ContentPlanScenario
): AutoCheckItem[] {
  const words = countWords(content.postText);
  const slides = getDesignerSlides(content);
  const frame = getDesignerFrameLabel(content.format);
  const rubric = scenario === "news" ? "Новость" : "По расписанию";
  const hasQuestion = /[?]/.test(content.postText);
  const hashtags = content.textOptions.includeHashtags || /#\w/.test(content.postText);

  const visualLine =
    content.format === "text"
      ? `Сторис ${frame}`
      : content.format === "gallery"
        ? `${slides.length} слайдов ${frame}, сторис 1080 × 1920`
        : `${slides.length} кадров ${frame}`;

  return [
    {
      ok: words > 0,
      text: `Рубрика: ${rubric}, ${words} слов`,
    },
    {
      ok: content.format === "text" || slides.length > 0,
      text: visualLine,
    },
    {
      ok: content.format === "text" || slides.length > 0,
      text:
        content.format === "text"
          ? "Фото и сторис на месте"
          : "Плашка на всех номерах",
    },
    {
      ok: hasQuestion || hashtags,
      text:
        hasQuestion && hashtags
          ? "Вопрос в конце, хештеги"
          : hashtags
            ? "Хештеги есть"
            : hasQuestion
              ? "Есть вопрос в конце"
              : "Нет вопроса или хештегов",
    },
  ];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countEmoji(text: string): number {
  const matches = text.match(/\p{Extended_Pictographic}/gu);
  return matches?.length ?? 0;
}

export function getAutoChecks(
  content: ContentUnit,
  stage: WorkflowStage,
  options?: { designApproved?: boolean }
): AutoCheckItem[] {
  const words = countWords(content.postText);
  const emoji = countEmoji(content.postText);
  const hasVisual =
    content.cards.some((card) => Boolean(card.imageUrl)) ||
    content.format === "slideshow" ||
    content.format === "video_meme";

  if (stage === "editor") {
    const finalReview = Boolean(options?.designApproved);
    const textReady =
      content.format === "video_meme"
        ? "Подводка готова к вычитке"
        : "Текст готов к вычитке";
    return [
      {
        ok: words >= 40 && words <= 180,
        text:
          words >= 40 && words <= 180
            ? `${words} слов — в рабочей длине`
            : `${words} слов — проверьте длину`,
      },
      {
        ok: finalReview ? hasVisual : words > 0,
        text: finalReview
          ? hasVisual
            ? "Текст и картинки можно сверить"
            : "Нет визуала для сверки с текстом"
          : textReady,
      },
      {
        ok: emoji <= 3,
        text:
          emoji <= 3
            ? `Эмодзи ${emoji}, норма до 3`
            : `Эмодзи ${emoji}, по правилу 2–3`,
      },
    ];
  }

  if (stage === "copywriter") {
    const hasSource = Boolean(content.sourceUrl || content.sourceFileName);
    const hasDigits = /\d/.test(content.postText);
    const needsTitles =
      content.format === "gallery" ||
      content.format === "slideshow" ||
      content.cards.length > 0;
    const titlesOk =
      content.format === "video_meme" ||
      !needsTitles ||
      content.cards.every((card) => card.shortText.trim().length > 0);

    return [
      {
        ok: hasSource,
        text: hasSource
          ? content.format === "video_meme"
            ? "Видео найдено"
            : "Источник указан"
          : content.format === "video_meme"
            ? "Нет ссылки или файла видео"
            : "Нет ссылки или файла",
      },
      {
        ok: words > 0,
        text: words > 0 ? "Текст сгенерирован" : "Нет текста для проверки",
      },
      {
        ok: words === 0 || hasDigits,
        text:
          words === 0
            ? "Проверьте факты и цифры"
            : hasDigits
              ? "Цифры в тексте есть"
              : "Нет цифр — сверьте факты",
      },
      {
        ok: titlesOk,
        text: titlesOk
          ? "Заголовки слайдов на месте"
          : "Пустые заголовки слайдов",
      },
    ];
  }

  if (stage === "designer") {
    const slides = getDesignerSlides(content);
    const problem = getProblemSlideIndex(slides);
    const frame = getDesignerFrameLabel(content.format);
    const withPlaque = slides.length;

    return [
      {
        ok: slides.length > 0,
        text: `${slides.length} слайдов ${frame}`,
      },
      {
        ok: withPlaque === slides.length && slides.length > 0,
        text: `Плашка на ${withPlaque} из ${slides.length} номеров`,
      },
      {
        ok: false,
        text: `Слайд ${problem + 1}: текст на машине`,
      },
    ];
  }

  if (stage === "video_editor") {
    const hasVoice = Boolean(content.narrationText.trim());
    const tempoOk = content.speechSpeed >= 0.8 && content.speechSpeed <= 1.4;
    return [
      {
        ok: hasVoice,
        text: hasVoice ? "Есть текст озвучки" : "Нет текста озвучки",
      },
      {
        ok: tempoOk,
        text: tempoOk
          ? `Темп ${content.speechSpeed}×`
          : "Выставьте темп ролика",
      },
      {
        ok: true,
        text: "Сверьте ударения, имена и эффекты",
      },
    ];
  }

  if (stage === "project_manager" && !options?.designApproved) {
    const hasSource = Boolean(content.sourceUrl || content.sourceFileName);
    const hasDigits = /\d/.test(content.postText);
    const titlesOk =
      content.format === "text" ||
      content.format === "video_meme" ||
      content.cards.every((card) => card.shortText.trim().length > 0);
    return [
      {
        ok: hasSource,
        text:
          content.format === "video_meme"
            ? hasSource
              ? "Видео на месте"
              : "Нет видео для согласования"
            : hasSource
              ? "Источник указан"
              : "Нет источника",
      },
      {
        ok: words > 0,
        text:
          words > 0
            ? content.format === "video_meme"
              ? "Подводка написана"
              : "Текст копирайтера на месте"
            : content.format === "video_meme"
              ? "Нет подводки"
              : "Нет текста копирайтера",
      },
      {
        ok: words === 0 || hasDigits || content.format === "video_meme",
        text:
          content.format === "video_meme"
            ? "Тема ролика подходит под рубрику"
            : hasDigits
              ? "Цифры в тексте есть"
              : "Нет цифр — сверьте факты",
      },
      {
        ok: titlesOk,
        text: titlesOk
          ? "Заголовки слайдов на месте"
          : "Пустые заголовки слайдов",
      },
    ];
  }

  return [
    {
      ok: words > 0,
      text: "Текст на месте, можно смотреть весь пакет",
    },
    {
      ok: hasVisual || content.format === "text",
      text: hasVisual || content.format === "text"
        ? "Визуал и текст можно сверить"
        : "Нет визуала для финальной проверки",
    },
    {
      ok: true,
      text: "После согласования — слот в плане",
    },
  ];
}

