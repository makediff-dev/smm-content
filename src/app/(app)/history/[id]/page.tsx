"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionLog } from "@/components/shared/action-log";
import { PlaceholderImage, VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { FORMAT_LABELS } from "@/types";
import { formatDate } from "@/lib/simulate-generation";
import styles from "./history.module.css";

export default function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contentId } = use(params);
  const router = useRouter();
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const prompts = useSettingsStore((s) => s.prompts);
  const initWizard = useWizardStore((s) => s.initWizard);

  const content = getContentUnit(contentId);
  const project = content ? getProject(content.projectId) : undefined;
  const prompt = content
    ? prompts.find((p) => p.id === content.promptId)
    : undefined;

  if (!content || !project) {
    return (
      <AppShell breadcrumb="История">
        <p>Контент не найден</p>
      </AppShell>
    );
  }

  const handleCreateCopy = () => {
    const newId = createContentUnit(content.projectId, {
      title: `${content.title} (копия)`,
      format: content.format,
      formatConfirmed: false,
      sourceUrl: content.sourceUrl,
      postText: content.postText,
      promptId: content.promptId,
      cards: content.cards,
      extractedTitle: content.extractedTitle,
      extractedText: content.extractedText,
      extractedImages: content.extractedImages,
      buildOptions: content.buildOptions,
      textTone: content.textTone,
      textLength: content.textLength,
      textOptions: content.textOptions,
      generationPrompt: content.generationPrompt,
    });
    initWizard(content.projectId, newId, {
      format: content.format,
      sourceUrl: content.sourceUrl,
      postText: content.postText,
      promptId: content.promptId,
      cards: content.cards,
      isExtracted: true,
      isPostGenerated: true,
      extractedTitle: content.extractedTitle,
      extractedText: content.extractedText,
      extractedImages: content.extractedImages,
      textTone: content.textTone,
      textLength: content.textLength,
      textOptions: content.textOptions,
      generationPrompt: content.generationPrompt,
    });
    router.push(
      `/projects/${content.projectId}/content/${newId}/wizard/format`
    );
  };

  const files =
    content.status === "done"
      ? content.format === "gallery"
        ? ["gallery.zip", ...content.cards.map((_, i) => `card-${i + 1}.png`)]
        : content.format === "slideshow"
          ? ["video.mp4", "cards.zip", "audio.mp3"]
          : ["post.txt", "post.md"]
      : [];

  return (
    <AppShell projectId={content.projectId} breadcrumb="История генерации">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{content.title}</h1>
          <p className={styles.meta}>
            {FORMAT_LABELS[content.format]} · {formatDate(content.createdAt)} ·{" "}
            {project.name}
          </p>
        </div>
        <StatusBadge status={content.status} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Исходная ссылка</h3>
        <div className={styles.field}>
          <a href={content.sourceUrl} className={styles.link} target="_blank" rel="noreferrer">
            {content.sourceUrl || "—"}
          </a>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Извлечённый текст</h3>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Заголовок</div>
          <div className={styles.fieldValue}>{content.extractedTitle || "—"}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Текст</div>
          <div className={styles.fieldValue}>{content.extractedText || "—"}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Использованный промпт</h3>
        <div className={styles.fieldValue}>
          {prompt ? `${prompt.name}: ${prompt.text}` : "—"}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Итоговый текст поста</h3>
        <div className={styles.fieldValue} style={{ whiteSpace: "pre-wrap" }}>
          {content.postText || "—"}
        </div>
      </div>

      {content.format === "text" && content.generationPrompt && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Промпт генерации</h3>
          <div className={styles.fieldValue}>{content.generationPrompt}</div>
        </div>
      )}

      {content.format !== "text" && (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Карточки</h3>
        {content.format === "slideshow" && content.status === "done" && (
          <div style={{ marginBottom: 16 }}>
            <VideoPlayerStub />
          </div>
        )}
        <div className={styles.cardsGrid}>
          {content.cards.map((card) => (
            <PlaceholderImage
              key={card.id}
              variant="vertical"
              label={card.shortText.slice(0, 20)}
            />
          ))}
          {content.cards.length === 0 && (
            <p className={styles.meta}>Карточки не созданы</p>
          )}
        </div>
      </div>
      )}

      {files.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Файлы для скачивания</h3>
          <div className={styles.files}>
            {files.map((file) => (
              <div key={file} className={styles.file}>
                <span>{file}</span>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => alert(`[Прототип] Скачать ${file}`)}
                >
                  Скачать
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Лог действий</h3>
        <ActionLog entries={content.actionLog} />
      </div>

      <div className={styles.actions}>
        <Button onClick={handleCreateCopy}>Создать копию</Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/projects/${content.projectId}`)}
        >
          Вернуться к проекту
        </Button>
        {content.status === "done" && (
          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/projects/${content.projectId}/content/${contentId}/wizard/result`
              )
            }
          >
            Открыть результат
          </Button>
        )}
      </div>
    </AppShell>
  );
}
