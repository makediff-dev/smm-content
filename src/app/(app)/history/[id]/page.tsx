"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import {
  buildScheduledAt,
  useContentPlanStore,
} from "@/stores/content-plan-store";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionLog } from "@/components/shared/action-log";
import { PlaceholderImage, VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowPanel } from "@/components/workflow/workflow-panel";
import { Modal } from "@/components/ui/modal";
import { FORMAT_LABELS } from "@/types";
import { formatDate } from "@/lib/simulate-generation";
import styles from "./history.module.css";

function getDefaultCpDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultCpTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatCpDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromKp = searchParams.get("from") === "kp";
  const currentUser = useAuthStore((s) => s.currentUser);
  const getContentUnit = useProjectsStore((s) => s.getContentUnit);
  const getProject = useProjectsStore((s) => s.getProject);
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const prompts = useSettingsStore((s) => s.prompts);
  const initWizard = useWizardStore((s) => s.initWizard);
  const addContentPlanSlot = useContentPlanStore((s) => s.addSlot);
  const cpSlots = useContentPlanStore((s) => s.slots);
  const [cpModalOpen, setCpModalOpen] = useState(false);
  const [cpDate, setCpDate] = useState(getDefaultCpDate);
  const [cpTime, setCpTime] = useState(getDefaultCpTime);
  const [cpNotice, setCpNotice] = useState<string | null>(null);

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

  const isInContentPlan = cpSlots.some((slot) => slot.contentUnitId === contentId);

  const handleCreateCopy = () => {
    const newId = createContentUnit(content.projectId, {
      title: `${content.title} (копия)`,
      format: content.format,
      formatConfirmed: false,
      sourceType: content.sourceType,
      sourceUrl: content.sourceUrl,
      sourceFileName: content.sourceFileName,
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
      sourceType: content.sourceType,
      sourceUrl: content.sourceUrl,
      sourceFileName: content.sourceFileName,
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

  const openCpModal = () => {
    setCpDate(getDefaultCpDate());
    setCpTime(getDefaultCpTime());
    setCpModalOpen(true);
  };

  const handleAddToCp = () => {
    if (!cpDate || !cpTime) return;

    const formatted = formatCpDateTime(cpDate, cpTime);
    const scheduledAt = buildScheduledAt(cpDate, cpTime);

    addContentPlanSlot({
      projectId: content.projectId,
      contentUnitId: contentId,
      scheduledAt,
      title: content.title,
      format: content.format,
      scenario: "scheduled",
      comment: "",
      hasText: !!content.postText,
      hasZip: content.format === "gallery" && content.status === "done",
      hasVisual:
        content.format !== "text" &&
        content.cards.length > 0 &&
        content.cards.every((card) => card.imageUrl),
    });

    if (currentUser) {
      addActionLog(contentId, `Добавлено в КП на ${formatted}`, currentUser.name);
    }

    setCpModalOpen(false);
    setCpNotice(`Контент добавлен в КП на ${formatted}`);
    setTimeout(() => setCpNotice(null), 3000);
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
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(fromKp ? "/kp" : `/projects/${content.projectId}`)}
      >
        ← Назад
      </button>

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

      <WorkflowPanel contentUnitId={contentId} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {content.sourceType === "file" ? "Исходный файл" : "Исходная ссылка"}
        </h3>
        <div className={styles.field}>
          {content.sourceType === "file" ? (
            <div className={styles.fieldValue}>{content.sourceFileName || "—"}</div>
          ) : (
            <a href={content.sourceUrl} className={styles.link} target="_blank" rel="noreferrer">
              {content.sourceUrl || "—"}
            </a>
          )}
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

      {(!isInContentPlan || content.status === "done" || cpNotice) && (
      <div className={styles.actions}>
        {!isInContentPlan && (
          <>
            <Button onClick={openCpModal}>Добавить в КП</Button>
            <Button variant="secondary" onClick={handleCreateCopy}>
              Создать копию
            </Button>
          </>
        )}
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
        {cpNotice && <span className={styles.cpNotice}>{cpNotice}</span>}
      </div>
      )}

      {!isInContentPlan && (
      <Modal
        title="Добавить в КП"
        open={cpModalOpen}
        onClose={() => setCpModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCpModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddToCp}>Добавить</Button>
          </>
        }
      >
        <p className={styles.modalHint}>
          Выберите дату и время публикации для коммерческого предложения.
        </p>
        <div className={styles.modalFields}>
          <Input
            label="Дата"
            type="date"
            value={cpDate}
            onChange={(e) => setCpDate(e.target.value)}
          />
          <Input
            label="Время"
            type="time"
            value={cpTime}
            onChange={(e) => setCpTime(e.target.value)}
          />
        </div>
      </Modal>
      )}
    </AppShell>
  );
}
