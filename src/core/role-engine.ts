import type { Player, Role, WordSelection } from "./game-state";
import type { RandomSource } from "../data/random";

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
  let imposterContentIndex = 0;
  return players.map((player, index) => {
    const role: Role = imposterIndexes.has(index) ? "imposter" : "civilian";
    const imposterContent = role === "imposter" ? words.imposterContents[imposterContentIndex++] : null;
    return {
      ...player,
      eliminated: false,
      secret: role === "civilian"
        ? { role, word: words.civilianWord, hint: null }
        : words.mode === "no-word"
          ? { role, word: null, hint: imposterContent }
          : { role, word: imposterContent, hint: null },
    };
  });
}
