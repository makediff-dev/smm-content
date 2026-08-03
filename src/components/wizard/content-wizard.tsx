"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { WizardStepper } from "@/components/wizard/wizard-stepper";
import { StepFormat } from "@/components/wizard/step-format";
import { StepSource } from "@/components/wizard/step-source";
import { StepText } from "@/components/wizard/step-text";
import { StepCards } from "@/components/wizard/step-cards";
import { StepGalleryBuild } from "@/components/wizard/step-gallery-build";
import { StepSlideshowBuild } from "@/components/wizard/step-slideshow-build";
import { StepTextBuild } from "@/components/wizard/step-text-build";
import { StepResult } from "@/components/wizard/step-result";
import { WizardStepNavigation } from "@/components/wizard/wizard-step-navigation";
import { WizardReadOnlyBanner } from "@/components/wizard/wizard-read-only-banner";
import { WizardStepProvider } from "@/components/wizard/wizard-step-context";
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
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentId));

  const content = getContentUnit(contentId);
  const stepOrder = getStepOrderForFormat(format);
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
      formatConfirmed: content.formatConfirmed ?? true,
      sourceType: content.sourceType ?? "url",
      sourceUrl: content.sourceUrl,
      sourceFileName: content.sourceFileName ?? "",
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
      speechSpeed: content.speechSpeed,
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
    if (!content || task?.currentStage !== "designer") return;
    setField(
      "cardsPhase",
      getInitialCardsPhaseForStage("designer", content.cards)
    );
  }, [content, task?.currentStage, setField]);

  useEffect(() => {
    setField("currentStep", step);
  }, [step, setField]);

  useEffect(() => {
    if (!stepOrder.includes(step)) {
      router.replace(
        `/projects/${projectId}/content/${contentId}/wizard/${stepOrder[0]}`
      );
    }
  }, [step, stepOrder, projectId, contentId, router]);

  useEffect(() => {
    if (!formatConfirmed && step !== "format") {
      router.replace(`/projects/${projectId}/content/${contentId}/wizard/format`);
    }
  }, [formatConfirmed, step, projectId, contentId, router]);

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
    updateContentUnit(contentId, { format, formatConfirmed: true });
    setField("formatConfirmed", true);
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
  const canGoForward = currentStepIndex >= 0 && currentStepIndex < stepOrder.length - 1;

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
              {currentStep === "cards" && format !== "text" && <StepCards />}
              {currentStep === "build" && format === "gallery" && (
                <StepGalleryBuild
                  onComplete={handleComplete}
                  confirmBeforeAction={confirmBeforeAction}
                />
              )}
              {currentStep === "build" && format === "slideshow" && (
                <StepSlideshowBuild
                  onComplete={handleComplete}
                  confirmBeforeAction={confirmBeforeAction}
                />
              )}
              {currentStep === "build" && format === "text" && (
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
