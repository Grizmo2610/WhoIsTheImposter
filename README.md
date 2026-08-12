# Ai là kẻ giả danh

An offline-first, pass-the-phone social deduction game for the web, PWA, and Android. The entire core game runs locally: no account, room server, or internet connection is required after the application assets are installed or cached.

Vietnamese documentation: README.vie.md.

## Highlights

* One Vite + TypeScript frontend shared by Web/PWA and Capacitor Android.
* Bundled Vietnamese word bank with explicit loading, ready, and error states.
* Pure game engine separated from DOM, storage, and platform APIs.
* Versioned local state and resume support for every game phase, including elimination.
* Safe player-name rendering through DOM text nodes; no user-controlled HTML parsing.
* Physical 3D hold-to-flip secret card using authored 2:3 artwork; no-word mode uses a dedicated red face to identify the Imposter and present the assigned hint.
* Automatic secret hiding on release/blur/background and Android `FLAG_SECURE`.
* Android system Back navigation closes dialogs, steps back through setup, and confirms before pausing an active game.
* Token-driven Ghost-Flame Mystery design with a responsive CSS spectral background, clue-card controls, dark cyan-edged CTAs, stable player identity colors, reduced motion, and 48px+ Android touch targets.
* Supplied Vietnamese ghost hero lockup on Home; no fixed-ratio full-screen background image is required at runtime.
* Vitest unit coverage plus Playwright specifications for gameplay, resume, XSS, and offline launch.

## Architecture

```text
src/                         shared application source
  core/                      pure game rules and state machine
  data/                      single JSON database + validator/selector
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

Sync the web assets and Capacitor plugins:

```sh
npx cap sync android
```

Open the native Android project in Android Studio:

```sh
npx cap open android
```

`MainActivity` applies `FLAG_SECURE`, so secrets are excluded from screenshots, screen recording, and the recent-apps preview. Android backup is disabled because the local state can contain secret roles and words.

The shared UI also handles Android-specific interaction details: the soft keyboard resizes the content viewport, focused controls remain stable after UI updates, hover styling is limited to devices that actually support hover, and hold-to-reveal provides light haptic feedback. System Back follows this order: close the open dialog, return from settings to players, return from players to home, confirm and save before leaving a running game, then exit from home.

The optional confrontation timer allocates 45 seconds per surviving player, persists its deadline with the resumable game, and vibrates once at `0:00`.

Run the app directly on a connected Android device:

```sh
npx cap run android
```

Build a debug APK without running browser tests:

```sh
npm run typecheck
npm run test
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

On Windows CMD:

```cmd
cd android
gradlew.bat assembleDebug
```

The generated file is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

No iOS dependency, native project, or build pipeline is included in this release.

## Offline and data model

`src/data/vocabulary_database.json` is the only runtime word source. Every record keeps the exact `id / topics / hint / related` schema. The bundled validator rejects malformed groups, while the selector filters the eight shared topics with OR semantics and blocks unsupported configurations without falling back outside the user's selection.

Vite PWA/Workbox precaches the application shell, compiled code, styles, word data, icons, and local assets. Since the word bank is imported into the application bundle, gameplay does not wait on a runtime fetch.

## Security and privacy notes

* Player names are normalized to 1–20 characters, stripped of control characters, and rendered with `textContent`/text nodes.
* Secrets are removed from the active DOM and accessibility tree whenever they are hidden.
* `pointerup`, `pointercancel`, lost pointer capture, blur, visibility changes, and Capacitor app background events all hide secrets.
* Stored state is local to the device and contains game secrets to support reliable offline resume.

See `docs/architecture.md`, `docs/wordbank.md`, the [Neon Noir Party design system](design-system/who-is-the-imposter/MASTER.md), and `CHANGELOG.md`.

## How to play

1. Add 3–12 players, choose the number of imposters, word mode, and one or more topics.
2. Pass the device to the named player. That player holds the secret card to flip it, memorizes the displayed word or hint, releases to hide it, and taps **Chuyển máy cho người tiếp theo**. For the final player, the action becomes **Bắt đầu vòng đối chứng**. Similar-word and different-group deals remain role-neutral; no-word mode identifies the Imposter with a dedicated red card face.
3. After everyone has viewed their card, take turns giving indirect descriptions. Never say, spell, or translate the exact secret word.
4. Discuss as a group, select one surviving player by consensus, and confirm the elimination. The current offline flow uses one shared group decision rather than separate ballots.
5. In multi-round mode, civilians win when no imposters remain; imposters win when their surviving count is at least the surviving civilian count. In single-round mode, civilians win only if the first eliminated player is an imposter.

The available deal modes are **Similar word**, **No word**, and **Different group**. For detailed rules, privacy behavior, resume behavior, and fair-play tips, read the [Vietnamese gameplay guide](docs/how-to-play.md).

## Project links

* [Repository](https://github.com/Grizmo2610/WhoIsTheImposter)
* [Open issues](https://github.com/Grizmo2610/WhoIsTheImposter/issues)
* [Report a bug](https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=bug&template=bug-report.md)
* [Request a feature](https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request.md)

## Optional legacy/full-stack tools

Historical online/full-stack material is not part of the supported runtime. The authoritative path is the local TypeScript engine under `src/core/` with the single bundled JSON database under `src/data/`.

## Roadmap

* [x] Offline pass-and-play Web/PWA experience.
* [x] Shared Capacitor Android wrapper.
* [x] Bundled word bank and versioned offline resume.
* [x] Privacy-safe hold-to-flip deal flow with an explicit no-word Imposter face.
* [ ] Native iOS wrapper and release pipeline.
* [ ] Optional score tracking and statistics without weakening offline privacy.

Roadmap discussion and accepted work are tracked in [GitHub Issues](https://github.com/Grizmo2610/WhoIsTheImposter/issues).

## Contributing

1. Fork or clone the project.
2. Create a dedicated branch such as `feature/short-description` or `fix/short-description`; do not work directly on `main`.
3. Preserve the existing word-bank schema and keep gameplay rules in the pure core instead of duplicating them in UI or native code.
4. Run `npm run typecheck`, `npm run test`, and `npm run build` for relevant changes. Browser E2E checks remain a separate manual step when requested.
5. Commit the focused change, push the branch, and open a pull request against `main`. Do not force-push or auto-merge.

Please document user-visible behavior in both README files, the gameplay guide when rules change, and `CHANGELOG.md`.

## Contact and acknowledgements

Maintainer: [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com).

The project uses Vite, TypeScript, Capacitor, Vitest, Playwright specifications, and community-maintained open-source packages. See the repository history and contributor graph for individual contributions.

Space Grotesk and Plus Jakarta Sans are bundled locally for offline use under the SIL Open Font License; the corresponding license texts are stored in `public/fonts/`.

## License

MIT — see LICENSE.txt.
