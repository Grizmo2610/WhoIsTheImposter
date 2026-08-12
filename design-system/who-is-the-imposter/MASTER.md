# Who Is The Imposter — Ghost-Flame Mystery Design System

## Direction

Dark Mystery + Ghost Detective with restrained neon-noir energy: near-black investigation room, spectral cyan flame, violet undertones, clue-card controls, stable player identity colors, bold display typography, and minimal metadata. The mood is mysterious and playful, never horror, medieval fantasy, generic cyberpunk, or children's UI.

Priority order: clarity, mystery, fast interaction, mobile ergonomics, consistency, accessibility, then party personality. Decoration must reinforce hierarchy and never compete with the secret card.

## Branding and atmosphere

- `public/assets/branding/home-hero-logo.png`: optimized transparent PNG of the supplied ghost mascot and Vietnamese title lockup, used only on Home and treated as the brightest object.
- `public/assets/cards/secret-card-back.png` and `secret-card-front.png`: the authored 2:3 card artwork. Runtime text is layered only inside the empty field of the front face.
- Full-screen illustrated background images are not part of the runtime visual system.
- Every screen receives one reusable `ghost-background` DOM layer with six responsive `ghost-wisp` shapes and nine sparse particles.
- Wisps stay near edges and corners. A code-driven dark central safe zone protects the logo, secret card, vote UI, and results at arbitrary aspect ratios.
- Motion uses only slow transform and opacity cycles of 8–18 seconds. Reduced-motion keeps a complete static spectral composition.

## Architecture

- Semantic DOM + TypeScript is the presentation layer.
- `src/core/` remains the only gameplay authority.
- UI components receive state and callbacks; they do not reproduce rules.
- Web/PWA and Capacitor Android use the same source and token system.
- No network font or image request is required at runtime. The font stacks use local names first and system fallbacks.

## Core tokens

```css
--bg-black: #05070B;
--bg-navy: #0B1020;
--color-bg-app: var(--bg-black);
--color-bg-surface: #090E18;
--color-bg-surface-2: #0D1423;
--color-bg-elevated: #111A2C;

--ghost-cyan: #22D3EE;
--ghost-blue: #3B82F6;
--ghost-violet: #8B5CF6;
--color-primary: var(--ghost-cyan);
--color-primary-soft: #67E8F9;

--danger-coral: #FF4D6D;
--color-danger: var(--danger-coral);
--color-success: #34D399;
--color-warning: #F59E0B;

--surface-dark: rgba(10,14,24,.78);
--surface-border: rgba(148,163,184,.16);

--color-text-primary: #F8FAFC;
--color-text-secondary: #AAB2C4;
--color-text-muted: #737B8C;
--color-text-disabled: #555C6D;
```

Primary actions use a dark indigo surface with a restrained cyan/violet spectral edge, never a full bright fill. Coral communicates destructive actions, errors, elimination, or Imposter results. Player colors never communicate role.

## Player identity

```css
--player-cyan: #22D3EE;
--player-coral: #FF6B6B;
--player-yellow: #FACC15;
--player-mint: #34D399;
--player-purple: #A78BFA;
--player-pink: #F472B6;
--player-orange: #FB923C;
--player-blue: #60A5FA;
```

An identity color is assigned by player order and stays unchanged throughout a game. Restored games keep their persisted colors.

## Typography

- Display and UI: `"Space Grotesk", system-ui, sans-serif`.
- Secret word only: `"Plus Jakarta Sans", "Space Grotesk", system-ui, sans-serif`, weight 800, in mystery yellow with a restrained glow and length-aware scaling. Text is never clipped with line clamp.
- Display XL: `clamp(42px, 8vw, 72px)`, 800, line-height 0.95.
- Heading XL: 40px, 800, line-height 1.05.
- Heading L: 32px, 800, line-height 1.1.
- Heading M: 24px, 700, line-height 1.2.
- Body L: 18px, 500, line-height 1.5.
- Body M: 16px, 500, line-height 1.5.
- Caption: 13px, 600–700, line-height 1.4.

ALL CAPS is limited to short labels, badges, categories, statuses, and concise CTA copy. Every screen should have no more than one title, one subtitle, one context label, one helper line, and one or two actions.

## Spacing, radius, borders, elevation, and motion

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 40px;
--space-9: 48px;

--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-xl: 22px;
--radius-pill: 999px;

--border-subtle: 1px solid rgba(255,255,255,.08);
--border-strong: 1px solid rgba(255,255,255,.14);
--border-focus: 2px solid var(--color-primary);

--shadow-card: 0 18px 50px rgba(0,0,0,.32);
--shadow-elevated: 0 24px 70px rgba(0,0,0,.42);
--shadow-glow-primary: 0 0 32px rgba(139,92,246,.22);
--shadow-glow-danger: 0 0 32px rgba(255,77,109,.20);

--motion-fast: 140ms;
--motion-normal: 220ms;
--motion-slow: 320ms;
--ease-standard: cubic-bezier(.2,.8,.2,1);
```

Allowed motion: fade, small scale/translate, card flip, and soft glow. Avoid long spins, continuous flashing, large bounce, and parallax. Reduced motion collapses animation and transition durations.

## Component contracts

- Primary button: 48px high, compact dark-indigo borderless surface, plain label, and restrained shadow.
- Secondary button: 48px high, borderless translucent surface without decorative corners or sweep effects.
- Danger button: borderless coral-tinted dark surface; only for destructive actions.
- Icon button: 48×48px on the Android/Web shared UI.
- Clue card: `rgba(10,14,24,.78)` body, subtle forensic corner mark, restrained backdrop blur, 14–22px radius.
- Offline badge: success-tinted surface and border; no white outline.
- Suspect card: avatar, sentence-case name, optional state. Selected evidence uses cyan/violet border, glow, and check mark.
- Modal: one dialog, trapped focus, strong scrim, `calc(100vw - 32px)` mobile width, 420px max.

## Screen contracts

### Home

Icon → logo → subtitle → resume card → primary CTA → secondary CTA → offline badge. Content stays between 480–520px on desktop.

### Reveal

`Người n / total` → `NGƯỜI ĐANG XEM` → player identity → secret card → `Giữ để xem · Thả tay để ẩn` → `CHUYỂN MÁY CHO NGƯỜI TIẾP THEO`; the final player uses `BẮT ĐẦU VÒNG ĐỐI CHỨNG`.

Round, alive count, mode, and rule descriptions never appear in the reveal focal area. The card always preserves the authored 2:3 aspect ratio: up to 310px wide on Android portrait while also respecting available viewport height, 250px in the mobile web flow, and 290px on desktop web. Hold flips it; release, cancel, lost capture, blur, tab hide, and app background hide it. The visible face contains the baked-in title plus a length-aware runtime value with unclipped Vietnamese diacritics. Role is never rendered during the deal.

There is no separate handoff screen. Confirming one hidden card immediately renders the next player's face-down card; the final confirmation immediately enters confrontation.

### Discussion

Round/alive context → `ĐỐI CHỨNG` → one instruction → optional timer → vote CTA.

### Vote

One title and a compact three-column Android phone grid; mobile Web uses two columns, tablet three, and desktop four. Selected state combines surface, glow, and a check icon. Confirmation happens in a separate modal.

### Elimination and result

Elimination shows the selected player, revealed role, a concise remaining-threat message when play continues, and one continuation action. It omits vote-count and redundant status labels. Final result keeps the winner as the only display-sized text and groups Imposter identity plus secret word in one result card.

## Responsive and accessibility guardrails

- The root `data-platform` value separates Web and Android presentation without duplicating screens: Web can use a wider desktop logo while Android also caps logo height to protect short portrait screens.

- Mobile below 600px; tablet 600–960px; desktop above 960px.
- Android Home and gameplay phases stay inside one dynamic viewport without scrolling; variable-length setup and settings remain scrollable. Never create nested page scrollbars.
- Landscape reduces vertical gaps and card height by roughly 10–15%, without scaling the whole UI.
- All Android-shared touch targets are at least 48×48 CSS px with at least 8px separation.
- Safe-area insets protect top, side, sticky action, and bottom gesture regions.
- Every interactive control uses native semantics, a descriptive accessible name, visible focus, pressed feedback, and a real disabled state.
- Primary text targets 4.5:1 contrast; secondary text targets at least 3:1.
- Player/role/status meaning always includes text, shape, or an icon instead of color alone.
- Browser zoom stays enabled.
