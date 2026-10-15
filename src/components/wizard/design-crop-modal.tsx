"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import styles from "./design-step.module.css";

type Rect = { x: number; y: number; width: number; height: number };

interface DesignCropModalProps {
  imageUrl: string;
  aspect?: number;
  outputSize?: { width: number; height: number };
  onCancel: () => void;
  onApply: (url: string) => void;
}

const MIN = 16;

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

const centeredRect = (imageWidth: number, imageHeight: number, aspect: number): Rect => {
  let width = imageWidth;
  let height = width / aspect;
  if (height > imageHeight) {
    height = imageHeight;
    width = height * aspect;
  }
  return {
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
    width,
    height,
  };
};

export function DesignCropModal({
  imageUrl,
  aspect,
  outputSize,
  onCancel,
  onApply,
}: DesignCropModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const action = useRef<{ mode: "move" | "resize"; grabX: number; grabY: number } | null>(
    null
  );
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [saving, setSaving] = useState(false);

  const toImagePoint = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = imageRef.current!.getBoundingClientRect();
    const scale = imageRef.current!.naturalWidth / bounds.width;
    return {
      x: clamp(event.clientX - bounds.left, bounds.width) * scale,
      y: clamp(event.clientY - bounds.top, bounds.height) * scale,
    };
  };

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth) {
      setSize({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, [imageUrl]);

  useEffect(() => {
    if (!size) return;
    setRect(aspect ? centeredRect(size.width, size.height, aspect) : {
      x: size.width * 0.1,
      y: size.height * 0.1,
      width: size.width * 0.8,
      height: size.height * 0.8,
    });
  }, [size, aspect]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rect || !size) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toImagePoint(event);
    const handle = Math.min(rect.width, rect.height) * 0.2;
    const onCorner =
      point.x >= rect.x + rect.width - handle &&
      point.y >= rect.y + rect.height - handle;
    if (onCorner) {
      action.current = { mode: "resize", grabX: 0, grabY: 0 };
      return;
    }
    action.current = {
      mode: "move",
      grabX: point.x - rect.x,
      grabY: point.y - rect.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = action.current;
    if (!current || !rect || !size) return;
    const point = toImagePoint(event);
    if (current.mode === "move") {
      setRect({
        ...rect,
        x: clamp(point.x - current.grabX, size.width - rect.width),
        y: clamp(point.y - current.grabY, size.height - rect.height),
      });
      return;
    }
    let width = Math.min(Math.max(MIN, point.x - rect.x), size.width - rect.x);
    let height = aspect
      ? width / aspect
      : Math.min(Math.max(MIN, point.y - rect.y), size.height - rect.y);
    if (aspect && height > size.height - rect.y) {
      height = size.height - rect.y;
      width = height * aspect;
    }
    setRect({ ...rect, width, height });
  };

  const apply = async () => {
    const image = imageRef.current;
    if (!image || !rect) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize ? outputSize.width : Math.round(rect.width);
      canvas.height = outputSize ? outputSize.height : Math.round(rect.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.drawImage(
        image,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const url = canvas.toDataURL("image/jpeg", 0.92);
      onApply(url);
    } catch {
      onApply(imageUrl);
    } finally {
      setSaving(false);
    }
  };

  const display = imageRef.current;
  const scale = display && size ? display.clientWidth / size.width : 1;

  return (
    <Modal
      title="Обрезать фотографию"
      open
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="button" onClick={() => apply()} disabled={!rect || saving}>
            {saving ? "Сохраняем…" : "Применить"}
          </Button>
        </>
      }
    >
      <div
        className={styles.cropWrap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          action.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          className={styles.cropImage}
          src={imageUrl}
          alt=""
          onLoad={(event) => {
            const next = event.currentTarget;
            setSize({
              width: next.naturalWidth || 1080,
              height: next.naturalHeight || 1080,
            });
          }}
        />
        {rect && (
          <span
            className={styles.cropRect}
            style={{
              left: rect.x * scale,
              top: rect.y * scale,
              width: rect.width * scale,
              height: rect.height * scale,
            }}
          >
            <span className={styles.cropHandle} />
          </span>
        )}
      </div>
      <p className={styles.cropHint}>
        Выделите область перетаскиванием — остальное обрежется
      </p>
    </Modal>
  );
}
