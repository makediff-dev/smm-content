"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentPlanSlot } from "@/types";
import { addDays, getWeekStart, toDateKey } from "@/lib/content-plan";
import { generateId } from "@/lib/simulate-generation";

interface ContentPlanState {
  slots: ContentPlanSlot[];
  readyForProofreading: boolean;
  addSlot: (slot: Omit<ContentPlanSlot, "id">) => string;
  updateSlot: (id: string, data: Partial<ContentPlanSlot>) => void;
  removeSlot: (id: string) => void;
  moveSlotToDate: (id: string, dateKey: string) => void;
  archiveSlot: (id: string) => void;
  placeSlotOnDate: (id: string, dateKey: string, time: string) => void;
  setReadyForProofreading: (value: boolean) => void;
  getSlotsForWeek: (weekStart: Date) => ContentPlanSlot[];
}

const now = new Date();
const weekStart = getWeekStart(now);

function makeSeedSlot(
  dayOffset: number,
  hours: number,
  minutes: number,
  title: string,
  overrides?: Partial<ContentPlanSlot>
): ContentPlanSlot {
  const date = addDays(weekStart, dayOffset);
  date.setHours(hours, minutes, 0, 0);

  return {
    id: generateId("kp"),
    projectId: "proj-1",
    contentUnitId: "content-1",
    scheduledAt: date.toISOString(),
    title,
    format: "gallery",
    scenario: dayOffset === 0 ? "news" : "scheduled",
    comment: "",
    hasText: true,
    hasZip: false,
    hasVisual: false,
    ...overrides,
  };
}

export const SEED_CONTENT_PLAN: ContentPlanSlot[] = [
  makeSeedSlot(0, 10, 30, "Обзор AI-инструментов 2026"),
  makeSeedSlot(0, 14, 0, "Кейс автоматизации", {
    contentUnitId: "content-3",
    format: "gallery",
    hasText: true,
    hasZip: true,
    hasVisual: false,
  }),
  makeSeedSlot(1, 11, 15, "Тренды SaaS 2026", {
    contentUnitId: "content-2",
    format: "slideshow",
    hasText: true,
    hasZip: false,
    hasVisual: true,
  }),
  {
    id: "kp-content-19",
    projectId: "proj-1",
    contentUnitId: "content-19",
    scheduledAt: new Date(2026, 9, 12, 12, 0, 0).toISOString(),
    title: "Японские тюнеры прокачали Lexus GX",
    format: "gallery",
    scenario: "news",
    comment: "",
    platforms: ["VK", "IG", "OK", "Дзен", "сторис"],
    hasText: true,
    hasZip: true,
    hasVisual: true,
    zipFileName: "12.10.26_пост галерея_вк_12.00.zip",
  },
  makeSeedSlot(2, 10, 0, "Объява: Hilux", {
    contentUnitId: "content-11",
    format: "text",
    hasZip: false,
    hasVisual: false,
  }),
  makeSeedSlot(3, 12, 0, "Bentley", {
    contentUnitId: "content-7",
    format: "gallery",
    hasZip: true,
  }),
  makeSeedSlot(4, 15, 0, "Мем про запуск", {
    format: "video_meme",
    contentUnitId: "content-26",
    hasVisual: true,
    hasZip: false,
  }),
  makeSeedSlot(5, 12, 0, "Галерея выходного", {
    format: "gallery",
    contentUnitId: "content-27",
  }),
  {
    id: "kp-archive-1",
    projectId: "proj-1",
    contentUnitId: "content-1",
    scheduledAt: addDays(weekStart, -10).toISOString(),
    title: "История Toyota Land Cruiser 105",
    format: "gallery",
    scenario: "scheduled",
    comment: "",
    hasText: true,
    hasZip: true,
    hasVisual: true,
    archived: true,
    archivedAt: addDays(weekStart, -11).toISOString(),
  },
  {
    id: "kp-archive-2",
    projectId: "proj-1",
    contentUnitId: "content-2",
    scheduledAt: addDays(weekStart, -8).toISOString(),
    title: "Mercedes 190E Evo II: как появился",
    format: "slideshow",
    scenario: "scheduled",
    comment: "",
    hasText: true,
    hasZip: false,
    hasVisual: true,
    archived: true,
    archivedAt: addDays(weekStart, -9).toISOString(),
  },
  {
    id: "kp-archive-3",
    projectId: "proj-2",
    scheduledAt: addDays(weekStart, -6).toISOString(),
    title: "Отзыв владельца Mazda CX-5",
    format: "text",
    scenario: "news",
    comment: "",
    hasText: true,
    hasZip: false,
    hasVisual: false,
    archived: true,
    archivedAt: addDays(weekStart, -7).toISOString(),
  },
];

export const useContentPlanStore = create<ContentPlanState>()(
  persist(
    (set, get) => ({
      slots: SEED_CONTENT_PLAN,
      readyForProofreading: false,

      addSlot: (slotData) => {
        const id = generateId("kp");
        const slot: ContentPlanSlot = { ...slotData, id };
        set((state) => ({ slots: [...state.slots, slot] }));
        return id;
      },

      updateSlot: (id, data) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.id === id ? { ...slot, ...data } : slot
          ),
        }));
      },

      removeSlot: (id) => {
        set((state) => ({
          slots: state.slots.filter((slot) => slot.id !== id),
        }));
      },

      moveSlotToDate: (id, dateKey) => {
        const slot = get().slots.find((item) => item.id === id);
        if (!slot) return;
        const date = new Date(slot.scheduledAt);
        const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        get().updateSlot(id, {
          scheduledAt: buildScheduledAt(dateKey, time),
          archived: false,
          archivedAt: undefined,
        });
      },

      archiveSlot: (id) => {
        get().updateSlot(id, {
          archived: true,
          archivedAt: new Date().toISOString(),
        });
      },

      placeSlotOnDate: (id, dateKey, time) => {
        get().updateSlot(id, {
          scheduledAt: buildScheduledAt(dateKey, time),
          archived: false,
          archivedAt: undefined,
        });
      },

      setReadyForProofreading: (value) => set({ readyForProofreading: value }),

      getSlotsForWeek: (start) => {
        const end = addDays(start, 7);
        return get().slots.filter((slot) => {
          if (slot.archived) return false;
          const date = new Date(slot.scheduledAt);
          return date >= start && date < end;
        });
      },
    }),
    {
      name: "smm-content-plan",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ContentPlanState> | undefined;
        const slots = persisted?.slots?.length
          ? persisted.slots
          : currentState.slots;
        const missingSeed = currentState.slots.filter(
          (seed) =>
            !slots.some(
              (slot) =>
                slot.id === seed.id ||
                (seed.contentUnitId &&
                  slot.contentUnitId === seed.contentUnitId)
            )
        );
        return {
          ...currentState,
          ...persisted,
          slots: [...slots, ...missingSeed],
        };
      },
    }
  )
);

export function buildScheduledAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function slotMatchesDate(slot: ContentPlanSlot, dateKey: string): boolean {
  return toDateKey(new Date(slot.scheduledAt)) === dateKey;
}
