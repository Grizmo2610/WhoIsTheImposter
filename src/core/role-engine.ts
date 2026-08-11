import type { Player, Role, WordSelection } from "./game-state";
import type { RandomSource } from "../data/word-repository";

export function chooseImposterIndexes(playerCount: number, imposterCount: number, random: RandomSource): Set<number> {
  const indexes = Array.from({ length: playerCount }, (_, index) => index);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j]!, indexes[i]!];
  }
  return new Set(indexes.slice(0, imposterCount));
}

export function assignRoles(
  players: Player[],
  imposterIndexes: ReadonlySet<number>,
  words: WordSelection,
): Player[] {
  return players.map((player, index) => {
    const role: Role = imposterIndexes.has(index) ? "imposter" : "civilian";
    return {
      ...player,
      eliminated: false,
      secret: role === "civilian"
        ? { role, word: words.civilianWord, hint: null, meaning: words.civilianMeaning }
        : { role, word: words.imposterWord, hint: words.imposterHint, meaning: null },
    };
  });
}
