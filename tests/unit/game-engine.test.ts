import { describe, expect, it } from "vitest";
import { GameEngine } from "../../src/core/game-engine";
import { DEFAULT_CONFIG } from "../../src/core/game-state";
import { WordRepository } from "../../src/data/word-repository";

const pairs = [
  { real: "Phở", related: "Bún bò", hint: "Món nước", meaning: "Món ăn Việt Nam" },
  { real: "Bóng đá", related: "Bóng rổ", hint: "Môn có bóng", meaning: "Một môn thể thao" },
  { real: "Mèo", related: "Chó", hint: "Thú cưng", meaning: "Một loài vật" },
];
const topics = { "Phở": "Ẩm thực", "Bóng đá": "Thể thao", "Mèo": "Động vật" };
const names = ["An", "Bình", "Chi", "Dũng", "Hà"];

function engine(config = {}, random = (): number => 0): GameEngine {
  let id = 0;
  return new GameEngine(new WordRepository(pairs, topics), names, config, {
    random,
    now: () => 100,
    idFactory: () => `id-${++id}`,
  });
}

describe("GameEngine", () => {
  it("assigns the requested number of imposters", () => {
    const state = engine({ imposterCount: 2 }).start();
    expect(state.players.filter((player) => player.secret?.role === "imposter")).toHaveLength(2);
    expect(state.phase).toBe("reveal");
  });

  it("caps imposters below the number of civilians", () => {
    const state = engine({ imposterCount: 99 }).start();
    expect(state.config.imposterCount).toBe(2);
  });

  it("moves through reveal, pass, discussion and vote", () => {
    const game = engine();
    game.start();
    for (let index = 0; index < names.length; index += 1) {
      expect(game.getCurrentPlayer()?.name).toBe(names[index]);
      expect(game.markRoleSeen().phase).toBe("pass");
      const next = game.continueAfterPass();
      expect(next.phase).toBe(index === names.length - 1 ? "discussion" : "reveal");
    }
    expect(game.beginVote().phase).toBe("vote");
  });

  it("increments the round after a civilian is eliminated", () => {
    const game = engine();
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.beginVote();
    const civilian = game.getGameState().players.find((player) => player.secret?.role === "civilian")!;
    game.selectVote(civilian.id);
    const eliminated = game.confirmVote();
    expect(eliminated.phase).toBe("elimination");
    expect(eliminated.round).toBe(2);
    expect(eliminated.gameOver).toBe(false);
    expect(game.continueFromElimination().phase).toBe("discussion");
  });

  it("ends when every imposter is eliminated", () => {
    const game = engine({ imposterCount: 1 });
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.beginVote();
    const imposter = game.getGameState().players.find((player) => player.secret?.role === "imposter")!;
    game.selectVote(imposter.id);
    const state = game.confirmVote();
    expect(state.winner).toBe("civilian");
    expect(state.gameOver).toBe(true);
    expect(game.continueFromElimination().phase).toBe("result");
  });

  it("restores the complete elimination state and correct CTA transition", () => {
    const game = engine();
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.beginVote();
    const civilian = game.getGameState().players.find((player) => player.secret?.role === "civilian")!;
    game.selectVote(civilian.id);
    const snapshot = game.confirmVote();
    const restored = GameEngine.restore(new WordRepository(pairs, topics), snapshot, { idFactory: () => "unused" });
    expect(restored.getGameState().lastElimination).toEqual(snapshot.lastElimination);
    expect(restored.continueFromElimination().phase).toBe("discussion");
  });

  it("supports a single-round game", () => {
    const game = engine({ ...DEFAULT_CONFIG, multiRound: false });
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.beginVote();
    const civilian = game.getGameState().players.find((player) => player.secret?.role === "civilian")!;
    game.selectVote(civilian.id);
    expect(game.confirmVote().winner).toBe("imposter");
  });
});
