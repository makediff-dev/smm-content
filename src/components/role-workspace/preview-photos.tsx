"use client";

import type { Card, ContentUnit } from "@/types";
import { getDesignerSlides } from "@/lib/designer-slides";
import styles from "./role-workspace.module.css";

function padPhotos(content: ContentUnit): Card[] {
  const slides = getDesignerSlides(content);
  if (slides.length >= 4) return slides;
  const next = [...slides];
  while (next.length < 4) {
    next.push({
      id: `photo-${content.id}-${next.length + 1}`,
      shortText: `Фото ${next.length + 1}`,
      copyright: "",
      status: "ready",
    });
  }
  return next;
}

export function PreviewPhotos({ content }: { content: ContentUnit }) {
  const photos = padPhotos(content);

  return (
    <div className={styles.photoGrid}>
      {photos.map((photo, index) => (
        <div key={photo.id} className={styles.photoTile}>
          {photo.imageUrl ? (
            <span
              className={styles.slidePhoto}
              style={{ backgroundImage: `url(${photo.imageUrl})` }}
            />
          ) : (
            <span className={styles.photoFallback}>
              {photo.shortText.slice(0, 16) || `Фото ${index + 1}`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
