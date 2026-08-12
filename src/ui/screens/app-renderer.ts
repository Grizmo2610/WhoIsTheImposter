import type { GameConfig, GameState, ImposterWordMode, PlayerSecret } from "../../core/game-state";
import type { WordBankState } from "../../data/word-database";
import { WORD_TOPICS, type WordTopic } from "../../data/word-topics";
import { discussionDurationSeconds, formatCountdown } from "../../core/discussion-timer";
import type { PrivacyManager } from "../../security/privacy-manager";
import {
  DangerButton,
  el,
  GameHeader,
  IconButton,
  PlayerAvatar,
  PlayerCard,
  PrimaryButton,
  screen,
  SecondaryButton,
  StatusBadge,
  Stepper,
  Toggle,
} from "../components/elements";

export type AppView = "home" | "players" | "settings" | "game";

export interface SetupDraft {
  names: string[];
  config: GameConfig;
  error: string | null;
}

export function visibleSecretCopy(secret: PlayerSecret): { caption: string; value: string } {
  return {
    caption: secret.word ? "TỪ CỦA BẠN" : "GỢI Ý CỦA BẠN",
    value: secret.word ?? secret.hint ?? "KHÔNG CÓ TỪ",
  };
}

export function revealedSecretCardArt(secret: PlayerSecret, mode: ImposterWordMode): string {
  return mode === "no-word" && secret.role === "imposter"
    ? "./assets/cards/card-imposter-front.png"
    : "./assets/cards/secret-card-front.png";
}

export interface RenderContext {
  view: AppView;
  wordBankState: WordBankState;
  wordBankError: string | null;
  wordSelectionError: string | null;
  resumable: GameState | null;
  game: GameState | null;
  draft: SetupDraft;
  privacy: PrivacyManager;
  actions: {
    goHome(): void;
    goPlayers(): void;
    goSettings(): void;
    showAbout(): void;
    resume(): void;
    discardResume(): void;
    retryWords(): void;
    updateName(index: number, value: string): void;
    addPlayer(): void;
    removePlayer(index: number): void;
    updateConfig(patch: Partial<GameConfig>): void;
    showAdvancedSettings(): void;
    startGame(): void;
    revealSecret(): void;
    hideSecret(): void;
    markRoleSeen(): void;
    beginVote(): void;
    selectVote(playerId: string): void;
    requestVoteConfirmation(): void;
    continueElimination(): void;
    playAgain(): void;
    timerExpired(): void;
  };
}

function titleBlock(kicker: string, title: string, body?: string): HTMLElement {
  return el("div", { className: "title-block" },
    el("p", { className: "eyebrow", text: kicker }),
    el("h1", { text: title }),
    body ? el("p", { className: "lede", text: body }) : null,
  );
}

function progress(state: GameState): HTMLElement {
  const alive = state.players.filter((player) => !player.eliminated).length;
  return el("p", { className: "game-progress", text: `VÒNG ${state.round} · ${alive} NGƯỜI CÒN LẠI` });
}

function home(ctx: RenderContext): HTMLElement {
  const ready = ctx.wordBankState === "ready";
  const actions = el("div", { className: "home-actions" },
    ctx.resumable ? null : PrimaryButton(ready ? "CHƠI NGAY" : ctx.wordBankState === "loading" ? "ĐANG CHUẨN BỊ..." : "KHO TỪ BỊ LỖI", ctx.actions.goPlayers, !ready),
    SecondaryButton("LUẬT CHƠI", ctx.actions.showAbout),
  );
  const resume = ctx.resumable ? el("section", { className: "resume-card clue-card", attrs: { "aria-label": "Ván chơi chưa hoàn thành" } },
    el("div", {},
      el("p", { className: "eyebrow", text: "VÁN ĐANG DỞ" }),
      el("h2", { text: `Vòng ${ctx.resumable.round}` }),
      el("p", { className: "muted", text: `${ctx.resumable.players.filter((p) => !p.eliminated).length} người còn lại · ${phaseLabel(ctx.resumable.phase)}` }),
    ),
    el("div", { className: "resume-card__actions" },
      PrimaryButton("TIẾP TỤC", ctx.actions.resume),
      DangerButton("BỎ VÁN", ctx.actions.discardResume),
    ),
  ) : null;
  const error = ctx.wordBankState === "error" ? el("section", { className: "error-card clue-card", attrs: { role: "alert" } },
    el("strong", { text: "Không thể chuẩn bị kho từ" }),
    el("p", { text: ctx.wordBankError ?? "Dữ liệu không hợp lệ." }),
    SecondaryButton("THỬ LẠI", ctx.actions.retryWords),
  ) : null;
  const content = screen(
    el("section", { className: `hero${ctx.resumable ? " hero--resumable" : ""}` },
      el("img", {
        className: "home-hero-logo",
        attrs: {
          src: "./assets/branding/home-hero-logo.png",
          alt: "AI LÀ KẺ GIẢ DANH",
          width: "1536",
          height: "1024",
          decoding: "async",
          fetchpriority: "high",
        },
      }),
      el("p", { className: "hero-tagline", text: "Cùng một từ. Một người đang giả vờ." }),
      resume,
      error,
      actions,
      StatusBadge(ctx.wordBankState),
    ),
  );
  content.classList.add("screen--home");
  return content;
}

function playerSetup(ctx: RenderContext): HTMLElement {
  const list = el("div", { className: "player-input-list" });
  ctx.draft.names.forEach((name, index) => {
    const accent = ["#22D3EE", "#FF6B6B", "#FACC15", "#34D399", "#A78BFA", "#F472B6", "#FB923C", "#60A5FA"][index % 8]!;
    const input = el("input", {
      className: "player-name-input",
      attrs: {
        "aria-label": `Tên người chơi ${index + 1}`,
        maxlength: "20",
        autocomplete: "off",
        autocapitalize: "words",
        enterkeyhint: index === ctx.draft.names.length - 1 ? "done" : "next",
      },
    });
    input.value = name;
    input.addEventListener("input", () => ctx.actions.updateName(index, input.value));
    const avatar = el("span", { className: "player-avatar player-avatar--input", text: String(index + 1), attrs: { "aria-hidden": "true" } });
    avatar.style.setProperty("--player-accent", accent);
    list.append(el("div", { className: "player-input-card clue-card" }, avatar, input,
      IconButton(`Xóa người chơi ${index + 1}`, "x", () => ctx.actions.removePlayer(index))));
  });
  return screen(
    GameHeader("THIẾT LẬP · 1/2", ctx.actions.goHome),
    el("div", { className: "setup-layout" },
      el("section", {},
        titleBlock("NGƯỜI CHƠI", `Ai đang tham gia?`, "Tối thiểu 3, tối đa 12 người. Tên sẽ chỉ được lưu trên thiết bị này."),
        el("div", { className: "count-pill", text: `${ctx.draft.names.length} NGƯỜI` }),
        list,
        ctx.draft.names.length < 12 ? SecondaryButton("+ THÊM NGƯỜI CHƠI", ctx.actions.addPlayer) : null,
        ctx.draft.error ? el("p", { className: "form-error", text: ctx.draft.error, attrs: { role: "alert" } }) : null,
      ),
      el("aside", { className: "sticky-action" }, PrimaryButton("TIẾP TỤC", ctx.actions.goSettings)),
    ),
  );
}

function modeButton(mode: ImposterWordMode, active: ImposterWordMode, title: string, body: string, onSelect: () => void): HTMLButtonElement {
  const button = el("button", {
    className: `mode-card clue-card${mode === active ? " is-selected" : ""}`,
    attrs: { "aria-pressed": String(mode === active) },
    onClick: onSelect,
  }, el("strong", { text: title }), el("small", { text: body }));
  button.type = "button";
  return button;
}

function topicSelector(config: GameConfig, updateConfig: (patch: Partial<GameConfig>) => void): HTMLElement {
  const selected = new Set(config.selectedTopics);
  const allSelected = selected.size === WORD_TOPICS.length;
  const toggleTopic = (topic: WordTopic): void => {
    const next = new Set(config.selectedTopics);
    if (next.has(topic)) next.delete(topic); else next.add(topic);
    updateConfig({ selectedTopics: WORD_TOPICS.filter((item) => next.has(item)) });
  };
  const chip = (label: string, active: boolean, onClick: () => void): HTMLButtonElement => {
    const button = el("button", {
      className: `topic-chip${active ? " is-selected" : ""}`,
      attrs: { "aria-pressed": String(active) },
      onClick,
    }, label);
    button.type = "button";
    return button;
  };
  return el("section", { className: "topic-selector", attrs: { "aria-labelledby": "topic-selector-title" } },
    el("p", { className: "eyebrow", text: "CHỌN CHỦ ĐỀ", attrs: { id: "topic-selector-title" } }),
    el("div", { className: "topic-chip-list" },
      chip("Tất cả", allSelected, () => updateConfig({ selectedTopics: [...WORD_TOPICS] })),
      ...WORD_TOPICS.map((topic) => chip(topic, selected.has(topic), () => toggleTopic(topic))),
    ),
  );
}

function settings(ctx: RenderContext): HTMLElement {
  const config = ctx.draft.config;
  const maxImposters = Math.max(1, Math.ceil(ctx.draft.names.length / 2) - 1);
  const startButton = PrimaryButton("BẮT ĐẦU GAME", ctx.actions.startGame, ctx.wordBankState !== "ready" || !!ctx.wordSelectionError);
  startButton.classList.add("button--config-start");
  return screen(
    GameHeader("THIẾT LẬP · 2/2", ctx.actions.goPlayers),
    el("div", { className: "setup-layout setup-layout--split" },
      el("section", {},
        titleBlock("LUẬT VÁN", "Kẻ giả danh biết gì?", "Chọn mức độ thử thách phù hợp với nhóm của bạn."),
        Stepper("Số kẻ giả danh", config.imposterCount, (delta) => ctx.actions.updateConfig({
          imposterCount: Math.max(1, Math.min(maxImposters, config.imposterCount + delta)),
        })),
        el("div", { className: "mode-grid" },
          modeButton("similar", config.imposterWordMode, "TỪ TƯƠNG TỰ", "Kẻ giả danh nhận một từ gần nghĩa.", () => ctx.actions.updateConfig({ imposterWordMode: "similar" })),
          modeButton("no-word", config.imposterWordMode, "KHÔNG CÓ TỪ", "Chỉ nhận một gợi ý ngắn.", () => ctx.actions.updateConfig({ imposterWordMode: "no-word" })),
          modeButton("different-group", config.imposterWordMode, "KHÁC NHÓM", "Nhận từ từ một nhóm khác cùng chủ đề.", () => ctx.actions.updateConfig({ imposterWordMode: "different-group" })),
        ),
        topicSelector(config, ctx.actions.updateConfig),
        ctx.wordSelectionError ? el("p", { className: "form-error", text: ctx.wordSelectionError, attrs: { role: "alert" } }) : null,
        SecondaryButton("CÀI ĐẶT NÂNG CAO", ctx.actions.showAdvancedSettings),
      ),
      el("aside", { className: "settings-summary clue-card" },
        el("p", { className: "eyebrow", text: "SẴN SÀNG" }),
        el("div", { className: "summary-stat" }, el("strong", { text: String(ctx.draft.names.length) }), el("span", { text: "người chơi" })),
        el("div", { className: "summary-stat" }, el("strong", { text: String(config.imposterCount) }), el("span", { text: "kẻ giả danh" })),
        StatusBadge(ctx.wordBankState),
        startButton,
      ),
    ),
  );
}

function reveal(ctx: RenderContext, state: GameState): HTMLElement {
  const player = state.players[state.revealIndex];
  if (!player?.secret) return fatalScreen(ctx, "Không tìm thấy bí mật của người chơi.");
  const revealsImposterRole = state.config.imposterWordMode === "no-word" && player.secret.role === "imposter";
  const revealedCardArt = revealedSecretCardArt(player.secret, state.config.imposterWordMode);
  const secretArea = el("div", { className: "secret-card__content" });
  let hasSeen = state.revealedPlayerIds.includes(player.id);
  const isLastPlayer = state.revealIndex === state.players.length - 1;
  const done = PrimaryButton(
    isLastPlayer ? "BẮT ĐẦU VÒNG ĐỐI CHỨNG" : "CHUYỂN MÁY CHO NGƯỜI TIẾP THEO",
    ctx.actions.markRoleSeen,
    !hasSeen,
  );
  const card = el("button", {
    className: "secret-card clue-card",
    attrs: {
      "aria-describedby": "hold-help",
      "aria-pressed": "false",
      "aria-label": "Giữ để lật lá bài bí mật",
    },
  },
  el("span", { className: "secret-card__inner" },
    el("span", { className: "secret-card__face secret-card__front", attrs: { "aria-hidden": "true" } },
      el("img", {
        className: "secret-card__art",
        attrs: {
          src: "./assets/cards/secret-card-back.png",
          alt: "",
          width: "1024",
          height: "1536",
          decoding: "async",
          draggable: "false",
        },
      }),
    ),
    el("span", { className: "secret-card__face secret-card__back" },
      el("img", {
        className: "secret-card__art",
        attrs: {
          src: revealedCardArt,
          alt: "",
          width: "1024",
          height: "1536",
          decoding: "async",
          draggable: "false",
        },
      }),
      secretArea,
    ),
  ));
  card.type = "button";
  const paint = (hidden: boolean): void => {
    card.classList.toggle("is-flipped", !hidden);
    secretArea.replaceChildren();
    if (hidden) {
      card.setAttribute("aria-label", "Giữ để lật lá bài bí mật");
      secretArea.setAttribute("aria-hidden", "true");
      return;
    }
    secretArea.removeAttribute("aria-hidden");
    const copy = visibleSecretCopy(player.secret!);
    card.classList.toggle("secret-card--imposter", revealsImposterRole);
    card.setAttribute("aria-label", `${copy.caption}: ${copy.value}`);
    const length = Array.from(copy.value).length;
    const sizeClass = length > 30 ? " secret-word--compact" : length > 18 ? " secret-word--long" : "";
    if (revealsImposterRole) {
      secretArea.append(
        el("span", { className: "secret-hint-label", text: "Gợi ý:" }),
        el("strong", { className: `secret-word secret-word--hint${sizeClass}`, text: copy.value }),
      );
    } else {
      secretArea.append(el("strong", { className: `secret-word${sizeClass}`, text: copy.value }));
    }
    hasSeen = true;
  };
  const release = (): void => {
    card.setAttribute("aria-pressed", "false");
    ctx.actions.hideSecret();
    done.disabled = !hasSeen;
  };
  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    card.setPointerCapture(event.pointerId);
    card.setAttribute("aria-pressed", "true");
    ctx.actions.revealSecret();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => card.addEventListener(eventName, release));
  card.addEventListener("keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      card.setAttribute("aria-pressed", "true");
      ctx.actions.revealSecret();
    }
  });
  card.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      card.setAttribute("aria-pressed", "false");
      release();
    }
  });
  ctx.privacy.subscribe((hidden) => {
    paint(hidden);
    card.setAttribute("aria-pressed", String(!hidden));
  });
  return screen(
    el("section", { className: "reveal-layout" },
      el("p", { className: "reveal-progress", text: `${state.revealIndex + 1} / ${state.players.length}` }),
      el("p", { className: "reveal-context", text: "NGƯỜI ĐANG XEM" }),
      el("div", { className: "reveal-player" },
        PlayerAvatar(player, "mini"),
        el("h1", { className: "player-focus-name", text: player.name }),
      ),
      card,
      el("p", { className: "secret-instruction", text: "Giữ để xem · Thả tay để ẩn", attrs: { id: "hold-help" } }),
      done,
    ),
  );
}

const notifiedDiscussionTimers = new Set<string>();

function discussionTimer(ctx: RenderContext, state: GameState): HTMLElement | null {
  if (!state.config.timerEnabled || !state.discussionEndsAt) return null;
  const timer = el("div", { className: "timer", attrs: { role: "timer" } });
  const notificationKey = `${state.gameId}:${state.round}:${state.discussionEndsAt}`;
  const update = (): void => {
    if (!timer.isConnected && timer.dataset.mounted === "true") {
      window.clearInterval(intervalId);
      return;
    }
    timer.dataset.mounted = "true";
    const remaining = Math.max(0, Math.ceil((state.discussionEndsAt! - Date.now()) / 1000));
    timer.textContent = formatCountdown(remaining);
    timer.setAttribute("aria-label", `${formatCountdown(remaining)} còn lại trong vòng đối chứng`);
    if (remaining === 0) {
      window.clearInterval(intervalId);
      timer.classList.add("timer--expired");
      if (!notifiedDiscussionTimers.has(notificationKey)) {
        notifiedDiscussionTimers.add(notificationKey);
        ctx.actions.timerExpired();
      }
    }
  };
  const intervalId = window.setInterval(update, 250);
  update();
  return timer;
}

function discussion(ctx: RenderContext, state: GameState): HTMLElement {
  return screen(
    el("section", { className: "center-stage discussion" },
      progress(state),
      el("p", { className: "eyebrow", text: "ĐỐI CHỨNG" }),
      el("h1", { className: "discussion__title", text: "Hãy mô tả từ của bạn" }),
      el("p", { className: "lede center", text: "mà không nói trực tiếp." }),
      discussionTimer(ctx, state),
      PrimaryButton("BẮT ĐẦU BỎ PHIẾU", ctx.actions.beginVote),
    ),
  );
}

function vote(ctx: RenderContext, state: GameState): HTMLElement {
  const selected = state.vote.pendingTargetId;
  const players = state.players.filter((player) => !player.eliminated);
  return screen(
    GameHeader("BỎ PHIẾU"),
    el("section", { className: "vote-layout" },
      progress(state),
      titleBlock("LỰA CHỌN CỦA CẢ NHÓM", "Ai là kẻ giả danh?", "Chọn một người rồi xác nhận quyết định chung."),
      el("div", { className: "vote-grid" }, ...players.map((player) => PlayerCard(player, selected === player.id, () => ctx.actions.selectVote(player.id)))),
      el("div", { className: "sticky-action" }, PrimaryButton(selected ? `XÁC NHẬN ${players.find((p) => p.id === selected)?.name.toLocaleUpperCase("vi") ?? "LỰA CHỌN"}` : "CHỌN MỘT NGƯỜI", ctx.actions.requestVoteConfirmation, !selected)),
    ),
  );
}

function elimination(ctx: RenderContext, state: GameState): HTMLElement {
  const result = state.lastElimination;
  const player = state.players.find((candidate) => candidate.id === result?.playerId);
  if (!result || !player) return fatalScreen(ctx, "Không thể khôi phục kết quả loại người.");
  const roleText = result.role === "imposter" ? "KẺ GIẢ DANH" : "DÂN THƯỜNG";
  const message = result.gameOver
    ? result.winner === "civilian" ? "Đã bắt được kẻ giả danh!" : "Kẻ giả danh đã chiếm ưu thế."
    : result.role === "imposter" ? "Vẫn còn kẻ giả danh khác." : "Kẻ giả danh vẫn còn trong nhóm.";
  return screen(
    GameHeader(result.gameOver ? "PHÁN QUYẾT" : `KẾT QUẢ VÒNG ${state.round - 1}`),
    el("section", { className: `center-stage result-stage result-stage--${result.role}` },
      PlayerAvatar(player, "hero"),
      el("h1", { className: "player-focus-name", text: player.name }),
      el("div", { className: `role-reveal clue-card role-reveal--${result.role}` }, el("strong", { text: roleText })),
      !result.gameOver ? el("p", { className: "result-message", text: message }) : null,
      PrimaryButton(result.gameOver ? "XEM KẾT QUẢ" : "TIẾP TỤC VÒNG", ctx.actions.continueElimination),
    ),
  );
}

function finalResult(ctx: RenderContext, state: GameState): HTMLElement {
  const imposters = state.players.filter((player) => player.secret?.role === "imposter");
  const citizensWin = state.winner === "civilian";
  return screen(
    GameHeader("GAME OVER"),
    el("section", { className: `final-result final-result--${state.winner ?? "unknown"}` },
      el("div", { className: "final-result__flare", attrs: { "aria-hidden": "true" } }),
      el("h1", { className: "result-winner", text: citizensWin ? "DÂN THƯỜNG THẮNG" : "KẺ GIẢ DANH THẮNG" }),
      el("div", { className: "result-card clue-card" },
        el("p", { className: "eyebrow", text: imposters.length > 1 ? "NHỮNG KẺ GIẢ DANH" : "KẺ GIẢ DANH" }),
        el("div", { className: "imposter-list" }, ...imposters.map((player) => el("div", { className: "imposter-item" }, PlayerAvatar(player, "large"), el("strong", { text: player.name })))),
        el("div", { className: "secret-summary" },
          el("span", { text: "TỪ BÍ MẬT" }),
          el("strong", { text: state.wordSelection?.civilianWord ?? "—" }),
        ),
      ),
      PrimaryButton("CHƠI LẠI", ctx.actions.playAgain),
      SecondaryButton("VỀ TRANG CHỦ", ctx.actions.goHome),
    ),
  );
}

function fatalScreen(ctx: RenderContext, message: string): HTMLElement {
  return screen(GameHeader("CÓ LỖI", ctx.actions.goHome), el("section", { className: "center-stage" },
    titleBlock("KHÔNG THỂ TIẾP TỤC", "Ván chơi bị gián đoạn", message),
    PrimaryButton("VỀ TRANG CHỦ", ctx.actions.goHome),
  ));
}

function game(ctx: RenderContext): HTMLElement {
  const state = ctx.game;
  if (!state) return fatalScreen(ctx, "Không tìm thấy dữ liệu ván chơi.");
  const content = (() => {
    switch (state.phase) {
      case "reveal": return reveal(ctx, state);
      case "pass": return fatalScreen(ctx, "Ván cũ đang được chuyển sang lá bài tiếp theo. Hãy về trang chủ và tiếp tục lại ván.");
      case "discussion": return discussion(ctx, state);
      case "vote": return vote(ctx, state);
      case "elimination": return elimination(ctx, state);
      case "result": return finalResult(ctx, state);
      case "setup": return fatalScreen(ctx, "Ván chơi chưa được bắt đầu.");
    }
  })();
  content.classList.add("screen--game");
  return content;
}

function phaseLabel(phase: GameState["phase"]): string {
  return ({ setup: "Thiết lập", reveal: "Xem bí mật", pass: "Xem bí mật", discussion: "Đối chứng", vote: "Bỏ phiếu", elimination: "Kết quả vòng", result: "Kết quả cuối" })[phase];
}

export function renderApp(root: HTMLElement, context: RenderContext): void {
  const focusableSelector = "button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])";
  const previousFocusables = [...root.querySelectorAll<HTMLElement>(focusableSelector)];
  const previousFocusIndex = document.activeElement instanceof HTMLElement
    ? previousFocusables.indexOf(document.activeElement)
    : -1;
  const content = context.view === "home" ? home(context)
    : context.view === "players" ? playerSetup(context)
      : context.view === "settings" ? settings(context)
        : game(context);
  const state = context.game;
  const screenKey = context.view === "game"
    ? `${context.view}:${state?.phase ?? "missing"}:${state?.round ?? 0}:${state?.revealIndex ?? 0}`
    : context.view;
  const screenChanged = root.dataset.screenKey !== screenKey;
  root.dataset.screenKey = screenKey;
  content.classList.toggle("screen--stable-update", !screenChanged);
  root.replaceChildren(content);
  if (screenChanged) {
    content.focus({ preventScroll: true });
  } else if (previousFocusIndex >= 0) {
    const nextFocusables = [...root.querySelectorAll<HTMLElement>(focusableSelector)];
    nextFocusables[Math.min(previousFocusIndex, nextFocusables.length - 1)]?.focus({ preventScroll: true });
  }
}

export function advancedSettingsContent(config: GameConfig, playerCount: number, update: (patch: Partial<GameConfig>) => void): HTMLElement[] {
  const duration = formatCountdown(discussionDurationSeconds(playerCount));
  return [
    Toggle("Nhiều vòng", config.multiRound, () => update({ multiRound: !config.multiRound }), "Tiếp tục cho đến khi một phe thắng."),
    Toggle("Hiện vai trò khi bị loại", config.revealRoleOnElimination, () => update({ revealRoleOnElimination: !config.revealRoleOnElimination }), "Không bao giờ lộ từ bí mật giữa ván."),
    Toggle("Hẹn giờ thảo luận", config.timerEnabled, () => update({ timerEnabled: !config.timerEnabled }), `${duration} cho ${playerCount} người · 45 giây/người. Rung khi hết giờ.`),
  ];
}

export function aboutContent(): HTMLElement[] {
  return [
    el("ol", { className: "rules-list" },
      el("li", { text: "Mỗi người lần lượt lật lá bài để xem từ bí mật của mình rồi chuyển máy cho người tiếp theo. Không ai biết mình thuộc Phe chính diện hay Kẻ giả danh." }),
      el("li", { text: "Lần lượt đưa ra gợi ý gián tiếp miêu tả về từ của mình (không nói thẳng hay đánh vần)." }),
      el("li", { text: "Cả nhóm thảo luận và bỏ phiếu loại người đáng ngờ nhất." }),
      el("li", { text: "Dừng vòng chơi và phe chính diện thắng khi loại hết Kẻ giả dạng. Kẻ giả danh thắng khi quân số bằng hoặc đông hơn." }),
    ),
  ];
}
