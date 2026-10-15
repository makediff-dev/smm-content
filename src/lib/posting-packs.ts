import {
  FORMAT_LABELS,
  type ContentFormat,
  type ContentPlanSlot,
  type ContentUnit,
} from "@/types";
import { getDesignerSlides } from "@/lib/designer-slides";
import type { AutoCheckItem } from "@/lib/role-workspace";

export type PostingPackAction = "download" | "copy";

export interface PostingPack {
  id: string;
  title: string;
  hint: string;
  action: PostingPackAction;
  fileName?: string;
  copyText?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function getPostingScheduleParts(iso: string): {
  dateLabel: string;
  timeLabel: string;
  fileDate: string;
  fileTime: string;
} {
  const date = new Date(iso);
  return {
    dateLabel: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
    timeLabel: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    fileDate: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)}`,
    fileTime: `${pad(date.getHours())}.${pad(date.getMinutes())}`,
  };
}

export function getPostingStatusLabel(
  status: "in_progress" | "returned" | "done",
  scheduledAt?: string
): string {
  if (status === "done") return "Вышло";
  if (!scheduledAt) return "В плане";
  const parts = getPostingScheduleParts(scheduledAt);
  return `В плане · ${parts.dateLabel} · ${parts.timeLabel}`;
}

const FORMAT_FILE_LABEL: Record<ContentFormat, string> = {
  gallery: "галерея",
  slideshow: "слайд-шоу",
  text: "текст",
  video_meme: "мем",
};

export function getPostingArchiveName(
  format: ContentFormat,
  scheduledAt: string
): string {
  const parts = getPostingScheduleParts(scheduledAt);
  return `${parts.fileDate}_пост ${FORMAT_FILE_LABEL[format]}_вк_${parts.fileTime}.zip`;
}

function getShortPostText(content: ContentUnit): string {
  const firstLine = content.postText
    .split(/\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine && firstLine.length <= 140) return firstLine;
  return content.postText.trim().slice(0, 140);
}

function getCopyText(content: ContentUnit): string {
  const longText = content.postText.trim();
  const shortText = getShortPostText(content);
  if (!longText) return shortText;
  if (shortText === longText) return longText;
  return `Длинный:\n${longText}\n\nКороткий:\n${shortText}`;
}

export function getPostingPacks(
  content: ContentUnit,
  scheduledAt: string
): PostingPack[] {
  const slides = getDesignerSlides(content);
  const stamp = getPostingScheduleParts(scheduledAt).fileDate;
  const copyText = getCopyText(content);

  if (content.format === "slideshow") {
    return [
      {
        id: "video",
        title: "VK, IG, OK, Дзен · ролик",
        hint: "Вертикальное видео до 90 секунд",
        action: "download",
        fileName: `${stamp}_ролик_слайд-шоу.mp4`,
      },
      {
        id: "stories",
        title: "VK, IG, OK · сторис",
        hint: "Кадры 1080 × 1920",
        action: "download",
        fileName: `${stamp}_сторис_слайд-шоу.zip`,
      },
      {
        id: "texts",
        title: "Тексты",
        hint: "Пост и текст озвучки",
        action: "copy",
        copyText: [copyText, content.narrationText.trim()]
          .filter(Boolean)
          .join("\n\nОзвучка:\n"),
      },
    ];
  }

  if (content.format === "text") {
    return [
      {
        id: "feed",
        title: "VK, IG, OK, Дзен · лента",
        hint: "Фото к посту + длинный текст",
        action: "download",
        fileName: `${stamp}_лента_текст.zip`,
      },
      {
        id: "stories",
        title: "VK, IG, OK · сторис",
        hint: "2 картинки 1080 × 1920 + вопрос",
        action: "download",
        fileName: `${stamp}_сторис_текст.zip`,
      },
      {
        id: "texts",
        title: "Тексты",
        hint: "Длинный и короткий, с хештегами",
        action: "copy",
        copyText,
      },
    ];
  }

  if (content.format === "video_meme") {
    return [
      {
        id: "video",
        title: "VK, IG, OK · ролик",
        hint: "Мем с плашкой и логотипом",
        action: "download",
        fileName: `${stamp}_мем.mp4`,
      },
      {
        id: "texts",
        title: "Тексты",
        hint: "Короткая подводка",
        action: "copy",
        copyText,
      },
    ];
  }

  const slideCount = Math.max(slides.length, 9);
  return [
    {
      id: "feed",
      title: "VK, IG, OK, Дзен · лента",
      hint: `${slideCount} картинок 1080 × 1080 + длинный текст`,
      action: "download",
      fileName: `${stamp}_лента_галерея.zip`,
    },
    {
      id: "stories",
      title: "VK, IG, OK · сторис",
      hint: "2 картинки 1080 × 1920 + вопрос",
      action: "download",
      fileName: `${stamp}_сторис_галерея.zip`,
    },
    {
      id: "texts",
      title: "Тексты",
      hint: "Длинный и короткий, с хештегами",
      action: "copy",
      copyText,
    },
  ];
}

export function getPostingChecks(): AutoCheckItem[] {
  return [
    { ok: true, text: "Размеры под каждую площадку" },
    { ok: true, text: "Имена файлов с датой" },
  ];
}

export function getManagerPackFileName(content: ContentUnit): string {
  const slug = content.title
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\wа-яА-ЯёЁ-]+/g, "")
    .slice(0, 48);
  return `${slug || "контент"}_файлы.zip`;
}

export function getManagerPackBody(content: ContentUnit): string {
  const slides = getDesignerSlides(content);
  const lines = [
    content.title,
    FORMAT_LABELS[content.format],
    "",
    "Текст поста:",
    content.postText.trim() || "—",
    "",
    "Файлы:",
  ];

  slides.forEach((slide, index) => {
    const name = slide.imageUrl
      ? `кадр-${index + 1}.jpg`
      : `кадр-${index + 1}.txt`;
    lines.push(`${index + 1}. ${name}${slide.shortText ? ` — ${slide.shortText}` : ""}`);
    if (slide.imageUrl) lines.push(`   ${slide.imageUrl}`);
  });

  if (content.sourceUrl) {
    lines.push(`Видео: ${content.sourceUrl}`);
  }
  if (content.sourceFileName) {
    lines.push(`Файл источника: ${content.sourceFileName}`);
  }
  if (content.narrationText.trim()) {
    lines.push("Озвучка: narration.txt");
  }
  (content.memeAssets ?? [])
    .filter((item) => !item.hidden)
    .forEach((item) => lines.push(`Другой файл: ${item.name}`));
  if (content.memeMusic && !content.memeMusic.muted) {
    lines.push(`Музыка: ${content.memeMusic.name}`);
  }

  return lines.join("\n");
}

export function downloadNamedFile(fileName: string, body: string): void {
  const blob = new Blob([body], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function copyTextToClipboard(text: string): void {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function resolvePostingSlot(
  slots: ContentPlanSlot[],
  content: ContentUnit,
  scheduledFallback: string
): ContentPlanSlot {
  const found = slots.find((slot) => slot.contentUnitId === content.id);
  if (found) return found;

  return {
    id: `preview-${content.id}`,
    projectId: content.projectId,
    contentUnitId: content.id,
    scheduledAt: scheduledFallback,
    title: content.title,
    format: content.format,
    scenario: "scheduled",
    comment: "",
    platforms: ["VK", "IG", "OK", "Дзен", "сторис"],
    hasText: true,
    hasZip: true,
    hasVisual: true,
  };
}
