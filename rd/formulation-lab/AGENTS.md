# AI Agent Guide

## Quick Start

- **Web UI**: http://localhost:3001. Use this exact URL because it has the existing signed-in browser session; do not substitute `127.0.0.1`. Port `3000` is used by the landing page.
- **Test login**: `test@example.com` / `test1234`
- **Dev servers**: `pnpm dev:lab` (frontend) + `pnpm dev:backend` (backend)

At the end of each task, add a "Suggested improvement" with 2-3 sentences describing a potential change that would improve the project.

Rania owns this. Start: say hi + 1 motivating line.
Work style: telegraph; noun-phrases ok; drop grammar; min tokens.

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Project Structure

| Layer      | Location                                                              |
| ---------- | --------------------------------------------------------------------- |
| Pages      | `pages/` (Dashboard, Formulation, Runs, Inventory, Reports, Schedule) |
| Components | `components/` (modals, cards, layout)                                 |
| Backend    | `../../packages/backend/convex/` (queries, mutations, schema)         |
| Types      | `types.ts`                                                            |
| Design     | `DESIGN_GUIDE.md`                                                     |

## Key Conventions

- **The i18n Rule (Zero-English)**: Any new component or text added to the app MUST use the translation provider. No hardcoded English text is allowed anywhere in the codebase moving forward.
- All UI strings use `t('key')` for i18n (see `context/SettingsContext.tsx`)
- Use CSS logical properties (`start`/`end`/`ms`/`ps`) — never `left`/`right`/`ml`/`pl`
- All components must support dark mode
- Cards use `rounded-[2.5rem]` — see `DESIGN_GUIDE.md` for full styling rules
