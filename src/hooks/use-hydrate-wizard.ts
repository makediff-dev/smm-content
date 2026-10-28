"use client";

import { useEffect, useRef } from "react";
import { useWizardStore } from "@/stores/content-wizard-store";
import { getDesignerSlides } from "@/lib/designer-slides";
import { getInitialCardsPhaseForStage } from "@/lib/workflow-access";
import { sourceFilesFromContent, sourceLinksFromContent } from "@/lib/source-fields";
import type { ContentUnit, WorkflowStage } from "@/types";

export function useHydrateWizardFromContent(
  projectId: string,
  contentId: string,
  content: ContentUnit | undefined,
  currentStage?: WorkflowStage,
  versionKey?: string
) {
  const initWizard = useWizardStore((s) => s.initWizard);
  const hydratedContentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!content) return;
    const key = `${contentId}:${versionKey ?? "current"}`;
    if (hydratedContentIdRef.current === key) return;

    hydratedContentIdRef.current = key;
    initWizard(projectId, contentId, {
      format: content.format,
      selectedFormats: [content.format],
      formatConfirmed: content.formatConfirmed ?? true,
      sourceType: content.sourceType ?? "url",
      sourceUrl: content.sourceUrl,
      sourceFileName: content.sourceFileName ?? "",
      sourceUseLink: content.sourceUseLink ?? content.sourceType !== "file",
      sourceUseFile: content.sourceUseFile ?? content.sourceType === "file",
      sourceNotesEnabled: content.sourceNotesEnabled ?? false,
      sourceNotes: content.sourceNotes ?? "",
      sourceLinks: sourceLinksFromContent(content),
      sourceFiles: sourceFilesFromContent(content),
      sourceExtracts: content.sourceExtracts ?? {},
      cardsCount: content.cardsCount ?? 3,
      videoTransition: content.videoTransition ?? "none",
      promptId: content.promptId,
      additionalInstructions: content.additionalInstructions,
      extractedTitle: content.extractedTitle,
      extractedText: content.extractedText,
      extractedImages: content.extractedImages,
      postText: content.postText,
      cards:
        content.format === "video_meme" && content.cards.length === 0
          ? getDesignerSlides(content)
          : content.cards,
      cardsPhase: getInitialCardsPhaseForStage(currentStage, content.cards),
      isGeneratingCardPhrases: false,
      isGeneratingCardImages: false,
      isExtracted: Boolean(content.extractedText),
      isPostGenerated: Boolean(content.postText),
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
  }, [contentId, projectId, content, currentStage, versionKey, initWizard]);
}
