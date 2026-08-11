import pairsJson from "./word_pairs.json";
import topicMapJson from "./word-topic-map.json";
import type { Difficulty, ImposterWordMode, WordSelection } from "../core/game-state";

export interface WordPair {
  id: string;
  real: string;
  related: string;
  hint: string;
  meaning: string;
  topic: string;
  difficulty: Exclude<Difficulty, "any">;
  audience: "general" | "adult";
  locale: "vi-VN";
  enabled: boolean;
}

interface WordPairInput extends Partial<Omit<WordPair, "real" | "related" | "hint" | "meaning">> {
  real: string;
  related: string;
  hint: string;
  meaning: string;
}

export interface WordSelectionOptions {
  selectedTopics?: readonly string[];
  difficulty?: Difficulty;
  excludedPairIds?: readonly string[];
}

export type WordBankState = "loading" | "ready" | "error";
export type RandomSource = () => number;

export class GameDataError extends Error {
  constructor(public readonly code: "WORD_BANK_EMPTY" | "WORD_BANK_INVALID" | "WORD_BANK_FILTER_EMPTY") {
    super(code);
    this.name = "GameDataError";
  }
}

function isPair(value: unknown): value is WordPairInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WordPairInput>;
  if (![item.real, item.related, item.hint, item.meaning].every((field) => typeof field === "string" && field.trim())) return false;
  if (item.id !== undefined && (typeof item.id !== "string" || !item.id.trim())) return false;
  if (item.difficulty !== undefined && !["easy", "medium", "hard"].includes(item.difficulty)) return false;
  return item.enabled === undefined || typeof item.enabled === "boolean";
}

function stablePairId(pair: WordPairInput): string {
  const source = `${pair.real}\u0000${pair.related}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `vi-${(hash >>> 0).toString(36)}`;
}

function inferDifficulty(pair: WordPairInput): WordPair["difficulty"] {
  const wordCount = pair.real.trim().split(/\s+/).length;
  if (wordCount >= 4 || pair.real.length >= 22) return "hard";
  if (wordCount === 1 && pair.real.length <= 10 && pair.hint.length <= 32) return "easy";
  return "medium";
}

function randomItem<T>(items: readonly T[], random: RandomSource): T {
  const index = Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length));
  const item = items[index];
  if (item === undefined) throw new GameDataError("WORD_BANK_EMPTY");
  return item;
}

export class WordRepository {
  readonly pairs: readonly WordPair[];
  readonly topics: Readonly<Record<string, string>>;
  readonly availableTopics: readonly string[];

  constructor(
    pairs: unknown = pairsJson,
    topics: Readonly<Record<string, string>> = topicMapJson,
  ) {
    if (!Array.isArray(pairs) || !pairs.every(isPair)) throw new GameDataError("WORD_BANK_INVALID");
    const ids = new Set<string>();
    this.pairs = pairs.map((pair) => {
      const id = pair.id ?? stablePairId(pair);
      if (ids.has(id)) throw new GameDataError("WORD_BANK_INVALID");
      ids.add(id);
      return {
        id,
        real: pair.real.trim(),
        related: pair.related.trim(),
        hint: pair.hint.trim(),
        meaning: pair.meaning.trim(),
        topic: pair.topic?.trim() || topics[pair.real] || "Khác",
        difficulty: pair.difficulty ?? inferDifficulty(pair),
        audience: pair.audience ?? "general",
        locale: pair.locale ?? "vi-VN",
        enabled: pair.enabled ?? true,
      };
    });
    this.topics = Object.fromEntries(this.pairs.map((pair) => [pair.real, pair.topic]));
    this.availableTopics = [...new Set(this.pairs.filter((pair) => pair.enabled).map((pair) => pair.topic))]
      .sort((a, b) => a.localeCompare(b, "vi"));
  }

  assertReady(): void {
    if (!this.pairs.some((pair) => pair.enabled)) throw new GameDataError("WORD_BANK_EMPTY");
  }

  select(
    mode: ImposterWordMode,
    random: RandomSource = Math.random,
    options: WordSelectionOptions = {},
  ): WordSelection {
    this.assertReady();
    const selectedTopics = new Set(options.selectedTopics ?? []);
    const base = this.pairs.filter((pair) => pair.enabled
      && (!selectedTopics.size || selectedTopics.has(pair.topic))
      && (!options.difficulty || options.difficulty === "any" || pair.difficulty === options.difficulty));
    if (!base.length) throw new GameDataError("WORD_BANK_FILTER_EMPTY");
    const excluded = new Set(options.excludedPairIds ?? []);
    const fresh = base.filter((pair) => !excluded.has(pair.id));
    const pool = fresh.length ? fresh : base;
    const topics = [...new Set(pool.map((pair) => pair.topic))];
    const selectedTopic = randomItem(topics, random);
    const pair = randomItem(pool.filter((candidate) => candidate.topic === selectedTopic), random);
    const common = {
      pairId: pair.id,
      topic: pair.topic,
      difficulty: pair.difficulty,
      civilianWord: pair.real,
      civilianMeaning: pair.meaning,
      mode,
    } as const;

    if (mode === "no-word") {
      return { ...common, imposterWord: null, imposterHint: pair.hint || null, source: "pair" };
    }
    if (mode === "similar") {
      return { ...common, imposterWord: pair.related, imposterHint: null, source: "pair" };
    }

    const crossTopic = this.pairs.filter((candidate) => candidate.enabled && candidate.topic !== pair.topic);
    const fallback = this.pairs.filter((candidate) => candidate.enabled && candidate.real !== pair.real && candidate.real !== pair.related);
    const candidates = crossTopic.length ? crossTopic : fallback;
    const imposterPair = randomItem(candidates, random);
    return {
      ...common,
      imposterWord: imposterPair.real,
      imposterHint: null,
      source: crossTopic.length ? "topic-map" : "fallback",
    };
  }
}

export async function loadBundledWordRepository(): Promise<WordRepository> {
  await Promise.resolve();
  const repository = new WordRepository();
  repository.assertReady();
  return repository;
}
