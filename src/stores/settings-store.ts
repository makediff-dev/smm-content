"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIModelSettings, Prompt, Skill } from "@/types";
import { SEED_AI_SETTINGS, SEED_PROMPTS, SEED_SKILLS } from "@/data/seed";
import { generateId } from "@/lib/simulate-generation";

interface SettingsState {
  prompts: Prompt[];
  skills: Skill[];
  aiSettings: AIModelSettings;
  updatePrompt: (id: string, data: Partial<Prompt>) => void;
  duplicatePrompt: (id: string) => void;
  updateSkill: (id: string, data: Partial<Skill>) => void;
  updateAISettings: (data: Partial<AIModelSettings>) => void;
  testConnection: () => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      prompts: SEED_PROMPTS,
      skills: SEED_SKILLS,
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
          ownerId: original.ownerId ?? "own",
        };
        set((s) => ({ prompts: [...s.prompts, copy] }));
      },

      updateSkill: (id, data) => {
        set((s) => ({
          skills: s.skills.map((skill) =>
            skill.id === id ? { ...skill, ...data } : skill
          ),
        }));
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
        set({
          prompts: SEED_PROMPTS,
          skills: SEED_SKILLS,
          aiSettings: SEED_AI_SETTINGS,
        }),
    }),
    {
      name: "smm-settings",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;

        return {
          ...currentState,
          ...persisted,
          prompts: persisted?.prompts?.length ? persisted.prompts : currentState.prompts,
          skills: persisted?.skills?.length ? persisted.skills : currentState.skills,
          aiSettings: {
            ...currentState.aiSettings,
            ...persisted?.aiSettings,
          },
        };
      },
    }
  )
);
