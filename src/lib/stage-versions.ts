import type {
  ContentUnit,
  StageContentSnapshot,
  StageVersionRecord,
  StageVersionView,
  WorkflowStage,
} from "@/types";

export type { StageContentSnapshot, StageVersionRecord, StageVersionView };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function takeStageSnapshot(content: ContentUnit): StageContentSnapshot {
  return {
    title: content.title,
    postText: content.postText,
    cards: cloneJson(content.cards),
    extractedTitle: content.extractedTitle,
    extractedText: content.extractedText,
    extractedImages: [...content.extractedImages],
    additionalInstructions: content.additionalInstructions,
    generationPrompt: content.generationPrompt,
    narrationText: content.narrationText,
    voiceModel: content.voiceModel,
    speechSpeed: content.speechSpeed,
    textTone: content.textTone,
    textLength: content.textLength,
    textOptions: { ...content.textOptions },
    sourceUrl: content.sourceUrl,
    sourceLinks: content.sourceLinks ? [...content.sourceLinks] : undefined,
    memeAssets: content.memeAssets ? cloneJson(content.memeAssets) : undefined,
    memeMusic: content.memeMusic ? cloneJson(content.memeMusic) : content.memeMusic,
  };
}

export function applyStageSnapshot(
  snapshot: StageContentSnapshot
): Partial<ContentUnit> {
  return cloneJson(snapshot);
}

export function hasPreviousStageVersion(
  content: ContentUnit,
  stage: WorkflowStage
): boolean {
  return Boolean(content.stageVersions?.[stage]?.previous);
}

export function isViewingPreviousVersion(
  content: ContentUnit,
  stage: WorkflowStage
): boolean {
  return content.stageVersions?.[stage]?.viewing === "previous";
}

export function captureStageVersionState(
  content: ContentUnit,
  stage: WorkflowStage
): ContentUnit["stageVersions"] {
  const live = takeStageSnapshot(content);
  const existing = content.stageVersions?.[stage];
  const previous = existing?.current ?? existing?.previous ?? live;
  return {
    ...content.stageVersions,
    [stage]: {
      previous,
      current: live,
      viewing: "current",
    },
  };
}

export function toggleStageVersionState(
  content: ContentUnit,
  stage: WorkflowStage
): Partial<ContentUnit> | null {
  const record = content.stageVersions?.[stage];
  if (!record?.previous) return null;

  const live = takeStageSnapshot(content);
  const viewing = record.viewing ?? "current";
  const nextView: StageVersionView = viewing === "current" ? "previous" : "current";
  const saved: StageVersionRecord = {
    previous: viewing === "previous" ? live : record.previous,
    current: viewing === "current" ? live : record.current,
    viewing: nextView,
  };
  const apply = nextView === "previous" ? saved.previous : saved.current;

  return {
    ...applyStageSnapshot(apply),
    stageVersions: {
      ...content.stageVersions,
      [stage]: saved,
    },
  };
}
