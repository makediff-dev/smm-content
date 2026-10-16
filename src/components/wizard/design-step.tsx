"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DesignCropModal } from "@/components/wizard/design-crop-modal";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import {
  createCardDesign,
  createTextLayer,
  DESIGN_FONTS,
  ensureCardDesign,
  fontFamily,
  PHOTO_GRADIENT_LAYER_OPACITY,
  photoGradientForPlacement,
  photoGradientStyle,
  resolvePhotoGradient,
  resolveTextShadow,
  textShadowLayerStyle,
  withStyleOf,
} from "@/lib/card-design";
import { ensureGoogleFonts } from "@/lib/design-fonts";
import { getMockCards } from "@/lib/mock-wizard-data";
import { simulateTask } from "@/lib/simulate-generation";
import { buildGeneratedPhotos } from "@/lib/workspace-generation";
import { useProjectsStore } from "@/stores/projects-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import type {
  Card,
  CardDesign,
  GradientPlacement,
  PhotoGradient,
  TextAlign,
  TextLayer,
  TextShadow,
  TextShadowBlend,
  TextShadowContour,
} from "@/types";
import styles from "./design-step.module.css";
import wizardStyles from "./wizard.module.css";

const SLIDESHOW_CROP_FORMAT = {
  label: "1080×1920",
  width: 1080,
  height: 1920,
} as const;

const CROP_FORMATS = [
  { label: "1080×1080", width: 1080, height: 1080 },
  { label: "1000×700", width: 1000, height: 700 },
  { label: "1080×960", width: 1080, height: 960 },
  { label: "Свободная" },
] as const;

type CropFormatOption =
  | (typeof CROP_FORMATS)[number]
  | typeof SLIDESHOW_CROP_FORMAT;

const GRADIENT_OPTIONS: { value: GradientPlacement | null; label: string }[] = [
  { value: null, label: "Нет" },
  { value: "bottom", label: "Снизу" },
  { value: "top", label: "Сверху" },
];

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "left", label: "Слева" },
  { value: "center", label: "По центру" },
  { value: "right", label: "Справа" },
];

const FONT_OPTIONS = DESIGN_FONTS.map((font) => ({ value: font, label: font }));

const SHADOW_BLEND_OPTIONS: { value: TextShadowBlend; label: string }[] = [
  { value: "multiply", label: "Multiply" },
  { value: "normal", label: "Normal" },
  { value: "darken", label: "Darken" },
  { value: "color-burn", label: "Color Burn" },
  { value: "overlay", label: "Overlay" },
  { value: "screen", label: "Screen" },
];

const SHADOW_CONTOUR_OPTIONS: { value: TextShadowContour; label: string }[] = [
  { value: "linear", label: "Линейный" },
  { value: "gaussian", label: "Гаусс" },
  { value: "cone", label: "Конус" },
];

function EyeIcon({ crossed }: { crossed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.8 12S6.2 6 12 6s9.2 6 9.2 6-3.4 6-9.2 6S2.8 12 2.8 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      {crossed && (
        <path
          d="M5 19 19 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Toggle = "bold" | "italic" | "underline";

type Patches = Record<string, Partial<Card>>;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function Range({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
  children,
}: {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  children?: ReactNode;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        <span className={styles.rangeValue}> {display}</span>
      </span>
      <span className={styles.rangeRow}>
        <input
          className={styles.range}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ "--range-fill": `${fill}%` } as CSSProperties}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {children}
      </span>
    </label>
  );
}

export function DesignStep() {
  const disabled = useWizardStepDisabled();
  const cards = useWizardStore((s) => s.cards);
  const format = useWizardStore((s) => s.format);
  const sourceUrl = useWizardStore((s) => s.sourceUrl);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const project = useProjectsStore((s) =>
    projectId ? s.getProject(projectId) : undefined
  );
  const hasBrandStyle = Boolean(
    project?.brandStyle?.trim() || project?.imageRules?.trim()
  );
  const isMeme = format === "video_meme";
  const isSlideshow = format === "slideshow";
  const cropFormats: readonly CropFormatOption[] = isSlideshow
    ? [SLIDESHOW_CROP_FORMAT]
    : CROP_FORMATS;

  const [selectedId, setSelectedId] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [cropFormat, setCropFormat] = useState<CropFormatOption | null>(null);
  const [frameFormat, setFrameFormat] = useState<CropFormatOption>(
    isSlideshow ? SLIDESHOW_CROP_FORMAT : CROP_FORMATS[0]
  );
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 1080, height: 1080 });
  const [displayWidth, setDisplayWidth] = useState(0);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; offsetX: number; offsetY: number } | null>(
    null
  );

  useEffect(() => {
    ensureGoogleFonts();
  }, []);

  useEffect(() => {
    if (isSlideshow) {
      setFrameFormat(SLIDESHOW_CROP_FORMAT);
    }
  }, [isSlideshow]);

  useEffect(() => {
    if (isMeme || isSlideshow) {
      setStageSize({ width: 1080, height: 1920 });
      return;
    }
    if ("width" in frameFormat) {
      setStageSize({ width: frameFormat.width, height: frameFormat.height });
    }
  }, [frameFormat, isMeme, isSlideshow]);

  const patchCards = useCallback(
    (patches: Patches) => {
      const next = cards.map((card) =>
        patches[card.id] ? { ...card, ...patches[card.id] } : card
      );
      setField("cards", next);
      if (contentId) updateContentUnit(contentId, { cards: next });
    },
    [cards, contentId, setField, updateContentUnit]
  );

  const replaceCards = useCallback(
    (next: Card[]) => {
      setField("cards", next);
      if (contentId) updateContentUnit(contentId, { cards: next });
    },
    [contentId, setField, updateContentUnit]
  );

  const withPhoto = cards.filter((card) => card.imageUrl);
  const selected = isMeme
    ? (cards.find((card) => card.id === selectedId) ?? cards[0])
    : (withPhoto.find((card) => card.id === selectedId) ?? withPhoto[0]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const measure = () => {
      const shown = host.clientWidth;
      setDisplayWidth((current) => (current === shown ? current : shown));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [selected?.id, frameFormat]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
      setActiveIndex(0);
    }
  }, [selected, selectedId]);

  const design = selected ? ensureCardDesign(selected, stageSize.width
    ? stageSize
    : undefined) : null;

  useEffect(() => {
    if (!selectedId || !stageSize.width) return;
    const card = useWizardStore.getState().cards.find((item) => item.id === selectedId);
    if (!card || card.design) return;
    patchCards({
      [card.id]: { design: createCardDesign(card.shortText, stageSize) },
    });
  }, [patchCards, selectedId, stageSize]);

  const layer =
    design && activeIndex !== null ? design.layers[activeIndex] : undefined;
  const layerShadow = layer ? resolveTextShadow(layer.shadow) : null;
  const overlay = design ? resolvePhotoGradient(design) : null;
  const scale = design && stageSize.width ? stageSize.width / design.width : 1;

  const commit = (next: CardDesign) => {
    if (!selected) return;
    patchCards({ [selected.id]: { design: next, designDirty: true } });
  };

  const changeLayer = (patch: Partial<TextLayer>) => {
    if (!design || activeIndex === null || !layer) return;
    commit({
      ...design,
      layers: design.layers.map((item, index) =>
        index === activeIndex ? { ...item, ...patch } : item
      ),
    });
  };

  const changeOverlay = (patch: Partial<PhotoGradient>) => {
    if (!design) return;
    const current = resolvePhotoGradient(design);
    const next = { ...current, ...patch };
    if (patch.height !== undefined && patch.yStart === undefined && patch.yEnd === undefined) {
      if (next.placement === "bottom") next.yStart = next.yEnd - patch.height;
      else next.yEnd = next.yStart + patch.height;
    }
    if (patch.yStart !== undefined || patch.yEnd !== undefined) {
      next.height = Math.abs(next.yEnd - next.yStart);
    }
    commit({ ...design, overlay: next });
  };

  const changeShadow = (patch: Partial<TextShadow>) => {
    if (!design || activeIndex === null || !layer) return;
    const current = resolveTextShadow(layer.shadow);
    const next = { ...current, ...patch };
    const angle = next.globalLight
      ? (patch.angle ?? design.globalLightAngle ?? current.angle)
      : next.angle;
    const shadow = next.globalLight ? { ...next, angle } : next;
    commit({
      ...design,
      globalLightAngle: next.globalLight ? angle : design.globalLightAngle,
      layers: design.layers.map((item, index) => {
        if (index === activeIndex) return { ...item, shadow };
        if (next.globalLight && patch.angle !== undefined) {
          const other = resolveTextShadow(item.shadow);
          if (other.globalLight) return { ...item, shadow: { ...other, angle } };
        }
        return item;
      }),
    });
  };

  const addLayer = () => {
    if (!design) return;
    const next = createTextLayer("Текст", design);
    commit({ ...design, layers: [...design.layers, next] });
    setActiveIndex(design.layers.length);
  };

  const removeLayerAt = (index: number) => {
    if (!design) return;
    const remaining = design.layers.length - 1;
    commit({
      ...design,
      layers: design.layers.filter((_, itemIndex) => itemIndex !== index),
    });
    setActiveIndex((current) => {
      if (remaining <= 0) return null;
      if (current === null) return 0;
      if (current === index) return Math.min(index, remaining - 1);
      if (current > index) return current - 1;
      return current;
    });
  };

  const toggleLayerHidden = (index: number) => {
    if (!design) return;
    commit({
      ...design,
      layers: design.layers.map((item, itemIndex) =>
        itemIndex === index ? { ...item, hidden: !item.hidden } : item
      ),
    });
  };

  const applyToAll = () => {
    if (!design?.layers.length || !selected) return;
    const patches: Patches = Object.fromEntries(
      cards.flatMap((card) => {
        if (card.id === selected.id || !card.design) return [];
        const own = card.design.layers;
        const ratio = card.design.width / design.width;
        return [
          [
            card.id,
            {
              design: {
                ...card.design,
                overlay: design.overlay,
                layers: [
                  ...design.layers.map((source, index) =>
                    withStyleOf(own[index] ?? source, source, ratio)
                  ),
                  ...own.slice(design.layers.length),
                ],
              },
              designDirty: true,
            },
          ],
        ];
      })
    );
    patchCards(patches);
  };

  const handleGeneratePhotos = async () => {
    if (disabled || busy) return;
    setBusy(true);
    await simulateTask(() => undefined, ["queued", "in_progress", "done"], 500);
    const base =
      cards.length > 0
        ? cards
        : getMockCards(format, project?.defaultCopyright ?? "");
    replaceCards(buildGeneratedPhotos(base, contentId ?? "design", format));
    setBusy(false);
  };

  const handleAddPlate = () => {
    if (!selected) return;
    patchCards({
      [selected.id]: { hasPlate: !selected.hasPlate, designDirty: true },
    });
  };

  const startDrag = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = design?.layers[index];
    if (!current) return;
    drag.current = {
      index,
      offsetX: event.clientX - bounds.left - current.left * scale,
      offsetY: event.clientY - bounds.top - current.top * scale,
    };
    setActiveIndex(index);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || !design) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = Math.round((event.clientX - bounds.left - current.offsetX) / scale);
    const top = Math.round((event.clientY - bounds.top - current.offsetY) / scale);
    commit({
      ...design,
      layers: design.layers.map((item, index) =>
        index === current.index ? { ...item, left, top } : item
      ),
    });
  };

  const keepFocus = (event: MouseEvent) => event.preventDefault();

  const frameAspect = isMeme || isSlideshow
    ? 9 / 16
    : "width" in frameFormat
      ? frameFormat.width / frameFormat.height
      : stageSize.width && stageSize.height
        ? stageSize.width / stageSize.height
        : 1;

  return (
    <section className={wizardStyles.section} aria-label="Оформление">
      <h2 className={styles.heading}>Оформление текста</h2>
      <p className={styles.subtitle}>
        {isMeme
          ? "Текст ставится на ролик. Перетащите подпись по кадру; выделенный слой правится в панели под видео."
          : "Текст на фото ставится здесь, а не нейросетью. Перетащите подпись по кадру; выделенный слой правится в панели под изображением."}
      </p>

      {!isMeme && withPhoto.length === 0 && (
        <div className={styles.generateBar}>
          <p className={styles.generateHint}>
            Сначала нужны фотографии карточек — затем на них ставится текст.
          </p>
          <Button type="button" onClick={handleGeneratePhotos} disabled={disabled || busy}>
            {busy ? "Генерируем…" : "Сгенерировать фотографии"}
          </Button>
        </div>
      )}

      <div className={styles.layout}>
        <div
          className={`${styles.previewRow} ${
            isMeme || isSlideshow ? styles.previewVertical : styles.previewSquare
          }`}
          style={{ "--frame-aspect": String(frameAspect) } as CSSProperties}
        >
          <div className={styles.stage}>
            {(isMeme ? Boolean(selected && design) : Boolean(selected?.imageUrl && design)) ? (
              <div
                ref={canvasHostRef}
                className={styles.canvasHost}
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
              >
                {isMeme ? (
                  sourceUrl ? (
                    <video
                      className={styles.photoImg}
                      src={sourceUrl}
                      muted
                      playsInline
                      loop
                      autoPlay
                    />
                  ) : (
                    <div className={styles.videoFallback} aria-hidden>
                      ▶
                    </div>
                  )
                ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.photoImg}
                  src={selected?.imageUrl}
                  alt=""
                  onLoad={(event) => {
                    if ("width" in frameFormat) return;
                    const image = event.currentTarget;
                    const width = image.naturalWidth;
                    const height = image.naturalHeight;
                    setStageSize((current) =>
                      current.width === width && current.height === height
                        ? current
                        : { width, height }
                    );
                  }}
                />
                )}
                {overlay?.enabled && (
                  <span
                    className={styles.gradient}
                    style={photoGradientStyle(overlay)}
                  />
                )}
                {selected.hasPlate && <span className={styles.plate} />}
                {design && design.layers.map((item, index) => {
                  if (item.hidden && index !== activeIndex) return null;
                  const shadow = resolveTextShadow(item.shadow);
                  const displayScale = displayWidth / design.width || scale;
                  const noiseId = `text-shadow-noise-${index}`;
                  return (
                    <button
                      key={`${item.left}-${item.top}-${index}`}
                      type="button"
                      className={`${styles.layer} ${index === activeIndex ? styles.layerActive : ""}`}
                      style={{
                        left: `${(item.left / design.width) * 100}%`,
                        top: `${(item.top / design.height) * 100}%`,
                        width: `${(item.width / design.width) * 100}%`,
                        color: item.color,
                        fontFamily: fontFamily(item.font),
                        fontSize: `${Math.max(12, item.fontSize * (displayWidth / design.width || scale))}px`,
                        fontWeight: item.bold ? 700 : 400,
                        fontStyle: item.italic ? "italic" : "normal",
                        textDecoration: item.underline ? "underline" : "none",
                        textAlign: item.align,
                        opacity: item.hidden ? Math.min(item.opacity, 0.35) : item.opacity,
                        letterSpacing: `${item.charSpacing / 1000}em`,
                        lineHeight: item.lineHeight,
                        WebkitTextStroke:
                          item.strokeWidth > 0
                            ? `${item.strokeWidth / 12}px ${item.strokeColor}`
                            : undefined,
                        background: item.background ?? "transparent",
                      }}
                      disabled={disabled}
                      onPointerDown={(event) => startDrag(index, event)}
                      onClick={() => setActiveIndex(index)}
                    >
                      {shadow.enabled && (
                        <>
                          {shadow.noise > 0 && (
                            <svg width="0" height="0" aria-hidden className={styles.noiseSvg}>
                              <filter
                                id={noiseId}
                                x="-50%"
                                y="-50%"
                                width="200%"
                                height="200%"
                              >
                                <feTurbulence
                                  type="fractalNoise"
                                  baseFrequency="0.85"
                                  numOctaves="2"
                                  result="noise"
                                />
                                <feDisplacementMap
                                  in="SourceGraphic"
                                  in2="noise"
                                  scale={shadow.noise * 0.12}
                                  xChannelSelector="R"
                                  yChannelSelector="G"
                                />
                              </filter>
                            </svg>
                          )}
                          <span
                            className={styles.layerShadow}
                            aria-hidden
                            style={textShadowLayerStyle(
                              shadow,
                              design.globalLightAngle ?? 90,
                              displayScale,
                              shadow.noise > 0 ? noiseId : undefined
                            )}
                          >
                            {item.text}
                          </span>
                        </>
                      )}
                      <span className={styles.layerFill}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                ref={canvasHostRef}
                className={`${styles.canvasHost} ${styles.emptyStage}`}
              >
                {isMeme
                  ? "Нет ролика для оформления"
                  : "Нет фото — сгенерируйте кадры, чтобы ставить текст"}
              </div>
            )}
          </div>

          {(isMeme ? cards : withPhoto).length > 0 && (
          <ul className={styles.photos} aria-label="Фотографии карточек">
            {(isMeme ? cards : withPhoto).map((card, index) => (
              <li key={card.id}>
                <button
                  type="button"
                  className={`${styles.photo} ${card.id === selected?.id ? styles.photoActive : ""}`}
                  aria-pressed={card.id === selected?.id}
                  aria-label={`Карточка ${index + 1}: ${card.shortText}`}
                  onClick={() => {
                    setSelectedId(card.id);
                    setActiveIndex(0);
                  }}
                >
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imageUrl} alt="" />
                  ) : (
                    <span className={styles.videoFallback}>▶</span>
                  )}
                  <span className={styles.photoIndex}>#{index + 1}</span>
                  {card.designDirty && <span className={styles.photoBadge}>Изменено</span>}
                </button>
              </li>
            ))}
          </ul>
          )}
        </div>

          <aside className={styles.panel} aria-label="Параметры текста">
          {!isMeme && (
          <div className={`${styles.field} ${styles.spanAll}`}>
            <span className={styles.label}>Формат фото</span>
            <div className={styles.formats}>
              {cropFormats.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`${styles.formatButton} ${
                    frameFormat.label === item.label ? styles.formatActive : ""
                  }`}
                  disabled={disabled || !selected?.imageUrl}
                  onClick={() => {
                    setFrameFormat(item);
                    setCropFormat(item);
                  }}
                >
                  {item.label}
                </button>
              ))}
              {selected && originals[selected.id] && (
                <button
                  type="button"
                  className={styles.formatButton}
                  disabled={disabled}
                  onClick={() => {
                    patchCards({ [selected.id]: { imageUrl: originals[selected.id] } });
                    setOriginals((map) => {
                      const next = { ...map };
                      delete next[selected.id];
                      return next;
                    });
                  }}
                >
                  Вернуть фото
                </button>
              )}
            </div>
          </div>
          )}

          {hasBrandStyle && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className={styles.spanAll}
              disabled={disabled || !selected?.imageUrl}
              onClick={handleAddPlate}
            >
              {selected?.hasPlate ? "Убрать плашку" : "Добавить плашку"}
            </Button>
          )}

          <div className={styles.divider} />

          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>Текстовые слои</h3>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={disabled || !design}
              onClick={addLayer}
            >
              Добавить текст
            </Button>
          </div>
          <div className={`${styles.field} ${styles.spanAll}`}>
            {design?.layers.length ? (
              <ul className={styles.layerList} aria-label="Текстовые слои">
                {design.layers.map((item, index) => (
                  <li
                    key={`${index}-${item.left}-${item.top}`}
                    className={`${styles.layerRow} ${
                      index === activeIndex ? styles.layerRowActive : ""
                    } ${item.hidden ? styles.layerRowHidden : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.layerPick}
                      aria-pressed={index === activeIndex}
                      disabled={disabled}
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className={styles.layerPickIndex}>#{index + 1}</span>
                      <span className={styles.layerPickText}>
                        {item.text.trim() || "Пустой слой"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${item.hidden ? styles.iconBtnOn : ""}`}
                      aria-pressed={Boolean(item.hidden)}
                      aria-label={item.hidden ? "Показать слой" : "Скрыть слой"}
                      disabled={disabled}
                      onClick={() => toggleLayerHidden(index)}
                    >
                      <EyeIcon crossed={item.hidden} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label={`Удалить слой ${index + 1}`}
                      disabled={disabled}
                      onClick={() => removeLayerAt(index)}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>На кадре пока нет текста — добавьте слой</p>
            )}
          </div>

          {layer ? (
            <div className={styles.layerEditor}>
              <div className={styles.layerCol}>
                <Field label="Текст">
                  <textarea
                    className={styles.number}
                    rows={3}
                    value={layer.text}
                    disabled={disabled}
                    onChange={(event) => changeLayer({ text: event.target.value })}
                  />
                </Field>

                <Select
                  label="Шрифт"
                  value={layer.font}
                  options={FONT_OPTIONS}
                  disabled={disabled}
                  onChange={(event) => changeLayer({ font: event.target.value })}
                />

                <Field label="Размер">
                  <input
                    className={styles.number}
                    type="number"
                    min={8}
                    max={600}
                    value={layer.fontSize}
                    disabled={disabled}
                    onChange={(event) => {
                      const fontSize = Number(event.target.value);
                      if (fontSize >= 8) changeLayer({ fontSize });
                    }}
                  />
                </Field>

                <Field label="Цвет">
                  <input
                    className={styles.color}
                    type="color"
                    value={layer.color}
                    disabled={disabled}
                    onChange={(event) => changeLayer({ color: event.target.value })}
                  />
                </Field>

                <div className={styles.row} role="group" aria-label="Начертание">
                  {(["bold", "italic", "underline"] as Toggle[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={layer[key]}
                      className={`${styles.toggle} ${styles[key]} ${
                        layer[key] ? styles.toggleOn : ""
                      }`}
                      disabled={disabled}
                      onMouseDown={keepFocus}
                      onClick={() => changeLayer({ [key]: !layer[key] })}
                    >
                      {key === "bold" ? "Ж" : key === "italic" ? "К" : "Ч"}
                    </button>
                  ))}
                </div>

                <div className={styles.row} role="group" aria-label="Выравнивание">
                  {ALIGN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={layer.align === option.value}
                      className={`${styles.toggle} ${styles.wide} ${
                        layer.align === option.value ? styles.toggleOn : ""
                      }`}
                      disabled={disabled}
                      onClick={() => changeLayer({ align: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.layerCol}>
                <Range
                  label="Межбуквенный интервал"
                  display={String(layer.charSpacing)}
                  min={-100}
                  max={800}
                  step={10}
                  value={layer.charSpacing}
                  onChange={(charSpacing) => changeLayer({ charSpacing })}
                />
                <Range
                  label="Межстрочный интервал"
                  display={layer.lineHeight.toFixed(2)}
                  min={0.7}
                  max={2.5}
                  step={0.05}
                  value={layer.lineHeight}
                  onChange={(lineHeight) => changeLayer({ lineHeight })}
                />
                <Range
                  label="Непрозрачность"
                  display={`${Math.round(layer.opacity * 100)}%`}
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={layer.opacity}
                  onChange={(opacity) => changeLayer({ opacity })}
                />
                <Range
                  label="Обводка"
                  display={String(layer.strokeWidth)}
                  min={0}
                  max={30}
                  step={1}
                  value={layer.strokeWidth}
                  onChange={(strokeWidth) => changeLayer({ strokeWidth })}
                >
                  <input
                    className={styles.color}
                    type="color"
                    aria-label="Цвет обводки"
                    value={layer.strokeColor}
                    disabled={disabled}
                    onChange={(event) =>
                      changeLayer({ strokeColor: event.target.value })
                    }
                  />
                </Range>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={Boolean(layerShadow?.enabled)}
                    disabled={disabled}
                    onChange={() =>
                      changeShadow({ enabled: !layerShadow?.enabled })
                    }
                  />
                  Тень текста
                </label>

                <div className={styles.row}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      className={styles.check}
                      checked={layer.background !== null}
                      disabled={disabled}
                      onChange={() =>
                        changeLayer({
                          background: layer.background === null ? "#000000" : null,
                        })
                      }
                    />
                    Плашка
                  </label>
                  {layer.background !== null && (
                    <input
                      className={styles.color}
                      type="color"
                      aria-label="Цвет плашки"
                      value={layer.background}
                      disabled={disabled}
                      onChange={(event) =>
                        changeLayer({ background: event.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.hint}>Выберите текст на кадре или добавьте новый</p>
          )}

          <div className={styles.divider} />

          <h3 className={styles.blockTitle}>Тень текста</h3>
          {layer && layerShadow?.enabled ? (
            <div className={styles.shadowPanel} aria-label="Параметры тени">
              <Select
                label="Режим наложения"
                options={SHADOW_BLEND_OPTIONS}
                value={layerShadow.blendMode}
                disabled={disabled}
                onChange={(event) =>
                  changeShadow({
                    blendMode: event.target.value as TextShadowBlend,
                  })
                }
              />
              <Range
                label="Непрозрачность"
                display={`${Math.round(layerShadow.opacity * 100)}%`}
                min={0}
                max={1}
                step={0.01}
                value={layerShadow.opacity}
                onChange={(opacity) => changeShadow({ opacity })}
              >
                <input
                  className={styles.color}
                  type="color"
                  aria-label="Цвет тени"
                  value={layerShadow.color}
                  disabled={disabled}
                  onChange={(event) =>
                    changeShadow({ color: event.target.value })
                  }
                />
              </Range>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={layerShadow.globalLight}
                  disabled={disabled}
                  onChange={() =>
                    changeShadow({
                      globalLight: !layerShadow.globalLight,
                      angle: !layerShadow.globalLight
                        ? (design?.globalLightAngle ?? 90)
                        : layerShadow.angle,
                    })
                  }
                />
                Глобальное освещение
              </label>
              <Range
                label="Угол"
                display={`${Math.round(layerShadow.globalLight ? (design?.globalLightAngle ?? layerShadow.angle) : layerShadow.angle)}°`}
                min={0}
                max={360}
                step={1}
                value={
                  layerShadow.globalLight
                    ? (design?.globalLightAngle ?? layerShadow.angle)
                    : layerShadow.angle
                }
                onChange={(angle) => changeShadow({ angle })}
              />
              <Range
                label="Смещение"
                display={`${layerShadow.distance} px`}
                min={0}
                max={40}
                step={1}
                value={layerShadow.distance}
                onChange={(distance) => changeShadow({ distance })}
              />
              <Range
                label="Размах"
                display={`${Math.round(layerShadow.spread)}%`}
                min={0}
                max={100}
                step={1}
                value={layerShadow.spread}
                onChange={(spread) => changeShadow({ spread })}
              />
              <Range
                label="Размер"
                display={`${layerShadow.size} px`}
                min={0}
                max={40}
                step={1}
                value={layerShadow.size}
                onChange={(size) => changeShadow({ size })}
              />
              <Range
                label="Шум"
                display={`${Math.round(layerShadow.noise)}%`}
                min={0}
                max={100}
                step={1}
                value={layerShadow.noise}
                onChange={(noise) => changeShadow({ noise })}
              />
              <Select
                label="Контур"
                options={SHADOW_CONTOUR_OPTIONS}
                value={layerShadow.contour}
                disabled={disabled}
                onChange={(event) =>
                  changeShadow({
                    contour: event.target.value as TextShadowContour,
                  })
                }
              />
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={layerShadow.antiAlias}
                  disabled={disabled}
                  onChange={() =>
                    changeShadow({ antiAlias: !layerShadow.antiAlias })
                  }
                />
                Сглаживание контура
              </label>
            </div>
          ) : (
            <p className={styles.hint}>
              {layer
                ? "Включите тень у выбранного текстового слоя"
                : "Сначала выберите текстовый слой"}
            </p>
          )}

          <div className={styles.divider} />

          <h3 className={styles.blockTitle}>Градиент под текст</h3>
          <div className={`${styles.field} ${styles.spanAll}`}>
            <div className={styles.formats}>
              {GRADIENT_OPTIONS.map((option) => {
                const active =
                  option.value === null
                    ? !overlay?.enabled
                    : Boolean(overlay?.enabled && overlay.placement === option.value);
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`${styles.formatButton} ${active ? styles.formatActive : ""}`}
                    disabled={disabled || !design}
                    onClick={() => {
                      if (!design) return;
                      if (option.value === null) {
                        changeOverlay({ enabled: false });
                        return;
                      }
                      const preset = photoGradientForPlacement(option.value);
                      changeOverlay({
                        ...preset,
                        color: overlay?.color ?? preset.color,
                        topOpacity: overlay?.topOpacity ?? preset.topOpacity,
                        bottomOpacity: overlay?.bottomOpacity ?? preset.bottomOpacity,
                        layerOpacity: overlay?.layerOpacity ?? preset.layerOpacity,
                        enabled: true,
                      });
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {overlay?.enabled && (
              <div className={styles.shadowPanel}>
                <Range
                  label="Ширина слоя"
                  display={`${overlay.width} px`}
                  min={200}
                  max={1080}
                  step={1}
                  value={overlay.width}
                  onChange={(width) => changeOverlay({ width })}
                />
                <Range
                  label="Высота слоя"
                  display={`${overlay.height} px`}
                  min={40}
                  max={1080}
                  step={1}
                  value={overlay.height}
                  onChange={(height) => changeOverlay({ height })}
                />
                <Range
                  label="Y от"
                  display={`${overlay.yStart} px`}
                  min={0}
                  max={1080}
                  step={1}
                  value={overlay.yStart}
                  onChange={(yStart) => changeOverlay({ yStart })}
                />
                <Range
                  label="Y до"
                  display={`${overlay.yEnd} px`}
                  min={0}
                  max={1080}
                  step={1}
                  value={overlay.yEnd}
                  onChange={(yEnd) => changeOverlay({ yEnd })}
                />
                <Range
                  label="Верхняя непрозрачность"
                  display={`${Math.round(overlay.topOpacity * 100)}%`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={overlay.topOpacity}
                  onChange={(topOpacity) => changeOverlay({ topOpacity })}
                >
                  <input
                    className={styles.color}
                    type="color"
                    aria-label="Цвет градиента"
                    value={overlay.color}
                    disabled={disabled}
                    onChange={(event) => changeOverlay({ color: event.target.value })}
                  />
                </Range>
                <Range
                  label="Непрозрачность у края"
                  display={`${Math.round(overlay.bottomOpacity * 100)}%`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={overlay.bottomOpacity}
                  onChange={(bottomOpacity) => changeOverlay({ bottomOpacity })}
                />
                <Range
                  label="Непрозрачность слоя"
                  display={`${Math.round(overlay.layerOpacity * 100)}% · ${Math.round(overlay.layerOpacity * 255)}/255`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={overlay.layerOpacity}
                  onChange={(layerOpacity) => changeOverlay({ layerOpacity })}
                />
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={overlay.layerOpacity >= 0.995}
                    disabled={disabled}
                    onChange={() =>
                      changeOverlay({
                        layerOpacity:
                          overlay.layerOpacity >= 0.995
                            ? PHOTO_GRADIENT_LAYER_OPACITY
                            : 1,
                      })
                    }
                  />
                  Светлый / контрастный фон (слой 100%)
                </label>
              </div>
            )}
          </div>

          {!isMeme && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className={styles.spanAll}
              title="Шрифт, цвета и место текста — на остальные карточки, текст у каждой свой"
              disabled={disabled || !design?.layers.length || withPhoto.length < 2}
              onClick={applyToAll}
            >
              Стиль на все карточки
            </Button>
          )}
          </aside>
      </div>

      {cropFormat && selected?.imageUrl && (
        <DesignCropModal
          imageUrl={selected.imageUrl}
          aspect={"width" in cropFormat ? cropFormat.width / cropFormat.height : undefined}
          outputSize={
            "width" in cropFormat
              ? { width: cropFormat.width, height: cropFormat.height }
              : undefined
          }
          onCancel={() => setCropFormat(null)}
          onApply={(url) => {
            if (!originals[selected.id] && selected.imageUrl) {
              setOriginals((map) => ({ ...map, [selected.id]: selected.imageUrl ?? url }));
            }
            patchCards({ [selected.id]: { imageUrl: url, designDirty: true } });
            setCropFormat(null);
          }}
        />
      )}
    </section>
  );
}
