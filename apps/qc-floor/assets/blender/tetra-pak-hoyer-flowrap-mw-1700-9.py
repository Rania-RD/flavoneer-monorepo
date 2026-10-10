#!/usr/bin/env python3
"""Build the reference-led Tetra Pak Hoyer Flowrap MW 1700-9 asset.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/tetra-pak-hoyer-flowrap-mw-1700-9.py

The model follows Tetra Pak drawing B59404537876 and related installed-machine
photos. It is an exterior QC-floor visualization, not a fabrication, guarding,
installation, maintenance, or safety model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "tetra-pak-hoyer-flowrap-mw-1700-9"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "tetra-pak-hoyer-flowrap-mw-1700-9.blend"
GLB_PATH = MODEL_DIR / "tetra-pak-hoyer-flowrap-mw-1700-9.glb"
STL_PATH = MODEL_DIR / "tetra-pak-hoyer-flowrap-mw-1700-9.stl"

# Drawing B59404537876 gives 9690 mm from the Straightline tunnel outlet to
# the wrapper end and 3326 mm to the Dino transfer centreline. Their
# difference establishes the wrapper length. The plan gives 1525 mm from the
# wrapper centreline to each side. The 2450 mm height is scaled from the same
# 1:50 elevation; the explicitly dimensioned product working height is 1350 mm.
ENVELOPE = (6.364, 3.050, 2.450)  # X length, Y width, Z height, metres.
WORK_HEIGHT = 1.350
LANE_Y = tuple(-1.12 + index * 0.28 for index in range(9))


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name, color, metallic=0.0, roughness=0.45, alpha=1.0):
    result = bpy.data.materials.new(f"material.{name}")
    rgba = (*color, alpha)
    result.diffuse_color = rgba
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        result.surface_render_method = "DITHERED"
    return result


def empty(name: str, parent=None, selectable: bool = False):
    result = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(result)
    result.parent = parent
    if selectable:
        result["selectable"] = True
    return result


def finish_object(obj, name: str, mat, parent, smooth=False):
    obj.name = name
    obj.data.name = f"mesh.{name}"
    obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = smooth
    return obj


def rounded_box(name, location, dimensions, mat, parent, bevel=0.008, segments=2):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_object(obj, name, mat, parent)


def cylinder(name, location, radius, depth, mat, parent, axis="Z", vertices=20, bevel=0.002):
    rotations = {
        "X": (0.0, math.pi / 2, 0.0),
        "Y": (math.pi / 2, 0.0, 0.0),
        "Z": (0.0, 0.0, 0.0),
    }
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotations[axis],
    )
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_object(obj, name, mat, parent, smooth=True)


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=18):
    rotations = {
        "X": (0.0, math.pi / 2, 0.0),
        "Y": (math.pi / 2, 0.0, 0.0),
        "Z": (0.0, 0.0, 0.0),
    }
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotations[axis],
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def torus(name, location, major_radius, minor_radius, mat, parent, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=20,
        minor_segments=6,
        location=location,
        rotation=rotation,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def beam_between(name, start, end, thickness, mat, parent):
    midpoint = (Vector(start) + Vector(end)) / 2
    direction = Vector(end) - Vector(start)
    obj = rounded_box(
        name,
        midpoint,
        (thickness, thickness, direction.length),
        mat,
        parent,
        bevel=min(0.004, thickness * 0.12),
    )
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def film_sheet(name, corners, mat, parent):
    mesh = bpy.data.meshes.new(f"mesh.{name}")
    mesh.from_pydata(corners, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def text_on_operator_side(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.0008
    curve.bevel_depth = 0.0002
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, 0.0)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    return obj


def leveling_foot(name, x, y, parent, steel_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.090), 0.024, 0.14, steel_mat, parent, vertices=14)
    cone(f"{name}.bell", (x, y, 0.043), 0.060, 0.030, 0.060, steel_mat, parent, vertices=18)
    cylinder(f"{name}.pad", (x, y, 0.009), 0.064, 0.018, rubber_mat, parent, vertices=20, bevel=0.001)


def mesh_guard(name, x, y, z, width_x, height_z, mat, frame_mat, parent):
    rounded_box(f"{name}.frame.top", (x, y, z + height_z / 2), (width_x, 0.025, 0.035), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.bottom", (x, y, z - height_z / 2), (width_x, 0.025, 0.035), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.left", (x - width_x / 2, y, z), (0.035, 0.025, height_z), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.right", (x + width_x / 2, y, z), (0.035, 0.025, height_z), frame_mat, parent, bevel=0.002)
    for index in range(1, 8):
        grid_x = x - width_x / 2 + index * width_x / 8
        rounded_box(f"{name}.grid.v{index:02d}", (grid_x, y, z), (0.009, 0.012, height_z - 0.04), mat, parent, bevel=0.001)
    for index in range(1, 5):
        grid_z = z - height_z / 2 + index * height_z / 5
        rounded_box(f"{name}.grid.h{index:02d}", (x, y, grid_z), (width_x - 0.04, 0.012, 0.009), mat, parent, bevel=0.001)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.47, 0.51, 0.52), metallic=0.84, roughness=0.25)
stainless_light = material("stainless_light", (0.72, 0.75, 0.76), metallic=0.78, roughness=0.22)
stainless_dark = material("stainless_dark", (0.15, 0.18, 0.19), metallic=0.72, roughness=0.34)
rubber = material("rubber", (0.022, 0.027, 0.030), roughness=0.76)
control_blue = material("control_blue", (0.012, 0.25, 0.49), metallic=0.08, roughness=0.30)
screen_blue = material("screen_blue", (0.025, 0.30, 0.48), metallic=0.02, roughness=0.20)
signal_red = material("signal_red", (0.77, 0.018, 0.012), roughness=0.28)
signal_green = material("signal_green", (0.015, 0.53, 0.17), roughness=0.28)
signal_amber = material("signal_amber", (0.98, 0.42, 0.015), roughness=0.27)
film = material("film", (0.46, 0.72, 0.90), metallic=0.20, roughness=0.18, alpha=0.60)
product = material("product", (0.20, 0.065, 0.025), roughness=0.45)
wood = material("wood", (0.64, 0.42, 0.20), roughness=0.56)

root = empty("machine.hoyer-flowrap-mw-1700-9")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "medium-high footprint from Tetra Pak layout; medium image-scaled height; medium-low hidden mechanisms"
root["referenceModel"] = "Tetra Pak Hoyer Flowrap MW1700-9, drawing 59402424345, 2007"
root["laneCount"] = 9
root["productWorkingHeightMeters"] = WORK_HEIGHT

frame_group = empty("structure.frame", root)
infeed_group = empty("inspection.nine_lane_infeed", root, selectable=True)
film_group = empty("inspection.film_roll_bank", root, selectable=True)
forming_group = empty("inspection.forming_and_long_seal", root, selectable=True)
cross_seal_group = empty("inspection.cross_seal_jaws", root, selectable=True)
outfeed_group = empty("inspection.nine_lane_outfeed", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
guard_group = empty("safety.guarding", root, selectable=True)
utility_group = empty("utilities.drives_and_pneumatics", root)

# Perimeter rails establish the drawing-derived footprint without invisible
# scale markers. The open tubular construction matches installed Flowrap MV
# photos from the same multi-lane wrapper family.
for side, y in (("operator", -1.475), ("far", 1.475)):
    rounded_box(f"frame.base_rail.{side}", (0.0, y, 0.25), (6.364, 0.10, 0.10), stainless_dark, frame_group, bevel=0.008)
    rounded_box(f"frame.work_rail.{side}", (0.0, y, 1.16), (5.90, 0.09, 0.09), stainless, frame_group, bevel=0.006)

for index, x in enumerate((-3.03, -2.15, -1.10, 0.05, 1.20, 2.25, 3.03), 1):
    for side, y in (("operator", -1.36), ("far", 1.36)):
        rounded_box(f"frame.post.{side}.{index:02d}", (x, y, 0.70), (0.075, 0.075, 0.98), stainless_dark, frame_group, bevel=0.005)
        leveling_foot(f"frame.foot.{side}.{index:02d}", x, y, frame_group, stainless_light, rubber)

for index, x in enumerate((-2.58, -1.63, -0.53, 0.63, 1.73, 2.64), 1):
    beam_between(f"frame.brace.operator.{index:02d}", (x - 0.32, -1.36, 0.28), (x + 0.32, -1.36, 0.88), 0.035, stainless_dark, frame_group)
    beam_between(f"frame.brace.far.{index:02d}", (x - 0.32, 1.36, 0.88), (x + 0.32, 1.36, 0.28), 0.035, stainless_dark, frame_group)

rounded_box("frame.process_bed", (0.0, 0.0, 1.16), (5.92, 2.76, 0.20), stainless, frame_group, bevel=0.018)
rounded_box("frame.infeed_apron", (-2.58, 0.0, 1.27), (1.16, 2.70, 0.12), stainless_light, frame_group, bevel=0.010)

# Nine independent infeed lanes and fixed pocket bars. Product flow is +X.
for lane, y in enumerate(LANE_Y, 1):
    rounded_box(f"infeed.belt.{lane}", (-2.25, y, 1.352), (1.70, 0.18, 0.035), rubber, infeed_group, bevel=0.004)
    rounded_box(f"infeed.guide.operator.{lane}", (-2.25, y - 0.105, 1.405), (1.70, 0.025, 0.11), stainless_light, infeed_group, bevel=0.003)
    rounded_box(f"infeed.guide.far.{lane}", (-2.25, y + 0.105, 1.405), (1.70, 0.025, 0.11), stainless_light, infeed_group, bevel=0.003)
    for pocket in range(6):
        x = -2.92 + pocket * 0.27
        rounded_box(f"infeed.pocket.{lane}.{pocket + 1:02d}", (x, y, 1.395), (0.025, 0.17, 0.055), stainless_dark, infeed_group, bevel=0.002)
    rounded_box(f"infeed.product.{lane}", (-2.40, y, 1.405), (0.22, 0.095, 0.075), product, infeed_group, bevel=0.028, segments=3)
    rounded_box(f"infeed.stick.{lane}", (-2.57, y, 1.405), (0.18, 0.025, 0.018), wood, infeed_group, bevel=0.005)

# The overhead wrapper bridge is the main silhouette feature. Its 3.05 m
# width and 2.45 m top establish the plan and elevation bounds.
rounded_box("film.header", (-0.38, 0.0, 2.285), (2.28, 3.050, 0.330), stainless, film_group, bevel=0.018, segments=3)
rounded_box("film.header.blue_stripe.operator", (-0.38, -1.518, 2.365), (2.10, 0.012, 0.070), control_blue, film_group, bevel=0.002)
rounded_box("film.header.blue_stripe.far", (-0.38, 1.518, 2.365), (2.10, 0.012, 0.070), control_blue, film_group, bevel=0.002)
for side, y in (("operator", -1.385), ("far", 1.385)):
    rounded_box(f"film.portal.{side}.left", (-1.30, y, 1.68), (0.13, 0.13, 1.20), stainless, film_group, bevel=0.008)
    rounded_box(f"film.portal.{side}.right", (0.53, y, 1.68), (0.13, 0.13, 1.20), stainless, film_group, bevel=0.008)

for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"film.roll.{lane}", (-0.52, y, 1.78), 0.235, 0.16, rubber, film_group, axis="X", vertices=28)
    cylinder(f"film.roll.core.{lane}", (-0.52, y, 1.78), 0.070, 0.18, stainless_light, film_group, axis="X", vertices=20)
    cylinder(f"film.guide.upper.{lane}", (-0.10, y, 1.57), 0.055, 0.18, stainless_light, film_group, axis="Y", vertices=18)
    cylinder(f"film.guide.lower.{lane}", (0.10, y, 1.35), 0.045, 0.18, stainless_light, film_group, axis="Y", vertices=18)
    film_sheet(
        f"film.web.{lane}",
        [(-0.43, y - 0.075, 1.63), (-0.43, y + 0.075, 1.63), (0.33, y + 0.075, 1.24), (0.33, y - 0.075, 1.24)],
        film,
        film_group,
    )

text_on_operator_side("film.brand", "Tetra Pak", (-0.73, -1.520, 2.31), 0.110, control_blue, film_group)
text_on_operator_side("film.model", "Hoyer Flowrap MW", (0.12, -1.520, 2.31), 0.105, control_blue, film_group)

# Forming shoulders, drive rollers, and longitudinal sealing wheels are shown
# per lane because they read clearly from the open end in the source photos.
for lane, y in enumerate(LANE_Y, 1):
    torus(f"forming.shoulder.{lane}", (0.38, y, 1.31), 0.095, 0.018, stainless_light, forming_group, rotation=(0.0, math.pi / 2, 0.0))
    cone(f"forming.collar.{lane}", (0.46, y, 1.31), 0.095, 0.060, 0.18, stainless, forming_group, axis="X", vertices=18)
    cylinder(f"forming.drive.upper.{lane}", (0.72, y, 1.42), 0.070, 0.18, rubber, forming_group, axis="Y", vertices=20)
    cylinder(f"forming.drive.lower.{lane}", (0.72, y, 1.25), 0.070, 0.18, rubber, forming_group, axis="Y", vertices=20)
    cylinder(f"forming.long_seal.{lane}", (0.98, y, 1.34), 0.055, 0.18, stainless_dark, forming_group, axis="Y", vertices=18)

rounded_box("forming.drive_cover.operator", (0.76, -1.43, 1.52), (0.82, 0.18, 0.55), stainless, forming_group, bevel=0.020, segments=3)
rounded_box("forming.drive_cover.far", (0.76, 1.43, 1.52), (0.82, 0.18, 0.55), stainless, forming_group, bevel=0.020, segments=3)

# Rotary cross-seal and cut-off bank. Each lane has an upper and lower jaw
# plus crimp bars. The terminal cabinet reflects the broad end housing in the
# plan view and related MV photos.
rounded_box("cross_seal.header", (1.45, 0.0, 1.92), (0.48, 3.00, 0.40), stainless, cross_seal_group, bevel=0.018, segments=3)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"cross_seal.upper.{lane}", (1.42, y, 1.47), 0.105, 0.19, stainless_dark, cross_seal_group, axis="Y", vertices=20)
    cylinder(f"cross_seal.lower.{lane}", (1.42, y, 1.22), 0.105, 0.19, stainless_dark, cross_seal_group, axis="Y", vertices=20)
    for jaw in range(4):
        angle = jaw * math.pi / 2
        rounded_box(
            f"cross_seal.jaw.{lane}.{jaw + 1}",
            (1.42 + math.cos(angle) * 0.105, y, 1.345 + math.sin(angle) * 0.125),
            (0.035, 0.18, 0.035),
            stainless_light,
            cross_seal_group,
            bevel=0.002,
        )

rounded_box("cross_seal.terminal_cabinet", (1.72, 0.0, 1.23), (0.48, 3.00, 0.74), stainless, cross_seal_group, bevel=0.020, segments=3)
rounded_box("cross_seal.access_panel.operator", (1.72, -1.507, 1.22), (0.35, 0.018, 0.48), stainless_light, cross_seal_group, bevel=0.012)
rounded_box("cross_seal.access_panel.far", (1.72, 1.507, 1.22), (0.35, 0.018, 0.48), stainless_light, cross_seal_group, bevel=0.012)

# Nine narrow discharge belts continue to the 6.364 m envelope. Wrapped bars
# make lane count and flow direction legible at floor-view scale.
for lane, y in enumerate(LANE_Y, 1):
    rounded_box(f"outfeed.belt.{lane}", (2.38, y, 1.295), (1.60, 0.18, 0.035), rubber, outfeed_group, bevel=0.004)
    for guide_side in (-1, 1):
        rounded_box(f"outfeed.guide.{lane}.{guide_side}", (2.38, y + guide_side * 0.105, 1.35), (1.60, 0.022, 0.105), stainless_light, outfeed_group, bevel=0.003)
    rounded_box(f"outfeed.package.{lane}", (2.48, y, 1.350), (0.25, 0.12, 0.045), film, outfeed_group, bevel=0.018, segments=3)

cylinder("outfeed.end_roller", (3.03, 0.0, 1.29), 0.080, 2.66, stainless_dark, outfeed_group, axis="Y", vertices=22)

# Operator HMI, switch bank, emergency stop, and status light. The blue HMI
# surround and stainless pedestal match the installed family photographs.
rounded_box("control.pedestal", (-0.92, -1.420, 1.08), (0.52, 0.16, 0.84), stainless, control_group, bevel=0.018, segments=3)
rounded_box("control.hmi_surround", (-0.92, -1.498, 1.35), (0.34, 0.025, 0.28), control_blue, control_group, bevel=0.010)
rounded_box("control.hmi_screen", (-0.92, -1.515, 1.36), (0.25, 0.012, 0.17), screen_blue, control_group, bevel=0.004)
for row in range(2):
    for column in range(4):
        x = -1.06 + column * 0.095
        z = 1.11 - row * 0.11
        button_mat = (signal_green, signal_amber, control_blue, signal_red)[column]
        cylinder(f"control.button.{row + 1}.{column + 1}", (x, -1.505, z), 0.025, 0.025, button_mat, control_group, axis="Y", vertices=14, bevel=0.001)
cylinder("control.emergency_stop", (-0.92, -1.505, 0.91), 0.050, 0.035, signal_red, control_group, axis="Y", vertices=18, bevel=0.002)

cylinder("control.stack_pole", (-0.20, -1.38, 2.18), 0.018, 0.35, stainless_dark, control_group, vertices=12)
for index, (z, mat) in enumerate(((2.34, signal_green), (2.26, signal_amber), (2.18, signal_red)), 1):
    cylinder(f"control.stack_light.{index}", (-0.20, -1.38, z), 0.040, 0.070, mat, control_group, vertices=18)

# Open wire guards keep the machinery legible while recording the guard
# volumes visible in the photos. They are not safety-certified geometry.
mesh_guard("guard.operator.left", -0.83, -1.505, 1.68, 0.80, 0.70, stainless_dark, stainless, guard_group)
mesh_guard("guard.operator.right", 0.17, -1.505, 1.68, 0.80, 0.70, stainless_dark, stainless, guard_group)
mesh_guard("guard.far.left", -0.83, 1.505, 1.68, 0.80, 0.70, stainless_dark, stainless, guard_group)
mesh_guard("guard.far.right", 0.17, 1.505, 1.68, 0.80, 0.70, stainless_dark, stainless, guard_group)

# Visible gearmotors, pneumatic manifold, and air lines supply the wrapper
# bank without trying to reconstruct inaccessible drive internals.
cylinder("utilities.main_gearmotor", (1.72, 1.29, 0.82), 0.20, 0.42, control_blue, utility_group, axis="Y", vertices=24)
cylinder("utilities.main_motor_shaft", (1.72, 1.08, 0.82), 0.055, 0.22, stainless_dark, utility_group, axis="Y", vertices=16)
rounded_box("utilities.pneumatic_manifold", (0.72, 1.40, 0.92), (1.15, 0.16, 0.20), stainless, utility_group, bevel=0.008)
for index, x in enumerate((0.32, 0.58, 0.84, 1.10), 1):
    cylinder(f"utilities.gauge.{index}", (x, 1.495, 0.96), 0.050, 0.022, stainless_light, utility_group, axis="Y", vertices=18)
    cylinder(f"utilities.valve.{index}", (x, 1.490, 0.86), 0.024, 0.050, control_blue, utility_group, axis="Y", vertices=14)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable model before adding preview-only studio objects.
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)

for obj in bpy.context.scene.objects:
    obj.select_set(False)
for obj in asset_objects():
    obj.select_set(True)
bpy.context.view_layer.objects.active = root

bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
    export_materials="EXPORT",
    export_texcoords=False,
    export_tangents=False,
    export_normals=True,
)

bpy.ops.wm.stl_export(
    filepath=str(STL_PATH),
    export_selected_objects=True,
    apply_modifiers=True,
    ascii_format=False,
    global_scale=1.0,
    use_scene_unit=True,
)


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(name: str, camera_location, target, ortho_scale: float):
    camera = bpy.data.objects.get("studio.camera")
    if camera is None:
        camera_data = bpy.data.cameras.new("studio.camera")
        camera = bpy.data.objects.new("studio.camera", camera_data)
        bpy.context.scene.collection.objects.link(camera)
        bpy.context.scene.camera = camera
        camera.data.type = "ORTHO"
        camera.data.lens = 55
    camera.location = camera_location
    camera.data.ortho_scale = ortho_scale
    point_at(camera, target)

    scene = bpy.context.scene
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


studio_floor = material("studio_floor", (0.53, 0.56, 0.56), roughness=0.76)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (8.2, 5.5, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.77, 0.79, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (3.8, -5.0, 5.8), 1450, 4.2),
    ("studio.fill", (-3.5, -2.8, 3.6), 760, 3.6),
    ("studio.rim", (1.5, 4.5, 5.0), 1050, 3.8),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.25))

render_preview("front", (0.0, -8.2, 2.10), (0.0, 0.0, 1.25), 6.85)
render_preview("side", (8.3, 0.0, 2.05), (0.0, 0.0, 1.15), 4.80)
render_preview("three-quarter", (7.2, -7.2, 4.8), (0.15, 0.0, 1.15), 6.60)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
