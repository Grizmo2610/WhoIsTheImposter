export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_PLAYER_NAME_LENGTH = 20;

export class PlayerValidationError extends Error {
  constructor(public readonly code: "EMPTY_NAME" | "DUPLICATE_NAME" | "INVALID_COUNT") {
    super(code);
    this.name = "PlayerValidationError";
  }
}

export function normalizePlayerName(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_PLAYER_NAME_LENGTH);
}

export function validatePlayerNames(values: string[]): string[] {
  if (values.length < MIN_PLAYERS || values.length > MAX_PLAYERS) {
    throw new PlayerValidationError("INVALID_COUNT");
  }
  const names = values.map(normalizePlayerName);
  if (names.some((name) => !name)) throw new PlayerValidationError("EMPTY_NAME");
  const unique = new Set(names.map((name) => name.toLocaleLowerCase("vi")));
  if (unique.size !== names.length) throw new PlayerValidationError("DUPLICATE_NAME");
  return names;
}

export function safeImposterCount(playerCount: number, requested: number): number {
  const max = Math.max(1, Math.ceil(playerCount / 2) - 1);
  return Math.min(max, Math.max(1, Math.trunc(requested)));
}
