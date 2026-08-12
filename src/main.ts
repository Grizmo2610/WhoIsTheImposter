import "./styles/main.css";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import { DEFAULT_CONFIG, type GameConfig, type GameState } from "./core/game-state";
import { GameEngine } from "./core/game-engine";
import { loadBundledWordDatabase, type WordBankState, type WordGroup } from "./data/word-database";
import { selectionAvailability, WordSelectionError, type WordSelectionErrorCode } from "./data/word-selector";
import { GameStorage } from "./storage/game-storage";
import { PlayerValidationError, safeImposterCount, validatePlayerNames } from "./security/input-validator";
import { PrivacyManager } from "./security/privacy-manager";
import { haptic, timerAlert } from "./ui/feedback";
import { Modal } from "./ui/modal";
import { aboutContent, advancedSettingsContent, renderApp, type AppView, type SetupDraft } from "./ui/screens/app-renderer";
import { el, PlayerAvatar } from "./ui/components/elements";

document.documentElement.dataset.platform = Capacitor.getPlatform();

class AppController {
  private view: AppView = "home";
  private wordBankState: WordBankState = "loading";
  private wordBankError: string | null = null;
  private database: readonly WordGroup[] | null = null;
  private engine: GameEngine | null = null;
  private resumable: GameState | null = null;
  private readonly storage = new GameStorage(window.localStorage);
  private readonly privacy = new PrivacyManager();
  private readonly modal: Modal;
  private draft: SetupDraft;

  constructor(private readonly root: HTMLElement, modalRoot: HTMLElement) {
    this.modal = new Modal(modalRoot);
    const cached = this.storage.loadNames();
    this.draft = {
      names: this.defaultPlayers(cached),
      config: this.defaultConfig(),
      error: null,
    };
  }

  async initialize(): Promise<void> {
    this.resumable = this.storage.load();
    await this.privacy.attach();
    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorApp.addListener("backButton", this.handleBackButton);
      } catch {
        // The web app remains usable if a custom native shell omits the App plugin.
      }
    }
    window.addEventListener("online", this.render);
    window.addEventListener("offline", this.render);
    this.render();
    await this.loadWords();
  }

  private async loadWords(): Promise<void> {
    this.wordBankState = "loading";
    this.wordBankError = null;
    this.render();
    try {
      this.database = await loadBundledWordDatabase();
      this.wordBankState = "ready";
    } catch (error) {
      this.database = null;
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
      wordSelectionError: this.wordSelectionMessage(),
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
        discardResume: () => this.requestDiscardResume(),
        retryWords: () => void this.loadWords(),
        updateName: (index, value) => { this.draft.names[index] = value; this.draft.error = null; },
        addPlayer: () => this.addPlayer(),
        removePlayer: (index) => this.removePlayer(index),
        updateConfig: (patch) => this.updateConfig(patch),
        showAdvancedSettings: () => this.showAdvancedSettings(),
        startGame: () => this.startGame(),
        revealSecret: () => this.revealSecret(),
        hideSecret: () => this.privacy.hideSecrets(),
        markRoleSeen: () => this.markRoleSeen(),
        beginVote: () => this.transition(() => this.engine!.beginVote()),
        selectVote: (id) => this.transition(() => this.engine!.selectVote(id), "light"),
        requestVoteConfirmation: () => this.requestVoteConfirmation(),
        continueElimination: () => this.transition(() => this.engine!.continueFromElimination()),
        playAgain: () => this.playAgain(),
        timerExpired: () => void timerAlert(),
      },
    });
  };

  private goHome(): void {
    this.privacy.hideSecrets();
    this.modal.close();
    if (this.engine) {
      const state = this.engine.getGameState();
      if (state.gameOver) {
        this.storage.clear();
        this.resumable = null;
        this.engine = null;
      } else {
        this.storage.save(state);
        this.resumable = state;
      }
    }
    this.view = "home";
    this.render();
  }

  private revealSecret(): void {
    if (this.privacy.isHidden()) void haptic("light");
    this.privacy.reveal();
  }

  private readonly handleBackButton = (): void => {
    this.privacy.hideSecrets();
    if (this.modal.isOpen()) {
      this.modal.close();
      return;
    }
    if (this.view === "players") {
      this.goHome();
      return;
    }
    if (this.view === "settings") {
      this.goPlayers();
      return;
    }
    if (this.view === "game") {
      this.requestLeaveGame();
      return;
    }
    void CapacitorApp.exitApp();
  };

  private requestLeaveGame(): void {
    const state = this.engine?.getGameState();
    if (!state) {
      this.goHome();
      return;
    }
    this.modal.open(state.gameOver ? "Về trang chủ?" : "Tạm dừng ván chơi?", [
      el("p", {
        text: state.gameOver
          ? "Kết quả đã hoàn tất. Bạn có thể bắt đầu một ván mới từ trang chủ."
          : "Tiến trình hiện tại đã được lưu trên thiết bị và có thể tiếp tục sau.",
      }),
    ], [
      { label: "Ở LẠI", kind: "secondary", onSelect: () => undefined },
      { label: state.gameOver ? "VỀ TRANG CHỦ" : "LƯU & VỀ TRANG CHỦ", onSelect: () => this.goHome() },
    ]);
  }

  private goPlayers(): void {
    if (this.wordBankState !== "ready") return;
    if (this.view === "home") this.draft.names = this.defaultPlayers(this.draft.names);
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
    this.render();
  }

  private startGame(): void {
    if (!this.database || this.wordBankState !== "ready" || this.wordSelectionMessage()) return;
    try {
      const names = validatePlayerNames(this.draft.names);
      this.engine = new GameEngine(this.database, names, this.draft.config);
      const state = this.engine.start();
      this.storage.saveNames(names);
      this.storage.save(state);
      this.resumable = state;
      this.view = "game";
      void haptic("medium");
      this.render();
    } catch (error) {
      this.draft.error = this.validationMessage(error);
      this.view = error instanceof PlayerValidationError ? "players" : "settings";
      this.render();
    }
  }

  private resume(): void {
    if (!this.database || !this.resumable) return;
    try {
      this.engine = GameEngine.restore(this.database, this.resumable);
      if (this.engine.getGameState().phase === "pass") this.engine.continueAfterPass();
      this.draft.names = this.resumable.players.map((player) => player.name);
      this.draft.config = { ...this.resumable.config };
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

  private requestDiscardResume(): void {
    this.modal.open("Bỏ ván đang dở?", [
      el("p", { text: "Tiến trình, vai trò và từ bí mật của ván này sẽ bị xóa khỏi thiết bị." }),
    ], [
      { label: "HỦY", kind: "secondary", onSelect: () => undefined },
      { label: "BỎ VÁN", kind: "danger", onSelect: () => this.discardResume() },
    ]);
  }

  private transition(change: () => GameState, feedback?: "light" | "medium" | "heavy"): void {
    try {
      this.privacy.hideSecrets();
      const state = change();
      this.storage.save(state);
      this.resumable = state;
      if (feedback) void haptic(feedback);
      this.render();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "Không thể tiếp tục ván chơi.");
    }
  }

  private requestVoteConfirmation(): void {
    const state = this.engine?.getGameState();
    const player = state?.players.find((candidate) => candidate.id === state.vote.pendingTargetId);
    if (!player) return;
    this.modal.open(`BẠN CHỌN ${player.name.toLocaleUpperCase("vi")}?`, [
      el("div", { className: "confirm-player" }, PlayerAvatar(player, "hero"), el("strong", { text: player.name })),
    ], [
      { label: "HỦY", kind: "secondary", onSelect: () => undefined },
      { label: "XÁC NHẬN", onSelect: () => this.transition(() => this.engine!.confirmVote(), "medium") },
    ]);
  }

  private playAgain(): void {
    this.storage.clear();
    this.resumable = null;
    this.engine = null;
    this.draft.names = this.defaultPlayers(this.draft.names);
    this.draft.config = this.defaultConfig();
    this.draft.error = null;
    this.view = "players";
    this.render();
  }

  private markRoleSeen(): void {
    this.transition(() => this.engine!.markRoleSeen(), "light");
  }

  private defaultPlayers(source: string[]): string[] {
    return Array.from({ length: 4 }, (_, index) => source[index]?.trim() || `Người chơi ${index + 1}`);
  }

  private defaultConfig(): GameConfig {
    return { ...DEFAULT_CONFIG, selectedTopics: [...DEFAULT_CONFIG.selectedTopics] };
  }

  private wordSelectionMessage(): string | null {
    if (!this.database || this.wordBankState !== "ready") return null;
    const code = selectionAvailability({
      database: this.database,
      selectedTopics: this.draft.config.selectedTopics,
      mode: this.draft.config.imposterWordMode,
      imposterCount: this.draft.config.imposterCount,
    });
    return code ? this.wordSelectionErrorMessage(code) : null;
  }

  private wordSelectionErrorMessage(code: WordSelectionErrorCode): string {
    if (code === "NO_TOPICS_SELECTED") return "Hãy chọn ít nhất một chủ đề.";
    if (code === "NO_ELIGIBLE_GROUPS") return "Không có nhóm từ phù hợp với chủ đề đã chọn.";
    return "Không đủ nhóm từ cho số Kẻ giả danh hiện tại. Hãy chọn thêm chủ đề hoặc giảm số Kẻ giả danh.";
  }

  private showAdvancedSettings(): void {
    const repaint = (patch: Partial<GameConfig>): void => {
      this.draft.config = { ...this.draft.config, ...patch };
      this.render();
      this.showAdvancedSettings();
    };
    this.modal.open("Cài đặt nâng cao", advancedSettingsContent(this.draft.config, this.draft.names.length, repaint), [
      { label: "XONG", onSelect: () => undefined },
    ]);
  }

  private showAbout(): void {
    this.modal.open("Luật chơi", aboutContent(), [{ label: "ĐÃ HIỂU", onSelect: () => undefined }]);
  }

  private showError(message: string): void {
    this.modal.open("Có lỗi xảy ra", [el("p", { text: message })], [{ label: "ĐÓNG", onSelect: () => undefined }]);
  }

  private validationMessage(error: unknown): string {
    if (error instanceof WordSelectionError) return this.wordSelectionErrorMessage(error.code);
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

registerSW({ immediate: true });
const app = new AppController(root, modalRoot);
void app.initialize();
