export function uniquePromptIds(ids: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function normalizePromptIds(source?: {
  promptId?: string;
  promptIds?: string[];
}): string[] {
  if (source?.promptIds && source.promptIds.length > 0) {
    return uniquePromptIds(source.promptIds);
  }
  return uniquePromptIds([source?.promptId]);
}

export function promptSelectionPatch(ids: string[]): {
  promptId: string;
  promptIds: string[];
} {
  const promptIds = uniquePromptIds(ids);
  return { promptIds, promptId: promptIds[0] ?? "" };
}
