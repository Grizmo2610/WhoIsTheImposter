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

  it("ends early without changing roles, eliminations or winner", () => {
    const game = engine();
    const started = game.start();
    const roles = started.players.map((player) => player.secret);
    const ended = game.endGameEarly();
    expect(ended.phase).toBe("result");
    expect(ended.gameOver).toBe(true);
    expect(ended.winner).toBeNull();
    expect(ended.endedEarly).toBe(true);
    expect(ended.players.map((player) => player.secret)).toEqual(roles);
    expect(ended.players.some((player) => player.eliminated)).toBe(false);
    expect(ended.eliminationHistory).toEqual([]);
    expect(() => game.endGameEarly()).toThrow("GAME_ALREADY_ENDED");
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

  it("keeps a moderator outside role assignment and requires a private handoff", () => {
    const moderated = new GameEngine(new WordRepository(pairs, topics), names, { moderatedDiscussionEnabled: true }, {
      random: () => 0,
      now: () => 100,
      idFactory: (() => { let id = 0; return () => `mod-${++id}`; })(),
      moderatorName: "Minh",
    });
    moderated.start();
    for (let index = 0; index < names.length; index += 1) { moderated.markRoleSeen(); moderated.continueAfterPass(); }
    const handoff = moderated.getGameState();
    expect(handoff.moderator).toEqual({ enabled: true, name: "Minh", handoffConfirmed: false });
    expect(handoff.players).toHaveLength(names.length);
    expect(handoff.discussion.stage).toBe("moderator-handoff");
    expect(moderated.confirmModeratorHandoff().discussion.stage).toBe("clue-round");
  });

  it("runs clue turns before open discussion and keeps the speaking queue unique", () => {
    const game = new GameEngine(new WordRepository(pairs, topics), names, { moderatedDiscussionEnabled: true, timerEnabled: true }, {
      random: () => 0,
      now: () => 100,
      idFactory: (() => { let id = 0; return () => `queue-${++id}`; })(),
      moderatorName: "Minh",
    });
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.confirmModeratorHandoff();
    for (let index = 0; index < names.length; index += 1) game.advanceClueTurn();
    const open = game.getGameState();
    expect(open.discussion.stage).toBe("open-floor");
    expect(open.discussion.timer.status).toBe("running");
    const playerId = open.players[0]!.id;
    game.toggleSpeakingQueue(playerId);
    game.toggleSpeakingQueue(playerId);
    expect(game.getGameState().discussion.speakingQueue).toEqual([]);
  });

  it("records consensus without manufacturing individual votes", () => {
    const game = engine();
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    game.beginVote();
    const target = game.getGameState().players.find((player) => player.secret?.role === "civilian")!;
    game.selectVote(target.id);
    const state = game.confirmVote();
    expect(state.lastElimination?.voteCount).toBeNull();
    expect(state.eliminationHistory[0]?.selectionMethod).toBe("consensus");
  });

  it("pauses the discussion timer for cooldown and resumes the remaining time", () => {
    let now = 1_000;
    let id = 0;
    const game = new GameEngine(new WordRepository(pairs, topics), names, {
      timerEnabled: true,
      discussionSeconds: 120,
    }, { random: () => 0, now: () => now, idFactory: () => `timer-${++id}` });
    game.start();
    for (let index = 0; index < names.length; index += 1) { game.markRoleSeen(); game.continueAfterPass(); }
    now = 31_000;
    const cooled = game.startCooldown();
    expect(cooled.discussion.timer.status).toBe("paused");
    expect(cooled.discussion.timer.pausedRemainingSeconds).toBe(90);
    now = 41_000;
    const resumed = game.tickDiscussion();
    expect(resumed.discussion.cooldownEndsAt).toBeNull();
    expect(resumed.discussion.timer.status).toBe("running");
    expect(resumed.discussion.timer.endsAt).toBe(131_000);
  });
});
