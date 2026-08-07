# Agent Rules & Guidelines (AGENTS.md)

Welcome, AI Agent. When working within the **Who Is The Imposter?** codebase, you must strictly follow these rules:

## 1. Code Quality & Standards
* **Mimic Patterns**: Match the formatting, naming conventions, typing, and architectural patterns of surrounding code.
* **No Unverified Libraries**: Do not introduce new third-party libraries or frameworks unless explicitly required and verified in `package.json`, `requirements.txt`, or environment configuration files.
* **Minimal Comments**: Add code comments sparingly. Focus on *why*, not *what*. Never add conversational comments or chat with the user through code.

## 2. File Operations & Paths
* **Absolute Paths**: Always use absolute paths when reading or writing files via tools.
* **Preserve Documentation**: Keep `CHANGELOG.md`, `README.md`, `README.vie.md`, and files under `docs/` accurate and synchronized with any code changes or feature additions.
* **Do Not Proactively Create Random Docs**: Only create or modify documentation files when explicitly requested or when directly mandated by core workflows.

## 3. Storage & Backend Integrity
* **Repository Pattern**: Never bypass the `WordRepository` abstraction when dealing with word banks (`local`, `r2`, `d1`).
* **Environment Security**: Never log, expose, or commit secrets, API keys, or `.env` configuration files.

## 4. Execution & Verification
* **Self-Verification**: Verify changes by running appropriate test commands, linters, or checking health check endpoints (`/api/health`) when modifying the backend.
* **Safety First**: Explain any critical system or filesystem modifications before executing shell commands via `bash`.
