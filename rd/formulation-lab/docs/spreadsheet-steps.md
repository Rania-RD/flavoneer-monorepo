---
read_when:
  - formulation editor
  - recipe step types
  - Convex recipe step schema
  - run snapshots
  - version history
---

# Spreadsheet Steps

`spreadsheet_note` is a recipe step type for compact, one-sheet tables inside a formulation step card. The default sheet is 8 rows by 6 columns. The maximum size is 50 rows by 20 columns.

Cells are stored on `recipeSteps.spreadsheet` using `A1` keys. Run creation copies the same object into `runSteps.spreadsheet`, so run execution uses a snapshot from the released formulation. Version history snapshots include the embedded spreadsheet because project versions store recipe step documents.

## Formulas

Formula cells start with `=`. V1 supports arithmetic, cell references, ranges, and these functions:

- `SUM`
- `AVERAGE`
- `MIN`
- `MAX`
- `COUNT`
- `ROUND`
- `ABS`

Errors render in cells as `#ERROR`, `#REF`, or `#CYCLE`. Blank cell references count as `0` for formulas.

## Named Formulation Values

Formula cells can reference formulation context through helper functions:

- `TOTAL_WEIGHT()`
- `INGREDIENT_WEIGHT("Ingredient Name")`
- `PHASE_TOTAL("Phase Name")`

These values are calculated on the client from the open formulation data.

## Autosave And Realtime

The editor updates local phase state immediately, then debounces cell writes to Convex by 500 ms. The `spreadsheetSteps.updateCell` mutation patches only the requested cell into the latest sheet and increments the sheet revision.

Realtime updates flow through Convex queries. If two clients edit different cells, both changes persist. If two clients edit the same cell, the later mutation wins.

## V1 Limits

- No `.xlsx` import/export.
- No live cursors or presence UI.
- One mini sheet per step.
- Released formulations reject spreadsheet autosave mutations and render as read-only.
