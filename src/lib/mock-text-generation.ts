import type { TextLength, TextTone, TextTransformAction } from "@/types";

const BASE_POST =
  "AI меняет подход к контент-маркетингу. Разбираем ключевые инструменты, которые стоит внедрить уже сейчас — от генерации текстов до автоматизации публикаций.";

const SHORT_POST =
  "AI ускоряет контент-маркетинг. Топ-инструменты для автоматизации уже доступны.";

const LONG_POST =
  "AI меняет подход к контент-маркетингу. Разбираем ключевые инструменты, которые стоит внедрить уже сейчас.\n\nОт генерации текстов и визуалов до планирования публикаций — команды экономят до 40% времени на рутине. Главное — задать правильный промпт и проверить результат перед публикацией.\n\n#контент #AI #маркетинг";

const BULLET_POST =
  "Что даёт AI в SMM:\n• Быстрая адаптация новостей под соцсети\n• Единый тон бренда в каждом посте\n• Сокращение рутины без потери качества";

export function generateMockPostText(
  tone: TextTone,
  length: TextLength,
  customPrompt?: string
): string {
  if (customPrompt?.trim()) {
    const preview = customPrompt.trim().slice(0, 60);
    const suffix =
      length === "short"
        ? "Краткая версия по вашему промпту."
        : length === "long"
          ? "Развёрнутая версия с деталями и примерами по вашему промпту."
          : "Текст поста по вашему промпту.";
    return `[${tone}] ${suffix} «${preview}${customPrompt.length > 60 ? "…" : ""}»`;
  }

  if (length === "short") return applyTone(SHORT_POST, tone);
  if (length === "long") return applyTone(LONG_POST, tone);
  return applyTone(BASE_POST, tone);
}

export function transformMockText(
  source: string,
  action: TextTransformAction
): string {
  const trimmed = source.trim();
  if (!trimmed) return trimmed;

  switch (action) {
    case "shorten":
      return trimmed.length > 120
        ? `${trimmed.slice(0, 110).trim()}…`
        : `${trimmed.split(".")[0]}.`;
    case "expand":
      return `${trimmed}\n\nДополнительный контекст: материал адаптирован для соцсетей с акцентом на практическую пользу для аудитории.`;
    case "formal":
      return trimmed
        .replace(/!/g, ".")
        .replace(/\bAI\b/g, "искусственный интеллект")
        .concat(" Материал подготовлен на основе анализа источника.");
    case "casual":
      return `Коротко: ${trimmed.replace(/\./g, "!")} Сохраняйте в закладки 👋`;
    case "bullets":
      return BULLET_POST;
    case "regenerate":
      return generateMockPostText("friendly", "medium");
    default:
      return trimmed;
  }
}

function applyTone(text: string, tone: TextTone): string {
  switch (tone) {
    case "formal":
      return text.replace(/!/g, ".").concat(" Материал подготовлен редакцией.");
    case "casual":
      return `Эй! ${text} Что думаете?`;
    case "expert":
      return `Экспертный взгляд: ${text}`;
    default:
      return text;
  }
}

export const TEXT_TRANSFORM_LABELS: Record<TextTransformAction, string> = {
  shorten: "Сократить",
  expand: "Расширить",
  formal: "Формальный тон",
  casual: "Разговорный тон",
  bullets: "Списком",
  regenerate: "Перегенерировать",
};

export function countChars(text: string): number {
  return text.length;
}
