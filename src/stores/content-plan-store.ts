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

      setReadyForProofreading: (value) => set({ readyForProofreading: value }),

      getSlotsForWeek: (start) => {
        const end = addDays(start, 7);
        return get().slots.filter((slot) => {
          const date = new Date(slot.scheduledAt);
          return date >= start && date < end;
        });
      },
    }),
    {
      name: "smm-content-plan",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ContentPlanState> | undefined;
        return {
          ...currentState,
          ...persisted,
          slots: persisted?.slots?.length ? persisted.slots : currentState.slots,
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
