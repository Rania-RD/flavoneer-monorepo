---
read_when:
  - changing production-line settings, serial allocation, batch-label evidence, or the mobile Quality workflow
  - adding later production-line form sections, review actions, signatures, or PDFs
---

# Production-line monitoring

The current implementation is the connected thin slice assigned in
`docs/designs/2026-08-06-production-line-monitoring-mobile.html`.

## Implemented flow

1. A workspace admin opens Workspace Settings and chooses an IANA timezone from
   a searchable, keyboard-accessible dropdown. New settings default to the
   device timezone; saved workspace settings take precedence when present. The
   admin also configures enabled halls and each hall's next digital serial. A
   hall counter can be initialized once and cannot be reset through the normal
   API.
2. The admin creates a versioned product specification, supplies limits for all
   five fixed measurements, and publishes it. Published versions are immutable.
3. The mobile signed-in screen creates one server draft for the selected line,
   product, and organization-local hour. Convex returns an existing duplicate before
   allocating a new serial, otherwise the counter increment and record insert run
   in one mutation.
4. QC captures the carton label with `expo-camera`. Mobile resizes and compresses
   the image before an authorized upload and attachment mutation.
5. QC enters `DDMMYY N`, confirms that it matches the photo, and saves the parsed
   production date and one-digit daily sequence to the record.
6. The web Production Monitoring route lists workspace records and renders a
   read-only detail page with the same photo, normalized code, parsed values,
   serial, and product specification snapshot.

## Routes

- Mobile signed-in home: `/` (implemented by `/(app)/index`; the route group has
  no bottom tab navigator and renders `production-line-screen.tsx`)
- Mobile QC selector alias: `/quality` (renders the same consolidated screen and
  keeps the QC / R&D header switcher route intact)
- Mobile record: `/quality/production-line/[recordId]`
- Web records: `/quality/production-line-records`
- Web detail: `/quality/production-line-records/:id`
- Web setup: `/settings`, Appearance section

## Backend modules

- `productionLineSettings.ts`: timezone, halls, and one-time counters
- `productionLineSpecifications.ts`: versioned product limits
- `productionLineRecords.ts`: reference data, draft identity, upload attachment,
  code confirmation, mobile records, and paginated web records
- `productionLineRecordHelpers.ts`: serial, local-hour, and batch-code rules

All reads and writes require workspace membership and the matching production
permission. Actor identity comes from the authenticated server session. Photo
URLs are resolved only after record authorization.

## Deferred phases

The five repeatable reading entry groups, all 22 conformity checks,
non-conformity photos, QC submission and signature, production return/approval,
immutable snapshots, audit UI, and official PDF remain the next planned phases.
