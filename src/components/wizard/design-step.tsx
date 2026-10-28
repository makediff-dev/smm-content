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
import {
  CaretDown,
  DotsThree,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { DesignCropModal } from "@/components/wizard/design-crop-modal";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import {
  createCardDesign,
  createTextLayer,
  DEFAULT_PHOTO_GRADIENT,
  DEFAULT_TEXT_SHADOW,
  DESIGN_FONTS,
  ensureCardDesign,
  fontFamily,
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
import {
  buildGeneratedPhotos,
  pagePhotosFromSource,
  photoSizeForFormat,
} from "@/lib/workspace-generation";
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

const STORIES_CROP_FORMAT = {
  label: "1080×1920",
  width: 1080,
  height: 1920,
} as const;

const CROP_FORMATS = [
  { label: "1080×1080", width: 1080, height: 1080 },
  STORIES_CROP_FORMAT,
  { label: "1000×700", width: 1000, height: 700 },
  { label: "1080×960", width: 1080, height: 960 },
  { label: "Свободная" },
] as const;

type CropFormatOption = (typeof CROP_FORMATS)[number];

let styleClipboard: CardDesign | null = null;

const GRADIENT_OPTIONS: { value: GradientPlacement | null; label: string }[] = [
  { value: null, label: "Нет" },
  { value: "bottom", label: "Снизу" },
  { value: "top", label: "Сверху" },
];

const ALIGN_OPTIONS: {
  value: TextAlign;
  label: string;
  Icon: typeof TextAlignLeft;
}[] = [
  { value: "left", label: "Слева", Icon: TextAlignLeft },
  { value: "center", label: "По центру", Icon: TextAlignCenter },
  { value: "right", label: "Справа", Icon: TextAlignRight },
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

type FoldKey = "format" | "layers" | "shadow" | "gradient" | "presets";

const PRESET_FRAME = { width: 1080, height: 1080 };

function makeStylePreset(
  id: string,
  label: string,
  layer: Partial<TextLayer>,
  overlay: Partial<PhotoGradient>
) {
  const base = createTextLayer("Aa", PRESET_FRAME);
  return {
    id,
    label,
    design: {
      ...PRESET_FRAME,
      overlay: { ...DEFAULT_PHOTO_GRADIENT, ...overlay },
      globalLightAngle: 90,
      layers: [{ ...base, ...layer }],
    } satisfies CardDesign,
  };
}

function withLayerColor(design: CardDesign, color: string): CardDesign {
  return {
    ...design,
    layers: design.layers.map((layer, index) =>
      index === 0 ? { ...layer, color } : layer
    ),
  };
}

function PresetColorSwatch({
  color,
  disabled,
  onChange,
}: {
  color: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  const hex = toHex6(color);
  return (
    <label className={styles.presetSwatch} style={{ backgroundColor: `#${hex}` }}>
      <input
        className={styles.colorSwatchInput}
        type="color"
        value={`#${hex}`}
        disabled={disabled}
        aria-label="Цвет пресета"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

const STYLE_PRESETS = [
  makeStylePreset(
    "white-bottom",
    "Подпись снизу",
    { font: "Montserrat", fontSize: 48, color: "#ffffff", align: "left", bold: true },
    { enabled: true, placement: "bottom" }
  ),
  makeStylePreset(
    "center",
    "Заголовок по центру",
    {
      font: "Unbounded",
      fontSize: 56,
      color: "#dbe4f0",
      align: "center",
      bold: true,
      top: 420,
    },
    { enabled: false }
  ),
  makeStylePreset(
    "plaque",
    "Текст на плашке",
    {
      font: "Montserrat",
      fontSize: 42,
      color: "#ffffff",
      align: "left",
      bold: true,
      background: "#000000",
    },
    { enabled: false }
  ),
  makeStylePreset(
    "stroke",
    "Белый с обводкой",
    {
      font: "Oswald",
      fontSize: 54,
      color: "#cfd3dc",
      align: "left",
      bold: true,
      strokeWidth: 6,
      strokeColor: "#000000",
      shadow: { ...DEFAULT_TEXT_SHADOW, enabled: false },
    },
    { enabled: true, placement: "bottom" }
  ),
  makeStylePreset(
    "serif",
    "Книжный с засечками",
    {
      font: "PT Serif",
      fontSize: 44,
      color: "#e6d3af",
      align: "left",
      bold: false,
      italic: true,
    },
    { enabled: true, placement: "bottom" }
  ),
  makeStylePreset(
    "accent",
    "Жёлтый акцент",
    {
      font: "Oswald",
      fontSize: 52,
      color: "#f8bf00",
      align: "left",
      bold: true,
    },
    { enabled: true, placement: "bottom", color: "#1a1a1a" }
  ),
];

function EditorFold({
  title,
  open,
  onToggle,
  extra,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.fold}>
      <div className={styles.foldHead}>
        <button
          type="button"
          className={styles.foldToggle}
          aria-expanded={open}
          onClick={onToggle}
        >
          <CaretDown
            size={16}
            className={open ? styles.foldCaretOpen : styles.foldCaret}
            aria-hidden
          />
          {title}
        </button>
        {extra}
      </div>
      {open ? <div className={styles.foldBody}>{children}</div> : null}
    </section>
  );
}

function toHex6(value: string) {
  const raw = value.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  return "FFFFFF";
}

function ColorLine({
  color,
  opacity,
  disabled,
  onColor,
  onOpacity,
}: {
  color: string;
  opacity?: number;
  disabled?: boolean;
  onColor: (hex: string) => void;
  onOpacity?: (value: number) => void;
}) {
  const hex = toHex6(color);
  const [draft, setDraft] = useState(hex);
  const percent = Math.round((opacity ?? 1) * 100);

  useEffect(() => {
    setDraft(hex);
  }, [hex]);

  return (
    <div className={styles.colorLine}>
      <label className={styles.colorSwatch} style={{ backgroundColor: `#${hex}` }}>
        <input
          className={styles.colorSwatchInput}
          type="color"
          value={`#${hex}`}
          disabled={disabled}
          aria-label="Цвет"
          onChange={(event) => onColor(event.target.value)}
        />
      </label>
      <input
        className={styles.hexInput}
        value={draft}
        maxLength={6}
        disabled={disabled}
        aria-label="HEX"
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
          setDraft(next);
          if (next.length === 3 || next.length === 6) {
            onColor(`#${toHex6(next)}`);
          }
        }}
      />
      {onOpacity ? (
        <span className={styles.opacityField}>
          <input
            className={styles.opacityInput}
            type="number"
            min={0}
            max={100}
            value={percent}
            disabled={disabled}
            aria-label="Непрозрачность"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isNaN(next)) return;
              onOpacity(Math.min(100, Math.max(0, next)) / 100);
            }}
          />
          <span>%</span>
        </span>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function decimalPlaces(value: number) {
  const text = String(value);
  if (!text.includes(".")) return 0;
  return text.split(".")[1]?.length ?? 0;
}

function Range({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
  scale = 1,
  slider = true,
  className,
  children,
}: {
  label: string;
  display?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  scale?: number;
  slider?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const inputStep = step * scale;
  const inputValue = Number((value * scale).toFixed(decimalPlaces(inputStep)));

  return (
    <label className={`${styles.field} ${className ?? ""}`.trim()}>
      <span className={styles.label}>{label}</span>
      <span className={styles.rangeRow}>
        {slider ? (
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
        ) : null}
        <input
          className={styles.rangeInput}
          type="number"
          min={min * scale}
          max={max * scale}
          step={inputStep}
          value={inputValue}
          aria-label={display ?? label}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            const unscaled = scale === 1 ? next : next / scale;
            onChange(Math.min(max, Math.max(min, unscaled)));
          }}
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
  const sourceType = useWizardStore((s) => s.sourceType);
  const extractedImages = useWizardStore((s) => s.extractedImages);
  const contentId = useWizardStore((s) => s.contentId);
  const projectId = useWizardStore((s) => s.projectId);
  const setField = useWizardStore((s) => s.setField);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const project = useProjectsStore((s) =>
    projectId ? s.getProject(projectId) : undefined
  );
  const isMeme = format === "video_meme";
  const isSlideshow = format === "slideshow";
  const cropFormats: readonly CropFormatOption[] = isSlideshow
    ? [STORIES_CROP_FORMAT]
    : CROP_FORMATS;

  const [selectedId, setSelectedId] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [cropFormat, setCropFormat] = useState<CropFormatOption | null>(null);
  const [frameFormat, setFrameFormat] = useState<CropFormatOption>(
    isSlideshow ? STORIES_CROP_FORMAT : CROP_FORMATS[0]
  );
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [folds, setFolds] = useState<Record<FoldKey, boolean>>({
    format: false,
    layers: true,
    shadow: false,
    gradient: false,
    presets: false,
  });
  const toggleFold = (key: FoldKey) => {
    setFolds((current) => ({ ...current, [key]: !current[key] }));
  };
  const [stageSize, setStageSize] = useState({ width: 1080, height: 1080 });
  const [displayWidth, setDisplayWidth] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presets, setPresets] = useState(() => STYLE_PRESETS);
  const [savedPreset, setSavedPreset] = useState<CardDesign | null>(
    () => styleClipboard
  );
  const [presetToDelete, setPresetToDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const photoFileCardId = useRef<string | null>(null);
  const drag = useRef<{ index: number; offsetX: number; offsetY: number } | null>(
    null
  );
  const [photoMenuId, setPhotoMenuId] = useState<string | null>(null);
  const [replaceLinkCardId, setReplaceLinkCardId] = useState<string | null>(null);
  const [replaceLink, setReplaceLink] = useState("");
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);

  useEffect(() => {
    ensureGoogleFonts();
  }, []);

  useEffect(() => {
    if (!photoMenuId) return;

    const close = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const root = document.querySelector(`[data-photo-menu="${photoMenuId}"]`);
      if (root?.contains(target)) return;
      setPhotoMenuId(null);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhotoMenuId(null);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [photoMenuId]);

  useEffect(() => {
    if (isSlideshow) {
      setFrameFormat(STORIES_CROP_FORMAT);
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
  const pagePhotos = pagePhotosFromSource({
    sourceType,
    sourceUrl,
    extractedImages,
    seed: contentId ?? sourceUrl,
    format,
  });
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

  const saveStyle = () => {
    if (!design) return;
    const copy = JSON.parse(JSON.stringify(design)) as CardDesign;
    styleClipboard = copy;
    setSavedPreset(copy);
    setActivePreset("saved");
  };

  const confirmDeletePreset = () => {
    if (!presetToDelete) return;
    if (presetToDelete.id === "saved") {
      styleClipboard = null;
      setSavedPreset(null);
    } else {
      setPresets((list) =>
        list.filter((item) => item.id !== presetToDelete.id)
      );
    }
    setActivePreset((current) =>
      current === presetToDelete.id ? null : current
    );
    setPresetToDelete(null);
  };

  const changePresetColor = (id: string, color: string) => {
    setPresets((list) =>
      list.map((preset) =>
        preset.id === id
          ? { ...preset, design: withLayerColor(preset.design, color) }
          : preset
      )
    );
  };

  const applySourceToCards = (source: CardDesign, targets: Card[]) => {
    const patches: Patches = Object.fromEntries(
      targets.map((card) => {
        const current = ensureCardDesign(card, stageSize);
        const own = current.layers;
        const ratio = current.width / source.width;
        return [
          card.id,
          {
            design: {
              ...current,
              overlay: source.overlay,
              globalLightAngle: source.globalLightAngle,
              layers: [
                ...source.layers.map((item, index) =>
                  withStyleOf(
                    own[index] ?? { ...item, text: card.shortText || item.text },
                    item,
                    ratio
                  )
                ),
                ...own.slice(source.layers.length),
              ],
            },
            designDirty: true,
          },
        ];
      })
    );
    patchCards(patches);
  };

  const applyToAll = () => {
    if (!design?.layers.length || !selected) return;
    applySourceToCards(
      design,
      withPhoto.filter((card) => card.id !== selected.id)
    );
  };

  const applyPreset = (source: CardDesign, id: string) => {
    const targets = withPhoto.length ? withPhoto : cards;
    if (!targets.length) return;
    applySourceToCards(source, targets);
    setActivePreset(id);
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

  const applyPagePhoto = (imageUrl: string) => {
    if (disabled || isMeme) return;
    const target =
      cards.find((card) => card.id === selectedId) ??
      cards.find((card) => !card.imageUrl) ??
      cards[0];
    if (!target) {
      const next = getMockCards(format, project?.defaultCopyright ?? "").map(
        (card, index) => ({
          ...card,
          imageUrl: index === 0 ? imageUrl : card.imageUrl,
          status: index === 0 ? ("ready" as const) : card.status,
        })
      );
      replaceCards(next);
      setSelectedId(next[0]?.id ?? "");
      return;
    }
    setCardImage(target.id, imageUrl);
  };

  const setCardImage = (cardId: string, imageUrl: string) => {
    patchCards({ [cardId]: { imageUrl, status: "ready", designDirty: true } });
    setSelectedId(cardId);
    setActiveIndex(0);
    setOriginals((map) => {
      if (!map[cardId]) return map;
      const next = { ...map };
      delete next[cardId];
      return next;
    });
  };

  const regenerateCardPhoto = async (cardId: string) => {
    if (disabled || photoBusyId) return;
    setPhotoBusyId(cardId);
    setPhotoMenuId(null);
    await simulateTask(() => undefined, ["queued", "in_progress"], 400);
    const { width, height } = photoSizeForFormat(format);
    setCardImage(
      cardId,
      `https://picsum.photos/seed/${cardId}-${Date.now()}/${width}/${height}`
    );
    setPhotoBusyId(null);
  };

  const openReplaceLink = (cardId: string) => {
    setPhotoMenuId(null);
    setReplaceLinkCardId(cardId);
    setReplaceLink("");
  };

  const confirmReplaceLink = () => {
    const url = replaceLink.trim();
    if (!replaceLinkCardId || !/^https?:\/\//i.test(url)) return;
    setCardImage(replaceLinkCardId, url);
    setReplaceLinkCardId(null);
    setReplaceLink("");
  };

  const openReplaceFile = (cardId: string) => {
    setPhotoMenuId(null);
    photoFileCardId.current = cardId;
    photoFileRef.current?.click();
  };

  const handlePhotoFile = (list: FileList | null) => {
    const file = list?.[0];
    const cardId = photoFileCardId.current;
    photoFileCardId.current = null;
    if (photoFileRef.current) photoFileRef.current.value = "";
    if (!file || !cardId) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCardImage(cardId, reader.result);
    };
    reader.readAsDataURL(file);
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
          ? "Текст ставится на ролик. Перетащите подпись по кадру; выделенный слой правится слева."
          : "Текст на фото ставится здесь, а не нейросетью. Перетащите подпись по кадру; выделенный слой правится слева."}
      </p>

      {!isMeme && withPhoto.length === 0 && (
        <div className={styles.generateBar}>
          <p className={styles.generateHint}>
            {pagePhotos.length > 0
              ? "Можно взять фото со страницы ниже или сгенерировать новые кадры."
              : "Сначала нужны фотографии карточек — затем на них ставится текст."}
          </p>
          <Button type="button" onClick={handleGeneratePhotos} disabled={disabled || busy}>
            {busy ? "Генерируем…" : "Сгенерировать фотографии"}
          </Button>
        </div>
      )}

      {!isMeme && pagePhotos.length > 0 && (
        <div className={styles.sourcePhotos}>
          <p className={styles.sourcePhotosLabel}>Фото со страницы</p>
          <ul className={styles.sourcePhotoList} aria-label="Фотографии из источника">
            {pagePhotos.map((imageUrl, index) => (
              <li key={`${imageUrl}-${index}`}>
                <button
                  type="button"
                  className={styles.sourcePhoto}
                  disabled={disabled}
                  onClick={() => applyPagePhoto(imageUrl)}
                  aria-label={`Фото ${index + 1} со страницы`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.layout}>
        <div
          className={`${styles.previewColumn} ${
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
              <li
                key={card.id}
                className={styles.photoItem}
                data-photo-menu={card.id}
              >
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
                {!isMeme && (
                  <button
                    type="button"
                    className={styles.photoMore}
                    aria-label={`Действия с фото ${index + 1}`}
                    aria-haspopup="menu"
                    aria-expanded={photoMenuId === card.id}
                    disabled={disabled || photoBusyId === card.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(card.id);
                      setPhotoMenuId((current) =>
                        current === card.id ? null : card.id
                      );
                    }}
                  >
                    <DotsThree size={18} weight="bold" />
                  </button>
                )}
                {photoMenuId === card.id && (
                  <div className={styles.photoMenu} role="menu">
                    <button
                      type="button"
                      className={styles.photoMenuItem}
                      role="menuitem"
                      onClick={() => openReplaceLink(card.id)}
                    >
                      Заменить по ссылке
                    </button>
                    <button
                      type="button"
                      className={styles.photoMenuItem}
                      role="menuitem"
                      onClick={() => regenerateCardPhoto(card.id)}
                    >
                      Перегенерировать
                    </button>
                    <button
                      type="button"
                      className={styles.photoMenuItem}
                      role="menuitem"
                      onClick={() => openReplaceFile(card.id)}
                    >
                      Загрузить с компьютера
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          )}
        </div>

          <aside className={styles.editorColumn} aria-label="Параметры текста">
          {!isMeme && (
          <EditorFold
            title="Формат фото"
            open={folds.format}
            onToggle={() => toggleFold("format")}
          >
          <div className={styles.field}>
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
          </EditorFold>
          )}

          <EditorFold
            title="Текстовые слои"
            open={folds.layers}
            onToggle={() => toggleFold("layers")}
            extra={
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={disabled || !design}
                onClick={addLayer}
              >
                Добавить текст
              </Button>
            }
          >
          <div className={styles.field}>
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

                <div className={styles.fontRow}>
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
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Цвет</span>
                  <ColorLine
                    color={layer.color}
                    opacity={layer.opacity}
                    disabled={disabled}
                    onColor={(color) => changeLayer({ color })}
                    onOpacity={(opacity) => changeLayer({ opacity })}
                  />
                </div>

                <div className={styles.styleRow}>
                  <div className={styles.field}>
                    <span className={styles.label}>Начертание</span>
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
                  </div>

                  <div className={styles.field}>
                    <span className={styles.label}>Выравнивание</span>
                    <div className={styles.row} role="group" aria-label="Выравнивание">
                      {ALIGN_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-label={option.label}
                          aria-pressed={layer.align === option.value}
                          className={`${styles.toggle} ${styles.iconToggle} ${
                            layer.align === option.value ? styles.toggleOn : ""
                          }`}
                          disabled={disabled}
                          onClick={() => changeLayer({ align: option.value })}
                        >
                          <option.Icon size={16} weight="bold" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.layerCol}>
                <div className={styles.rangeGrid}>
                  <Range
                    label="Межбуквенный интервал"
                    min={-100}
                    max={800}
                    step={10}
                    slider={false}
                    value={layer.charSpacing}
                    onChange={(charSpacing) => changeLayer({ charSpacing })}
                  />
                  <Range
                    label="Межстрочный интервал"
                    min={0.7}
                    max={2.5}
                    step={0.05}
                    slider={false}
                    value={layer.lineHeight}
                    onChange={(lineHeight) => changeLayer({ lineHeight })}
                  />
                </div>
                <Range
                  className={styles.strokeField}
                  label="Обводка"
                  min={0}
                  max={30}
                  step={1}
                  slider={false}
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

                <div className={styles.plaqueRow}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() =>
                      changeLayer({
                        background:
                          layer.background === null ? "#000000" : null,
                      })
                    }
                  >
                    {layer.background !== null
                      ? "Убрать плашку"
                      : "Добавить плашку"}
                  </Button>
                  <input
                    className={styles.color}
                    type="color"
                    aria-label="Цвет плашки"
                    value={layer.background ?? "#000000"}
                    disabled={disabled}
                    onChange={(event) =>
                      changeLayer({ background: event.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.hint}>Выберите текст на кадре или добавьте новый</p>
          )}
          </EditorFold>

          <EditorFold
            title="Тень текста"
            open={folds.shadow}
            onToggle={() => toggleFold("shadow")}
          >
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
              <div className={styles.rangeGrid}>
                <Range
                  className={styles.strokeField}
                  label="Непрозрачность"
                  min={0}
                  max={1}
                  step={0.01}
                  scale={100}
                  slider={false}
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
                <Range
                  label="Угол"
                  min={0}
                  max={360}
                  step={1}
                  slider={false}
                  value={
                    layerShadow.globalLight
                      ? (design?.globalLightAngle ?? layerShadow.angle)
                      : layerShadow.angle
                  }
                  onChange={(angle) => changeShadow({ angle })}
                />
                <Range
                  label="Смещение"
                  min={0}
                  max={40}
                  step={1}
                  slider={false}
                  value={layerShadow.distance}
                  onChange={(distance) => changeShadow({ distance })}
                />
                <Range
                  label="Размах"
                  min={0}
                  max={100}
                  step={1}
                  slider={false}
                  value={layerShadow.spread}
                  onChange={(spread) => changeShadow({ spread })}
                />
                <Range
                  label="Размер"
                  min={0}
                  max={40}
                  step={1}
                  slider={false}
                  value={layerShadow.size}
                  onChange={(size) => changeShadow({ size })}
                />
                <Range
                  label="Шум"
                  min={0}
                  max={100}
                  step={1}
                  slider={false}
                  value={layerShadow.noise}
                  onChange={(noise) => changeShadow({ noise })}
                />
              </div>
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
            </div>
          ) : layer ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={disabled}
              onClick={() => changeShadow({ enabled: true })}
            >
              Включить тень
            </Button>
          ) : (
            <p className={styles.hint}>Сначала выберите текстовый слой</p>
          )}
          </EditorFold>

          <EditorFold
            title="Градиент под текст"
            open={folds.gradient}
            onToggle={() => toggleFold("gradient")}
          >
          <div className={styles.field}>
            <div className={styles.row} role="group" aria-label="Градиент под текст">
              {GRADIENT_OPTIONS.map((option) => {
                const active =
                  option.value === null
                    ? !overlay?.enabled
                    : Boolean(overlay?.enabled && overlay.placement === option.value);
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`${styles.toggle} ${styles.gradientToggle} ${
                      active ? styles.toggleOn : ""
                    }`}
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
                <div className={styles.rangeGrid}>
                <Range
                  label="Ширина слоя"
                  min={200}
                  max={1080}
                  step={1}
                  slider={false}
                  value={overlay.width}
                  onChange={(width) => changeOverlay({ width })}
                />
                <Range
                  label="Высота слоя"
                  min={40}
                  max={1080}
                  step={1}
                  slider={false}
                  value={overlay.height}
                  onChange={(height) => changeOverlay({ height })}
                />
                <Range
                  label="Y от"
                  min={0}
                  max={1080}
                  step={1}
                  slider={false}
                  value={overlay.yStart}
                  onChange={(yStart) => changeOverlay({ yStart })}
                />
                <Range
                  label="Y до"
                  min={0}
                  max={1080}
                  step={1}
                  slider={false}
                  value={overlay.yEnd}
                  onChange={(yEnd) => changeOverlay({ yEnd })}
                />
                <Range
                  className={styles.strokeField}
                  label="Верхняя непрозрачность"
                  min={0}
                  max={1}
                  step={0.01}
                  scale={100}
                  slider={false}
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
                  min={0}
                  max={1}
                  step={0.01}
                  scale={100}
                  slider={false}
                  value={overlay.bottomOpacity}
                  onChange={(bottomOpacity) => changeOverlay({ bottomOpacity })}
                />
                <Range
                  className={`${styles.strokeField} ${styles.spanAll}`}
                  label="Непрозрачность слоя"
                  min={0}
                  max={1}
                  step={0.01}
                  scale={100}
                  slider={false}
                  value={overlay.layerOpacity}
                  onChange={(layerOpacity) => changeOverlay({ layerOpacity })}
                />
                </div>
              </div>
            )}
          </div>
          </EditorFold>

          <EditorFold
            title="Пресеты"
            open={folds.presets}
            onToggle={() => toggleFold("presets")}
            extra={
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={disabled || !design}
                onClick={saveStyle}
              >
                Сохранить стиль
              </Button>
            }
          >
            <ul className={styles.presetList} aria-label="Пресеты стиля">
              {presets.map((preset) => (
                  <li
                    key={preset.id}
                    className={`${styles.presetRow} ${
                      activePreset === preset.id ? styles.presetRowOn : ""
                    }`}
                  >
                    <PresetColorSwatch
                      color={preset.design.layers[0]?.color ?? "#ffffff"}
                      disabled={disabled}
                      onChange={(color) => changePresetColor(preset.id, color)}
                    />
                    <button
                      type="button"
                      className={styles.presetPick}
                      disabled={disabled || (!withPhoto.length && !cards.length)}
                      onClick={() => applyPreset(preset.design, preset.id)}
                    >
                      <span className={styles.presetName}>{preset.label}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label={`Удалить пресет «${preset.label}»`}
                      disabled={disabled}
                      onClick={() =>
                        setPresetToDelete({ id: preset.id, label: preset.label })
                      }
                    >
                      <TrashIcon />
                    </button>
                  </li>
              ))}
              {!presets.length && !savedPreset ? (
                <li className={styles.hint}>Пресеты удалены — сохраните свой стиль</li>
              ) : null}
              {savedPreset ? (
                <li
                  className={`${styles.presetRow} ${
                    activePreset === "saved" ? styles.presetRowOn : ""
                  }`}
                >
                  <PresetColorSwatch
                    color={savedPreset.layers[0]?.color ?? "#ffffff"}
                    disabled={disabled}
                    onChange={(color) => {
                      const next = withLayerColor(savedPreset, color);
                      styleClipboard = next;
                      setSavedPreset(next);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.presetPick}
                    disabled={disabled}
                    onClick={() => applyPreset(savedPreset, "saved")}
                  >
                    <span className={styles.presetName}>Мой стиль</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    aria-label="Удалить пресет «Мой стиль»"
                    disabled={disabled}
                    onClick={() =>
                      setPresetToDelete({ id: "saved", label: "Мой стиль" })
                    }
                  >
                    <TrashIcon />
                  </button>
                </li>
              ) : null}
            </ul>
          </EditorFold>

          {!isMeme && (
            <Button
              type="button"
              variant="primary"
              fullWidth
              title="Шрифт, цвета и место текста — на остальные карточки, текст у каждой свой"
              disabled={disabled || !design?.layers.length || withPhoto.length < 2}
              onClick={applyToAll}
            >
              Применить на все карточки
            </Button>
          )}
          </aside>
      </div>

      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        className={styles.fileHidden}
        onChange={(event) => handlePhotoFile(event.target.files)}
      />

      <Modal
        title="Заменить фото по ссылке"
        open={Boolean(replaceLinkCardId)}
        onClose={() => {
          setReplaceLinkCardId(null);
          setReplaceLink("");
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setReplaceLinkCardId(null);
                setReplaceLink("");
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={confirmReplaceLink}
              disabled={!/^https?:\/\//i.test(replaceLink.trim())}
            >
              Подставить
            </Button>
          </>
        }
      >
        <Input
          label="Ссылка на фото"
          value={replaceLink}
          placeholder="https://"
          onChange={(event) => setReplaceLink(event.target.value)}
        />
      </Modal>

      <Modal
        title="Удалить пресет?"
        open={Boolean(presetToDelete)}
        onClose={() => setPresetToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPresetToDelete(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={confirmDeletePreset}>
              Удалить
            </Button>
          </>
        }
      >
        <p>
          Точно удалить пресет
          {presetToDelete ? ` «${presetToDelete.label}»` : ""}? Это нельзя отменить.
        </p>
      </Modal>

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
