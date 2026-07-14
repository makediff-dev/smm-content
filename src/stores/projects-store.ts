"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentUnit, Project } from "@/types";
import { SEED_CONTENT, SEED_PROJECTS } from "@/data/seed";
import { generateId } from "@/lib/simulate-generation";

interface ProjectsState {
  projects: Project[];
  contentUnits: ContentUnit[];
  createProject: (data: { name: string; description: string }) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  getProject: (id: string) => Project | undefined;
  getProjectsForUser: (userId: string, isAdmin: boolean) => Project[];
  getContentForProject: (projectId: string) => ContentUnit[];
  createContentUnit: (projectId: string, data?: Partial<ContentUnit>) => string;
  updateContentUnit: (id: string, data: Partial<ContentUnit>) => void;
  getContentUnit: (id: string) => ContentUnit | undefined;
  addActionLog: (
    contentId: string,
    action: string,
    user: string
  ) => void;
  resetData: () => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      contentUnits: SEED_CONTENT,

      createProject: (data) => {
        const id = generateId("proj");
        const project: Project = {
          id,
          name: data.name,
          description: data.description,
          logoPlaceholder: data.name.slice(0, 2).toUpperCase(),
          logoAssets: [],
          contentCount: 0,
          managerIds: [],
          brandStyle: "",
          defaultCopyright: "",
          cardTemplates: "",
          imageRules: "",
          formattingRules: "",
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return id;
      },

      updateProject: (id, data) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      getProjectsForUser: (userId, isAdmin) => {
        if (isAdmin) return get().projects;
        return get().projects.filter((p) => p.managerIds.includes(userId));
      },

      getContentForProject: (projectId) =>
        get().contentUnits.filter((c) => c.projectId === projectId),

      createContentUnit: (projectId, data) => {
        const id = generateId("content");
        const unit: ContentUnit = {
          id,
          projectId,
          title: data?.title ?? "Новый контент",
          format: data?.format ?? "gallery",
          formatConfirmed: data?.formatConfirmed ?? false,
          sourceUrl: data?.sourceUrl ?? "",
          status: "draft",
          createdAt: new Date().toISOString(),
          cards: data?.cards ?? [],
          postText: data?.postText ?? "",
          promptId: data?.promptId ?? "prompt-post",
          extractedTitle: data?.extractedTitle ?? "",
          extractedText: data?.extractedText ?? "",
          extractedImages: data?.extractedImages ?? [],
          additionalInstructions: data?.additionalInstructions ?? "",
          voiceModel: data?.voiceModel ?? "voice-female-1",
          speechSpeed: data?.speechSpeed ?? 1,
          narrationText: data?.narrationText ?? "",
          actionLog: data?.actionLog ?? [],
          buildOptions: data?.buildOptions ?? {
            addCopyright: true,
            applyBrandStyle: true,
            prepareArchive: true,
          },
          textTone: data?.textTone ?? "friendly",
          textLength: data?.textLength ?? "medium",
          textOptions: data?.textOptions ?? {
            includeHashtags: true,
            includeEmoji: false,
            addSourceLink: true,
          },
          generationPrompt: data?.generationPrompt ?? "",
        };
        set((s) => {
          const contentUnits = [...s.contentUnits, unit];
          const projects = s.projects.map((p) =>
            p.id === projectId
              ? { ...p, contentCount: p.contentCount + 1 }
              : p
          );
          return { contentUnits, projects };
        });
        return id;
      },

      updateContentUnit: (id, data) => {
        set((s) => ({
          contentUnits: s.contentUnits.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      getContentUnit: (id) => get().contentUnits.find((c) => c.id === id),

      addActionLog: (contentId, action, user) => {
        set((s) => ({
          contentUnits: s.contentUnits.map((c) =>
            c.id === contentId
              ? {
                  ...c,
                  actionLog: [
                    ...c.actionLog,
                    {
                      id: generateId("log"),
                      timestamp: new Date().toISOString(),
                      action,
                      user,
                    },
                  ],
                }
              : c
          ),
        }));
      },

      resetData: () =>
        set({ projects: SEED_PROJECTS, contentUnits: SEED_CONTENT }),
    }),
    { name: "smm-projects" }
  )
);
