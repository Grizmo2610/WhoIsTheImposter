export const WORD_TOPICS = [
  "Ẩm thực & Đồ uống",
  "Đồ vật",
  "Thể thao",
  "Giải trí",
  "Nghệ thuật",
  "Địa điểm",
  "Người nổi tiếng/Thương hiệu",
  "Việt Nam",
] as const;

export type WordTopic = typeof WORD_TOPICS[number];

const WORD_TOPIC_SET = new Set<string>(WORD_TOPICS);

export function isWordTopic(value: unknown): value is WordTopic {
  return typeof value === "string" && WORD_TOPIC_SET.has(value);
}

export function normalizeSelectedTopics(values: readonly unknown[]): WordTopic[] {
  return WORD_TOPICS.filter((topic) => values.includes(topic));
}
