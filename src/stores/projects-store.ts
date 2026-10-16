"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentUnit, Project, WorkflowStage } from "@/types";
import { SEED_CONTENT, SEED_PROJECTS } from "@/data/seed";
import { mergeSeedContentUnits, mergeSeedProjects } from "@/lib/seed-sync";
import { generateId } from "@/lib/simulate-generation";
import {
  captureStageVersionState,
  toggleStageVersionState,
} from "@/lib/stage-versions";

interface ProjectsState {
  projects: Project[];
  contentUnits: ContentUnit[];
  createProject: (data: { name: string; description: string }) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  getProject: (id: string) => Project | undefined;
  getProjectsForUser: (userId: string, isAdmin: boolean, projectIds?: string[]) => Project[];
  getContentForProject: (projectId: string) => ContentUnit[];
  createContentUnit: (projectId: string, data?: Partial<ContentUnit>) => string;
  updateContentUnit: (id: string, data: Partial<ContentUnit>) => void;
  getContentUnit: (id: string) => ContentUnit | undefined;
  addActionLog: (
    contentId: string,
    action: string,
    user: string
  ) => void;
  captureStageVersion: (id: string, stage: WorkflowStage) => void;
  toggleStageVersion: (id: string, stage: WorkflowStage) => void;
  resetData: () => void;
}

function syncProjectsState(
  state: Pick<ProjectsState, "projects" | "contentUnits">
) {
  return {
    projects: mergeSeedProjects(state.projects),
    contentUnits: mergeSeedContentUnits(state.contentUnits),
  };
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

      getProjectsForUser: (userId, isAdmin, projectIds = []) => {
        if (isAdmin) return get().projects;
        if (projectIds.length > 0) {
          return get().projects.filter((p) => projectIds.includes(p.id));
        }
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
          sourceType: data?.sourceType ?? "url",
          sourceUrl: data?.sourceUrl ?? "",
          sourceFileName: data?.sourceFileName ?? "",
          sourceUseLink: data?.sourceUseLink ?? data?.sourceType !== "file",
          sourceUseFile: data?.sourceUseFile ?? data?.sourceType === "file",
          sourceNotesEnabled: data?.sourceNotesEnabled ?? false,
          sourceNotes: data?.sourceNotes ?? "",
          sourceLinks: data?.sourceLinks ?? (data?.sourceUrl ? [data.sourceUrl] : [""]),
          sourceFiles: data?.sourceFiles ?? [],
          sourceExtracts: data?.sourceExtracts ?? {},
          cardsCount: data?.cardsCount ?? 3,
          videoTransition: data?.videoTransition ?? "none",
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
          memeAssets: data?.memeAssets ?? [],
          memeMusic: data?.memeMusic ?? null,
          stageVersions: data?.stageVersions ?? {},
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

      captureStageVersion: (id, stage) => {
        const unit = get().contentUnits.find((item) => item.id === id);
        if (!unit) return;
        set((s) => ({
          contentUnits: s.contentUnits.map((item) =>
            item.id === id
              ? { ...item, stageVersions: captureStageVersionState(item, stage) }
              : item
          ),
        }));
      },

      toggleStageVersion: (id, stage) => {
        const unit = get().contentUnits.find((item) => item.id === id);
        if (!unit) return;
        const patch = toggleStageVersionState(unit, stage);
        if (!patch) return;
        set((s) => ({
          contentUnits: s.contentUnits.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          ),
        }));
      },

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
    {
      name: "smm-projects",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Pick<
          ProjectsState,
          "projects" | "contentUnits"
        >;
        return syncProjectsState(state);
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const synced = syncProjectsState(state);
        state.projects = synced.projects;
        state.contentUnits = synced.contentUnits;
      },
    }
  )
);
