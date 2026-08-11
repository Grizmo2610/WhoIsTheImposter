import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

export class PrivacyManager {
  private hidden = true;
  private readonly listeners = new Set<(hidden: boolean) => void>();
  private nativeHandle: PluginListenerHandle | null = null;

  readonly hideSecrets = (): void => {
    if (this.hidden) return;
    this.hidden = true;
    this.emit();
  };

  reveal(): void {
    this.hidden = false;
    this.emit();
  }

  isHidden(): boolean {
    return this.hidden;
  }

  subscribe(listener: (hidden: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.hidden);
    return () => this.listeners.delete(listener);
  }

  clearSubscribers(): void {
    this.listeners.clear();
  }

  async attach(): Promise<void> {
    window.addEventListener("blur", this.hideSecrets);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    try {
      this.nativeHandle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) this.hideSecrets();
      });
    } catch {
      this.nativeHandle = null;
    }
  }

  async detach(): Promise<void> {
    window.removeEventListener("blur", this.hideSecrets);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    await this.nativeHandle?.remove();
    this.nativeHandle = null;
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.hideSecrets();
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.hidden));
  }
}
