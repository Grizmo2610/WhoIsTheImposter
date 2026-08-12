import { DangerButton, el, PrimaryButton, SecondaryButton, type Child } from "./components/elements";

export interface ModalAction {
  label: string;
  kind?: "primary" | "secondary" | "danger";
  onSelect: () => void;
}

export class Modal {
  private previousFocus: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {}

  open(title: string, content: Child[], actions: ModalAction[]): void {
    this.close(false);
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const titleId = `modal-title-${Date.now()}`;
    const buttons = actions.map((action) => {
      const select = (): void => { this.close(); action.onSelect(); };
      return action.kind === "secondary"
        ? SecondaryButton(action.label, select)
        : action.kind === "danger"
          ? DangerButton(action.label, select)
          : PrimaryButton(action.label, select);
    });
    this.dialog = el("div", {
      className: "modal",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId },
    },
    el("div", { className: "modal__scrim", attrs: { "aria-hidden": "true" }, onClick: () => this.close() }),
    el("section", { className: "modal__panel clue-card" },
      el("h2", { className: "modal__title", text: title, attrs: { id: titleId } }),
      el("div", { className: "modal__content" }, ...content),
      el("div", { className: "modal__actions" }, ...buttons),
    ));
    this.dialog.addEventListener("keydown", this.onKeyDown);
    this.root.replaceChildren(this.dialog);
    queueMicrotask(() => buttons[0]?.focus());
  }

  close(restoreFocus = true): void {
    this.dialog?.removeEventListener("keydown", this.onKeyDown);
    this.root.replaceChildren();
    this.dialog = null;
    if (restoreFocus) this.previousFocus?.focus();
  }

  isOpen(): boolean {
    return this.dialog !== null;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== "Tab" || !this.dialog) return;
    const focusable = [...this.dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((item) => !item.hasAttribute("disabled"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
