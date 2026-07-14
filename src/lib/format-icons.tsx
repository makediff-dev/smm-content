"use client";

import {
  SquaresFour,
  Images,
  FilmStrip,
  TextAlignLeft,
  type Icon,
} from "@phosphor-icons/react";
import type { ContentFormat } from "@/types";

export type FormatFilterId = ContentFormat | "all";

export const formatIconMap: Record<FormatFilterId, Icon> = {
  all: SquaresFour,
  gallery: Images,
  slideshow: FilmStrip,
  text: TextAlignLeft,
};
