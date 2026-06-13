# AI Agent Guide

## Quick Start

- **Web UI**: http://localhost:3000
- **Test login**: `test@example.com` / `test1234`
- **Dev servers**: `npm run dev` (frontend) + `npx convex dev` (backend)

At the end of each task, add a "Suggested improvement" with 2-3 sentences describing a potential change that would improve the project.

Rania owns this. Start: say hi + 1 motivating line.
Work style: telegraph; noun-phrases ok; drop grammar; min tokens.

## Agent Protocol
- “Make a note” => edit AGENTS.md (shortcut; not a blocker). Ignore `CLAUDE.md`.
- No `./runner`. Guardrails: use `trash` for deletes.
- Bugs: add regression test when it fits.
- Keep files <~500 LOC; split/refactor as needed.
- Prefer end-to-end verify; if blocked, say what’s missing.
- New deps: quick health check (recent releases/commits, adoption).
- Style: telegraph. Drop filler/grammar. Min tokens (global AGENTS + replies).

## Docs
- Start: open docs before coding.
- Follow links until domain makes sense; honor `Read when` hints.
- Keep notes short; update docs when behavior/API changes (no ship w/o docs).
- Add `read_when` hints on cross-cutting docs.

## Build / Test
- Before handoff: run full gate (lint/typecheck/tests/docs).
- Keep it observable (logs, panes, tails, MCP/browser tools).
- Release: read `docs/RELEASING.md` (or find best checklist if missing).

## Language/Stack Notes
- TypeScript: use repo PM; keep files small; follow existing patterns.

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

<frontend_aesthetics>
Avoid “AI slop” UI. Be opinionated + distinctive.

Do:
- Typography: pick a real font; avoid Inter/Roboto/Arial/system defaults.
- Theme: commit to a palette; use CSS vars; bold accents > timid gradients.
- Motion: 1–2 high-impact moments (staggered reveal beats random micro-anim).
- Background: add depth (gradients/patterns), not flat default.

Avoid: purple-on-white clichés, generic component grids, predictable layouts.
</frontend_aesthetics>

## Project Structure

| Layer      | Location                                                              |
| ---------- | --------------------------------------------------------------------- |
| Pages      | `pages/` (Dashboard, Formulation, Runs, Inventory, Reports, Schedule) |
| Components | `components/` (modals, cards, layout)                                 |
| Backend    | `convex/` (Convex queries, mutations, schema)                         |
| Types      | `types.ts`                                                            |
| Design     | `DESIGN_GUIDE.md`                                                     |

## ⚠️ Backend Modification Rules

When modifying any Convex backend file (`convex/*.ts`):

1. **Always update both the `args` validator AND the `handler`** — they must stay in sync. If you add/remove/rename a field in the `args` object, the `handler` logic must reflect it, and vice versa.
2. **Update `convex/schema.ts`** if table columns change.
3. **Update `types.ts`** if the change affects frontend-facing types.
4. **Check calling code** — frontend mutations/queries must pass args matching the updated validator exactly. Extra or missing fields cause `ArgumentValidationError`.

Example pattern in `convex/*.ts`:

```ts
export const create = mutation({
  args: {
    // ← VALIDATOR: defines accepted fields
    name: v.string(),
    stock: v.number()
  },
  handler: async (ctx, args) => {
    // ← HANDLER: uses those fields
    return await ctx.db.insert('tableName', { ...args })
  }
})
```

## Key Conventions

- **The i18n Rule (Zero-English)**: Any new component or text added to the app MUST use the translation provider. No hardcoded English text is allowed anywhere in the codebase moving forward.
- All UI strings use `t('key')` for i18n (see `context/SettingsContext.tsx`)
- Use CSS logical properties (`start`/`end`/`ms`/`ps`) — never `left`/`right`/`ml`/`pl`
- All components must support dark mode
- Cards use `rounded-[2.5rem]` — see `DESIGN_GUIDE.md` for full styling rules

## Convex Notes

This project uses Convex as its backend. The Convex AI file installer did not provide generated guidelines in this repo, so backend work should start with `convex/BACKEND.md`, `convex/schema.ts`, and the relevant `convex/*.ts` module instead.
