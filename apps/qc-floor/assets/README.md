# QC floor machine asset bundles

These bundles implement the reference-led machine workflow in
`.plan/2026-08-19-ai-assisted-qc-floor.html`. They are approximate QC-floor visualizations,
not engineering or fabrication models.

## Outputs

- `references/<machine-key>/manifest.json`: source URLs, dimensions, confidence notes, and usage limits.
- `blender/<machine-key>.py` or `parametric/<machine-key>.mjs`: deterministic source for the GLB, STL, and neutral previews.
- `../../public/models/*.glb`: runtime assets with stable named nodes.
- `../../public/models/*.stl`: colorless triangle-mesh interchange files.
- `previews/<machine-key>/`: front, side, and three-quarter SVG/PNG renders plus budget reports.

Reference photographs are linked in the manifest and are not copied into the runtime asset.

## Rebuild and verify

Run from the repository root:

```sh
node apps/qc-floor/assets/parametric/gif-400.mjs # invokes Blender for GIF 400
node apps/qc-floor/assets/parametric/verify-gif-400.mjs

node apps/qc-floor/assets/parametric/gif-600.mjs # invokes Blender for GIF 600
node apps/qc-floor/assets/parametric/verify-gif-600.mjs

node apps/qc-floor/assets/parametric/gif-1200.mjs # invokes Blender for GIF 1200
node apps/qc-floor/assets/parametric/verify-gif-1200.mjs

node apps/qc-floor/assets/parametric/gram-gmf-c.mjs # invokes Blender for GMF-C
node apps/qc-floor/assets/parametric/verify-gram-gmf-c.mjs

node apps/qc-floor/assets/parametric/gram-hsw-c-10-lane.mjs # invokes Blender for HSW-C
node apps/qc-floor/assets/parametric/verify-gram-hsw-c-10-lane.mjs

node apps/qc-floor/assets/parametric/tetra-pak-hoyer-comet-cl4.mjs # invokes Blender for CL4
node apps/qc-floor/assets/parametric/verify-tetra-pak-hoyer-comet-cl4.mjs

node apps/qc-floor/assets/parametric/tetra-pak-hoyer-straightline-800-c.mjs # invokes Blender for Straightline 800 C
node apps/qc-floor/assets/parametric/verify-tetra-pak-hoyer-straightline-800-c.mjs

node apps/qc-floor/assets/parametric/tetra-pak-hoyer-flowrap-mw-1700-9.mjs # invokes Blender for Flowrap MW 1700-9
node apps/qc-floor/assets/parametric/verify-tetra-pak-hoyer-flowrap-mw-1700-9.mjs

node apps/qc-floor/assets/parametric/tetra-pak-hoyer-frigus-sf-600.mjs # invokes Blender for Frigus SF 600
node apps/qc-floor/assets/parametric/verify-tetra-pak-hoyer-frigus-sf-600.mjs

node apps/qc-floor/assets/parametric/danxiao-gta450-120.mjs # invokes Blender for GTA450-120
node apps/qc-floor/assets/parametric/verify-danxiao-gta450-120.mjs

node apps/qc-floor/assets/parametric/danxiao-rxgj-12.mjs # invokes Blender for RXGJ-12
node apps/qc-floor/assets/parametric/verify-danxiao-rxgj-12.mjs

node apps/qc-floor/assets/parametric/rxgj-6.mjs # invokes Blender for RXGJ-6
node apps/qc-floor/assets/parametric/verify-rxgj-6.mjs

node apps/qc-floor/assets/parametric/qbj-1000.mjs # invokes Blender for QBJ1000
node apps/qc-floor/assets/parametric/verify-qbj-1000.mjs

node apps/qc-floor/assets/parametric/elpress-dzw-hdt-1000.mjs # invokes Blender for hygiene station
node apps/qc-floor/assets/parametric/verify-elpress-dzw-hdt-1000.mjs
```

Set `GIF400_BLENDER_BINARY` when Blender is not installed at the default macOS path or on
`PATH`. The GIF 400 Blender script exports its GLB/STL files and renders all three PNG previews
in one deterministic run.

Set `GIF600_BLENDER_BINARY` to override Blender for the GIF 600 rebuild. Its source script also
saves an editable `assets/blender/gif-600.blend` file before adding preview-only studio objects.

Set `GIF1200_BLENDER_BINARY` to override Blender for the GIF 1200 rebuild. Its source script saves
an editable `assets/blender/gif-1200.blend` file and generates the GLB, STL, and three PNG previews.

Set `GMFC_BLENDER_BINARY` to override Blender for the GMF-C rebuild. Its source script saves an
editable `assets/blender/gram-gmf-c.blend` file before it adds preview-only studio objects, then
generates the GLB, STL, and three PNG previews.

Set `HSWC_BLENDER_BINARY` to override Blender for the HSW-C rebuild. Its source script saves an
editable `assets/blender/gram-hsw-c-10-lane.blend` file, exports GLB/STL files, and renders front,
side, and three-quarter PNG previews. The reference bundle contains the supplied current render
and two downloaded manufacturer copies of the same ten-lane configuration.

Set `CL4_BLENDER_BINARY` to override Blender for the Hoyer Comet CL4 rebuild. Its source script
saves an editable `assets/blender/tetra-pak-hoyer-comet-cl4.blend` file, exports GLB/STL files,
and renders front, side, and three-quarter PNG previews.

Set `STRAIGHTLINE800_BLENDER_BINARY` to override Blender for the Hoyer Straightline 800 C
rebuild. Its source script saves an editable
`assets/blender/tetra-pak-hoyer-straightline-800-c.blend` file, exports GLB/STL files, and
renders front, side, and three-quarter PNG previews.

Set `FLOWRAP_MW1700_BLENDER_BINARY` to override Blender for the Hoyer Flowrap MW 1700-9
rebuild. Its source script saves an editable
`assets/blender/tetra-pak-hoyer-flowrap-mw-1700-9.blend` file, exports GLB/STL files, and
renders front, side, and three-quarter PNG previews. The reference bundle contains the Tetra Pak
line-layout drawing, 29 exact-line photographs, and three related multi-lane Flowrap MV views.

Set `FRIGUS600_BLENDER_BINARY` to override Blender for the Hoyer Frigus SF 600 rebuild. Its
source script saves an editable `assets/blender/tetra-pak-hoyer-frigus-sf-600.blend` file,
exports GLB/STL files, and renders front, side, and three-quarter PNG previews. The reference
bundle contains the supplied target photograph, the exact Frigus 600 manual, and six consistent
photos of one 2004 SF 600.

Set `GTA450_BLENDER_BINARY` to override Blender for the Danxiao GTA450-120 rebuild. Its source
script saves an editable `assets/blender/danxiao-gta450-120.blend` file, exports GLB/STL files,
and renders front, side, and three-quarter PNG previews.

Set `RXGJ12_BLENDER_BINARY` to override Blender for the Danxiao RXGJ-12 rebuild. Its source
script saves an editable `assets/blender/danxiao-rxgj-12.blend` file, exports GLB/STL files,
and renders front, side, and three-quarter PNG previews.

Set `RXGJ6_BLENDER_BINARY` to override Blender for the Danxiao RXGJ-6 rebuild. Its source
script saves an editable `assets/blender/rxgj-6.blend` file, exports GLB/STL files, and renders
front, side, and three-quarter PNG previews. The reference bundle contains ten downloaded images.
Six distinct machine views drive the geometry; duplicate and product-only images are retained for
source completeness and marked as unused in the manifest.

Set `QBJ1000_BLENDER_BINARY` to override Blender for the QBJ1000 rebuild. Its source script saves
an editable `assets/blender/qbj-1000.blend` file, exports GLB/STL files, and renders front, side,
and three-quarter PNG previews. The reference bundle contains the supplied target photograph,
five downloaded manufacturer images, one provenance duplicate, and the eight-page QBJ manual.

Set `DZWHDT1000_BLENDER_BINARY` to override Blender for the Elpress DZW-HDT-1000 hygiene-station
rebuild. Its source script saves an editable `assets/blender/elpress-dzw-hdt-1000.blend` file,
exports GLB/STL files, and renders front, side, and three-quarter PNG previews. The reference bundle
contains the supplied target render plus three online product and installed-machine photographs.

All models use meters, Y-up coordinates, and a footprint-center floor origin. Line assets use +X
product flow. The QBJ1000 uses +X as its operator side because a holding tank has no flow axis.
The GIF 600 cabinet, top cap,
feet, and front hardware establish its documented 1.47 x 0.60 x 1.60 m exterior bounds.
The GIF 1200 cabinet, front process hardware, feet, and top cap establish its documented
1.95 x 0.69 x 1.70 m nominal exterior bounds.
The GMF-C dimensions are an image-derived 6.20 x 1.60 x 3.30 m installed envelope because no
public general-arrangement drawing was found. Its main frame is approximately 2.25 m high; the
tall utility stack establishes the maximum height. Treat this scale as replaceable until measured.
The HSW-C ten-lane wrapper uses an image-derived 5.80 x 2.70 m closed footprint and 3.10 m height
because no public general-arrangement drawing or installed dimensions were found. Its open-service
width is 3.168 m including the raised hatches and operator panel. The supplied render and two
manufacturer images define the separate foil bank, ten-lane transfer bed, guarded wrapping cell,
roof cabinets, and open service hatches. Treat the scale and hidden film path as replaceable.
The Hoyer Comet CL4 uses the CL603B manual's published 5.65 x 1.55 x 2.20 m envelope and a
four-lane cup/cone configuration. Its individual station proportions and hidden mechanisms remain
reference-led approximations until factory installation photographs or a GA drawing are available.
The Hoyer Straightline 800 C uses the S8 02 D 12 manual's published 13.78 x 4.40 x 2.50 m
installed envelope, including the 8.58 m tunnel module and external worktable. Its nine collected
installed-condition photographs and nineteen station drawings define the visible detail, but the
exact station package and hidden tray routing remain approximate.
The Hoyer Flowrap MW 1700-9 uses a 6.364 x 3.050 m footprint derived from Tetra Pak drawing
B59404537876. The 1.350 m product working height is explicit on the elevation; the 2.450 m maximum
height is scaled from that drawing. The model records nine lanes, the overhead reel portal, film
webs, forming collars, sealing stations, HMI, guards, drives, and open support frame. Exact hidden
film routing, drive internals, purchased options, and maximum height remain approximate.
The Hoyer Frigus SF 600 uses the operation manual's published 1.330 x 0.755 x 1.665 m envelope.
The attached image fixes the viewer-left control-panel and S-pipe configuration. Six exact-model
2004 listing photographs define the finish, panel graphics, fittings, and fascia typography, but
their operator panel is on the opposite side and their pump option differs. Hidden refrigeration
components and installed utility routing remain cabinet volume.
The Danxiao GTA450-120 uses the exact-model marketplace listing's published 5.05 x 0.96 x 1.55 m
complete-line envelope. Twenty collected listing images define the long infeed, compact transfer
head, two-roll film carriage, operator panel, sealing rollers, end-seal head, and short discharge.
Danxiao shows several interchangeable infeed arrangements, so the selected transfer head remains
an exterior approximation until the installed revision is confirmed.
The Danxiao RXGJ-12 uses the current manufacturer's published 5.50 x 3.75 x 1.88 m envelope,
12 moulds per row, and 140 mould lines. Two overall product views, two process details, and 23
frames extracted from the official 222-second process video define the visible station layout.
An older marketplace listing publishes a smaller 4.90 x 3.10 x 2.10 m revision, so installed
serial and measurements must be confirmed before the asset replaces RXGJ-6 in the floor plan.
The RXGJ-6 uses Danxiao's published 4.50 x 2.60 x 1.82 m envelope. The circular jacket, three-row
annular mould deck, pneumatic process stations, raised transfer shroud, separate cyan-faced
control cabinet, and blue brine pump follow the collected exact-model and product-family images.
No public general-arrangement drawing was found, so hidden tank construction, station dimensions,
and installed pipe routes remain approximate.
The QBJ1000 uses the published 1.25 m tank diameter and 1.70 m nominal height. Its 1000 L
capacity, 22.5 rpm agitator, 1.5 kW motor, 7.5 kW heating power, 2.5 kW holding power, and 785 kg
listed weight agree across two manufacturer pages. The supplied HULK-revision photo fixes the
projecting control cabinet, blue top drive, four legs, low outlet, three heater terminals, and
visible cables. The cabinet and outlet extend beyond the 1.25 m circular floor-plan footprint.
The internal mixer, jacket wall thickness, and installed utility routing remain outside the model.
The Elpress DZW-HDT-1000 uses the published 2.125 x 0.918 x 1.513 m envelope and 1000 mm brush
length. The supplied older product render controls the twin towers, orange hand module, striped
brushes, green chemical can, grating, rails, and turnstile. Current and older installed-machine
photos confirm the platform and access-control arrangement. Hidden spray, pump, drain, electrical,
and dosing systems remain outside the model.

The verifier checks the GLB header, external bounds, root and selectable node names, product-flow
metadata, file size, triangle count, material count, and texture count. Blender or FreeCAD should
still be used for a second importer check when either tool is available.
