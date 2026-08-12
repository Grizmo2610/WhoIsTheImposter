# Agent Rules & Guidelines (AGENTS.md)

Welcome, AI Agent. When working within the **Who Is The Imposter?** codebase, you must strictly follow these rules:

## 1. Code Quality & Standards
* **Mimic Patterns**: Match the formatting, naming conventions, typing, and architectural patterns of surrounding code.
* **No Unverified Libraries**: Do not introduce new third-party libraries or frameworks unless explicitly required and verified in `package.json`, `requirements.txt`, or environment configuration files.
* **Minimal Comments**: Add code comments sparingly. Focus on *why*, not *what*. Never add conversational comments or chat with the user through code.

## 2. File Operations & Paths
* **Absolute Paths**: Always use absolute paths when reading or writing files via tools.
* **Preserve Documentation**: Keep `CHANGELOG.md`, `README.md`, `README.vie.md`, and files under `docs/` accurate and synchronized with any code changes or feature additions.
* **Preserve Existing Content**: When updating or modifying key files (such as `LICENSE`, `README.md`, `README.vie.md`, etc.), **never delete existing content unless explicitly requested**. Only append or add new content while retaining all previous sections and information.
* **Do Not Proactively Create Random Docs**: Only create or modify documentation files when explicitly requested or when directly mandated by core workflows.

## 3. Offline Data Integrity
* **Single source**: `src/data/vocabulary_database.json` is the only runtime word database. Keep filtering and selection in the typed data modules; never duplicate it in UI or native code.
* **No runtime backend**: Do not add API, CSV, D1, R2, or S3 word loading to the supported Web/PWA/Android path.
* **Environment Security**: Never log, expose, or commit secrets, API keys, or `.env` configuration files.

## 4. Execution & Verification
* **Self-Verification**: Verify changes with the appropriate typecheck, unit tests, and production build.
* **Safety First**: Explain any critical system or filesystem modifications before executing shell commands via `bash`.
* **Branch Isolation**: Always create and work on a dedicated feature/fix branch when making any code or documentation changes. **Never** modify code directly on `main` and **never** merge into `main` automatically.
