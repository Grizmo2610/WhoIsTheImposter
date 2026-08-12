export type RandomSource = () => number;

export class SamplingError extends Error {
  constructor(public readonly code: "EMPTY_SAMPLE" | "INVALID_SAMPLE_COUNT") {
    super(code);
    this.name = "SamplingError";
  }
}

function randomIndex(length: number, random: RandomSource): number {
  const value = random();
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(value, 0.9999999999999999)) : 0;
  return Math.floor(normalized * length);
}

export function sampleOne<T>(items: readonly T[], random: RandomSource = Math.random): T {
  if (items.length === 0) throw new SamplingError("EMPTY_SAMPLE");
  return items[randomIndex(items.length, random)]!;
}

export function sampleUnique<T>(items: readonly T[], count: number, random: RandomSource = Math.random): T[] {
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new SamplingError("INVALID_SAMPLE_COUNT");
  }
  const pool = [...items];
  for (let index = 0; index < count; index += 1) {
    const selected = index + randomIndex(pool.length - index, random);
    [pool[index], pool[selected]] = [pool[selected]!, pool[index]!];
  }
  return pool.slice(0, count);
}
