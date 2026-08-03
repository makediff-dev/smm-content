import type { Card, ContentFormat } from "@/types";

export const DEMO_SOURCE_URL = "https://example.com/demo-article";

export interface MockExtractionData {
  title: string;
  text: string;
  images: string[];
}

const EXTRACTION_BY_FORMAT: Record<ContentFormat, MockExtractionData> = {
  gallery: {
    title: "Обзор AI-инструментов для контент-команд",
    text:
      "Искусственный интеллект стал неотъемлемой частью работы SMM-специалистов. Команды используют AI для генерации текстов, подбора визуалов и планирования публикаций.\n\nВ материале разобраны пять инструментов, которые помогают ускорить производство контента без потери качества.",
    images: ["img-a", "img-b", "img-c", "img-d", "img-e", "img-f"],
  },
  slideshow: {
    title: "5 трендов SaaS, которые меняют рынок",
    text:
      "Рынок SaaS продолжает трансформироваться. AI-first подход, vertical SaaS и product-led growth становятся стандартом для зрелых продуктов.\n\nКаждый тренд влияет на стратегию контента: от формата слайдов до тона озвучки в коротких видео.",
    images: ["img-a", "img-b", "img-c", "img-d"],
  },
  text: {
    title: "Дайджест digital-маркетинга",
    text:
      "На этой неделе Meta обновила алгоритм ленты, TikTok расширил инструменты для B2B, а исследование HubSpot показало рост использования AI в контент-командах на 35%.\n\nЭксперты рекомендуют адаптировать стратегии под оригинальный контент и короткие форматы.",
    images: [],
  },
};

const POST_TEXT_BY_FORMAT: Record<ContentFormat, string> = {
  gallery:
    "AI ускоряет контент-производство. Разбираем 5 инструментов, которые стоит внедрить уже сейчас — от текстов до визуалов для карточек.",
  slideshow:
    "SaaS-рынок в 2026: три тренда, которые нельзя игнорировать. Смотрите слайд-шоу с ключевыми тезисами для вашей аудитории.",
  text:
    "Главное за неделю в digital:\n\n• Meta обновила алгоритм ленты\n• TikTok расширил B2B-инструменты\n• AI в контент-командах +35%\n\n#маркетинг #digital",
};

export function getMockExtractionData(format: ContentFormat): MockExtractionData {
  return EXTRACTION_BY_FORMAT[format];
}

export function getMockExtractionDataFromFile(
  format: ContentFormat,
  fileName: string
): MockExtractionData {
  const base = getMockExtractionData(format);
  const label = fileName.replace(/\.[^.]+$/, "") || fileName;

  return {
    ...base,
    title: `${base.title} (${label})`,
  };
}

export function getMockPostText(format: ContentFormat): string {
  return POST_TEXT_BY_FORMAT[format];
}

export function getMockPostTextRegenerated(
  format: ContentFormat,
  extraPrompt: string
): string {
  const base = POST_TEXT_BY_FORMAT[format];
  const hint = extraPrompt.trim().slice(0, 80);
  if (!hint) return base;
  return `${base}\n\n[По уточнению: «${hint}${extraPrompt.trim().length > 80 ? "…" : ""}»]`;
}

export function getMockCards(format: ContentFormat, copyright: string): Card[] {
  const phrases =
    format === "slideshow"
      ? [
          { text: "AI-first подход", duration: 4 },
          { text: "Vertical SaaS растёт", duration: 5 },
          { text: "PLG-модель в продукте", duration: 3 },
        ]
      : [
          { text: "5 инструментов для автоматизации" },
          { text: "ChatGPT для контент-плана" },
          { text: "Midjourney для визуалов" },
        ];

  return phrases.map((item, index) => ({
    id: `mock-card-${format}-${index + 1}`,
    shortText: item.text,
    copyright,
    status: (index === phrases.length - 1 ? "needs_edit" : "ready") as Card["status"],
    ...(format === "slideshow" && "duration" in item
      ? { duration: item.duration }
      : {}),
  }));
}

export function getMockCardsRegenerated(
  format: ContentFormat,
  copyright: string,
  extraPrompt: string
): Card[] {
  const hint = extraPrompt.trim().slice(0, 50);
  if (!hint) return getMockCards(format, copyright);

  const altPhrases =
    format === "slideshow"
      ? [
          { text: `Тренд: ${hint}`, duration: 4 },
          { text: "Ключевой инсайт для аудитории", duration: 5 },
          { text: "Вывод и следующий шаг", duration: 3 },
        ]
      : [
          { text: `Идея: ${hint}` },
          { text: "Главный тезис материала" },
          { text: "Призыв перейти к источнику" },
        ];

  return altPhrases.map((item, index) => ({
    id: `mock-card-${format}-${index + 1}`,
    shortText: item.text,
    copyright,
    status: (index === altPhrases.length - 1 ? "needs_edit" : "ready") as Card["status"],
    ...(format === "slideshow" && "duration" in item
      ? { duration: item.duration }
      : {}),
  }));
}
