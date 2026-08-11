export interface VoteResolution {
  targetId: string;
  voteCount: number;
  tied: boolean;
}

export function resolveVotes(votes: Readonly<Record<string, string>>): VoteResolution | null {
  const totals = new Map<string, number>();
  Object.values(votes).forEach((targetId) => totals.set(targetId, (totals.get(targetId) ?? 0) + 1));
  if (!totals.size) return null;
  const sorted = [...totals.entries()].sort(([aId, aVotes], [bId, bVotes]) => bVotes - aVotes || aId.localeCompare(bId));
  const [targetId, voteCount] = sorted[0]!;
  return { targetId, voteCount, tied: sorted[1]?.[1] === voteCount };
}
