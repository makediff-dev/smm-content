import type { Card, ContentFormat, ContentUnit } from "@/types";
import { photoSizeForFormat } from "@/lib/workspace-generation";

export type DesignerTool = "crop" | "plaque" | "text" | "dim";

export interface SlideOverlay {
  crop: boolean;
  plaque: boolean;
  dim: boolean;
}

export const EMPTY_OVERLAY: SlideOverlay = {
  crop: false,
  plaque: true,
  dim: true,
};

export function getDesignerFrameLabel(format: ContentFormat): string {
  if (format === "gallery" || format === "text") return "1080 × 1080";
  if (format === "video_meme") return "нужный размер";
  return "1080 × 1920";
}

function padGallerySlides(
  cards: Card[],
  contentId: string,
  format?: ContentFormat
): Card[] {
  if (cards.length >= 9) return cards;
  const next = [...cards];
  const size = photoSizeForFormat(format);
  while (next.length < 9) {
    const index = next.length;
    next.push({
      id: `slide-${contentId}-${index + 1}`,
      shortText: `Слайд ${index + 1}`,
      copyright: "",
      status: index === 3 ? "needs_edit" : "ready",
      imageUrl: `https://picsum.photos/seed/${contentId}-${index + 1}/${size.width}/${size.height}`,
    });
  }
  return next;
}

export function getDesignerSlides(content: ContentUnit): Card[] {
  if (content.cards.length > 0) {
    if (
      content.format === "gallery" ||
      content.format === "slideshow" ||
      content.format === "text"
    ) {
      return padGallerySlides(content.cards, content.id, content.format);
    }
    return content.cards;
  }

  if (content.format === "text") {
    return padGallerySlides([], content.id, content.format);
  }

  if (content.format === "video_meme") {
    return [
      {
        id: `meme-${content.id}-1`,
        shortText: content.postText.slice(0, 42) || "Подводка",
        copyright: "",
        status: "ready" as const,
        imageUrl: `https://picsum.photos/seed/${content.id}-meme/1080/1920`,
      },
    ];
  }

  const phrases = content.postText
    .split(/[.!?\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 9);

  const labels = phrases.length > 0 ? phrases : ["Слайд"];

  const size = photoSizeForFormat(content.format);
  return Array.from({ length: Math.max(9, labels.length) }, (_, index) => ({
    id: `slide-${content.id}-${index + 1}`,
    shortText: labels[index % labels.length] ?? `Слайд ${index + 1}`,
    copyright: "",
    status: index === 3 ? ("needs_edit" as const) : ("ready" as const),
    imageUrl: `https://picsum.photos/seed/${content.id}-${index + 1}/${size.width}/${size.height}`,
  }));
}

export function getProblemSlideIndex(slides: Card[]): number {
  const flagged = slides.findIndex((slide) => slide.status === "needs_edit");
  if (flagged >= 0) return flagged;
  return Math.min(3, Math.max(0, slides.length - 1));
}
