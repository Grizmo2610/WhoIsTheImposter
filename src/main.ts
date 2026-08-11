import "./styles/main.css";
import { registerSW } from "virtual:pwa-register";
import { App } from "@capacitor/app";
import { DEFAULT_CONFIG, type GameConfig, type GameState } from "./core/game-state";
import { GameEngine } from "./core/game-engine";
import { loadBundledWordRepository, type WordBankState, type WordRepository } from "./data/word-repository";
import { GameStorage } from "./storage/game-storage";
import { PlayerValidationError, safeImposterCount, validatePlayerNames } from "./security/input-validator";
import { PrivacyManager } from "./security/privacy-manager";
import { haptic } from "./ui/feedback";
import { Modal } from "./ui/modal";
import { aboutContent, advancedSettingsContent, renderApp, updateDiscussionLiveUI, type AppView, type SetupDraft } from "./ui/screens/app-renderer";
import { el, PlayerAvatar } from "./ui/components/elements";

type UpdateMode = "render" | "discussion-patch";

class AppController {
  private view: AppView = "home";
  private wordBankState: WordBankState = "loading";
  private wordBankError: string | null = null;
  private repository: WordRepository | null = null;
  private engine: GameEngine | null = null;
  private resumable: GameState | null = null;
  private readonly storage = new GameStorage(window.localStorage);
  private readonly privacy = new PrivacyManager();
  private readonly modal: Modal;
  private discussionTicker: number | null = null;
  private storageWarningShown = false;
  private wakeLock: WakeLockSentinel | null = null;
  private wakeLockPending = false;
  private pendingUpdate: (() => void) | null = null;
  private draft: SetupDraft;

  constructor(private readonly root: HTMLElement, modalRoot: HTMLElement) {
    this.modal = new Modal(modalRoot);
    const cached = this.storage.loadNames();
    this.draft = {
      names: Array.from({ length: Math.max(5, Math.min(12, cached.length || 5)) }, (_, index) => cached[index] ?? `Người chơi ${index + 1}`),
      moderatorName: "Quản trò",
      config: { ...DEFAULT_CONFIG },
      error: null,
    };
  }

  async initialize(): Promise<void> {
    this.resumable = this.storage.load();
    await this.privacy.attach();
    window.addEventListener("online", this.render);
    window.addEventListener("offline", this.render);
    document.addEventListener("visibilitychange", () => void this.syncWakeLock());
    try {
      await App.addListener("backButton", ({ canGoBack }) => {
        if (this.view === "game" && this.engine && !this.engine.getGameState().gameOver) {
          if (window.confirm("Tạm rời ván? Tiến trình sẽ được lưu để tiếp tục sau.")) this.goHome();
        } else if (this.view !== "home") this.goHome();
        else if (!canGoBack) void App.exitApp();
      });
    } catch { /* browser or unsupported native shell */ }
    this.render();
    await this.loadWords();
  }

  private async loadWords(): Promise<void> {
    this.wordBankState = "loading";
    this.wordBankError = null;
    this.render();
    try {
      this.repository = await loadBundledWordRepository();
      this.wordBankState = "ready";
    } catch (error) {
      this.repository = null;
      this.wordBankState = "error";
      this.wordBankError = error instanceof Error ? error.message : "WORD_BANK_INVALID";
    }
    this.render();
  }

  private readonly render = (): void => {
    this.privacy.clearSubscribers();
    renderApp(this.root, {
      view: this.view,
      wordBankState: this.wordBankState,
      wordBankError: this.wordBankError,
      availableTopics: this.repository?.availableTopics ?? [],
      resumable: this.resumable,
      game: this.engine?.getGameState() ?? null,
      draft: this.draft,
      privacy: this.privacy,
      actions: {
        goHome: () => this.goHome(),
        goPlayers: () => this.goPlayers(),
        goSettings: () => this.goSettings(),
        showAbout: () => this.showAbout(),
        resume: () => this.resume(),
        discardResume: () => this.discardResume(),
        retryWords: () => void this.loadWords(),
        updateName: (index, value) => { this.draft.names[index] = value; this.draft.error = null; },
        updateModeratorName: (value) => { this.draft.moderatorName = value; this.draft.error = null; },
        addPlayer: () => this.addPlayer(),
        removePlayer: (index) => this.removePlayer(index),
        updateConfig: (patch) => this.updateConfig(patch),
        showAdvancedSettings: () => this.showAdvancedSettings(),
        showGameOptions: () => this.showGameOptions(),
        startGame: () => this.startGame(),
        markRoleSeen: () => this.transition(() => this.engine!.markRoleSeen(), "light"),
        continuePass: () => this.transition(() => this.engine!.continueAfterPass()),
        confirmModeratorHandoff: () => this.transition(() => this.engine!.confirmModeratorHandoff(), "medium"),
        advanceClueTurn: () => this.transition(() => this.engine!.advanceClueTurn(), "light"),
        extendClueTurn: () => this.transition(() => this.engine!.extendClueTurn(), undefined, "discussion-patch"),
        toggleTimer: () => this.toggleDiscussionTimer(),
        addTimerTime: () => this.transition(() => this.engine!.addDiscussionTime(), undefined, "discussion-patch"),
        startCooldown: () => this.transition(() => this.engine!.startCooldown(), "medium", "discussion-patch"),
        toggleSpeakingQueue: (id) => this.transition(() => this.engine!.toggleSpeakingQueue(id), "light", "discussion-patch"),
        advanceSpeakingQueue: () => this.transition(() => this.engine!.advanceSpeakingQueue(), "light", "discussion-patch"),
        clearSpeakingQueue: () => this.transition(() => this.engine!.clearSpeakingQueue(), undefined, "discussion-patch"),
        signalYield: () => this.signalYield(),
        beginVote: () => this.transition(() => this.engine!.beginVote()),
        selectVote: (id) => this.transition(() => this.engine!.selectVote(id), "light"),
        requestVoteConfirmation: () => this.requestVoteConfirmation(),
        continueElimination: () => this.transition(() => this.engine!.continueFromElimination()),
        playAgain: () => this.playAgain(),
      },
    });
    this.syncDiscussionTicker();
    void this.syncWakeLock();
    this.showPendingUpdateIfSafe();
  };

  private goHome(): void {
    this.privacy.hideSecrets();
    this.modal.close();
    const state = this.engine?.getGameState();
    if (state?.gameOver) {
      this.storage.clear();
      this.resumable = null;
      this.engine = null;
    } else if (state) {
      this.resumable = state;
    }
    this.view = "home";
    this.render();
  }

  private goPlayers(): void {
    if (this.wordBankState !== "ready") return;
    this.view = "players";
    this.draft.error = null;
    this.render();
  }

  private goSettings(): void {
    try {
      this.draft.names = validatePlayerNames(this.draft.names);
      this.storage.saveNames(this.draft.names);
      this.draft.config.imposterCount = safeImposterCount(this.draft.names.length, this.draft.config.imposterCount);
      this.draft.error = null;
      this.view = "settings";
    } catch (error) {
      this.draft.error = this.validationMessage(error);
      this.view = "players";
    }
    this.render();
  }

  private addPlayer(): void {
    if (this.draft.names.length >= 12) return;
    this.draft.names.push(`Người chơi ${this.draft.names.length + 1}`);
    this.render();
  }

  private removePlayer(index: number): void {
    if (this.draft.names.length <= 3) {
      this.draft.error = "Cần ít nhất 3 người chơi.";
    } else {
      this.draft.names.splice(index, 1);
      this.draft.error = null;
    }
    this.render();
  }

  private updateConfig(patch: Partial<GameConfig>): void {
    this.draft.config = { ...this.draft.config, ...patch };
    if (patch.timerMinutes !== undefined && patch.discussionSeconds === undefined) {
      this.draft.config.discussionSeconds = patch.timerMinutes * 60;
    }
    this.render();
  }

  private startGame(): void {
    if (!this.repository || this.wordBankState !== "ready") return;
    try {
      const names = validatePlayerNames(this.draft.names);
      this.engine = new GameEngine(this.repository, names, this.draft.config, {
        moderatorName: this.draft.moderatorName,
        excludedPairIds: this.storage.loadWordHistory(),
      });
      const state = this.engine.start();
      this.storage.saveNames(names);
      this.saveState(state);
      if (state.wordSelection) this.storage.rememberWord(state.wordSelection.pairId);
      this.resumable = state;
      this.view = "game";
      if (state.config.hapticsEnabled) void haptic("medium");
      this.render();
    } catch (error) {
      this.draft.error = this.validationMessage(error);
      this.view = "players";
      this.render();
    }
  }

  private resume(): void {
    if (!this.repository || !this.resumable) return;
    try {
      this.engine = GameEngine.restore(this.repository, this.resumable);
      this.draft.names = this.resumable.players.map((player) => player.name);
      this.draft.config = { ...this.resumable.config };
      this.draft.moderatorName = this.resumable.moderator.name ?? "Quản trò";
      this.view = "game";
      this.render();
    } catch {
      this.discardResume();
    }
  }

  private discardResume(): void {
    this.storage.clear();
    this.resumable = null;
    this.engine = null;
    this.render();
  }

  private transition(change: () => GameState, feedback?: "light" | "medium" | "heavy", updateMode: UpdateMode = "render"): void {
    try {
      this.privacy.hideSecrets();
      const before = this.engine?.getGameState();
      const state = change();
      this.saveState(state);
      this.resumable = state;
      if (feedback && state.config.hapticsEnabled) void haptic(feedback);
      const canPatch = updateMode === "discussion-patch"
        && before?.phase === "discussion"
        && state.phase === "discussion"
        && before.discussion.stage === state.discussion.stage;
      if (canPatch) {
        updateDiscussionLiveUI(this.root, state, Date.now());
        this.syncDiscussionTicker();
        void this.syncWakeLock();
      } else {
        this.render();
      }
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "Không thể tiếp tục ván chơi.");
    }
  }

  private toggleDiscussionTimer(): void {
    const timer = this.engine?.getGameState().discussion.timer;
    if (timer?.status === "running") {
      this.transition(() => this.engine!.pauseDiscussionTimer(), undefined, "discussion-patch");
    } else if (timer?.status === "paused") {
      this.transition(() => this.engine!.resumeDiscussionTimer(), undefined, "discussion-patch");
    }
  }

  private requestVoteConfirmation(): void {
    const state = this.engine?.getGameState();
    const selectedId = state?.selection.method === "consensus" ? state.selection.selectedPlayerId : null;
    const player = state?.players.find((candidate) => candidate.id === selectedId);
    if (!player) return;
    this.modal.open(`Bạn chọn ${player.name}?`, [
      el("div", { className: "confirm-player" }, PlayerAvatar(player, "hero"), el("strong", { text: player.name })),
      el("p", { className: "center muted", text: "Lựa chọn này sẽ loại người chơi khỏi ván." }),
    ], [
      { label: "HỦY", kind: "secondary", onSelect: () => undefined },
      { label: "XÁC NHẬN", onSelect: () => this.transition(() => this.engine!.confirmVote(), "heavy") },
    ]);
  }

  private playAgain(): void {
    this.storage.clear();
    this.resumable = null;
    this.engine = null;
    this.view = "settings";
    this.render();
  }

  private showGameOptions(): void {
    const state = this.engine?.getGameState();
    if (!state || state.gameOver || state.phase === "result") return;
    this.privacy.hideSecrets();
    this.modal.open("Tùy chọn ván", [
      el("p", { text: "Tạm rời để tiếp tục sau, hoặc kết thúc hẳn ván này và xem toàn bộ đáp án." }),
    ], [
      { label: "TẠM RỜI", kind: "secondary", onSelect: () => this.goHome() },
      { label: "KẾT THÚC SỚM", kind: "danger", onSelect: () => this.confirmEarlyEnd() },
    ]);
  }

  private confirmEarlyEnd(): void {
    this.privacy.hideSecrets();
    this.modal.open("Kết thúc ván sớm?", [
      el("p", { text: "Toàn bộ role và từ bí mật sẽ được công bố. Ván không thể tiếp tục và không phe nào được tính thắng." }),
    ], [
      { label: "HỦY", kind: "secondary", onSelect: () => undefined },
      { label: "KẾT THÚC & XEM ĐÁP ÁN", kind: "danger", onSelect: () => this.transition(() => this.engine!.endGameEarly(), "heavy") },
    ]);
  }

  private syncDiscussionTicker(): void {
    const active = this.view === "game" && this.engine?.getGameState().phase === "discussion";
    if (active && this.discussionTicker === null) {
      this.discussionTicker = window.setInterval(() => {
        if (!this.engine || this.view !== "game") return;
        const before = this.engine.getGameState().updatedAt;
        const state = this.engine.tickDiscussion();
        if (state.updatedAt !== before) {
          this.saveState(state);
          this.resumable = state;
          void this.syncWakeLock();
        }
        updateDiscussionLiveUI(this.root, state, Date.now());
      }, 1000);
    } else if (!active && this.discussionTicker !== null) {
      window.clearInterval(this.discussionTicker);
      this.discussionTicker = null;
    }
  }

  private saveState(state: GameState): void {
    if (this.storage.save(state) || this.storageWarningShown) return;
    this.storageWarningShown = true;
    queueMicrotask(() => this.modal.open("Không thể lưu ván", [
      el("p", { text: "Ván vẫn chơi được, nhưng có thể không khôi phục được nếu đóng hoặc tải lại ứng dụng." }),
    ], [{ label: "ĐÃ HIỂU", onSelect: () => undefined }]));
  }

  private signalYield(): void {
    const state = this.engine?.getGameState();
    if (state?.config.hapticsEnabled) void haptic("heavy");
    if (state?.config.soundEnabled) this.playSignalTone();
    this.root.classList.remove("is-yield-signaling");
    requestAnimationFrame(() => this.root.classList.add("is-yield-signaling"));
    window.setTimeout(() => this.root.classList.remove("is-yield-signaling"), 900);
  }

  private playSignalTone(): void {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
      oscillator.addEventListener("ended", () => void context.close());
    } catch { /* enhancement only */ }
  }

  offerUpdate(apply: () => void): void {
    this.pendingUpdate = apply;
    this.showPendingUpdateIfSafe();
  }

  private showPendingUpdateIfSafe(): void {
    if (!this.pendingUpdate) return;
    const phase = this.engine?.getGameState().phase;
    if (this.view === "game" && (phase === "reveal" || phase === "pass")) return;
    const apply = this.pendingUpdate;
    this.pendingUpdate = null;
    this.modal.open("Đã có phiên bản mới", [
      el("p", { text: "Ứng dụng đã tải xong bản mới. Cập nhật bây giờ sẽ tải lại giao diện; ván hiện tại đã được lưu." }),
    ], [
      { label: "SAU", kind: "secondary", onSelect: () => undefined },
      { label: "CẬP NHẬT", onSelect: apply },
    ]);
  }

  private async syncWakeLock(): Promise<void> {
    const state = this.engine?.getGameState();
    const shouldHold = document.visibilityState === "visible"
      && this.view === "game"
      && state?.phase === "discussion"
      && state.discussion.timer.status === "running";
    if (!shouldHold) {
      await this.wakeLock?.release().catch(() => undefined);
      this.wakeLock = null;
      return;
    }
    if (this.wakeLock || this.wakeLockPending || !("wakeLock" in navigator)) return;
    this.wakeLockPending = true;
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => { this.wakeLock = null; });
    } catch {
      this.wakeLock = null;
    } finally {
      this.wakeLockPending = false;
    }
  }

  private showAdvancedSettings(): void {
    const repaint = (patch: Partial<GameConfig>): void => {
      this.draft.config = { ...this.draft.config, ...patch };
      this.render();
      this.showAdvancedSettings();
    };
    this.modal.open("Cài đặt nâng cao", advancedSettingsContent(this.draft.config, repaint), [
      { label: "XONG", onSelect: () => undefined },
    ]);
  }

  private showAbout(): void {
    this.modal.open("Cách chơi & quyền riêng tư", aboutContent(), [{ label: "ĐÃ HIỂU", onSelect: () => undefined }]);
  }

  private showError(message: string): void {
    this.modal.open("Có lỗi xảy ra", [el("p", { text: message })], [{ label: "ĐÓNG", onSelect: () => undefined }]);
  }

  private validationMessage(error: unknown): string {
    if (error instanceof Error && error.message === "MODERATOR_NAME_REQUIRED") return "Hãy nhập tên quản trò hoặc tắt chế độ quản trò.";
    if (error instanceof Error && error.message === "WORD_BANK_FILTER_EMPTY") return "Không có từ phù hợp với bộ lọc đã chọn.";
    if (!(error instanceof PlayerValidationError)) return error instanceof Error ? error.message : "Dữ liệu không hợp lệ.";
    return ({
      EMPTY_NAME: "Tên người chơi không được để trống.",
      DUPLICATE_NAME: "Mỗi người chơi cần một tên khác nhau.",
      INVALID_COUNT: "Số người chơi phải từ 3 đến 12.",
    })[error.code];
  }
}

const root = document.querySelector<HTMLElement>("#app");
const modalRoot = document.querySelector<HTMLElement>("#modal-root");
if (!root || !modalRoot) throw new Error("APP_ROOT_MISSING");

const app = new AppController(root, modalRoot);
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => app.offerUpdate(() => void updateSW(true)),
});
void app.initialize();
