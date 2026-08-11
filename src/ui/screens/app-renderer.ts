import type { GameConfig, GameState, ImposterWordMode } from "../../core/game-state";
import type { WordBankState } from "../../data/word-repository";
import type { PrivacyManager } from "../../security/privacy-manager";
import {
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
  moderatorName: string;
  config: GameConfig;
  error: string | null;
}

export interface RenderContext {
  view: AppView;
  wordBankState: WordBankState;
  wordBankError: string | null;
  availableTopics: readonly string[];
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
    updateModeratorName(value: string): void;
    addPlayer(): void;
    removePlayer(index: number): void;
    updateConfig(patch: Partial<GameConfig>): void;
    showAdvancedSettings(): void;
    showGameOptions(): void;
    startGame(): void;
    markRoleSeen(): void;
    continuePass(): void;
    confirmModeratorHandoff(): void;
    advanceClueTurn(): void;
    extendClueTurn(): void;
    toggleTimer(): void;
    addTimerTime(): void;
    startCooldown(): void;
    toggleSpeakingQueue(playerId: string): void;
    advanceSpeakingQueue(): void;
    clearSpeakingQueue(): void;
    signalYield(): void;
    beginVote(): void;
    selectVote(playerId: string): void;
    requestVoteConfirmation(): void;
    continueElimination(): void;
    playAgain(): void;
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
    PrimaryButton(ready ? "CHƠI NGAY" : ctx.wordBankState === "loading" ? "ĐANG CHUẨN BỊ..." : "KHO TỪ BỊ LỖI", ctx.actions.goPlayers, !ready),
    SecondaryButton("CÀI ĐẶT & CÁCH CHƠI", ctx.actions.showAbout),
  );
  const resume = ctx.resumable ? el("section", { className: "resume-card", attrs: { "aria-label": "Ván chơi chưa hoàn thành" } },
    el("div", {},
      el("p", { className: "eyebrow", text: "VÁN ĐANG DỞ" }),
      el("h2", { text: `Vòng ${ctx.resumable.round}` }),
      el("p", { className: "muted", text: `${ctx.resumable.players.filter((p) => !p.eliminated).length} người còn lại · ${phaseLabel(ctx.resumable.phase)}` }),
    ),
    el("div", { className: "resume-card__actions" },
      PrimaryButton("TIẾP TỤC", ctx.actions.resume),
      SecondaryButton("BỎ VÁN", ctx.actions.discardResume),
    ),
  ) : null;
  const error = ctx.wordBankState === "error" ? el("section", { className: "error-card", attrs: { role: "alert" } },
    el("strong", { text: "Không thể chuẩn bị kho từ" }),
    el("p", { text: ctx.wordBankError ?? "Dữ liệu không hợp lệ." }),
    SecondaryButton("THỬ LẠI", ctx.actions.retryWords),
  ) : null;
  return screen(
    el("div", { className: "home-ambient", attrs: { "aria-hidden": "true" } }),
    el("section", { className: "hero" },
      el("div", { className: "brand-mark", attrs: { "aria-hidden": "true" } },
        el("span", { className: "brand-mark__eye" }),
        el("span", { className: "brand-mark__question", text: "?" }),
      ),
      titleBlock("GAME TRUYỀN TAY", "WHO IS THE IMPOSTER?", "Tìm kẻ đang giả vờ biết cùng một bí mật với bạn."),
      resume,
      error,
      actions,
      StatusBadge(ctx.wordBankState),
    ),
  );
}

function playerSetup(ctx: RenderContext): HTMLElement {
  const list = el("div", { className: "player-input-list" });
  ctx.draft.names.forEach((name, index) => {
    const accent = ["#38D8FF", "#FF9A3D", "#FF66B3", "#58E6A9", "#A98BFF", "#F7D154"][index % 6]!;
    const input = el("input", {
      className: "player-name-input",
      attrs: { "aria-label": `Tên người chơi ${index + 1}`, maxlength: "20", autocomplete: "off" },
    });
    input.value = name;
    input.addEventListener("input", () => ctx.actions.updateName(index, input.value));
    const avatar = el("span", { className: "player-avatar player-avatar--input", text: String(index + 1), attrs: { "aria-hidden": "true" } });
    avatar.style.setProperty("--player-accent", accent);
    list.append(el("div", { className: "player-input-card" }, avatar, input,
      IconButton(`Xóa người chơi ${index + 1}`, "×", () => ctx.actions.removePlayer(index))));
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
    className: `mode-card${mode === active ? " is-selected" : ""}`,
    attrs: { "aria-pressed": String(mode === active), "data-focus-key": `mode:${mode}` },
    onClick: onSelect,
  }, el("strong", { text: title }), el("small", { text: body }));
  button.type = "button";
  return button;
}

function topicButton(topic: string, selected: boolean, onSelect: () => void): HTMLButtonElement {
  const button = el("button", {
    className: `topic-chip${selected ? " is-selected" : ""}`,
    text: topic,
    attrs: { "aria-pressed": String(selected), "data-focus-key": `topic:${topic}` },
    onClick: onSelect,
  });
  button.type = "button";
  return button;
}

function queueButton(playerId: string, name: string, selected: boolean, onSelect: () => void): HTMLButtonElement {
  const button = topicButton(name, selected, onSelect);
  button.dataset.playerId = playerId;
  button.dataset.focusKey = `queue:${playerId}`;
  return button;
}

function settings(ctx: RenderContext): HTMLElement {
  const config = ctx.draft.config;
  const maxImposters = Math.max(1, Math.ceil(ctx.draft.names.length / 2) - 1);
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
          modeButton("different-topic", config.imposterWordMode, "KHÁC CHỦ ĐỀ", "Nhận từ thuộc một chủ đề khác.", () => ctx.actions.updateConfig({ imposterWordMode: "different-topic" })),
        ),
        el("section", { className: "moderator-setup" },
          Toggle("Có quản trò điều phối", config.moderatedDiscussionEnabled, () => ctx.actions.updateConfig({
            moderatedDiscussionEnabled: !config.moderatedDiscussionEnabled,
          }), "Quản trò đứng ngoài ván, không nhận vai và không bỏ phiếu."),
          config.moderatedDiscussionEnabled ? (() => {
            const input = el("input", {
              className: "player-name-input",
              attrs: { "aria-label": "Tên quản trò", maxlength: "20", autocomplete: "off", placeholder: "Tên quản trò" },
            });
            input.value = ctx.draft.moderatorName;
            input.addEventListener("input", () => ctx.actions.updateModeratorName(input.value));
            return el("label", { className: "field-stack" }, el("span", { text: "Tên quản trò" }), input);
          })() : null,
          config.moderatedDiscussionEnabled && ctx.draft.names.length >= 5
            ? el("p", { className: "helper-copy", text: "Phù hợp nhóm đông: quản trò bảo đảm mọi người có lượt đưa manh mối trước khi tranh luận mở." })
            : null,
        ),
        el("section", { className: "topic-settings" },
          el("p", { className: "stepper__label", text: "Độ khó" }),
          el("div", { className: "chip-grid" },
            topicButton("Tất cả", config.difficulty === "any", () => ctx.actions.updateConfig({ difficulty: "any" })),
            topicButton("Dễ", config.difficulty === "easy", () => ctx.actions.updateConfig({ difficulty: "easy" })),
            topicButton("Vừa", config.difficulty === "medium", () => ctx.actions.updateConfig({ difficulty: "medium" })),
            topicButton("Khó", config.difficulty === "hard", () => ctx.actions.updateConfig({ difficulty: "hard" })),
          ),
          el("p", { className: "stepper__label", text: "Chủ đề" }),
          el("div", { className: "chip-grid" },
            ...ctx.availableTopics.map((topic) => {
              const selected = config.selectedTopics.includes(topic);
              return topicButton(topic, selected, () => ctx.actions.updateConfig({
                selectedTopics: selected ? config.selectedTopics.filter((item) => item !== topic) : [...config.selectedTopics, topic],
              }));
            }),
          ),
          config.selectedTopics.length ? SecondaryButton("DÙNG TẤT CẢ CHỦ ĐỀ", () => ctx.actions.updateConfig({ selectedTopics: [] })) : null,
        ),
        SecondaryButton("CÀI ĐẶT NÂNG CAO ›", ctx.actions.showAdvancedSettings),
      ),
      el("aside", { className: "settings-summary" },
        el("p", { className: "eyebrow", text: "SẴN SÀNG" }),
        el("div", { className: "summary-stat" }, el("strong", { text: String(ctx.draft.names.length) }), el("span", { text: "người chơi" })),
        el("div", { className: "summary-stat" }, el("strong", { text: String(config.imposterCount) }), el("span", { text: "kẻ giả danh" })),
        StatusBadge(ctx.wordBankState),
        PrimaryButton("BẮT ĐẦU GAME", ctx.actions.startGame, ctx.wordBankState !== "ready"),
      ),
    ),
  );
}

function reveal(ctx: RenderContext, state: GameState): HTMLElement {
  const player = state.players[state.revealIndex];
  if (!player?.secret) return fatalScreen(ctx, "Không tìm thấy bí mật của người chơi.");
  const secretArea = el("div", { className: "secret-card__content" });
  const instructionText = state.config.tapToReveal ? "Chạm để xem · Chạm lần nữa để ẩn" : "Giữ nút để xem · Thả tay để ẩn";
  const instruction = el("p", { className: "secret-instruction", text: instructionText });
  const done = PrimaryButton("ĐÃ XEM", ctx.actions.markRoleSeen, true);
  let hasSeen = state.revealedPlayerIds.includes(player.id);
  const paint = (hidden: boolean): void => {
    secretArea.replaceChildren();
    if (hidden) {
      secretArea.setAttribute("aria-hidden", "true");
      secretArea.append(el("span", { className: "secret-placeholder", text: "••••••" }));
      return;
    }
    secretArea.removeAttribute("aria-hidden");
    secretArea.append(
      el("p", { className: `role-label role-label--${player.secret!.role}`, text: player.secret!.role === "imposter" ? "KẺ GIẢ DANH" : "DÂN THƯỜNG" }),
      el("p", { className: "secret-caption", text: player.secret!.word ? "TỪ CỦA BẠN" : "GỢI Ý CỦA BẠN" }),
      el("strong", { className: "secret-word", text: player.secret!.word ?? player.secret!.hint ?? "KHÔNG CÓ TỪ" }),
    );
    if (player.secret!.meaning) secretArea.append(el("p", { className: "secret-meaning", text: player.secret!.meaning }));
    hasSeen = true;
  };
  const release = (): void => {
    ctx.privacy.hideSecrets();
    done.disabled = !hasSeen;
  };
  const hold = el("button", { className: "hold-button", text: state.config.tapToReveal ? "CHẠM ĐỂ XEM" : "GIỮ ĐỂ XEM", attrs: { "aria-describedby": "hold-help" } });
  hold.type = "button";
  if (state.config.tapToReveal) {
    hold.addEventListener("click", () => {
      if (ctx.privacy.isHidden()) {
        ctx.privacy.reveal();
        hold.textContent = "CHẠM ĐỂ ẨN";
      } else {
        release();
        hold.textContent = "CHẠM ĐỂ XEM";
      }
    });
  } else {
    hold.addEventListener("pointerdown", (event) => { hold.setPointerCapture(event.pointerId); ctx.privacy.reveal(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => hold.addEventListener(eventName, release));
    hold.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); ctx.privacy.reveal(); }
    });
    hold.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); release(); }
    });
  }
  ctx.privacy.subscribe(paint);
  return screen(
    GameHeader(`NGƯỜI ${state.revealIndex + 1} / ${state.players.length}`, undefined, ctx.actions.showGameOptions),
    el("section", { className: "reveal-layout" },
      progress(state),
      PlayerAvatar(player, "hero"),
      el("h1", { className: "player-focus-name", text: player.name }),
      el("div", { className: "secret-card" }, secretArea),
      hold,
      el("p", { className: "muted center", text: instruction.textContent ?? "", attrs: { id: "hold-help" } }),
      done,
    ),
  );
}

function passPhone(ctx: RenderContext, state: GameState): HTMLElement {
  const next = state.players[state.revealIndex + 1];
  const recipient = next?.name ?? (state.moderator.enabled ? state.moderator.name : null);
  return screen(
    GameHeader(`ĐÃ XEM ${state.revealIndex + 1} / ${state.players.length}`, undefined, ctx.actions.showGameOptions),
    el("section", { className: "center-stage" },
      el("div", { className: "success-seal", text: "✓", attrs: { "aria-hidden": "true" } }),
      titleBlock("BÍ MẬT ĐÃ ĐƯỢC CHE", "ĐÃ XEM"),
      el("p", { className: "handover-copy", text: recipient ? "Đưa điện thoại cho" : "Mọi người đã xem bí mật" }),
      recipient ? el("strong", { className: "handover-name", text: recipient }) : null,
      PrimaryButton(next || state.moderator.enabled ? "TÔI ĐÃ ĐƯA MÁY" : "BẮT ĐẦU THẢO LUẬN", ctx.actions.continuePass),
    ),
  );
}

function remainingSeconds(endAt: number | null, paused: number | null = null, now = Date.now()): number {
  if (paused !== null) return Math.max(0, paused);
  if (endAt === null) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function moderatorHandoff(ctx: RenderContext, state: GameState): HTMLElement {
  return screen(
    GameHeader("CHUYỂN CHO QUẢN TRÒ", undefined, ctx.actions.showGameOptions),
    el("section", { className: "center-stage moderator-handoff" },
      el("div", { className: "success-seal", text: "✓", attrs: { "aria-hidden": "true" } }),
      titleBlock("BÍ MẬT ĐÃ ĐƯỢC CHE", `Đưa máy cho ${state.moderator.name ?? "quản trò"}`, "Quản trò đứng ngoài ván, không nhận vai, không xem từ và không bỏ phiếu."),
      el("p", { className: "privacy-note", text: "Chỉ xác nhận sau khi tất cả người chơi đã rời khỏi màn xem bí mật." }),
      PrimaryButton("TÔI LÀ QUẢN TRÒ", ctx.actions.confirmModeratorHandoff),
    ),
  );
}

function clueRound(ctx: RenderContext, state: GameState): HTMLElement {
  const currentId = state.discussion.speakerOrder[state.discussion.speakerIndex];
  const nextId = state.discussion.speakerOrder[state.discussion.speakerIndex + 1];
  const current = state.players.find((player) => player.id === currentId);
  const next = state.players.find((player) => player.id === nextId);
  if (!current) return fatalScreen(ctx, "Không tìm thấy người đang đưa manh mối.");
  const seconds = remainingSeconds(state.discussion.clueTurnEndsAt);
  return screen(
    GameHeader(`MANH MỐI · ${state.discussion.speakerIndex + 1}/${state.discussion.speakerOrder.length}`, undefined, ctx.actions.showGameOptions),
    el("section", { className: "center-stage clue-stage" },
      progress(state),
      el("p", { className: "eyebrow", text: "NGƯỜI ĐANG NÓI" }),
      PlayerAvatar(current, "hero"),
      el("h1", { className: "player-focus-name", text: current.name }),
      el("div", { className: `timer timer--compact${seconds === 0 ? " is-expired" : ""}`, text: clock(seconds), attrs: { "aria-label": `${seconds} giây còn lại`, "data-live": "clue-timer" } }),
      state.config.discussionGuideEnabled
        ? el("p", { className: "lede center", text: "Mô tả bằng đặc điểm hoặc liên tưởng. Đừng nói thẳng, đánh vần hay dịch từ bí mật." })
        : null,
      next ? el("p", { className: "muted center", text: `Tiếp theo: ${next.name}` }) : el("p", { className: "muted center", text: "Sau lượt này sẽ mở tranh luận tự do." }),
      el("div", { className: "action-row" },
        SecondaryButton("+10 GIÂY", ctx.actions.extendClueTurn),
      ),
      PrimaryButton("CHUYỂN NGƯỜI TIẾP", ctx.actions.advanceClueTurn),
    ),
  );
}

function openDiscussion(ctx: RenderContext, state: GameState): HTMLElement {
  const active = state.players.filter((player) => !player.eliminated);
  const timer = state.discussion.timer;
  const seconds = timer.status === "paused"
    ? remainingSeconds(null, timer.pausedRemainingSeconds)
    : remainingSeconds(timer.endsAt);
  const cooldownSeconds = remainingSeconds(state.discussion.cooldownEndsAt);
  const currentQueued = state.players.find((player) => player.id === state.discussion.currentQueuedSpeakerId);
  const queueNames = state.discussion.speakingQueue
    .map((id) => state.players.find((player) => player.id === id)?.name)
    .filter((name): name is string => !!name);
  return screen(
    GameHeader(state.moderator.enabled ? `QUẢN TRÒ · ${state.moderator.name ?? ""}` : "THẢO LUẬN", undefined, ctx.actions.showGameOptions),
    el("section", { className: "center-stage discussion open-discussion" },
      progress(state),
      el("div", { className: "discussion-orbit", attrs: { "aria-hidden": "true" } }, el("span", { text: "?" })),
      titleBlock("TRANH LUẬN MỞ", "Ai đang giả vờ?", "Phản biện tự do. Quản trò chỉ điều tiết khi nhiều người nói chồng lên nhau."),
      state.config.timerEnabled ? el("div", {
        className: `timer${timer.status === "expired" ? " is-expired" : ""}`,
        text: clock(seconds),
        attrs: { "aria-label": timer.status === "expired" ? "Đã hết thời gian thảo luận" : `${seconds} giây thảo luận còn lại`, "data-live": "discussion-timer" },
      }) : null,
      (() => {
        const cooldown = el("div", { className: "cooldown-banner", attrs: { role: "status", "data-live": "cooldown" } },
          el("strong", { text: `HẠ NHIỆT · ${cooldownSeconds}`, attrs: { "data-live": "cooldown-count" } }),
          el("span", { text: "Tạm ngừng 10 giây rồi tiếp tục tranh luận." }),
        );
        cooldown.hidden = cooldownSeconds <= 0;
        return cooldown;
      })(),
      state.config.timerEnabled ? el("div", { className: "action-row timer-actions" },
        (() => {
          const toggle = SecondaryButton(timer.status === "paused" ? "TIẾP TỤC" : "TẠM DỪNG", ctx.actions.toggleTimer, "timer-toggle");
          toggle.dataset.live = "timer-toggle";
          toggle.hidden = timer.status !== "running" && timer.status !== "paused";
          return toggle;
        })(),
        SecondaryButton("+30 GIÂY", ctx.actions.addTimerTime),
      ) : null,
      el("div", { className: "active-player-row", attrs: { "aria-label": "Người chơi còn lại" } },
        ...active.map((player) => {
          const mini = PlayerAvatar(player, "mini");
          mini.title = player.name;
          return mini;
        }),
      ),
      state.moderator.enabled ? el("section", { className: "moderator-panel", attrs: { "aria-label": "Công cụ quản trò" } },
        el("div", { className: "moderator-panel__header" },
          el("div", {}, el("p", { className: "eyebrow", text: "CÔNG CỤ QUẢN TRÒ" }), el("h2", { text: "Điều tiết nhẹ, không khóa lời" })),
          SecondaryButton("XIN NHƯỜNG LỜI", ctx.actions.signalYield),
        ),
        (() => {
          const spotlight = el("div", { className: "speaker-spotlight", attrs: { "data-live": "speaker-spotlight" } },
            el("span", { text: "Đang được mời nói" }), el("strong", { text: currentQueued?.name ?? "", attrs: { "data-live": "speaker-name" } }),
          );
          spotlight.hidden = !currentQueued;
          return spotlight;
        })(),
        el("p", { className: "muted", text: queueNames.length ? `Hàng chờ: ${queueNames.join(" → ")}` : "Chạm tên để thêm vào hàng chờ phát biểu.", attrs: { "data-live": "queue-label" } }),
        el("div", { className: "queue-grid" }, ...active.map((player) => queueButton(player.id, player.name, state.discussion.speakingQueue.includes(player.id), () => ctx.actions.toggleSpeakingQueue(player.id)))),
        el("div", { className: "action-row" },
          SecondaryButton("NGƯỜI TIẾP THEO", ctx.actions.advanceSpeakingQueue),
          SecondaryButton("XÓA HÀNG CHỜ", ctx.actions.clearSpeakingQueue),
          SecondaryButton("HẠ NHIỆT 10 GIÂY", ctx.actions.startCooldown),
        ),
      ) : null,
      PrimaryButton("BẮT ĐẦU BỎ PHIẾU", ctx.actions.beginVote),
    ),
  );
}

function discussion(ctx: RenderContext, state: GameState): HTMLElement {
  if (state.discussion.stage === "moderator-handoff") return moderatorHandoff(ctx, state);
  if (state.discussion.stage === "clue-round") return clueRound(ctx, state);
  return openDiscussion(ctx, state);
}

function vote(ctx: RenderContext, state: GameState): HTMLElement {
  const selected = state.selection.method === "consensus" ? state.selection.selectedPlayerId : null;
  const players = state.players.filter((player) => !player.eliminated);
  return screen(
    GameHeader("BỎ PHIẾU", undefined, ctx.actions.showGameOptions),
    el("section", { className: "vote-layout" },
      progress(state),
      titleBlock("QUYẾT ĐỊNH CHUNG", "Cả nhóm thống nhất chọn ai?", "Chạm vào một người, sau đó xác nhận để tránh chọn nhầm."),
      el("div", { className: "vote-grid" }, ...players.map((player) => PlayerCard(player, selected === player.id, () => ctx.actions.selectVote(player.id)))),
      el("div", { className: "sticky-action" }, PrimaryButton(selected ? `XÁC NHẬN ${players.find((p) => p.id === selected)?.name.toLocaleUpperCase("vi") ?? "LỰA CHỌN"}` : "CHỌN MỘT NGƯỜI", ctx.actions.requestVoteConfirmation, !selected)),
    ),
  );
}

function elimination(ctx: RenderContext, state: GameState): HTMLElement {
  const result = state.lastElimination;
  const player = state.players.find((candidate) => candidate.id === result?.playerId);
  if (!result || !player) return fatalScreen(ctx, "Không thể khôi phục kết quả loại người.");
  const showRole = state.config.revealRoleOnElimination || result.gameOver;
  const roleText = result.role === "imposter" ? "KẺ GIẢ DANH" : "DÂN THƯỜNG";
  const message = result.gameOver
    ? result.winner === "civilian" ? "Đã bắt được kẻ giả danh!" : "Kẻ giả danh đã chiếm ưu thế."
    : result.role === "imposter" ? "Vẫn còn kẻ giả danh khác." : "Kẻ giả danh vẫn còn trong nhóm.";
  return screen(
    GameHeader(result.gameOver ? "PHÁN QUYẾT" : `KẾT QUẢ VÒNG ${state.round - 1}`, undefined, result.gameOver ? undefined : ctx.actions.showGameOptions),
    el("section", { className: `center-stage result-stage result-stage--${result.role}` },
      el("p", { className: "eyebrow", text: result.gameOver && result.role === "imposter" ? "ĐÃ BẮT ĐƯỢC!" : "ĐƯỢC CẢ NHÓM CHỌN" }),
      PlayerAvatar(player, "hero"),
      el("h1", { className: "player-focus-name", text: player.name }),
      result.voteCount === null ? el("p", { className: "vote-count", text: "QUYẾT ĐỊNH ĐỒNG THUẬN" })
        : el("p", { className: "vote-count", text: `${result.voteCount} PHIẾU` }),
      showRole ? el("div", { className: `role-reveal role-reveal--${result.role}` }, el("span", { text: `${player.name} là` }), el("strong", { text: roleText })) : el("p", { className: "role-hidden", text: "Vai trò vẫn được giữ bí mật" }),
      el("p", { className: "result-message", text: message }),
      PrimaryButton(result.gameOver ? "XEM KẾT QUẢ" : "TIẾP TỤC VÁN", ctx.actions.continueElimination),
    ),
  );
}

function finalResult(ctx: RenderContext, state: GameState): HTMLElement {
  const imposters = state.players.filter((player) => player.secret?.role === "imposter");
  const citizensWin = state.winner === "civilian";
  const endedEarly = state.endedEarly;
  return screen(
    GameHeader("GAME OVER"),
    el("section", { className: `final-result final-result--${endedEarly ? "ended-early" : state.winner ?? "unknown"}` },
      el("div", { className: "final-result__flare", attrs: { "aria-hidden": "true" } }),
      el("p", { className: "eyebrow", text: endedEarly ? "VÁN ĐÃ DỪNG SỚM" : "KẾT THÚC VÁN" }),
      el("h1", { text: endedEarly ? "KHÔNG XÁC ĐỊNH PHE THẮNG" : citizensWin ? "DÂN THƯỜNG THẮNG" : "KẺ GIẢ DANH THẮNG" }),
      el("p", { className: "lede", text: endedEarly ? "Ván được dừng theo quyết định của nhóm. Đây không phải là kết quả thắng thua." : citizensWin ? "Màn ngụy trang đã bị lật tẩy." : "Sự nghi ngờ đã chia rẽ cả nhóm." }),
      el("div", { className: "result-card" },
        el("p", { className: "eyebrow", text: imposters.length > 1 ? "NHỮNG KẺ GIẢ DANH" : "KẺ GIẢ DANH" }),
        el("div", { className: "imposter-list" }, ...imposters.map((player) => el("div", { className: "imposter-item" }, PlayerAvatar(player, "large"), el("strong", { text: player.name })))),
        el("div", { className: "secret-summary" },
          el("span", { text: "TỪ BÍ MẬT" }),
          el("strong", { text: state.wordSelection?.civilianWord ?? "—" }),
        ),
        el("div", { className: "secret-summary" },
          el("span", { text: state.wordSelection?.imposterWord ? "TỪ CỦA KẺ GIẢ DANH" : "GỢI Ý CỦA KẺ GIẢ DANH" }),
          el("strong", { text: state.wordSelection?.imposterWord ?? state.wordSelection?.imposterHint ?? "—" }),
        ),
        el("p", { className: "muted center", text: `Chủ đề: ${state.wordSelection?.topic ?? "—"} · Chế độ: ${modeLabel(state.config.imposterWordMode)}` }),
      ),
      state.eliminationHistory.length ? el("section", { className: "history-card" },
        el("p", { className: "eyebrow", text: "DIỄN BIẾN" }),
        ...state.eliminationHistory.map((item) => {
          const player = state.players.find((candidate) => candidate.id === item.playerId);
          return el("p", { text: `Vòng ${item.round}: ${player?.name ?? "Người chơi"} — ${item.role === "imposter" ? "Kẻ giả danh" : "Dân thường"}` });
        }),
      ) : null,
      el("section", { className: "all-role-grid", attrs: { "aria-label": "Vai trò của tất cả người chơi" } },
        ...state.players.map((player) => el("div", { className: "role-summary-item" },
          PlayerAvatar(player, "mini"),
          el("strong", { text: player.name }),
          el("span", { text: player.secret?.role === "imposter" ? "Kẻ giả danh" : "Dân thường" }),
        )),
      ),
      state.moderator.enabled ? el("p", { className: "muted center", text: `Điều phối bởi ${state.moderator.name ?? "quản trò"}` }) : null,
      PrimaryButton("CHƠI LẠI", ctx.actions.playAgain),
      SecondaryButton("VỀ TRANG CHỦ", ctx.actions.goHome),
    ),
  );
}

function modeLabel(mode: ImposterWordMode): string {
  return ({ similar: "Từ tương tự", "no-word": "Không có từ", "different-topic": "Khác chủ đề" })[mode];
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
  switch (state.phase) {
    case "reveal": return reveal(ctx, state);
    case "pass": return passPhone(ctx, state);
    case "discussion": return discussion(ctx, state);
    case "vote": return vote(ctx, state);
    case "elimination": return elimination(ctx, state);
    case "result": return finalResult(ctx, state);
    case "setup": return fatalScreen(ctx, "Ván chơi chưa được bắt đầu.");
  }
}

function phaseLabel(phase: GameState["phase"]): string {
  return ({ setup: "Thiết lập", reveal: "Xem bí mật", pass: "Chuyền máy", discussion: "Thảo luận", vote: "Bỏ phiếu", elimination: "Kết quả vòng", result: "Kết quả cuối" })[phase];
}

export function getScreenKey(context: RenderContext): string {
  if (context.view !== "game") return context.view;
  const state = context.game;
  if (!state) return "game:missing";
  if (state.phase === "reveal" || state.phase === "pass") return `${state.phase}:${state.revealIndex}`;
  if (state.phase === "discussion") {
    return state.discussion.stage === "clue-round"
      ? `discussion:clue-round:${state.discussion.speakerIndex}`
      : `discussion:${state.discussion.stage}`;
  }
  return state.phase;
}

export function updateDiscussionLiveUI(root: HTMLElement, state: GameState, now: number): void {
  if (state.phase !== "discussion") return;

  const clueTimer = root.querySelector<HTMLElement>('[data-live="clue-timer"]');
  if (clueTimer) {
    const seconds = remainingSeconds(state.discussion.clueTurnEndsAt, null, now);
    clueTimer.textContent = clock(seconds);
    clueTimer.setAttribute("aria-label", `${seconds} giây còn lại`);
    clueTimer.classList.toggle("is-expired", seconds === 0);
  }

  const timer = state.discussion.timer;
  const discussionTimer = root.querySelector<HTMLElement>('[data-live="discussion-timer"]');
  if (discussionTimer) {
    const seconds = timer.status === "paused"
      ? remainingSeconds(null, timer.pausedRemainingSeconds, now)
      : remainingSeconds(timer.endsAt, null, now);
    discussionTimer.textContent = clock(seconds);
    discussionTimer.setAttribute("aria-label", timer.status === "expired" ? "Đã hết thời gian thảo luận" : `${seconds} giây thảo luận còn lại`);
    discussionTimer.classList.toggle("is-expired", timer.status === "expired" || seconds === 0);
  }

  const cooldownSeconds = remainingSeconds(state.discussion.cooldownEndsAt, null, now);
  const cooldown = root.querySelector<HTMLElement>('[data-live="cooldown"]');
  if (cooldown) {
    cooldown.hidden = cooldownSeconds <= 0;
    const count = cooldown.querySelector<HTMLElement>('[data-live="cooldown-count"]');
    if (count) count.textContent = `HẠ NHIỆT · ${cooldownSeconds}`;
  }

  const timerToggle = root.querySelector<HTMLButtonElement>('[data-live="timer-toggle"]');
  if (timerToggle) {
    timerToggle.hidden = timer.status !== "running" && timer.status !== "paused";
    timerToggle.textContent = timer.status === "paused" ? "TIẾP TỤC" : "TẠM DỪNG";
  }

  const queueNames = state.discussion.speakingQueue
    .map((id) => state.players.find((player) => player.id === id)?.name)
    .filter((name): name is string => !!name);
  const queueLabel = root.querySelector<HTMLElement>('[data-live="queue-label"]');
  if (queueLabel) queueLabel.textContent = queueNames.length
    ? `Hàng chờ: ${queueNames.join(" → ")}`
    : "Chạm tên để thêm vào hàng chờ phát biểu.";

  const spotlight = root.querySelector<HTMLElement>('[data-live="speaker-spotlight"]');
  const currentSpeaker = state.players.find((player) => player.id === state.discussion.currentQueuedSpeakerId && !player.eliminated);
  if (spotlight) {
    spotlight.hidden = !currentSpeaker;
    const name = spotlight.querySelector<HTMLElement>('[data-live="speaker-name"]');
    if (name) name.textContent = currentSpeaker?.name ?? "";
  }

  root.querySelectorAll<HTMLButtonElement>("[data-player-id]").forEach((button) => {
    const selected = !!button.dataset.playerId && state.discussion.speakingQueue.includes(button.dataset.playerId);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function renderApp(root: HTMLElement, context: RenderContext): void {
  const previous = root.querySelector<HTMLElement>(".screen");
  const screenKey = getScreenKey(context);
  const sameScreen = previous?.dataset.screenKey === screenKey;
  const previousScrollTop = previous?.scrollTop ?? 0;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusKey = previous?.contains(activeElement) ? activeElement?.dataset.focusKey : undefined;
  const content = context.view === "home" ? home(context)
    : context.view === "players" ? playerSetup(context)
      : context.view === "settings" ? settings(context)
        : game(context);
  content.dataset.screenKey = screenKey;
  const inner = content.querySelector<HTMLElement>(".screen__inner");
  if (!sameScreen && inner) {
    inner.classList.add("is-entering");
    inner.addEventListener("animationend", () => inner.classList.remove("is-entering"), { once: true });
  }
  root.replaceChildren(content);
  if (sameScreen) {
    content.scrollTop = previousScrollTop;
    const focusTarget = focusKey
      ? [...content.querySelectorAll<HTMLElement>("[data-focus-key]")].find((candidate) => candidate.dataset.focusKey === focusKey)
      : null;
    focusTarget?.focus({ preventScroll: true });
    content.scrollTop = previousScrollTop;
  } else {
    content.scrollTop = 0;
    content.focus({ preventScroll: true });
  }
}

export function advancedSettingsContent(config: GameConfig, update: (patch: Partial<GameConfig>) => void): HTMLElement[] {
  return [
    Toggle("Nhiều vòng", config.multiRound, () => update({ multiRound: !config.multiRound }), "Tiếp tục cho đến khi một phe thắng."),
    Toggle("Hiện vai trò khi bị loại", config.revealRoleOnElimination, () => update({ revealRoleOnElimination: !config.revealRoleOnElimination }), "Không bao giờ lộ từ bí mật giữa ván."),
    Toggle("Hẹn giờ thảo luận", config.timerEnabled, () => update({ timerEnabled: !config.timerEnabled }), "Hiển thị mốc thời gian gợi ý."),
    config.timerEnabled ? Stepper("Phút thảo luận", Math.round(config.discussionSeconds / 60), (delta) => update({
      discussionSeconds: Math.max(60, Math.min(900, config.discussionSeconds + delta * 60)),
      timerMinutes: Math.max(1, Math.min(15, Math.round(config.discussionSeconds / 60) + delta)),
    })) : null,
    config.moderatedDiscussionEnabled ? Stepper("Giây mỗi manh mối", config.clueTurnSeconds, (delta) => update({
      clueTurnSeconds: Math.max(10, Math.min(120, config.clueTurnSeconds + delta * 10)),
    })) : null,
    Toggle("Hướng dẫn manh mối", config.discussionGuideEnabled, () => update({ discussionGuideEnabled: !config.discussionGuideEnabled }), "Nhắc cách mô tả hợp lệ ở vòng đầu."),
    Toggle("Âm thanh", config.soundEnabled, () => update({ soundEnabled: !config.soundEnabled }), "Phát tín hiệu nhẹ cho quản trò và timer."),
    Toggle("Rung", config.hapticsEnabled, () => update({ hapticsEnabled: !config.hapticsEnabled }), "Phản hồi rung khi chuyển lượt hoặc hết giờ."),
    Toggle("Chạm để xem bí mật", config.tapToReveal, () => update({ tapToReveal: !config.tapToReveal }), "Hỗ trợ người khó giữ nút; cần chạm lại để che và nên cẩn thận khi chuyền máy."),
  ].filter((item): item is HTMLElement => item !== null);
}

export function aboutContent(): HTMLElement[] {
  return [
    el("p", { text: "Mỗi người lần lượt giữ nút để xem vai trò và từ bí mật. Sau đó cả nhóm mô tả từ, thảo luận và chọn người đáng ngờ nhất." }),
    el("ol", { className: "rules-list" },
      el("li", { text: "Không nói trực tiếp từ bí mật." }),
      el("li", { text: "Kẻ giả danh cố hòa nhập mà không để lộ mình." }),
      el("li", { text: "Thiết bị được chuyền tay; bí mật tự che khi ứng dụng mất tiêu điểm." }),
    ),
    StatusBadge("ready", "Kho từ được lưu ngay trong ứng dụng"),
  ];
}
