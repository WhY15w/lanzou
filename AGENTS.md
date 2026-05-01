# AGENTS.md

## Quick commands

| Task | Command |
|------|---------|
| Dev server (hot reload) | `pnpm run dev` |
| Build (type-check + compile) | `pnpm run build` |
| Start production | `pnpm start` |
| Lint | `pnpm run lint` |
| Lint with auto-fix | `pnpm run lint:fix` |
| Format | `pnpm run format` |

## Architecture

- Hono HTTP server on port 1103, entrypoint: `src/app.ts`
- Single route mounted at `/lanzou` via `src/routes/lanzou.ts`
- Parses Lanzou (蓝奏云) file-sharing links — fetches pages, handles anti-scraping challenges, extracts download URLs
- No test framework configured; no CI/CD

## Critical TypeScript quirks

**All local imports MUST use `.js` extension** — even when the source file is `.ts`. This is enforced by `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` + `"type": "module"`. Getting this wrong causes `ERR_MODULE_NOT_FOUND` at runtime.

```ts
// Correct
import config from './config/config.js';
// Wrong — will fail at runtime
import config from './config/config';
```

**`verbatimModuleSyntax` is ON.** Type-only imports must use `import type`. Re-exports of types must use `export type`. Omitting `type` on a type-only import will be removed from the emit and break runtime.

**`isolatedModules` is ON.** No const enums, no ambient declarations without `declare global`, no re-exports that the transpiler can't resolve on its own.

## Tooling conventions

- **Package manager:** pnpm (v10.33.0). Do not use npm or yarn.
- **Linter:** oxlint — not ESLint. Config is baked into the CLI; there is no config file.
- **Formatter:** Prettier with `@trivago/prettier-plugin-sort-imports`. Run `pnpm run format` to sort imports and format. Import ordering is enforced by the plugin; don't manually reorder imports.
- **Build:** TypeScript emits to `dist/`. Check `dist/` is in `.gitignore` — never commit it.
