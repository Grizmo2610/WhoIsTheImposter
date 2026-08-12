import type { ImposterWordMode, WordSelection } from "../core/game-state";
import { sampleOne, sampleUnique, type RandomSource } from "./random";
import type { WordGroup } from "./word-database";
import { normalizeSelectedTopics, type WordTopic } from "./word-topics";

export type WordSelectionErrorCode = "NO_TOPICS_SELECTED" | "NO_ELIGIBLE_GROUPS" | "INSUFFICIENT_WORD_GROUPS";

export class WordSelectionError extends Error {
  constructor(public readonly code: WordSelectionErrorCode) {
    super(code);
    this.name = "WordSelectionError";
  }
}

export interface SelectGameWordsInput {
  database: readonly WordGroup[];
  selectedTopics: readonly WordTopic[];
  mode: ImposterWordMode;
  imposterCount: number;
  random?: RandomSource;
}

export function filterGroupsByTopics(database: readonly WordGroup[], selectedTopics: readonly WordTopic[]): WordGroup[] {
  const selected = new Set(normalizeSelectedTopics(selectedTopics));
  if (selected.size === 0) return [];
  return database.filter((group) => group.topics.some((topic) => selected.has(topic)));
}

function hasCommonSelectedTopic(groupA: WordGroup, groupB: WordGroup, selectedTopics: readonly WordTopic[]): boolean {
  const selected = new Set(selectedTopics);
  return groupA.topics.some((topic) => selected.has(topic) && groupB.topics.includes(topic));
}

function differentGroupPairs(groups: readonly WordGroup[], selectedTopics: readonly WordTopic[], imposterCount: number): Array<[WordGroup, WordGroup]> {
  const pairs: Array<[WordGroup, WordGroup]> = [];
  for (const groupA of groups) {
    if (groupA.related.length < 1) continue;
    for (const groupB of groups) {
      if (groupA.id === groupB.id || groupB.related.length < imposterCount) continue;
      if (hasCommonSelectedTopic(groupA, groupB, selectedTopics)) pairs.push([groupA, groupB]);
    }
  }
  return pairs;
}

export function selectionAvailability(input: Omit<SelectGameWordsInput, "random">): WordSelectionErrorCode | null {
  const selectedTopics = normalizeSelectedTopics(input.selectedTopics);
  if (selectedTopics.length === 0) return "NO_TOPICS_SELECTED";
  const eligible = filterGroupsByTopics(input.database, selectedTopics);
  if (eligible.length === 0) return "NO_ELIGIBLE_GROUPS";
  if (input.mode === "similar" && !eligible.some((group) => group.related.length >= input.imposterCount + 1)) {
    return "INSUFFICIENT_WORD_GROUPS";
  }
  if (input.mode === "different-group" && differentGroupPairs(eligible, selectedTopics, input.imposterCount).length === 0) {
    return "INSUFFICIENT_WORD_GROUPS";
  }
  return null;
}

export function selectGameWords(input: SelectGameWordsInput): WordSelection {
  const random = input.random ?? Math.random;
  const selectedTopics = normalizeSelectedTopics(input.selectedTopics);
  const availability = selectionAvailability({ ...input, selectedTopics });
  if (availability) throw new WordSelectionError(availability);
  const eligible = filterGroupsByTopics(input.database, selectedTopics);

  if (input.mode === "similar") {
    const group = sampleOne(eligible.filter((candidate) => candidate.related.length >= input.imposterCount + 1), random);
    const sampled = sampleUnique(group.related, input.imposterCount + 1, random);
    const civilianWord = sampleOne(sampled, random);
    return {
      civilianWord,
      imposterContents: sampled.filter((word) => word !== civilianWord),
      hint: null,
      mode: input.mode,
      sourceGroupIds: [group.id],
    };
  }

  if (input.mode === "no-word") {
    const group = sampleOne(eligible, random);
    return {
      civilianWord: sampleOne(group.related, random),
      imposterContents: Array.from({ length: input.imposterCount }, () => group.hint),
      hint: group.hint,
      mode: input.mode,
      sourceGroupIds: [group.id],
    };
  }

  const [groupA, groupB] = sampleOne(differentGroupPairs(eligible, selectedTopics, input.imposterCount), random);
  return {
    civilianWord: sampleOne(groupA.related, random),
    imposterContents: sampleUnique(groupB.related, input.imposterCount, random),
    hint: null,
    mode: input.mode,
    sourceGroupIds: [groupA.id, groupB.id],
  };
}
