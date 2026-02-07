# Repository Guidelines

## Rules

- Only use native antd ui components
- Target on macos silicon devices

## Project Structure & Module Organization

- `src/main/` contains Electron main-process services (database, Ollama integration, updater).
- `src/preload.ts` and `src/renderer.ts` bridge the main and renderer processes.
- `src/components/` and `src/App.tsx` hold React UI components used by the renderer.
- `src/shared/` hosts shared utilities used across main/renderer.
- Build configs live at the repo root (`forge.config.ts`, `vite.*.config.ts`, `tsconfig.json`).
- Static assets and build outputs are in `assets/` and `out/` respectively.

## Build, Test, and Development Commands

- `npm run dev` starts the Electron app with Vite and hot reload.
- `npm run package` bundles the app without creating installers.
- `npm run make` creates platform installers via Electron Forge.
- `npm run publish` builds and publishes artifacts (requires publish config).
- `npm run lint` runs ESLint across `.ts` and `.tsx` files.

## Coding Style & Naming Conventions

- TypeScript + React with 2-space indentation, semicolons, and double quotes (match existing files).
- Components: `PascalCase` (e.g., `ImageGrid`), hooks: `useSomething`, files: `kebab-case` or `snake-case` as already used in `src/components/app/`.
- Prefer colocating UI logic in `src/components/app/` and main-process logic in `src/main/`.
- Keep shared types in `src/types.d.ts` or `src/shared/` as appropriate.
- Run `npm run lint` before pushing.

## Testing Guidelines

- No automated test runner is configured yet. If adding tests, introduce a framework (e.g., Vitest) and add a `npm test` script in `package.json`.
- Place unit tests near code (e.g., `src/components/app/__tests__/`) or in a top-level `tests/` directory.

## Commit & Pull Request Guidelines

- Commit history uses Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`). Keep messages scoped and imperative.
- PRs should include a short summary, testing performed (e.g., `npm run lint`), and screenshots for UI changes.

## Security & Configuration Notes

- Environment and build settings live in `forge.env.d.ts` and `forge.config.ts`; avoid hardcoding secrets.
- Validate file paths and user input in the main process to prevent unsafe file access.
