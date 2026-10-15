import type { CSSProperties } from "react";
import type {
  Card,
  CardDesign,
  GradientPlacement,
  PhotoGradient,
  TextLayer,
  TextShadow,
} from "@/types";

export const DESIGN_WIDTH = 1080;

export const DESIGN_FONTS = [
  "Montserrat",
  "Inter",
  "Roboto",
  "Manrope",
  "Rubik",
  "Oswald",
  "Unbounded",
  "PT Sans",
  "PT Serif",
  "Playfair Display",
  "Lora",
  "Comfortaa",
] as const;

export function designFrame(photo: { width: number; height: number }) {
  return {
    width: DESIGN_WIDTH,
    height: Math.round((DESIGN_WIDTH * photo.height) / photo.width) || DESIGN_WIDTH,
  };
}

export function createTextLayer(
  text: string,
  frame: { width: number; height: number }
): TextLayer {
  return {
    text,
    font: "Montserrat",
    fontSize: 48,
    color: "#ffffff",
    align: "left",
    bold: true,
    italic: false,
    underline: false,
    left: 48,
    top: Math.max(64, frame.height - 240),
    width: frame.width - 96,
    opacity: 1,
    charSpacing: 0,
    lineHeight: 1.15,
    strokeWidth: 0,
    strokeColor: "#000000",
    shadow: { ...DEFAULT_TEXT_SHADOW },
    background: null,
    hidden: false,
  };
}

export function createCardDesign(
  text: string,
  photo: { width: number; height: number }
): CardDesign {
  const frame = designFrame(photo);
  return {
    ...frame,
    overlay: { ...DEFAULT_PHOTO_GRADIENT },
    globalLightAngle: 90,
    layers: [createTextLayer(text, frame)],
  };
}

export function ensureCardDesign(card: Card, photo?: { width: number; height: number }): CardDesign {
  if (!card.design) {
    return createCardDesign(
      card.shortText,
      photo ?? { width: DESIGN_WIDTH, height: DESIGN_WIDTH }
    );
  }
  return {
    ...card.design,
    overlay: resolvePhotoGradient(card.design),
    globalLightAngle: card.design.globalLightAngle ?? 90,
    layers: card.design.layers.map((layer) => ({
      ...layer,
      shadow: resolveTextShadow(layer.shadow),
    })),
  };
}

export function withStyleOf(
  target: TextLayer,
  source: TextLayer,
  scale: number
): TextLayer {
  const shadow = resolveTextShadow(source.shadow);
  return {
    ...source,
    text: target.text,
    fontSize: Math.round(source.fontSize * scale),
    strokeWidth: Math.round(source.strokeWidth * scale),
    left: Math.round(source.left * scale),
    top: Math.round(source.top * scale),
    width: Math.round(source.width * scale),
    shadow: {
      ...shadow,
      distance: Math.round(shadow.distance * scale * 10) / 10,
      size: Math.round(shadow.size * scale * 10) / 10,
    },
  };
}

export function fontFamily(font: string): string {
  return `"${font}", sans-serif`;
}

export const DEFAULT_TEXT_SHADOW: TextShadow = {
  enabled: true,
  blendMode: "multiply",
  color: "#000000",
  opacity: 1,
  globalLight: true,
  angle: 90,
  distance: 3,
  spread: 0,
  size: 0,
  noise: 0,
  contour: "linear",
  antiAlias: false,
};

export function resolveTextShadow(shadow: TextLayer["shadow"] | boolean | undefined): TextShadow {
  if (shadow === false || shadow == null) {
    return { ...DEFAULT_TEXT_SHADOW, enabled: false };
  }
  if (shadow === true) return { ...DEFAULT_TEXT_SHADOW };
  return { ...DEFAULT_TEXT_SHADOW, ...shadow };
}

export function textShadowLayerStyle(
  shadow: TextShadow,
  globalLightAngle: number,
  displayScale: number,
  noiseFilterId?: string
): CSSProperties {
  const angle = shadow.globalLight ? globalLightAngle : shadow.angle;
  const rad = (angle * Math.PI) / 180;
  const distance = shadow.distance * displayScale;
  const x = -Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;
  const blur = Math.max(0, shadow.size * displayScale);
  const spread = (shadow.spread / 100) * Math.max(blur, 6) * displayScale;
  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${(blur / 2).toFixed(2)}px)`);
  if (shadow.contour === "gaussian") {
    filters.push(`blur(${Math.max(0.35, blur / 3 + 0.35).toFixed(2)}px)`);
  }
  if (shadow.contour === "cone") filters.push("contrast(1.4)");
  if (!shadow.antiAlias) filters.push("contrast(1.12)");
  if (shadow.noise > 0 && noiseFilterId) {
    filters.push(`url(#${noiseFilterId})`);
  }

  return {
    color: shadow.color,
    opacity: shadow.opacity,
    mixBlendMode: shadow.blendMode,
    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`,
    filter: filters.length ? filters.join(" ") : undefined,
    WebkitTextStroke: spread > 0.2 ? `${spread.toFixed(2)}px ${shadow.color}` : undefined,
    WebkitFontSmoothing: shadow.antiAlias ? "antialiased" : "none",
  };
}

export const PHOTO_GRADIENT_REF = 1080;
export const PHOTO_GRADIENT_LAYER_OPACITY = 212 / 255;

export const DEFAULT_PHOTO_GRADIENT: PhotoGradient = {
  enabled: true,
  placement: "bottom",
  width: 1080,
  height: 519,
  yStart: 561,
  yEnd: 1080,
  color: "#000000",
  topOpacity: 0,
  bottomOpacity: 0.93,
  layerOpacity: PHOTO_GRADIENT_LAYER_OPACITY,
};

export function photoGradientForPlacement(placement: GradientPlacement): PhotoGradient {
  if (placement === "top") {
    return {
      ...DEFAULT_PHOTO_GRADIENT,
      placement: "top",
      yStart: 0,
      yEnd: DEFAULT_PHOTO_GRADIENT.height,
    };
  }
  return { ...DEFAULT_PHOTO_GRADIENT };
}

export function resolvePhotoGradient(design: CardDesign): PhotoGradient {
  const overlay = design.overlay;
  if (overlay && typeof overlay === "object") {
    return { ...DEFAULT_PHOTO_GRADIENT, ...overlay };
  }
  const legacy = design.gradient;
  if (legacy === "bottom" || legacy === "top") {
    return {
      ...photoGradientForPlacement(legacy),
      layerOpacity: design.gradientStrong ? 1 : PHOTO_GRADIENT_LAYER_OPACITY,
    };
  }
  return { ...DEFAULT_PHOTO_GRADIENT, enabled: false };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((part) => part + part)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function photoGradientStyle(overlay: PhotoGradient): CSSProperties {
  const yStart = Math.min(overlay.yStart, overlay.yEnd);
  const yEnd = Math.max(overlay.yStart, overlay.yEnd);
  const topPct = (yStart / PHOTO_GRADIENT_REF) * 100;
  const heightPct = (Math.max(1, yEnd - yStart) / PHOTO_GRADIENT_REF) * 100;
  const widthPct = (overlay.width / PHOTO_GRADIENT_REF) * 100;
  const leftPct = ((PHOTO_GRADIENT_REF - overlay.width) / 2 / PHOTO_GRADIENT_REF) * 100;
  const { r, g, b } = hexToRgb(overlay.color || "#000000");
  const fade = `rgba(${r}, ${g}, ${b}, ${overlay.topOpacity})`;
  const edge = `rgba(${r}, ${g}, ${b}, ${overlay.bottomOpacity})`;

  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    top: `${topPct}%`,
    height: `${heightPct}%`,
    background:
      overlay.placement === "bottom"
        ? `linear-gradient(to bottom, ${fade}, ${edge})`
        : `linear-gradient(to bottom, ${edge}, ${fade})`,
    opacity: overlay.layerOpacity,
  };
}
