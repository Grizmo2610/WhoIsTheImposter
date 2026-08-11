# Who Is The Imposter?

An offline-first, pass-the-phone social deduction game for the web, PWA, and Android. The entire core game runs locally: no account, room server, or internet connection is required after the application assets are installed or cached.

Vietnamese documentation: [README.vie.md](README.vie.md).

## Highlights

- One Vite + TypeScript frontend shared by Web/PWA and Capacitor Android.
- Bundled Vietnamese word bank with explicit loading, ready, and error states.
- Pure game engine separated from DOM, storage, and platform APIs.
- Versioned local state and resume support for every game phase, including elimination.
- Safe player-name rendering through DOM text nodes; no user-controlled HTML parsing.
- Hold-to-reveal privacy flow, automatic hiding on blur/background, and Android `FLAG_SECURE`.
- Mobile-first Dark Mystery + Party Pop design with landscape layouts, keyboard navigation, focus trapping, reduced motion, and 44px+ touch targets.
- Vitest unit coverage plus Playwright specifications for gameplay, resume, XSS, and offline launch.

## Architecture

```text
src/                         shared application source
  core/                      pure game rules and state machine
  data/                      WordRepository + bundled JSON data
  security/                  validation and privacy lifecycle
  storage/                   versioned persistence and migration
  ui/                        DOM screens and reusable components
  styles/                    design tokens and responsive layout
public/                      PWA manifest, icons, local assets
tests/unit/                  DOM-free Vitest tests
tests/e2e/                   Playwright specifications
android/                     Capacitor Android wrapper only
backend/                     optional legacy/experimental FastAPI service
dist/                        generated Web/PWA and Capacitor assets
```

The production path is:

```text
src → Vite build → dist → Web/PWA + Capacitor Android
```

The optional FastAPI backend is not used by local gameplay and is not required to build, start, resume, vote, or finish a game.

## Development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Production and static verification:

```sh
npm run typecheck
npm run test
npm run build
```

Browser end-to-end specifications are available but intentionally separate:

```sh
npm run test:e2e
```

## Android

Capacitor stays on major version 6 in this architectural refactor. The native project is generated and tracked under `android/`.

```sh
npm run cap:sync
npm run cap:open:android
```

`MainActivity` applies `FLAG_SECURE`, so secrets are excluded from screenshots, screen recording, and the recent-apps preview. Android backup is disabled because the local state can contain secret roles and words.

No iOS dependency, native project, or build pipeline is included in this release.

## Offline and data model

`src/data/word_pairs.json` keeps its original object schema unchanged. `src/data/word-topic-map.json` is auxiliary metadata exported from `backend/data/words.csv`; it lets different-topic mode select an actual different topic. If metadata is unavailable, the repository exposes an explicit deterministic fallback rather than claiming an arbitrary different index is a different topic.

Vite PWA/Workbox precaches the application shell, compiled code, styles, word data, icons, and local assets. Since the word bank is imported into the application bundle, gameplay does not wait on a runtime fetch.

## Security and privacy notes

- Player names are normalized to 1–20 characters, stripped of control characters, and rendered with `textContent`/text nodes.
- Secrets are removed from the active DOM and accessibility tree whenever they are hidden.
- `pointerup`, `pointercancel`, lost pointer capture, blur, visibility changes, and Capacitor app background events all hide secrets.
- Stored state is local to the device and contains game secrets to support reliable offline resume.

See [docs/architecture.md](docs/architecture.md), [docs/wordbank.md](docs/wordbank.md), and [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE.txt](LICENSE.txt).
