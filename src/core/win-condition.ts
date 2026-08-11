import type { Player, Winner } from "./game-state";

export function determineWinner(players: readonly Player[], multiRound: boolean, eliminatedWasImposter: boolean): Winner {
  if (!multiRound) return eliminatedWasImposter ? "civilian" : "imposter";
  const alive = players.filter((player) => !player.eliminated);
  const imposters = alive.filter((player) => player.secret?.role === "imposter").length;
  const civilians = alive.filter((player) => player.secret?.role === "civilian").length;
  if (imposters === 0) return "civilian";
  if (imposters >= civilians) return "imposter";
  return null;
}
