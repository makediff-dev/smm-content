import type { ContentUnit, SourceExtract, SourceFileRef, SourceLinkKind } from "@/types";

export function detectLinkKind(raw: string): SourceLinkKind {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "t.me" || host === "telegram.me" || host === "telegram.dog") {
      return "telegram";
    }
    if (host === "vk.com" || host === "m.vk.com" || host === "vk.ru" || host === "m.vk.ru") {
      return "vk";
    }
  } catch {
    return "page";
  }
  return "page";
}

export function loadingHint(url: string): string {
  const kind = detectLinkKind(url);
  if (kind === "telegram") return "Читаем пост Telegram…";
  if (kind === "vk") return "Читаем пост ВКонтакте…";
  return "Читаем страницу…";
}

export function doneHint(extract: SourceExtract): string {
  const title = extract.title ? ` «${extract.title}»` : "";
  const kind = extract.kind ?? "page";
  const textPart =
    kind === "telegram"
      ? extract.text
        ? `Пост Telegram получен${title}`
        : "Текста в посте нет"
      : kind === "vk"
        ? extract.text
          ? `Пост ВКонтакте получен${title}`
          : "Текста в посте нет"
        : extract.text
          ? `Текст получен${title}`
          : "Текста статьи нет";

  return [textPart, extract.images?.length ? `${extract.images.length} фото для карточек` : null]
    .filter(Boolean)
    .join(" · ");
}

export function sourceLinksFromContent(content: ContentUnit): string[] {
  if (content.sourceLinks && content.sourceLinks.length > 0) {
    return content.sourceLinks;
  }
  return content.sourceUrl ? [content.sourceUrl] : [""];
}

export function sourceFilesFromContent(content: ContentUnit): SourceFileRef[] {
  if (content.sourceFiles && content.sourceFiles.length > 0) {
    return content.sourceFiles;
  }
  if (content.sourceFileName) {
    return [{ id: "seed-file", name: content.sourceFileName }];
  }
  return [];
}
