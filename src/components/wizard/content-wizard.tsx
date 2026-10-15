"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import {
  createProductionTaskForContent,
  useWorkflowStore,
} from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { WizardStepper } from "@/components/wizard/wizard-stepper";
import { StepFormat } from "@/components/wizard/step-format";
import { StepSource } from "@/components/wizard/step-source";
import { StepText } from "@/components/wizard/step-text";
import { StepCards } from "@/components/wizard/step-cards";
import { StepGalleryBuild } from "@/components/wizard/step-gallery-build";
import { StepTextBuild } from "@/components/wizard/step-text-build";
import { StepResult } from "@/components/wizard/step-result";
import { WizardStepNavigation } from "@/components/wizard/wizard-step-navigation";
import { WizardReadOnlyBanner } from "@/components/wizard/wizard-read-only-banner";
import { WizardStepProvider } from "@/components/wizard/wizard-step-context";
import { FORMAT_LABELS, formatUsesCards } from "@/types";
import { StepConfirmModal } from "@/components/shared/step-confirm-modal";
import { useWizardAccess } from "@/hooks/use-wizard-access";
import { useStepConfirmModal } from "@/hooks/use-step-confirm-modal";
import { getWizardStepConfirmContent } from "@/lib/step-confirm";
import { getInitialCardsPhaseForStage } from "@/lib/workflow-access";
import { getStepOrderForFormat, type WizardStep } from "@/types";
import bannerStyles from "./wizard-read-only-banner.module.css";
import styles from "./wizard.module.css";

interface ContentWizardProps {
  projectId: string;
  contentId: string;
  step: WizardStep;
}

export function ContentWizard({ projectId, contentId, step }: ContentWizardProps) {
  const router = useRouter();
  const format = useWizardStore((s) => s.format);
  const selectedFormats = useWizardStore((s) => s.selectedFormats);
  const formatConfirmed = useWizardStore((s) => s.formatConfirmed);
  const initWizard = useWizardStore((s) => s.initWizard);
  const currentStep = useWizardStore((s) => s.currentStep);
  const setField = useWizardStore((s) => s.setField);
  const isExtracted = useWizardStore((s) => s.isExtracted);
  const isPostGenerated = useWizardStore((s) => s.isPostGenerated);
  const postText = useWizardStore((s) => s.postText);
  const cards = useWizardStore((s) => s.cards);
  const buildStatus = useWizardStore((s) => s.buildStatus);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const createTask = useWorkflowStore((s) => s.createTask);
  const users = useAuthStore((s) => s.users);
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentId));

  const content = getContentUnit(contentId);
  const stepOrder = useMemo(() => getStepOrderForFormat(format), [format]);
  const hydratedContentIdRef = useRef<string | null>(null);
  const { readOnly, canEdit, currentStageLabel } = useWizardAccess(
    contentId,
    step
  );
  const {
    confirmContent,
    confirmOpen,
    requestConfirm,
    closeConfirm,
    confirmPending,
  } = useStepConfirmModal();

  const confirmWizardStep = (
    targetStep: WizardStep,
    action: () => void,
    options?: { skip?: boolean }
  ) => {
    requestConfirm(
      getWizardStepConfirmContent(targetStep, format, options),
      action
    );
  };

  useEffect(() => {
    if (!content) return;
    if (hydratedContentIdRef.current === contentId) return;

    hydratedContentIdRef.current = contentId;
    initWizard(projectId, contentId, {
      format: content.format,
      selectedFormats: content.formatConfirmed ? [content.format] : [],
      formatConfirmed: content.formatConfirmed ?? true,
      sourceType: content.sourceType ?? "url",
      sourceUrl: content.sourceUrl,
      sourceFileName: content.sourceFileName ?? "",
      sourceUseLink: content.sourceUseLink ?? content.sourceType !== "file",
      sourceUseFile: content.sourceUseFile ?? content.sourceType === "file",
      sourceNotesEnabled: content.sourceNotesEnabled ?? false,
      sourceNotes: content.sourceNotes ?? "",
      sourceLinks: content.sourceLinks?.length
        ? content.sourceLinks
        : content.sourceUrl
          ? [content.sourceUrl]
          : [""],
      sourceFiles: content.sourceFiles?.length
        ? content.sourceFiles
        : content.sourceFileName
          ? [{ id: "seed-file", name: content.sourceFileName }]
          : [],
      sourceExtracts: content.sourceExtracts ?? {},
      cardsCount: content.cardsCount ?? 3,
      videoTransition: content.videoTransition ?? "none",
      promptId: content.promptId,
      additionalInstructions: content.additionalInstructions,
      extractedTitle: content.extractedTitle,
      extractedText: content.extractedText,
      extractedImages: content.extractedImages,
      postText: content.postText,
      cards: content.cards,
      cardsPhase: getInitialCardsPhaseForStage(task?.currentStage, content.cards),
      isGeneratingCardPhrases: false,
      isGeneratingCardImages: false,
      isExtracted: !!content.extractedText,
      isPostGenerated: !!content.postText,
      voiceModel: content.voiceModel,
      speechSpeed: content.speechSpeed ?? 1,
      narrationText: content.narrationText,
      buildOptions: content.buildOptions,
      textTone: content.textTone ?? "friendly",
      textLength: content.textLength ?? "medium",
      textOptions: content.textOptions ?? {
        includeHashtags: true,
        includeEmoji: false,
        addSourceLink: true,
      },
      generationPrompt: content.generationPrompt ?? "",
      buildStatus: content.status === "done" ? "done" : "idle",
      selectedCardId: content.cards[0]?.id ?? null,
    });
  }, [contentId, projectId, content, task?.currentStage, initWizard]);

  useEffect(() => {
    if (task?.currentStage !== "designer") return;
    const unit = useProjectsStore.getState().getContentUnit(contentId);
    if (!unit) return;
    const next = getInitialCardsPhaseForStage("designer", unit.cards);
    if (useWizardStore.getState().cardsPhase === next) return;
    setField("cardsPhase", next);
  }, [contentId, task?.currentStage, setField]);

  useEffect(() => {
    if (useWizardStore.getState().currentStep === step) return;
    setField("currentStep", step);
  }, [step, setField]);

  useEffect(() => {
    if (!stepOrder.includes(step)) {
      router.replace(
        `/projects/${projectId}/content/${contentId}/wizard/${stepOrder[0]}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stepOrder, projectId, contentId]);

  useEffect(() => {
    if (!formatConfirmed && step !== "format") {
      router.replace(`/projects/${projectId}/content/${contentId}/wizard/format`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatConfirmed, step, projectId, contentId]);

  const navigateTo = (targetStep: WizardStep) => {
    router.push(
      `/projects/${projectId}/content/${contentId}/wizard/${targetStep}`
    );
  };

  const goNext = () => {
    const activeStep = step ?? currentStep;
    const idx = stepOrder.indexOf(activeStep);
    if (idx < stepOrder.length - 1) {
      navigateTo(stepOrder[idx + 1]);
    }
  };

  const confirmBeforeAction = (action: () => void) => {
    confirmWizardStep("build", action);
  };

  const goBack = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) {
      navigateTo(stepOrder[idx - 1]);
    }
  };

  const saveFormatAndNext = () => {
    if (!contentId) return;
    const formats = selectedFormats.length > 0 ? selectedFormats : [format];
    const primary = formats.includes(format) ? format : formats[0];
    const source = getContentUnit(contentId);
    updateContentUnit(contentId, { format: primary, formatConfirmed: true });
    setField("format", primary);
    setField("formatConfirmed", true);

    formats
      .filter((item) => item !== primary)
      .forEach((extraFormat) => {
        const extraId = createContentUnit(projectId, {
          title: source
            ? `${source.title} · ${FORMAT_LABELS[extraFormat]}`
            : FORMAT_LABELS[extraFormat],
          format: extraFormat,
          formatConfirmed: true,
          sourceType: source?.sourceType,
          sourceUrl: source?.sourceUrl,
          sourceFileName: source?.sourceFileName,
          sourceUseLink: source?.sourceUseLink,
          sourceUseFile: source?.sourceUseFile,
          sourceNotesEnabled: source?.sourceNotesEnabled,
          sourceNotes: source?.sourceNotes,
          sourceLinks: source?.sourceLinks,
          sourceFiles: source?.sourceFiles,
          sourceExtracts: source?.sourceExtracts,
          promptId: source?.promptId,
          generationPrompt: source?.generationPrompt,
        });
        const extra = getContentUnit(extraId);
        if (extra) {
          createTask(
            createProductionTaskForContent(
              extraId,
              projectId,
              extraFormat,
              extra.title
            ),
            users
          );
        }
      });

    goNext();
  };

  const handleForward = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx >= stepOrder.length - 1) return;

    if (readOnly) {
      goNext();
      return;
    }

    if (currentStep === "format") {
      confirmWizardStep("format", saveFormatAndNext);
      return;
    }

    confirmWizardStep(currentStep, goNext);
  };

  const handleComplete = () => {
    if (!canEdit) return;
    updateContentUnit(contentId, { status: "done" });
    navigateTo("result");
  };

  const completedSteps: WizardStep[] = [];
  if (formatConfirmed) completedSteps.push("format");
  if (isExtracted) completedSteps.push("source");
  if (isPostGenerated) completedSteps.push("text");
  if (cards.length > 0 && cards.every((card) => card.imageUrl)) {
    completedSteps.push("cards");
  }
  if (buildStatus === "done") completedSteps.push("build", "result");

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const canGoBack = currentStepIndex > 0;
  const canGoForward =
    currentStepIndex >= 0 &&
    currentStepIndex < stepOrder.length - 1 &&
    (currentStep !== "format" || selectedFormats.length > 0);

  return (
    <AppShell projectId={projectId} breadcrumb="Создание контента">
      <WizardStepper
        format={format}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(targetStep) => navigateTo(targetStep)}
      />

      <div className={styles.wizard}>
        {readOnly && <WizardReadOnlyBanner stageLabel={currentStageLabel} />}

        <WizardStepProvider readOnly={readOnly} canEdit={canEdit}>
          <div className={styles.stepContent}>
            <div className={readOnly ? bannerStyles.readOnlyStep : undefined}>
              {currentStep === "format" && <StepFormat />}
              {currentStep === "source" && <StepSource />}
              {currentStep === "text" && <StepText />}
              {currentStep === "cards" && formatUsesCards(format) && <StepCards />}
              {currentStep === "build" && format === "gallery" && (
                <StepGalleryBuild
                  onComplete={handleComplete}
                  confirmBeforeAction={confirmBeforeAction}
                />
              )}
              {currentStep === "build" &&
                (format === "text" || format === "video_meme") && (
                <StepTextBuild
                  onComplete={handleComplete}
                  confirmBeforeAction={confirmBeforeAction}
                />
              )}
              {currentStep === "result" && (
                <StepResult projectId={projectId} contentId={contentId} />
              )}
            </div>

            <WizardStepNavigation
              readOnly={readOnly}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={handleForward}
            />
          </div>
        </WizardStepProvider>
      </div>

      <StepConfirmModal
        open={confirmOpen}
        content={confirmContent}
        onClose={closeConfirm}
        onConfirm={confirmPending}
      />
    </AppShell>
  );
}
