import "./styles/main.css";
import { registerSW } from "virtual:pwa-register";
import { DEFAULT_CONFIG, type GameConfig, type GameState } from "./core/game-state";
import { GameEngine } from "./core/game-engine";
import { loadBundledWordRepository, type WordBankState, type WordRepository } from "./data/word-repository";
import { GameStorage } from "./storage/game-storage";
import { PlayerValidationError, safeImposterCount, validatePlayerNames } from "./security/input-validator";
import { PrivacyManager } from "./security/privacy-manager";
import { haptic } from "./ui/feedback";
import { Modal } from "./ui/modal";
import { aboutContent, advancedSettingsContent, renderApp, type AppView, type SetupDraft } from "./ui/screens/app-renderer";
import { el, PlayerAvatar } from "./ui/components/elements";

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
  private draft: SetupDraft;

  constructor(private readonly root: HTMLElement, modalRoot: HTMLElement) {
    this.modal = new Modal(modalRoot);
    const cached = this.storage.loadNames();
    this.draft = {
      names: Array.from({ length: Math.max(5, Math.min(12, cached.length || 5)) }, (_, index) => cached[index] ?? `Người chơi ${index + 1}`),
      config: { ...DEFAULT_CONFIG },
      error: null,
    };
  }

  async initialize(): Promise<void> {
    this.resumable = this.storage.load();
    await this.privacy.attach();
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
        addPlayer: () => this.addPlayer(),
        removePlayer: (index) => this.removePlayer(index),
        updateConfig: (patch) => this.updateConfig(patch),
        showAdvancedSettings: () => this.showAdvancedSettings(),
        startGame: () => this.startGame(),
        markRoleSeen: () => this.transition(() => this.engine!.markRoleSeen(), "light"),
        continuePass: () => this.transition(() => this.engine!.continueAfterPass()),
        beginVote: () => this.transition(() => this.engine!.beginVote()),
        selectVote: (id) => this.transition(() => this.engine!.selectVote(id), "light"),
        requestVoteConfirmation: () => this.requestVoteConfirmation(),
        continueElimination: () => this.transition(() => this.engine!.continueFromElimination()),
        playAgain: () => this.playAgain(),
      },
    });
  };

  private goHome(): void {
    this.privacy.hideSecrets();
    this.modal.close();
    if (this.engine && !this.engine.getGameState().gameOver) this.resumable = this.engine.getGameState();
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
    this.render();
  }

  private startGame(): void {
    if (!this.repository || this.wordBankState !== "ready") return;
    try {
      const names = validatePlayerNames(this.draft.names);
      this.engine = new GameEngine(this.repository, names, this.draft.config);
      const state = this.engine.start();
      this.storage.saveNames(names);
      this.storage.save(state);
      this.resumable = state;
      this.view = "game";
      void haptic("medium");
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
