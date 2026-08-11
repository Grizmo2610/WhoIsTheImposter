import pairsJson from "./word_pairs.json";
import topicMapJson from "./word-topic-map.json";
import type { ImposterWordMode, WordSelection } from "../core/game-state";

export interface WordPair {
  real: string;
  related: string;
  hint: string;
  meaning: string;
}

export type WordBankState = "loading" | "ready" | "error";
export type RandomSource = () => number;

export class GameDataError extends Error {
  constructor(public readonly code: "WORD_BANK_EMPTY" | "WORD_BANK_INVALID") {
    super(code);
    this.name = "GameDataError";
  }
}

function isPair(value: unknown): value is WordPair {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WordPair>;
  return [item.real, item.related, item.hint, item.meaning].every((field) => typeof field === "string");
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

  constructor(
    pairs: unknown = pairsJson,
    topics: Readonly<Record<string, string>> = topicMapJson,
  ) {
    if (!Array.isArray(pairs)) throw new GameDataError("WORD_BANK_INVALID");
    if (!pairs.every(isPair)) throw new GameDataError("WORD_BANK_INVALID");
    this.pairs = pairs;
    this.topics = topics;
  }

  assertReady(): void {
    if (this.pairs.length === 0) throw new GameDataError("WORD_BANK_EMPTY");
  }

  select(mode: ImposterWordMode, random: RandomSource = Math.random): WordSelection {
    this.assertReady();
    const pair = randomItem(this.pairs, random);
    if (mode === "no-word") {
      return {
        civilianWord: pair.real,
        civilianMeaning: pair.meaning,
        imposterWord: null,
        imposterHint: pair.hint || null,
        mode,
        source: "pair",
      };
    }
    if (mode === "similar") {
      return {
        civilianWord: pair.real,
        civilianMeaning: pair.meaning,
        imposterWord: pair.related,
        imposterHint: null,
        mode,
        source: "pair",
      };
    }

    const realTopic = this.topics[pair.real];
    const crossTopic = realTopic
      ? this.pairs.filter((candidate) => this.topics[candidate.real] && this.topics[candidate.real] !== realTopic)
      : [];
    const fallback = this.pairs.filter((candidate) => candidate.real !== pair.real && candidate.real !== pair.related);
    const candidates = crossTopic.length ? crossTopic : fallback;
    const imposterPair = randomItem(candidates, random);
    return {
      civilianWord: pair.real,
      civilianMeaning: pair.meaning,
      imposterWord: imposterPair.real,
      imposterHint: null,
      mode,
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
