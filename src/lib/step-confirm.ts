import { getNextStage, getStageLabel, type StagePathOptions } from "@/lib/workflow";
import type { ContentFormat, WizardStep, WorkflowStage } from "@/types";
import { getWizardStepsForFormat } from "@/types";

export interface StepConfirmContent {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
}

function getWizardStepLabel(step: WizardStep, format: ContentFormat): string {
  return getWizardStepsForFormat(format).find((item) => item.id === step)?.label ?? step;
}

const WIZARD_STEP_DESCRIPTIONS: Record<
  WizardStep,
  (format: ContentFormat) => { description: string; confirmLabel: string }
> = {
  format: () => ({
    description:
      "Выбранный формат будет зафиксирован. После подтверждения изменить его смогут только менеджеры и администратор.",
    confirmLabel: "Подтвердить формат",
  }),
  source: () => ({
    description:
      "Данные источника будут сохранены, и вы перейдёте к следующему шагу мастера.",
    confirmLabel: "Подтвердить источник",
  }),
  text: () => ({
    description:
      "Текст поста будет сохранён. Убедитесь, что формулировки и параметры генерации вас устраивают.",
    confirmLabel: "Подтвердить текст",
  }),
  cards: (format) => ({
    description:
      format === "text"
        ? "Карточки будут сохранены перед переходом дальше."
        : "Карточки и изображения будут сохранены перед переходом к сборке.",
    confirmLabel: "Подтвердить карточки",
  }),
  build: (format) => ({
    description:
      format === "text"
        ? "Пост будет финализирован и подготовлен к публикации."
        : format === "gallery"
          ? "Галерея будет собрана, материалы подготовлены к скачиванию."
          : format === "video_meme"
            ? "Мем будет собран: плашка, логотип, нужный размер."
            : "Видео будет собрано с озвучкой и подготовлено к скачиванию.",
    confirmLabel:
      format === "text"
        ? "Подтвердить финализацию"
        : format === "gallery"
          ? "Подтвердить сборку"
          : format === "video_meme"
            ? "Подтвердить сборку мема"
            : "Подтвердить сборку видео",
  }),
  result: () => ({
    description: "Вы завершите работу над текущим шагом.",
    confirmLabel: "Подтвердить",
  }),
};

export function getWizardStepConfirmContent(
  step: WizardStep,
  format: ContentFormat,
  options?: { skip?: boolean }
): StepConfirmContent {
  const label = getWizardStepLabel(step, format);
  const stepOrder = getWizardStepsForFormat(format);
  const stepIndex = stepOrder.findIndex((item) => item.id === step);
  const nextLabel =
    stepIndex >= 0 && stepIndex < stepOrder.length - 1
      ? stepOrder[stepIndex + 1]?.label
      : null;

  if (options?.skip) {
    return {
      title: `Пропустить этап «${label}»?`,
      description: nextLabel
        ? `Вы перейдёте к этапу «${nextLabel}» без явного подтверждения работы на текущем шаге.`
        : "Вы перейдёте к следующему шагу без явного подтверждения работы на текущем этапе.",
      confirmLabel: "Пропустить этап",
      cancelLabel: "Остаться",
    };
  }

  const copy = WIZARD_STEP_DESCRIPTIONS[step](format);

  return {
    title: `Подтвердить этап «${label}»?`,
    description: nextLabel
      ? `${copy.description} Следующий шаг: «${nextLabel}».`
      : copy.description,
    confirmLabel: copy.confirmLabel,
    cancelLabel: "Отмена",
  };
}

export function getWorkflowStageConfirmContent(
  stage: WorkflowStage,
  format: ContentFormat,
  options?: StagePathOptions
): StepConfirmContent {
  const nextStage = getNextStage(format, stage, options);
  const stageLabel = getStageLabel(stage);
  const isFinalStage = stage === "posting_manager" || !nextStage;

  if (stage === "project_manager" && nextStage === "editor") {
    return {
      title:
        format === "video_meme"
          ? "Согласовать видео и подводку?"
          : "Согласовать текст копирайтера?",
      description:
        format === "video_meme"
          ? "Ролик можно брать. Подводка уйдёт редактору на вычитку."
          : "Тема и текст копирайтера уйдут редактору на вычитку. Визуал на этом шаге ещё не проверяете.",
      confirmLabel: "Согласовать",
      cancelLabel: "Отмена",
    };
  }

  if (isFinalStage) {
    return {
      title: "Завершить производство?",
      description:
        "Контент будет помечен как готовый к публикации. После завершения редактирование этапов будет недоступно.",
      confirmLabel: "Завершить производство",
      cancelLabel: "Отмена",
    };
  }

  return {
    title: `Подтвердить этап «${stageLabel}»?`,
    description: `Работа будет передана на этап «${getStageLabel(nextStage!)}». Убедитесь, что задачи текущего этапа выполнены.`,
    confirmLabel: "Подтвердить этап",
    cancelLabel: "Отмена",
  };
}

export function getAdminShiftConfirmContent(
  fromLabel: string,
  toLabel: string,
  direction: "forward" | "back"
): StepConfirmContent {
  if (direction === "back") {
    return {
      title: "Откатить задачу?",
      description: `Задача вернётся на предыдущий этап: с «${fromLabel}» на «${toLabel}».`,
      confirmLabel: "Вернуться",
      cancelLabel: "Отмена",
    };
  }
  return {
    title: "Переместить задачу дальше?",
    description: `Задача перейдёт на следующий этап: с «${fromLabel}» на «${toLabel}».`,
    confirmLabel: "Переместить далее",
    cancelLabel: "Отмена",
  };
}
