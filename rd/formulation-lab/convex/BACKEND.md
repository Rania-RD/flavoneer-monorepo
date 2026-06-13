# Backend Architecture & Guide

This document outlines the architecture, patterns, and standards for the Food R&D Lab backend (built on Convex).

## 1. Architecture Overview

The backend is organized into standard Convex modules:

- `schema.ts`: Defines the entire data model and indexes.
- `validators.ts`: Shared Zod-like validators (using `convex/values`) for consistent input validation across mutations.
- `projects.ts`, `runs.ts`, etc.: Feature-specific modules containing `query` and `mutation` functions.

### Data Model Philosophy

- **Relational-ish**: We use normalized tables for core entities (Projects, Runs, Key Ingredients) where data integrity is critical.
- **Denormalization**: We denormalize specific fields (like `projectName` or `userName`) into child records (like `runs` or `comments`) for read performance, but this requires careful management during updates.
- **Snapshots**: For historical records (like `runs`), we snapshot the recipe (phases/ingredients) at the time of the run. This ensures that changing a project's recipe _after_ a run doesn't alter historical data.

## 2. Coding Standards

### Mutations

- **Validators**: usage of `v...` validators is mandatory. Use shared validators from `validators.ts` for complex objects (e.g., `ingredientValidator`, `phaseValidator`).
- **Helpers**: Complex logic (like "updating a project's ingredients") should be extracted into helper functions _within the same file_ or a shared `lib/` file if truly reusable.
- **Atomic Operations**: Convex mutations are transactional by default. leveraging this to perform multi-table updates (e.g., "create project" + "create ingredients") safely.

### Queries

- **Enrichment**: Raw database documents often need "enrichment" (joining related data). Use helper functions like `enrichProject` or `enrichRun` to consistently format data for the frontend.
- **Performance**: Always use `withIndex` when querying. Avoid full table scans (`.collect()` without filters) unless the table is guaranteed to be tiny.

## 3. Common Patterns

### The "Enrichment" Pattern

Instead of returning raw table rows, wrap queries in an enrichment function:

```typescript
// projects.ts
async function enrichProject(ctx: QueryCtx, project: Doc<'projects'>) {
  const ingredients = await ctx.db ... // fetch ingredients
  return { ...project, ingredients };
}

export const get = query({
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    return enrichProject(ctx, project);
  }
});
```

### The "Snapshot" Pattern

When a `run` starts, we copy the current state of a project into `runPhases` and `runSteps`.

- **Source**: `projects` -> `recipePhases` -> `recipeSteps`
- **Destination**: `runs` -> `runPhases` -> `runSteps`

This separation preserves history.

## 4. Key Modules

- **Projects**: Core recipes. Complex update logic allows replacing ingredients/phases.
- **Runs**: Executing a recipe. Handles inventory deduction upon completion.
- **Inventory**: Stock management. Linked to `materialUsageLogs` for traceability.
