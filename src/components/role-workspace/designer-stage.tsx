"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import type { Card, ContentUnit } from "@/types";
import { PlaceholderImage, VideoPlayerStub } from "@/components/shared/placeholder-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getDesignerFrameLabel,
  getDesignerSlides,
  getProblemSlideIndex,
  type SlideOverlay,
} from "@/lib/designer-slides";
import { simulateTask } from "@/lib/simulate-generation";
import { buildGeneratedPhotos } from "@/lib/workspace-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import styles from "./role-workspace.module.css";

interface DesignerStageProps {
  content: ContentUnit;
  canOperate: boolean;
  canEdit: boolean;
  onCardsChange: (cards: Card[]) => void;
}

const DEFAULT_OVERLAY: SlideOverlay = {
  crop: false,
  plaque: false,
  dim: false,
};

export function DesignerStage({
  content,
  canOperate,
  canEdit,
  onCardsChange,
}: DesignerStageProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const slides = useMemo(
    () => (content.cards.length > 0 ? content.cards : getDesignerSlides(content)),
    [content]
  );
  const problemIndex = getProblemSlideIndex(slides);
  const [selectedIndex, setSelectedIndex] = useState(
    Math.min(problemIndex, Math.max(0, slides.length - 1))
  );
  const [overlays, setOverlays] = useState<Record<string, SlideOverlay>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = slides[selectedIndex] ?? slides[0];
  const frame = getDesignerFrameLabel(content.format);
  const locked = !canOperate;

  const log = (action: string) => {
    if (currentUser) addActionLog(content.id, action, currentUser.name);
  };

  const commit = (next: Card[]) => {
    onCardsChange(next);
  };

  const updateCard = (cardId: string, patch: Partial<Card>) => {
    commit(slides.map((slide) => (slide.id === cardId ? { ...slide, ...patch } : slide)));
  };

  const handleGenerateImages = async () => {
    if (locked) return;
    setBusy("Генерация фотографий…");
    await simulateTask(() => {}, ["queued", "in_progress", "done"], 800);
    commit(buildGeneratedPhotos(slides, content.id));
    log("Генерация фотографий для карточек");
    setBusy(null);
  };

  const handleGenerateOne = async () => {
    if (locked || !selected) return;
    setBusy("Генерация кадра…");
    await simulateTask(() => {}, ["queued", "in_progress"], 450);
    updateCard(selected.id, {
      imageUrl: `https://picsum.photos/seed/${selected.id}-${Date.now()}/1080/1080`,
      status: "ready",
    });
    log(`Сгенерировано фото слайда ${selectedIndex + 1}`);
    setBusy(null);
  };

  const applyPhoto = (imageUrl: string) => {
    if (locked || !selected) return;
    updateCard(selected.id, { imageUrl, status: "ready" });
  };

  const toggleOverlay = (key: keyof SlideOverlay) => {
    if (!selected || (!canEdit && !canOperate)) return;
    setOverlays((current) => {
      const prev = current[selected.id] ?? DEFAULT_OVERLAY;
      return { ...current, [selected.id]: { ...prev, [key]: !prev[key] } };
    });
  };

  const handleAssembleMeme = async () => {
    if (locked) return;
    setBusy("Сборка мема…");
    await simulateTask(() => {}, ["queued", "in_progress"], 600);
    log("Собран видео-мем: плашка и логотип");
    setBusy(null);
  };

  if (content.format === "video_meme") {
    return (
      <div className={styles.stackPreview}>
        <div>
          <VideoPlayerStub
            className={styles.playerWide}
            src={content.sourceUrl || undefined}
          />
          <p className={styles.visualLabel}>Видео-мем · {frame}</p>
        </div>
        {canOperate && (
          <div className={styles.aiRow}>
            <Button disabled={Boolean(busy)} onClick={handleAssembleMeme}>
              Собрать мем
            </Button>
          </div>
        )}
        {busy && <p className={styles.busyNote}>{busy}</p>}
      </div>
    );
  }

  return (
    <VisualBoard
      content={content}
      slides={slides}
      selectedIndex={selectedIndex}
      overlays={overlays}
      frame={frame}
      problemIndex={problemIndex}
      canOperate={canOperate}
      canEdit={canEdit}
      busy={busy}
      photoLink={imageUrlInput}
      fileRef={fileRef}
      onSelect={setSelectedIndex}
      onPhotoLink={setImageUrlInput}
      onApplyLink={() => applyPhoto(imageUrlInput.trim())}
      onFile={(file) => applyPhoto(URL.createObjectURL(file))}
      onGenerateOne={handleGenerateOne}
      onGenerateAll={handleGenerateImages}
      onToggle={toggleOverlay}
      onText={(shortText) => selected && updateCard(selected.id, { shortText })}
      selected={selected}
    />
  );
}


function VisualBoard({
  content,
  slides,
  selectedIndex,
  overlays,
  frame,
  problemIndex,
  canOperate,
  canEdit,
  busy,
  photoLink,
  fileRef,
  onSelect,
  onPhotoLink,
  onApplyLink,
  onFile,
  onGenerateOne,
  onGenerateAll,
  onToggle,
  onText,
  selected,
}: {
  content: ContentUnit;
  slides: Card[];
  selectedIndex: number;
  overlays: Record<string, SlideOverlay>;
  frame: string;
  problemIndex: number;
  canOperate: boolean;
  canEdit: boolean;
  busy: string | null;
  photoLink: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onSelect: (index: number) => void;
  onPhotoLink: (value: string) => void;
  onApplyLink: () => void;
  onFile: (file: File) => void;
  onGenerateOne: () => void;
  onGenerateAll: () => void;
  onToggle: (key: keyof SlideOverlay) => void;
  onText: (value: string) => void;
  selected?: Card;
}) {
  return (
    <div className={styles.stackPreview}>
      <div className={styles.photoGrid}>
        {slides.map((slide, index) => {
          const slideOverlay = overlays[slide.id] ?? DEFAULT_OVERLAY;
          return (
            <button
              key={slide.id}
              type="button"
              className={`${styles.slideTile} ${
                index === selectedIndex ? styles.slideTileActive : ""
              }`}
              onClick={() => onSelect(index)}
            >
              {slide.imageUrl ? (
                <span
                  className={`${styles.slidePhoto} ${
                    slideOverlay.crop ? styles.slideCrop : ""
                  }`}
                  style={{ backgroundImage: `url(${slide.imageUrl})` }}
                />
              ) : (
                <PlaceholderImage
                  variant="vertical"
                  size="small"
                  label={slide.shortText.slice(0, 16)}
                />
              )}
              {slideOverlay.dim && <span className={styles.slideDim} />}
              {slideOverlay.plaque && (
                <span className={styles.slidePlaque}>{slide.shortText}</span>
              )}
              {index === problemIndex && <span className={styles.slideWarn}>текст</span>}
            </button>
          );
        })}
      </div>
      <p className={styles.visualLabel}>
        {content.format === "text" ? "Сторис" : `${slides.length} кадров · ${frame}`}
      </p>
      {canOperate && selected && (
        <div className={styles.designerTools}>
          <div className={styles.aiRow}>
            <Input
              label="Ссылка на фото"
              value={photoLink}
              placeholder="https://"
              onChange={(event) => onPhotoLink(event.target.value)}
            />
            <Button
              size="small"
              variant="secondary"
              disabled={!photoLink.trim()}
              onClick={onApplyLink}
            >
              Подставить
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileHidden}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
          <div className={styles.cardActionsGroup}>
            <Button size="small" variant="ghost" onClick={() => fileRef.current?.click()}>
              С компьютера
            </Button>
            <Button size="small" variant="ghost" disabled={Boolean(busy)} onClick={onGenerateOne}>
              Сгенерировать
            </Button>
            <Button size="small" disabled={Boolean(busy)} onClick={onGenerateAll}>
              Сгенерировать все кадры
            </Button>
          </div>
          {(canEdit || canOperate) && (
            <Textarea
              label="Текст на кадре"
              rows={2}
              value={selected.shortText}
              onChange={(event) => onText(event.target.value)}
            />
          )}
          <div className={styles.toolRow}>
            <button type="button" className={styles.toolChip} onClick={() => onToggle("crop")}>
              Кадр
            </button>
            <button type="button" className={styles.toolChip} onClick={() => onToggle("plaque")}>
              Плашка
            </button>
            <button type="button" className={styles.toolChip} onClick={() => onToggle("dim")}>
              Затемнение
            </button>
          </div>
        </div>
      )}
      {busy && <p className={styles.busyNote}>{busy}</p>}
    </div>
  );
}
