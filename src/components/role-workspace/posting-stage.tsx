"use client";

import { useMemo, useState } from "react";
import type { Card, ContentPlanSlot, ContentUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { VideoPlayerStub } from "@/components/shared/placeholder-image";
import { getDesignerSlides } from "@/lib/designer-slides";
import {
  copyTextToClipboard,
  downloadNamedFile,
  getPostingArchiveName,
  getPostingChecks,
  getPostingPacks,
  type PostingPack,
} from "@/lib/posting-packs";
import styles from "./role-workspace.module.css";

function packBody(fileName: string, hint: string): string {
  return `HUB Content — пакет для постинга\n${fileName}\n${hint}\n`;
}

function feedSlides(slides: Card[]): Card[] {
  return slides;
}

function storySlides(slides: Card[]): Card[] {
  if (slides.length <= 2) return slides;
  return slides.slice(-2);
}

function SlideTile({ slide, story = false }: { slide: Card; story?: boolean }) {
  return (
    <div className={story ? styles.storyTile : styles.photoTile}>
      {slide.imageUrl ? (
        <span
          className={styles.slidePhoto}
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
      ) : (
        <span className={styles.photoFallback}>
          {slide.shortText.slice(0, 16)}
        </span>
      )}
      {slide.shortText ? (
        <span className={styles.slidePlaque}>{slide.shortText}</span>
      ) : null}
    </div>
  );
}

function PackContent({
  content,
  pack,
}: {
  content: ContentUnit;
  pack: PostingPack;
}) {
  const slides = useMemo(() => getDesignerSlides(content), [content]);

  if (pack.id === "texts") {
    return (
      <div className={styles.copy}>
        <p className={styles.postText}>
          {pack.copyText?.trim() || content.postText.trim() || "Нет текста."}
        </p>
      </div>
    );
  }

  if (pack.id === "video") {
    return (
      <div>
        <VideoPlayerStub src={content.sourceUrl || undefined} />
        <p className={styles.visualLabel}>{pack.hint}</p>
      </div>
    );
  }

  if (pack.id === "stories") {
    const frames = storySlides(slides);
    return (
      <div className={styles.storyGrid}>
        {frames.map((slide) => (
          <SlideTile key={slide.id} slide={slide} story />
        ))}
      </div>
    );
  }

  const frames = feedSlides(slides);
  const imageGrid = (
    <div className={styles.packFeedGrid}>
      {frames.map((slide) => (
        <SlideTile key={slide.id} slide={slide} />
      ))}
    </div>
  );

  if (content.format !== "text") {
    return imageGrid;
  }

  return (
    <div className={styles.packSplit}>
      <section className={styles.packSection}>
        <h3 className={styles.kicker}>Картинки</h3>
        {imageGrid}
      </section>
      <section className={styles.packSection}>
        <h3 className={styles.kicker}>Текст поста</h3>
        <p className={styles.postText}>
          {content.postText.trim() || "Нет текста."}
        </p>
      </section>
    </div>
  );
}

export function PostingPacks({
  content,
  slot,
}: {
  content: ContentUnit;
  slot: ContentPlanSlot;
}) {
  const packs = useMemo(
    () => getPostingPacks(content, slot.scheduledAt),
    [content, slot.scheduledAt],
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openPackId, setOpenPackId] = useState<string | null>(null);

  const handlePack = (pack: PostingPack) => {
    if (pack.action === "copy") {
      copyTextToClipboard(pack.copyText ?? content.postText);
      setCopiedId(pack.id);
      window.setTimeout(() => setCopiedId(null), 1600);
      return;
    }

    downloadNamedFile(
      pack.fileName ?? "pack.zip",
      packBody(pack.fileName ?? "pack.zip", pack.hint),
    );
  };

  const openPack = packs.find((pack) => pack.id === openPackId) ?? null;

  if (openPack) {
    return (
      <div className={styles.packPreview}>
        <div className={styles.packPreviewHead}>
          <Button
            type="button"
            variant="muted"
            size="small"
            onClick={() => setOpenPackId(null)}
          >
            К пакетам
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => handlePack(openPack)}
          >
            {openPack.action === "copy"
              ? copiedId === openPack.id
                ? "Скопировано"
                : "Копировать"
              : "Скачать"}
          </Button>
        </div>
        <p className={styles.packTitle}>{openPack.title}</p>
        <p className={styles.packHint}>{openPack.hint}</p>
        <PackContent content={content} pack={openPack} />
      </div>
    );
  }

  return (
    <ul className={styles.packList}>
      {packs.map((pack) => (
        <li key={pack.id} className={styles.packItem}>
          <button
            type="button"
            className={styles.packRow}
            onClick={() => setOpenPackId(pack.id)}
          >
            <p className={styles.packTitle}>{pack.title}</p>
            <p className={styles.packHint}>{pack.hint}</p>
          </button>
          <Button
            variant="secondary"
            size="small"
            className={styles.packAction}
            onClick={() => handlePack(pack)}
          >
            {pack.action === "copy"
              ? copiedId === pack.id
                ? "Скопировано"
                : "Копировать"
              : "Скачать"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

interface PostingSideProps {
  content: ContentUnit;
  slot: ContentPlanSlot;
  canOperate: boolean;
  alreadyPosted: boolean;
  onMarkPosted: () => void;
}

export function PostingSide({
  content,
  slot,
  canOperate,
  alreadyPosted,
  onMarkPosted,
}: PostingSideProps) {
  const archiveName = getPostingArchiveName(content.format, slot.scheduledAt);
  const checks = getPostingChecks();
  const packs = getPostingPacks(content, slot.scheduledAt);

  const handleDownloadAll = () => {
    downloadNamedFile(
      archiveName,
      packBody(
        archiveName,
        packs.map((pack) => `${pack.title}: ${pack.hint}`).join("\n"),
      ),
    );
  };

  return (
    <>
      <section className={styles.sideCard} aria-label="Весь набор">
        <h2 className={styles.sideTitle}>Весь набор одним архивом</h2>
        <p className={styles.archiveName}>{archiveName}</p>
      </section>

      <section className={styles.sideCard} aria-label="Проверено">
        <h2 className={styles.sideTitle}>Проверено</h2>
        <ul className={styles.checks}>
          {checks.map((item) => (
            <li
              key={item.text}
              className={`${styles.checkItem} ${item.ok ? styles.checkOk : styles.checkWarn}`}
            >
              <span className={styles.checkMark} aria-hidden>
                {item.ok ? "✓" : "!"}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        <Button onClick={handleDownloadAll}>Скачать всё</Button>
        {canOperate && !alreadyPosted ? (
          <Button variant="secondary" onClick={onMarkPosted}>
            Отметить «вышло»
          </Button>
        ) : (
          <p className={styles.note}>
            {alreadyPosted
              ? "Уже отмечено как вышедшее."
              : "Отметка «вышло» доступна менеджеру постинга."}
          </p>
        )}
      </div>
    </>
  );
}
