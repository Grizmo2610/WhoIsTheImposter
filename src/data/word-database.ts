import rawDatabase from "./vocabulary_database.json";
import { isWordTopic, type WordTopic } from "./word-topics";

export interface WordGroup {
  id: number;
  topics: WordTopic[];
  hint: string;
  related: string[];
}

export type WordBankState = "loading" | "ready" | "error";

export interface DatabaseValidationIssue {
  id: number | string;
  reason: string;
}

export class WordDatabaseError extends Error {
  constructor(public readonly code: "WORD_DATABASE_INVALID" | "WORD_DATABASE_EMPTY") {
    super(code);
    this.name = "WordDatabaseError";
  }
}

function recordId(value: unknown, index: number): number | string {
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return id;
  }
  return `index:${index}`;
}

function validateRecord(value: unknown, index: number, knownIds: Set<number>): { group?: WordGroup; issues: DatabaseValidationIssue[] } {
  const id = recordId(value, index);
  const issues: DatabaseValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { issues: [{ id, reason: "record phải là object" }] };
  }
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.id)) issues.push({ id, reason: "id phải là số nguyên" });
  else if (knownIds.has(record.id as number)) issues.push({ id, reason: "id bị trùng" });
  else knownIds.add(record.id as number);

  if (!Array.isArray(record.topics) || record.topics.length < 1 || record.topics.length > 2) {
    issues.push({ id, reason: "topics phải chứa 1 hoặc 2 chủ đề" });
  } else {
    if (!record.topics.every(isWordTopic)) issues.push({ id, reason: "topics chứa chủ đề không hợp lệ" });
    if (new Set(record.topics).size !== record.topics.length) issues.push({ id, reason: "topics bị trùng" });
  }

  if (typeof record.hint !== "string" || record.hint.trim().length === 0) {
    issues.push({ id, reason: "hint không được để trống" });
  }

  if (!Array.isArray(record.related) || record.related.length === 0) {
    issues.push({ id, reason: "related phải là array không rỗng" });
  } else {
    const normalizedRelated = record.related.filter((word): word is string => typeof word === "string").map((word) => word.trim());
    if (normalizedRelated.length !== record.related.length || normalizedRelated.some((word) => word.length === 0)) {
      issues.push({ id, reason: "related chỉ được chứa string không rỗng" });
    }
    if (new Set(normalizedRelated).size !== normalizedRelated.length) issues.push({ id, reason: "related bị trùng" });
  }

  if (issues.length > 0) return { issues };
  return {
    group: {
      id: record.id as number,
      topics: [...record.topics as WordTopic[]],
      hint: (record.hint as string).trim(),
      related: (record.related as string[]).map((word) => word.trim()),
    },
    issues,
  };
}

export function validateWordDatabase(value: unknown): { groups: WordGroup[]; issues: DatabaseValidationIssue[] } {
  if (!Array.isArray(value)) throw new WordDatabaseError("WORD_DATABASE_INVALID");
  const groups: WordGroup[] = [];
  const issues: DatabaseValidationIssue[] = [];
  const knownIds = new Set<number>();
  value.forEach((record, index) => {
    const result = validateRecord(record, index, knownIds);
    if (result.group) groups.push(result.group);
    issues.push(...result.issues);
  });
  return { groups, issues };
}

export async function loadBundledWordDatabase(): Promise<readonly WordGroup[]> {
  await Promise.resolve();
  const { groups, issues } = validateWordDatabase(rawDatabase);
  issues.forEach((issue) => console.error(`[word-database] record ${issue.id}: ${issue.reason}`));
  if (groups.length === 0) throw new WordDatabaseError("WORD_DATABASE_EMPTY");
  return groups;
}
