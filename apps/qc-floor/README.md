# QC production floor

Desktop 3D overview for production hall 1. The layout is schematic, while machine GLBs use
the metric envelopes recorded in `assets/references/*/manifest.json`.

## Run

From the repository root:

```sh
pnpm dev:qc-floor
```

The app runs at `http://localhost:3002`. Set `VITE_FORMULATION_LAB_URL` when the formulation
lab is not available at `http://localhost:3001`; the inspector uses that base URL for the
"Open QC records" action.

## Layout updates

Edit `src/floor/factory-layout.ts` to change hall bounds, line zones, equipment placement, or
QC demo state. Edit `src/floor/machine-catalog.ts` only when a runtime asset or its verified
metric envelope changes.
