# QC production floor

Desktop 3D overview for production halls 1 and 2. The layouts are schematic, while machine GLBs use
the metric envelopes recorded in `assets/references/*/manifest.json`.

## Run

From the repository root:

```sh
pnpm dev:qc-floor
```

The app runs at `http://localhost:3002`. It reads `VITE_CONVEX_URL` and
`VITE_CONVEX_SITE_URL` from `rd/formulation-lab/.env` in local development so both apps use
the same backend and Better Auth session. Set those variables in the build environment when
deploying the floor separately. Set the backend's `QC_FLOOR_SITE_URL` Convex environment variable
to the deployed floor origin so Better Auth accepts its credentialed requests.

Set `VITE_FORMULATION_LAB_URL` when the formulation lab is not available at
`http://localhost:3001`. The inspector links directly to the latest real QC record for a selected
line.

## Live QC data

The floor loads the signed-in user's active organization from the shared formulation-lab browser
setting. `productionFloor.getOverview` returns the latest inspection from the last 30 days and
statistics for the last 24 hours. Layout names are matched to QC department names after removing
spaces and punctuation, so `BTC-1` matches `BTC1`. A line with no matching inspection is shown as
"No inspection data."

## Layout updates

Edit `src/floor/factory-layout.ts` to change hall bounds, line zones, or equipment placement. Edit
`src/floor/machine-catalog.ts` only when a runtime asset or its verified metric envelope changes.

Hall 2 uses the same local axes and model scale as Hall 1. Positive Z runs toward the front
door, and the Hall 2 plan keeps the supplied drawing's top-to-bottom orientation.
