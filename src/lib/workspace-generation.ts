import type { Card, ContentFormat, ContentUnit, SourceType } from "@/types";
import { generateId } from "@/lib/simulate-generation";
import {
  getMockCards,
  getMockCardsRegenerated,
  getMockExtractionData,
  getMockPostText,
  getMockPostTextRegenerated,
} from "@/lib/mock-wizard-data";
import { generateMockPostText } from "@/lib/mock-text-generation";

export function extractedPagePhotoUrls(
  images: string[],
  seed: string,
  format?: ContentFormat
): string[] {
  if (images.length === 0) return [];
  const { width, height } = photoSizeForFormat(format);
  return images.map((image, index) =>
    /^https?:\/\//i.test(image)
      ? image
      : `https://picsum.photos/seed/${seed}-page-${index}/${width}/${height}`
  );
}

export function pagePhotosFromSource(options: {
  sourceType?: SourceType;
  sourceUrl?: string;
  extractedImages?: string[];
  seed?: string;
  format?: ContentFormat;
}): string[] {
  if (options.sourceType === "file") return [];
  if (!options.sourceUrl?.trim()) return [];
  const images = options.extractedImages ?? [];
  if (images.length === 0) return [];
  return extractedPagePhotoUrls(images, options.seed ?? "source", options.format);
}

export function buildGeneratedExtraction(content: ContentUnit) {
  const base = getMockExtractionData(content.format);
  return {
    ...base,
    images: extractedPagePhotoUrls(
      base.images,
      content.id || content.sourceUrl || "source",
      content.format
    ),
  };
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

export function photoSizeForFormat(format?: ContentFormat): { width: number; height: number } {
  if (format === "slideshow" || format === "video_meme") {
    return { width: 1080, height: 1920 };
  }
  return { width: 1080, height: 1080 };
}

export function buildGeneratedPhotos(
  cards: Card[],
  seed: string,
  format?: ContentFormat
): Card[] {
  const stamp = Date.now();
  const { width, height } = photoSizeForFormat(format);
  return cards.map((card, index) => ({
    ...card,
    imageUrl: `https://picsum.photos/seed/${seed}-${card.id}-${stamp}-${index}/${width}/${height}`,
    status: "ready",
  }));
}

export function buildNarrationFromCards(cards: Card[]): string {
  const lines = cards.map((card) => card.shortText.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `${lines.join(". ")}.`;
}
