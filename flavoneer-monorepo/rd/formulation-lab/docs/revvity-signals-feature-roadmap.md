# Revvity Signals-Inspired Feature Roadmap

## Purpose

This document translates Revvity Signals Software concepts into an implementation roadmap for Food R&D Lab Manager. It focuses on features that fit this app's current food formulation workflow: projects, formulations, runs, inventory, lab reports, sensory testing, teams, roles, signatures, audit logs, version history, and traceability configuration.

The goal is not to copy drug-discovery chemistry features such as ChemDraw, SAR, compound registration, or molecular modeling. The goal is to add the same category of R&D workflow depth for food product development: structured experiment records, stronger lot traceability, analytics, approvals, test requests, and assisted documentation.

## Revvity Signals Reference Model

Revvity Signals is useful as a reference because its products combine lab execution, data capture, inventory, collaboration, analytics, compliance, and AI-ready data in one workflow.

Reference sources:

- [Signals One](https://revvitysignals.com/products/research/signals-research-suite): end-to-end R&D workflow support across Design-Make-Test-Decide, data capture, data processing, analytics, collaboration, visualization, AI-ready assay data, and AI-assisted workflows.
- [Signals Notebook](https://revvitysignals.com/products/research/signals-notebook-eln): cloud ELN with experiment capture, templates, rich content, folder organization, tags, search, real-time collaboration, comments, approvals, e-signatures, audit trails, inventory, and instrument data capture.
- [Revvity technology overview](https://revvitysignals.com/why-signals/technology): scientific data management, configurable workflows, raw-data-to-analytics processing, notebook support, automatable processing, reproducibility, extensibility, security, and validation quality.
- [Signals One launch release](https://news.revvity.com/press-announcements/press-releases/press-release-details/2025/Revvity-Signals-Software-Unveils-Unified-Data-Platform-to-Accelerate-Drug-Discovery-2025-pwV4oJ89GP/default.aspx): unified data platform across Design-Make-Test-Decide with data processing, in vitro curve fitting, in vivo analysis, group comparisons, standardized AI-ready data, semantic search, summarization assistants, and automated protocol writing.

Useful Revvity feature categories for this app:

- Electronic lab notebook records attached to experiments and projects.
- Configurable workflows instead of fixed paper-like forms.
- Inventory and sample traceability with barcode support.
- Test request, result review, and reporting loops.
- Analytics dashboards for decisions across versions, batches, and test outcomes.
- Approval states, e-signatures, audit trails, and validation readiness.
- AI-assisted summarization, protocol drafting, and search over structured data.

## Current App Capabilities

The current app already has a strong base:

- `pages/dashboard.tsx` manages projects and run creation.
- `pages/formulation.tsx` manages formulas, phases, steps, ingredients, dependencies, and project saving.
- `pages/runs.tsx` supports run execution and run history.
- `pages/materials.tsx` manages ingredient library and inventory.
- `pages/reports.tsx` and `pages/report-details.tsx` manage lab reports and report review.
- `pages/sensory-test.tsx` and `components/SensoryBuilder.tsx` support sensory forms and public sensory submissions.
- `components/Settings/VersionControlConfig.tsx` and `components/Settings/TraceabilityConfig.tsx` configure version and traceability behavior.
- `convex/schema.ts` already defines projects, normalized ingredients, recipe phases, recipe steps, runs, run snapshots, lab reports, lab test results, inventory items, material usage logs, sensory forms, sensory evaluations, comments, project versions, roles, users, teams, audit logs, shared links, and system config.
- `convex/runs.ts` already snapshots recipe phases and steps at run start and deducts inventory on completion.
- `convex/labReports.ts` already stores lab reports separately from normalized lab test results.
- `convex/teamAuditLogs.ts` already provides a team-level audit log base.

Important current constraint:

- Run inventory deduction currently searches inventory by material name. That is useful for early demos, but it is not enough for regulated traceability because it does not prove which supplier/internal lot was used.

## Feature Gap Map

| Revvity-like capability | Current app state | Gap | Recommended feature |
| --- | --- | --- | --- |
| Experiment notebook | Projects, runs, reports, comments exist | No structured ELN entry model | Structured Experiment Notebook |
| Analytics | Some charts and report data exist | No cross-version or batch analytics layer | Formula Analytics Dashboard |
| Inventory traceability | Inventory items and usage logs exist | No inventory lot selection during execution | Material Lot Traceability |
| Approvals and compliance | Statuses, roles, signatures, audit logs exist | Approval stages are not enforced consistently | Approval And Compliance Workflow |
| Test request loop | Lab reports and test results exist | No request-to-result lifecycle | Test Requests And Results |
| AI-assisted workflows | No AI feature surface in app workflow | No accepted-output audit path | AI Assistant Layer |

## Implementation Roadmap

### 1. Structured Experiment Notebook

Add a notebook layer that behaves like a food R&D ELN. Notebook entries should attach to existing operational records instead of creating a separate disconnected document system.

User-facing behavior:

- Users can create notebook entries from a project, run, report, or material.
- Users can choose a template: formulation trial, shelf-life check, sensory panel, QC test note, or blank note.
- Each entry has objective, hypothesis, protocol, observations, results, conclusion, attachments, tags, and status.
- Entries can be filtered by project, run, report, inventory item, author, date, status, and tag.
- Entries can be locked after approval or release if compliance settings require it.

Backend:

- Add `notebookEntries` to `convex/schema.ts`.
- Add `notebookEntrySections` to store ordered structured sections instead of a single untyped blob.
- Add optional `notebookAttachments` if attachments need metadata beyond Convex storage IDs.
- Add `convex/notebookEntries.ts` with create, update, remove, get, listByProject, listByRun, listByReport, and listByInventoryItem queries/mutations.
- Add validators in `convex/validators.ts` for entry status, section type, linked entity type, and template key.
- Keep args and handlers synchronized for every Convex mutation.

Suggested table shape:

```ts
notebookEntries: defineTable({
  title: v.string(),
  templateKey: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("in_review"), v.literal("approved"), v.literal("locked")),
  projectId: v.optional(v.id("projects")),
  runId: v.optional(v.id("runs")),
  labReportId: v.optional(v.id("labReports")),
  inventoryItemId: v.optional(v.id("inventoryItems")),
  teamId: v.optional(v.id("teams")),
  authorId: v.string(),
  authorName: v.string(),
  tags: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  lockedAt: v.optional(v.number()),
  lockedBy: v.optional(v.string()),
})
  .index("by_projectId", ["projectId"])
  .index("by_runId", ["runId"])
  .index("by_labReportId", ["labReportId"])
  .index("by_inventoryItemId", ["inventoryItemId"])
  .index("by_teamId", ["teamId"]);
```

```ts
notebookEntrySections: defineTable({
  entryId: v.id("notebookEntries"),
  sectionKey: v.string(),
  type: v.union(
    v.literal("objective"),
    v.literal("hypothesis"),
    v.literal("protocol"),
    v.literal("observation"),
    v.literal("result_table"),
    v.literal("conclusion"),
    v.literal("attachment")
  ),
  title: v.string(),
  contentJSON: v.string(),
  sortOrder: v.number(),
}).index("by_entryId", ["entryId"]);
```

Frontend:

- Add a notebook panel to `ProjectDetailsModal` first. This gives users project-context notes without adding a new top-level navigation item.
- Add a notebook drawer or tab in run details in `pages/runs.tsx`.
- Add a notebook-linked evidence section in `pages/report-details.tsx`.
- Use `t("...")` for every visible string and add keys to `locales`.
- Respect dark mode and existing rounded panel patterns from `DESIGN_GUIDE.md`.

### 2. Formula Analytics Dashboard

Add analytics that help users decide which formula versions and batches are performing best.

User-facing behavior:

- Project detail view shows version comparison: pass rate, sensory averages, failed QC count, average run duration, cost estimate, and material waste.
- Dashboard shows high-level cards: active tests, failed reports, expiring lots, low stock, top-performing formulas, and recent out-of-spec results.
- Runs page shows run-level comparison by batch and version.

Backend:

- Add `convex/analytics.ts`.
- Use existing `runs`, `labReports`, `labTestResults`, `sensoryForms`, `sensoryEvaluations`, `materialUsageLogs`, and `projectIngredients`.
- Start with query-time aggregation. Add `analyticsSnapshots` later only if query-time aggregation becomes slow.
- Add queries:
  - `getProjectAnalytics({ projectId })`
  - `getDashboardAnalytics({ teamId? })`
  - `getVersionComparison({ projectId })`
  - `getBatchQualityTrend({ projectId })`

Frontend:

- Use existing `recharts` dependency.
- Add compact chart components under `components/analytics/`.
- Integrate first into `ProjectDetailsModal` or a project details route if one is added later.
- Add a small dashboard analytics band in `pages/dashboard.tsx`.
- Avoid a separate analytics page in v1. The data is more useful where decisions are made.

Metrics:

- Pass/fail counts by project version.
- Average actual value vs target range for lab parameters.
- Sensory averages by run.
- QC drift over time.
- Run duration trend.
- Ingredient cost estimate per batch.
- Material usage and waste trend.
- Out-of-spec count by parameter.

### 3. Material Lot Traceability

Upgrade inventory from item-level stock to lot-level usage. This should be the first major implementation because it improves every later compliance and analytics feature.

User-facing behavior:

- Inventory item detail shows lots with supplier lot, internal lot, received date, expiry, storage location, stock, unit, barcode, allergen flags, and regulatory documents.
- Run execution weighing steps require lot selection when an ingredient maps to inventory.
- Completion deducts from the selected lot and writes a usage log with `inventoryLotId`.
- Low-stock and expiry alerts use lot-level stock.

Backend:

- Add `inventoryLots` to `convex/schema.ts`.
- Extend `materialUsageLogs` with optional `inventoryLotId`.
- Update `convex/inventory.ts` with lot create/update/archive/list mutations and queries.
- Update `convex/runs.ts` so inventory deduction uses selected lot IDs when supplied.
- Keep name-search fallback only for legacy runs or old data without selected lots.

Suggested table shape:

```ts
inventoryLots: defineTable({
  inventoryItemId: v.id("inventoryItems"),
  supplierLot: v.optional(v.string()),
  internalLot: v.string(),
  receivedDate: v.optional(v.string()),
  expiryDate: v.string(),
  storageLocation: v.optional(v.string()),
  stock: v.number(),
  unit: v.string(),
  barcode: v.optional(v.string()),
  allergenFlags: v.optional(v.array(v.string())),
  regulatoryNotes: v.optional(v.string()),
  sdsFileId: v.optional(v.id("_storage")),
  coaFileId: v.optional(v.id("_storage")),
  status: v.union(v.literal("available"), v.literal("depleted"), v.literal("quarantined"), v.literal("expired")),
  teamId: v.optional(v.id("teams")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_inventoryItemId", ["inventoryItemId"])
  .index("by_teamId", ["teamId"])
  .index("by_internalLot", ["internalLot"]);
```

Frontend:

- Extend `pages/materials.tsx` and inventory modals with a Lots tab.
- Update run weighing UI in `components/runs/RunPhaseView.tsx` to select lots before completing a weighing step.
- Update `components/PrintLabelModal.tsx` to support lot labels and barcodes.
- Add lot usage history to `StockUsageHistoryModal`.

Migration:

- Existing `inventoryItems.stock` remains as an aggregate for compatibility.
- New lots should become the source of truth.
- For existing inventory, provide a one-time "Create opening lot" path that creates a lot with current stock.

### 4. Approval And Compliance Workflow

Turn statuses, roles, signatures, comments, and audit logs into an enforceable workflow.

User-facing behavior:

- Project statuses follow a controlled path: Draft -> Testing -> Under Review -> Approved -> Released -> On Hold.
- Reports follow: Draft -> In Review -> Approved -> Rejected.
- Release requires signature and release notes.
- Failed critical checks require signed deviation reason or disposal decision.
- Locked released records cannot be edited without creating a new version.

Backend:

- Add workflow transition helpers in `convex/projects.ts` and `convex/labReports.ts`.
- Add explicit mutations such as `submitForReview`, `approve`, `reject`, `release`, and `reopen`.
- Extend `teamAuditLogs` or add entity-specific audit log tables if before/after details become large.
- Add before/after metadata for project, report, inventory, and run state changes.
- Use existing roles and permissions. Add new permissions only if existing keys cannot express review/release behavior.

Frontend:

- Add review action buttons to `ProjectDetailsModal`, `pages/report-details.tsx`, and reports list actions.
- Show status transition history near comments and signatures.
- Show locked-state banners using translated strings.
- Add settings controls for whether signatures are required on release, report approval, and failed critical checks.

### 5. Test Requests And Results

Add a formal request-to-result flow between formulation/run work and lab reports.

User-facing behavior:

- A user creates test requests from a project or run.
- Request fields include parameter, method, sample, due date, assignee, priority, status, and notes.
- Lab users enter results against requests.
- Completed requests can create a new lab report or append to an existing draft report.
- Out-of-spec results require disposition: repeat test, accept with justification, reject batch, or open deviation.

Backend:

- Add `testRequests` to `convex/schema.ts`.
- Add `convex/testRequests.ts`.
- Link requests to `projectId`, optional `runId`, optional `labReportId`, optional `assignedTo`, and `teamId`.
- Add status validator: `draft`, `requested`, `in_progress`, `completed`, `cancelled`, `out_of_spec`.
- Add mutation to convert completed request data into `labTestResults`.

Suggested table shape:

```ts
testRequests: defineTable({
  projectId: v.id("projects"),
  runId: v.optional(v.id("runs")),
  labReportId: v.optional(v.id("labReports")),
  parameter: v.string(),
  method: v.string(),
  sampleLabel: v.string(),
  targetRange: v.optional(v.string()),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  unit: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
  status: v.union(
    v.literal("draft"),
    v.literal("requested"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("out_of_spec")
  ),
  assignedTo: v.optional(v.string()),
  resultValue: v.optional(v.number()),
  resultNotes: v.optional(v.string()),
  disposition: v.optional(v.string()),
  teamId: v.optional(v.id("teams")),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_projectId", ["projectId"])
  .index("by_runId", ["runId"])
  .index("by_labReportId", ["labReportId"])
  .index("by_status", ["status"]);
```

Frontend:

- Add test request panels to project details and run details.
- Add a test request queue to `pages/reports.tsx`.
- Add result entry modal with out-of-spec handling.
- Use existing report detail page to show linked requests.

### 6. AI Assistant Layer

Add AI support after the app has structured notebook, test request, and traceability data. The first version should assist writing and search, not make final decisions.

User-facing behavior:

- Draft protocol from project formula, target outcome, and selected template.
- Summarize run execution, deviations, and critical checks.
- Summarize lab report results and out-of-spec values.
- Summarize version-to-version changes.
- Search across notebook entries, projects, runs, reports, and materials using natural language.
- Require user acceptance before AI text becomes part of the record.

Backend:

- Add `aiAssistanceLogs` if accepted AI output needs audit metadata separate from normal entry history.
- Store prompt type, source entity IDs, generated text, accepted text, acceptedBy, acceptedAt, and target entity.
- Do not treat generated text as authoritative until accepted.
- Keep all AI-generated visible content translated or user-authored where appropriate.

Frontend:

- Add assistant buttons near notebook templates, run summaries, report summaries, and version history.
- Make the UI explicit: generated draft, review required, accept into record.
- Do not auto-submit approvals, reports, or deviations.

## Data Model Changes

Minimum schema additions:

- `notebookEntries`
- `notebookEntrySections`
- `inventoryLots`
- `testRequests`
- Optional `notebookAttachments`
- Optional `analyticsSnapshots`
- Optional `aiAssistanceLogs`

Existing schema extensions:

- `materialUsageLogs.inventoryLotId?: Id<"inventoryLots">`
- `runSteps.selectedInventoryLotId?: Id<"inventoryLots">` if lot selection is captured per step.
- `labReports.approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason` if report workflow needs explicit audit-friendly fields.
- `projects.reviewedBy`, `reviewedAt`, `releasedBy`, `releasedAt`, and `releaseNotes` should use existing fields where present before adding duplicates.

Type updates:

- Add frontend-facing types in `types.ts` for notebook entries, notebook sections, inventory lots, test requests, analytics summaries, and AI assistance logs.
- Prefer `Doc<"...">` aliases for raw Convex rows and explicit enriched interfaces for joined query returns.

Validator updates:

- Add reusable validators in `convex/validators.ts`.
- Keep literal unions centralized for statuses and template keys.
- Update generated Convex API usage after backend changes.

## Backend Integration

General Convex rules:

- Every mutation must keep `args` validators and `handler` behavior synchronized.
- Every table column change must update `convex/schema.ts`.
- Every frontend-facing shape must update `types.ts`.
- Every caller must pass exactly the fields accepted by the Convex validator.
- Use indexes for project, run, team, report, status, and inventory lot lookups. Avoid full scans for user-facing lists.

Module plan:

- `convex/notebookEntries.ts`: notebook CRUD and entity-linked list queries.
- `convex/analytics.ts`: project, dashboard, version, and batch analytics queries.
- `convex/inventory.ts`: add lot CRUD and aggregate stock helpers.
- `convex/runs.ts`: update run completion and material deduction to use lot IDs.
- `convex/labReports.ts`: add request-linked result insertion and approval workflow transitions.
- `convex/testRequests.ts`: request lifecycle and result conversion.
- `convex/teamAuditLogs.ts`: add reusable audit helper for entity changes if current helper is too team-action-specific.
- `convex/systemConfig.ts`: add compliance toggles if signature requirements become configurable.

Auth and permissions:

- Notebook creation requires authenticated user.
- Entity-linked lists should only return records the user can access through ownership, team membership, or shared access.
- Approval/release requires admin, supervisor, or a dedicated permission.
- Public sensory form submission remains public, but result analytics remain authenticated.

## Frontend Integration

Use existing surfaces before adding new navigation.

Project workflow:

- Add notebook, test requests, analytics, and approval controls to project details.
- If `ProjectDetailsModal` becomes too large, split into tabs or extract panels under `components/project/`.

Formulation workflow:

- Add a test request shortcut from formulation.
- Add protocol draft support later after notebook templates exist.

Run workflow:

- Add inventory lot selection to weighing steps in `components/runs/RunPhaseView.tsx`.
- Add deviation capture for failed critical checks.
- Add notebook and test request panels to run detail views.

Reports workflow:

- Add linked test requests to `pages/reports.tsx` and `pages/report-details.tsx`.
- Add approval actions and signature requirement checks.
- Add report summary AI action later.

Materials workflow:

- Add inventory lot management to `pages/materials.tsx`.
- Add lot-level stock usage and label printing.
- Add expiry, low-stock, and allergen-risk alerts.

Settings workflow:

- Extend existing version and traceability settings only when configuration is needed.
- Add compliance toggles in settings after approval workflow exists.

Component organization:

- Use `components/notebook/` for notebook panels, editors, and templates.
- Use `components/analytics/` for charts and metric cards.
- Use `components/test-requests/` for request queue, request modal, and result entry.
- Use `components/inventory-lots/` if materials page becomes large.

## i18n Requirements

The project has a zero-English rule for new UI. Every new UI string must use `t("key")`.

Implementation rules:

- Add translation keys before or during UI work.
- Do not hardcode English in buttons, empty states, labels, errors, toasts, modal titles, chart labels, or helper text.
- Keep translation keys stable and descriptive.
- Support RTL by using logical properties and existing `useSettings` behavior.
- Avoid `left`, `right`, `ml`, and `pl`; use logical Tailwind classes such as `start`, `end`, `ms`, and `ps`.

Suggested key namespaces:

- `notebook_*`
- `analytics_*`
- `inventory_lot_*`
- `test_request_*`
- `approval_*`
- `ai_assistant_*`

## Testing And Verification

Documentation-only verification for this file:

```bash
test -f docs/revvity-signals-feature-roadmap.md
sed -n '1,220p' docs/revvity-signals-feature-roadmap.md
```

Implementation verification for future feature work:

- Run `npm run check` before handoff.
- Run `npm run build` before handoff.
- Run `npm run test` when UI flows are affected.
- Add regression coverage for run completion deducting selected inventory lots.
- Add mutation-level tests or integration checks for notebook create/update, test request completion, report approval, and project release transitions.
- Verify visible UI in the running app because the dev server is assumed to be running.

Critical scenarios:

- A run weighing step cannot complete without selecting a required inventory lot.
- Completing a run deducts from the selected lot and writes `materialUsageLogs.inventoryLotId`.
- A completed test request can create or append lab report results.
- Out-of-spec test results require a disposition before report approval.
- Released projects are locked from direct edit and require a new version for changes.
- Notebook entries linked to a project are visible from project detail and remain available after version changes.
- AI-generated text is not stored as accepted content until the user accepts it.

## Rollout Order

1. Material Lot Traceability
   - Fixes the highest-risk data gap.
   - Improves run records, reports, analytics, and auditability.

2. Test Requests And Results
   - Connects formulation and run work to lab reports.
   - Creates structured data for analytics.

3. Structured Experiment Notebook
   - Adds the ELN layer around projects, runs, reports, and materials.
   - Gives teams one place to capture experiment rationale and observations.

4. Formula Analytics Dashboard
   - Uses cleaner lot, test, run, report, and sensory data.
   - Helps compare versions and batches.

5. Approval And Compliance Workflow
   - Turns existing statuses, signatures, roles, and audit logs into enforceable gates.
   - Should land after core data flows are stable.

6. AI Assistant Layer
   - Works best after records are structured.
   - Starts with draft and summary actions, then semantic search.

## Risks And Constraints

- Lot-level traceability changes run execution behavior. It needs clear migration support for existing inventory without lots.
- Analytics can become slow if queries scan too much data. Start query-time, then add snapshots only when measured performance requires it.
- Approval locks can frustrate users if version creation is not clear. Released records should offer a direct "Create new version" path.
- AI features can create compliance risk if generated text is accepted silently. The app must require explicit user acceptance and audit accepted output.
- Rich notebook editing can add dependency and complexity. Start with structured sections and JSON content before adding a heavy editor.
- Public sensory submissions must stay isolated from authenticated analytics and report workflows.

## Suggested improvement

Add a short `docs/README.md` after this roadmap so future planning docs have an entry point. The README should list each planning doc, when to read it, and which app areas it affects.
