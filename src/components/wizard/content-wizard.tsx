"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useProjectsStore } from "@/stores/projects-store";
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
import { Button } from "@/components/ui/button";
import { getStepOrderForFormat, inferCardsPhase, type WizardStep } from "@/types";
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

  const content = getContentUnit(contentId);
  const stepOrder = getStepOrderForFormat(format);
  const hydratedContentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!content) return;
    if (hydratedContentIdRef.current === contentId) return;

    hydratedContentIdRef.current = contentId;
    initWizard(projectId, contentId, {
      format: content.format,
      formatConfirmed: content.formatConfirmed ?? true,
      sourceUrl: content.sourceUrl,
      promptId: content.promptId,
      additionalInstructions: content.additionalInstructions,
      extractedTitle: content.extractedTitle,
      extractedText: content.extractedText,
      extractedImages: content.extractedImages,
      postText: content.postText,
      cards: content.cards,
      cardsPhase: inferCardsPhase(content.cards),
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
  }, [contentId, projectId, content, initWizard]);

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

  const goBack = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) {
      navigateTo(stepOrder[idx - 1]);
    }
  };

  const handleComplete = () => {
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

  const canGoBack = currentStep !== "format" && currentStep !== "source";
  const stepIndex = stepOrder.indexOf(currentStep);

  return (
    <AppShell projectId={projectId} breadcrumb="Создание контента">
      <WizardStepper
        format={format}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(s) => {
          const targetIdx = stepOrder.indexOf(s);
          if (targetIdx <= stepIndex || completedSteps.includes(s)) {
            navigateTo(s);
          }
        }}
      />

      <div className={styles.wizard}>
        <div className={styles.stepContent}>
          {currentStep === "format" && <StepFormat onNext={goNext} />}
          {currentStep === "source" && <StepSource onNext={goNext} />}
          {currentStep === "text" && <StepText />}
          {currentStep === "cards" && format !== "text" && <StepCards />}
          {currentStep === "build" && format === "gallery" && (
            <StepGalleryBuild onComplete={handleComplete} />
          )}
          {currentStep === "build" && format === "slideshow" && (
            <StepSlideshowBuild onComplete={handleComplete} />
          )}
          {currentStep === "build" && format === "text" && (
            <StepTextBuild onComplete={handleComplete} />
          )}
          {currentStep === "result" && (
            <StepResult projectId={projectId} contentId={contentId} />
          )}
        </div>

        {currentStep !== "format" &&
          currentStep !== "source" &&
          currentStep !== "result" &&
          currentStep !== "build" && (
          <div className={styles.nav}>
            <div>
              {canGoBack && (
                <Button variant="ghost" onClick={goBack}>
                  ← Назад
                </Button>
              )}
            </div>
            <div className={styles.navRight}>
              {currentStep === "text" && isPostGenerated && postText.trim() && (
                <Button onClick={goNext}>
                  {format === "text" ? "К финализации →" : "Далее →"}
                </Button>
              )}
              {currentStep === "cards" &&
                cards.length > 0 &&
                cards.every((card) => card.imageUrl) && (
                <Button onClick={goNext}>Далее →</Button>
              )}
            </div>
          </div>
        )}

        {(currentStep === "format" || currentStep === "source") && (
          <div className={styles.nav}>
            <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}`)}>
              ← К проекту
            </Button>
            {currentStep === "source" && (
              <div className={styles.navRight}>
                <Button variant="ghost" onClick={goBack}>
                  ← Изменить формат
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
