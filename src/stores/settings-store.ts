"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIModelSettings, Prompt } from "@/types";
import { SEED_AI_SETTINGS, SEED_PROMPTS } from "@/data/seed";
import { generateId } from "@/lib/simulate-generation";

interface SettingsState {
  prompts: Prompt[];
  aiSettings: AIModelSettings;
  updatePrompt: (id: string, data: Partial<Prompt>) => void;
  duplicatePrompt: (id: string) => void;
  updateAISettings: (data: Partial<AIModelSettings>) => void;
  testConnection: () => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      prompts: SEED_PROMPTS,
      aiSettings: SEED_AI_SETTINGS,

      updatePrompt: (id, data) => {
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      duplicatePrompt: (id) => {
        const original = get().prompts.find((p) => p.id === id);
        if (!original) return;
        const copy: Prompt = {
          ...original,
          id: generateId("prompt"),
          name: `${original.name} (копия)`,
        };
        set((s) => ({ prompts: [...s.prompts, copy] }));
      },

      updateAISettings: (data) => {
        set((s) => ({
          aiSettings: { ...s.aiSettings, ...data },
        }));
      },

      testConnection: () => {
        set((s) => ({
          aiSettings: { ...s.aiSettings, connectionStatus: "testing" },
        }));
        setTimeout(() => {
          set((s) => ({
            aiSettings: { ...s.aiSettings, connectionStatus: "connected" },
          }));
        }, 2000);
      },

      resetSettings: () =>
        set({ prompts: SEED_PROMPTS, aiSettings: SEED_AI_SETTINGS }),
    }),
    { name: "smm-settings" }
  )
);
