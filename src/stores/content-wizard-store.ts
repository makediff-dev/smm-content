"use client";

import { create } from "zustand";
import type { Card, ContentFormat, TaskStatus, TextLength, TextTone, WizardStep, CardsPhase } from "@/types";

interface WizardState {
  contentId: string | null;
  projectId: string | null;
  currentStep: WizardStep;
  format: ContentFormat;
  formatConfirmed: boolean;
  sourceUrl: string;
  promptId: string;
  additionalInstructions: string;
  extractedTitle: string;
  extractedText: string;
  extractedImages: string[];
  postText: string;
  isExtracted: boolean;
  isPostGenerated: boolean;
  isExtracting: boolean;
  isGeneratingPost: boolean;
  selectedCardId: string | null;
  cards: Card[];
  cardsPhase: CardsPhase;
  isGeneratingCardPhrases: boolean;
  isGeneratingCardImages: boolean;
  buildStatus: "idle" | TaskStatus;
  voiceModel: string;
  speechSpeed: number;
  narrationText: string;
  isVoiceGenerated: boolean;
  isBuilding: boolean;
  buildProgress: string[];
  buildOptions: {
    addCopyright: boolean;
    applyBrandStyle: boolean;
    prepareArchive: boolean;
  };
  textTone: TextTone;
  textLength: TextLength;
  generationPrompt: string;
  textOptions: {
    includeHashtags: boolean;
    includeEmoji: boolean;
    addSourceLink: boolean;
  };
  isTransforming: boolean;
  lastTransform: string | null;
  initWizard: (projectId: string, contentId: string, data?: Partial<WizardState>) => void;
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  resetWizard: () => void;
}

const initialState = {
  contentId: null as string | null,
  projectId: null as string | null,
  currentStep: "source" as WizardStep,
  format: "gallery" as ContentFormat,
  formatConfirmed: false,
  sourceUrl: "",
  promptId: "prompt-post",
  additionalInstructions: "",
  extractedTitle: "",
  extractedText: "",
  extractedImages: [] as string[],
  postText: "",
  isExtracted: false,
  isPostGenerated: false,
  isExtracting: false,
  isGeneratingPost: false,
  selectedCardId: null as string | null,
  cards: [] as Card[],
  cardsPhase: "phrases" as CardsPhase,
  isGeneratingCardPhrases: false,
  isGeneratingCardImages: false,
  buildStatus: "idle" as WizardState["buildStatus"],
  voiceModel: "voice-female-1",
  speechSpeed: 1,
  narrationText: "",
  isVoiceGenerated: false,
  isBuilding: false,
  buildProgress: [] as string[],
  buildOptions: {
    addCopyright: true,
    applyBrandStyle: true,
    prepareArchive: true,
  },
  textTone: "friendly" as TextTone,
  textLength: "medium" as TextLength,
  generationPrompt: "",
  textOptions: {
    includeHashtags: true,
    includeEmoji: false,
    addSourceLink: true,
  },
  isTransforming: false,
  lastTransform: null as string | null,
};

export const useWizardStore = create<WizardState>()((set) => ({
  ...initialState,

  initWizard: (projectId, contentId, data) => {
    set({
      ...initialState,
      projectId,
      contentId,
      ...data,
      selectedCardId: data?.cards?.[0]?.id ?? null,
    });
  },

  setField: (key, value) => set({ [key]: value }),

  resetWizard: () => set(initialState),
}));
