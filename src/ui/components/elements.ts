import type { Player } from "../../core/game-state";

export type Child = Node | string | null | undefined | false;
export type IconName = "arrow-left" | "minus" | "plus" | "x" | "check";

const ICON_PATHS: Record<IconName, string> = {
  "arrow-left": "M19 12H5m7-7-7 7 7 7",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
};

export function GameIcon(name: IconName, className = "game-icon"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add(className);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string; attrs?: Record<string, string>; onClick?: (event: MouseEvent) => void } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  Object.entries(options.attrs ?? {}).forEach(([name, value]) => node.setAttribute(name, value));
  if (options.onClick) node.addEventListener("click", (event) => options.onClick?.(event as MouseEvent));
  children.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

export function PrimaryButton(label: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const button = el("button", { className: "button mystery-button mystery-button--primary button--primary", text: label, onClick });
  button.type = "button";
  button.disabled = disabled;
  return button;
}

export function SecondaryButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el("button", { className: "button mystery-button mystery-button--secondary button--secondary", text: label, onClick });
  button.type = "button";
  return button;
}

export function DangerButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el("button", { className: "button mystery-button mystery-button--danger button--danger", text: label, onClick });
  button.type = "button";
  return button;
}

export function IconButton(label: string, icon: IconName, onClick: () => void): HTMLButtonElement {
  const button = el("button", {
    className: "icon-button",
    attrs: { "aria-label": label, title: label },
    onClick,
  }, GameIcon(icon));
  button.type = "button";
  return button;
}

export function GameHeader(eyebrow: string, onHome?: () => void): HTMLElement {
  return el("header", { className: "game-header" },
    onHome ? IconButton("Quay lại", "arrow-left", onHome) : el("span", { className: "game-header__spacer" }),
    el("p", { className: "game-header__eyebrow", text: eyebrow }),
    el("span", { className: "game-header__spacer" }),
  );
}

export function StatusBadge(state: "ready" | "loading" | "error", label?: string): HTMLElement {
  const text = label ?? ({ ready: "Sẵn sàng chơi offline", loading: "Đang chuẩn bị kho từ", error: "Kho từ chưa sẵn sàng" }[state]);
  return el("div", { className: `status-badge status-badge--${state}`, attrs: { role: "status" } },
    el("span", { className: "status-badge__dot", attrs: { "aria-hidden": "true" } }),
    el("span", { text }),
  );
}

export function PlayerAvatar(player: Pick<Player, "avatar" | "accent" | "name">, size = "normal"): HTMLElement {
  const avatar = el("span", {
    className: `player-avatar player-avatar--${size}`,
    text: player.avatar,
    attrs: { "aria-label": `Biểu tượng của ${player.name}` },
  });
  avatar.style.setProperty("--player-accent", player.accent);
  return avatar;
}

export function PlayerCard(player: Player, selected: boolean, onClick: () => void): HTMLButtonElement {
  const button = el("button", {
    className: `player-card suspect-card${selected ? " is-selected" : ""}`,
    attrs: { "aria-pressed": String(selected) },
    onClick,
  },
  el("span", { className: "player-card__selection", attrs: { "aria-hidden": "true" } }, GameIcon("check")),
  PlayerAvatar(player, "large"),
  el("span", { className: "player-card__name", text: player.name }),
  );
  button.type = "button";
  return button;
}

export function Stepper(label: string, value: number, onChange: (delta: number) => void): HTMLElement {
  return el("div", { className: "stepper" },
    el("p", { className: "stepper__label", text: label }),
    el("div", { className: "stepper__controls" },
      IconButton(`Giảm ${label.toLocaleLowerCase("vi")}`, "minus", () => onChange(-1)),
      el("output", { className: "stepper__value", text: String(value), attrs: { "aria-live": "polite" } }),
      IconButton(`Tăng ${label.toLocaleLowerCase("vi")}`, "plus", () => onChange(1)),
    ),
  );
}

export function Toggle(label: string, checked: boolean, onChange: () => void, description?: string): HTMLButtonElement {
  const button = el("button", {
    className: "toggle-row",
    attrs: { "aria-pressed": String(checked) },
    onClick: onChange,
  },
  el("span", { className: "toggle-row__copy" },
    el("strong", { text: label }),
    description ? el("small", { text: description }) : null,
  ),
  el("span", { className: `toggle${checked ? " is-on" : ""}`, attrs: { "aria-hidden": "true" } }, el("span")),
  );
  button.type = "button";
  return button;
}

export function screen(...children: Child[]): HTMLElement {
  const wisps = ["bottom-left", "bottom-right", "left", "right", "top-left", "top-right"]
    .map((position) => el("span", { className: `ghost-wisp ghost-wisp--${position}` }));
  const particles = Array.from({ length: 9 }, (_, index) => el("span", {
    className: `ghost-particle ghost-particle--${index + 1}`,
  }));
  const background = el("div", {
    className: "ghost-background",
    attrs: { "aria-hidden": "true" },
  }, ...wisps, ...particles);
  return el("main", { className: "screen", attrs: { tabindex: "-1" } }, background, el("div", { className: "screen__inner" }, ...children));
}
