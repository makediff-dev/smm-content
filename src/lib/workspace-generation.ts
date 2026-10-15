import type { Card, ContentUnit } from "@/types";
import { generateId } from "@/lib/simulate-generation";
import {
  getMockCards,
  getMockCardsRegenerated,
  getMockExtractionData,
  getMockPostText,
  getMockPostTextRegenerated,
} from "@/lib/mock-wizard-data";
import { generateMockPostText } from "@/lib/mock-text-generation";

export function buildGeneratedExtraction(content: ContentUnit) {
  return getMockExtractionData(content.format);
}

export function buildGeneratedPost(content: ContentUnit, extraPrompt?: string): string {
  const hint = extraPrompt?.trim() ?? "";
  if (content.format === "text") {
    return generateMockPostText(
      content.textTone,
      content.textLength,
      hint || content.generationPrompt || content.extractedText
    );
  }
  if (hint) return getMockPostTextRegenerated(content.format, hint);
  return getMockPostText(content.format);
}

export function buildGeneratedCards(
  content: ContentUnit,
  extraPrompt?: string
): Card[] {
  const hint = extraPrompt?.trim() ?? "";
  const generated = hint
    ? getMockCardsRegenerated(content.format, "", hint)
    : getMockCards(content.format, "");

  return generated.map((card, index) => ({
    ...card,
    id: content.cards[index]?.id ?? generateId("card"),
    imageUrl: content.cards[index]?.imageUrl,
    duration: card.duration ?? content.cards[index]?.duration,
  }));
}

export function buildGeneratedPhotos(cards: Card[], seed: string): Card[] {
  const stamp = Date.now();
  return cards.map((card, index) => ({
    ...card,
    imageUrl: `https://picsum.photos/seed/${seed}-${card.id}-${stamp}-${index}/1080/1080`,
    status: "ready",
  }));
}

export function buildNarrationFromCards(cards: Card[]): string {
  const lines = cards.map((card) => card.shortText.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `${lines.join(". ")}.`;
}
