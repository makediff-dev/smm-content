"use client";

import { useState, type CSSProperties } from "react";
import selectStyles from "@/components/ui/select.module.css";
import styles from "./transition-field.module.css";

const TRANSITIONS: {
  value: string;
  label: string;
  kind: string;
  vars?: CSSProperties;
}[] = [
  { value: "none", label: "Без перехода", kind: "cut" },
  { value: "fade", label: "Затухание", kind: "fade" },
  { value: "dissolve", label: "Растворение", kind: "dissolve" },
  {
    value: "fadeblack",
    label: "Через чёрный",
    kind: "flash",
    vars: { "--flash": "#000" } as CSSProperties,
  },
  {
    value: "fadewhite",
    label: "Через белый",
    kind: "flash",
    vars: { "--flash": "#fff" } as CSSProperties,
  },
  {
    value: "wipeleft",
    label: "Шторка влево",
    kind: "wipe",
    vars: { "--l": 1 } as CSSProperties,
  },
  {
    value: "wiperight",
    label: "Шторка вправо",
    kind: "wipe",
    vars: { "--r": 1 } as CSSProperties,
  },
  {
    value: "wipeup",
    label: "Шторка вверх",
    kind: "wipe",
    vars: { "--t": 1 } as CSSProperties,
  },
  {
    value: "wipedown",
    label: "Шторка вниз",
    kind: "wipe",
    vars: { "--b": 1 } as CSSProperties,
  },
  {
    value: "slideleft",
    label: "Сдвиг влево",
    kind: "slide",
    vars: { "--dx": 1, "--dy": 0 } as CSSProperties,
  },
  {
    value: "slideright",
    label: "Сдвиг вправо",
    kind: "slide",
    vars: { "--dx": -1, "--dy": 0 } as CSSProperties,
  },
  {
    value: "slideup",
    label: "Сдвиг вверх",
    kind: "slide",
    vars: { "--dx": 0, "--dy": 1 } as CSSProperties,
  },
  {
    value: "slidedown",
    label: "Сдвиг вниз",
    kind: "slide",
    vars: { "--dx": 0, "--dy": -1 } as CSSProperties,
  },
  { value: "circleopen", label: "Круг наружу", kind: "circleopen" },
  { value: "circleclose", label: "Круг внутрь", kind: "circleclose" },
  { value: "hblur", label: "Размытие", kind: "blur" },
  { value: "zoomin", label: "Наплыв", kind: "zoom" },
];

interface TransitionFieldProps {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function TransitionField({ id, value, disabled, onChange }: TransitionFieldProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const shown =
    TRANSITIONS.find((item) => item.value === (highlighted ?? value)) ?? TRANSITIONS[0];

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Переход между слайдами
      </label>
      <div className={styles.row}>
        <select
          id={id}
          className={selectStyles.select}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onMouseLeave={() => setHighlighted(null)}
        >
          {TRANSITIONS.map((item) => (
            <option
              key={item.value}
              value={item.value}
              onMouseEnter={() => setHighlighted(item.value)}
            >
              {item.label}
            </option>
          ))}
        </select>
        <div
          className={`${styles.preview} ${styles[shown.kind]}`}
          style={shown.vars}
          aria-hidden
        >
          <div className={`${styles.frame} ${styles.a}`}>1</div>
          <div className={`${styles.frame} ${styles.b}`}>2</div>
        </div>
      </div>
      <p className={styles.hint}>
        Пример условный. Переход не удлиняет ролик: он накладывается на стык, а
        общий тайминг слайдов остаётся тем же, что и у озвучки.
      </p>
    </div>
  );
}
