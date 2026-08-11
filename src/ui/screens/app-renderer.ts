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
  config: GameConfig;
  error: string | null;
}

export interface RenderContext {
  view: AppView;
  wordBankState: WordBankState;
  wordBankError: string | null;
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
    markRoleSeen(): void;
    continuePass(): void;
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
    attrs: { "aria-pressed": String(mode === active) },
    onClick: onSelect,
  }, el("strong", { text: title }), el("small", { text: body }));
  button.type = "button";
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
  const instruction = el("p", { className: "secret-instruction", text: "Giữ nút để xem · Thả tay để ẩn" });
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
  const hold = el("button", { className: "hold-button", text: "GIỮ ĐỂ XEM", attrs: { "aria-describedby": "hold-help" } });
  hold.type = "button";
  hold.addEventListener("pointerdown", (event) => { hold.setPointerCapture(event.pointerId); ctx.privacy.reveal(); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => hold.addEventListener(eventName, release));
  hold.addEventListener("keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); ctx.privacy.reveal(); }
  });
  hold.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); release(); }
  });
  ctx.privacy.subscribe(paint);
  return screen(
    GameHeader(`NGƯỜI ${state.revealIndex + 1} / ${state.players.length}`),
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
  return screen(
    GameHeader(`ĐÃ XEM ${state.revealIndex + 1} / ${state.players.length}`),
    el("section", { className: "center-stage" },
      el("div", { className: "success-seal", text: "✓", attrs: { "aria-hidden": "true" } }),
      titleBlock("BÍ MẬT ĐÃ ĐƯỢC CHE", "ĐÃ XEM"),
      el("p", { className: "handover-copy", text: next ? "Đưa điện thoại cho" : "Đưa điện thoại cho người điều phối" }),
      next ? el("strong", { className: "handover-name", text: next.name }) : null,
      PrimaryButton(next ? "TÔI ĐÃ ĐƯA MÁY" : "BẮT ĐẦU THẢO LUẬN", ctx.actions.continuePass),
    ),
  );
}

function discussion(ctx: RenderContext, state: GameState): HTMLElement {
  const active = state.players.filter((player) => !player.eliminated);
  return screen(
    GameHeader("THẢO LUẬN"),
    el("section", { className: "center-stage discussion" },
      progress(state),
      el("div", { className: "discussion-orbit", attrs: { "aria-hidden": "true" } }, el("span", { text: "?" })),
      titleBlock("ĐỪNG NÓI THẲNG TỪ", "Ai đang giả vờ?", "Lần lượt mô tả bí mật của bạn. Quan sát cách mọi người phản ứng."),
      state.config.timerEnabled ? el("div", { className: "timer", text: `${String(state.config.timerMinutes).padStart(2, "0")}:00`, attrs: { "aria-label": `${state.config.timerMinutes} phút thảo luận` } }) : null,
      el("div", { className: "active-player-row", attrs: { "aria-label": "Người chơi còn lại" } },
        ...active.map((player) => {
          const mini = PlayerAvatar(player, "mini");
          mini.title = player.name;
          return mini;
        }),
      ),
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
      titleBlock("LỰA CHỌN CỦA CẢ NHÓM", "Ai là kẻ giả danh?", "Chạm vào một người, sau đó xác nhận để tránh chọn nhầm."),
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
    GameHeader(result.gameOver ? "PHÁN QUYẾT" : `KẾT QUẢ VÒNG ${state.round - 1}`),
    el("section", { className: `center-stage result-stage result-stage--${result.role}` },
      el("p", { className: "eyebrow", text: result.gameOver && result.role === "imposter" ? "ĐÃ BẮT ĐƯỢC!" : "NHIỀU PHIẾU NHẤT" }),
      PlayerAvatar(player, "hero"),
      el("h1", { className: "player-focus-name", text: player.name }),
      el("p", { className: "vote-count", text: `${result.voteCount} PHIẾU` }),
      showRole ? el("div", { className: `role-reveal role-reveal--${result.role}` }, el("span", { text: `${player.name} là` }), el("strong", { text: roleText })) : el("p", { className: "role-hidden", text: "Vai trò vẫn được giữ bí mật" }),
      el("p", { className: "result-message", text: message }),
      PrimaryButton(result.gameOver ? "XEM KẾT QUẢ" : "TIẾP TỤC VÁN", ctx.actions.continueElimination),
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
      el("p", { className: "eyebrow", text: "KẾT THÚC VÁN" }),
      el("h1", { text: citizensWin ? "DÂN THƯỜNG THẮNG" : "KẺ GIẢ DANH THẮNG" }),
      el("p", { className: "lede", text: citizensWin ? "Màn ngụy trang đã bị lật tẩy." : "Sự nghi ngờ đã chia rẽ cả nhóm." }),
      el("div", { className: "result-card" },
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

export function renderApp(root: HTMLElement, context: RenderContext): void {
  const content = context.view === "home" ? home(context)
    : context.view === "players" ? playerSetup(context)
      : context.view === "settings" ? settings(context)
        : game(context);
  root.replaceChildren(content);
  content.focus({ preventScroll: true });
}

export function advancedSettingsContent(config: GameConfig, update: (patch: Partial<GameConfig>) => void): HTMLElement[] {
  return [
    Toggle("Nhiều vòng", config.multiRound, () => update({ multiRound: !config.multiRound }), "Tiếp tục cho đến khi một phe thắng."),
    Toggle("Hiện vai trò khi bị loại", config.revealRoleOnElimination, () => update({ revealRoleOnElimination: !config.revealRoleOnElimination }), "Không bao giờ lộ từ bí mật giữa ván."),
    Toggle("Hẹn giờ thảo luận", config.timerEnabled, () => update({ timerEnabled: !config.timerEnabled }), "Hiển thị mốc thời gian gợi ý."),
  ];
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
