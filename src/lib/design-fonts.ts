import { DESIGN_FONTS } from "@/lib/card-design";

let fontsLinked = false;

export function ensureGoogleFonts(): void {
  if (fontsLinked || typeof document === "undefined") return;
  fontsLinked = true;

  const families = DESIGN_FONTS.map(
    (font) => `family=${font.replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400;1,700`
  ).join("&");

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}
