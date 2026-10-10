#!/usr/bin/env python3
"""Build the reference-led Gram HSW-C ten-lane wrapper for the AI QC floor.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/gram-hsw-c-10-lane.py

This is an approximate exterior visualization. It is not an engineering,
installation, guarding, controls, or service model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "gram-hsw-c-10-lane"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "gram-hsw-c-10-lane.blend"
GLB_PATH = MODEL_DIR / "gram-hsw-c-10-lane.glb"
STL_PATH = MODEL_DIR / "gram-hsw-c-10-lane.stl"

# Gram does not publish a general-arrangement drawing for this configuration.
# The envelope is scaled from a 1.05 m product working height, 0.18 m lane pitch,
# common sanitary frame sections, and leveling feet in the supplied render.
ENVELOPE = (5.80, 3.168, 3.10)  # Includes open service hatches and operator panel.
CLOSED_FOOTPRINT = (5.80, 2.70)
LANE_COUNT = 10


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


def material(name, color, metallic=0.0, roughness=0.45, transmission=0.0, alpha=1.0):
    result = bpy.data.materials.new(f"material.{name}")
    rgba = (color[0], color[1], color[2], alpha)
    result.diffuse_color = rgba
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Alpha"].default_value = alpha
    if "Transmission Weight" in principled.inputs:
        principled.inputs["Transmission Weight"].default_value = transmission
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


def rounded_box(name, location, dimensions, mat, parent, bevel=0.008, segments=2, rotation=None):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation or (0.0, 0.0, 0.0))
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


def cylinder(name, location, radius, depth, mat, parent, axis="Z", vertices=16, bevel=0.002):
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
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, bevel_resolution=1):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_resolution
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def text_facing_operator(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.001
    curve.bevel_depth = 0.0003
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


def leveling_foot(name, x, y, parent, metal_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.105), 0.022, 0.17, metal_mat, parent, vertices=12)
    cone(f"{name}.bell", (x, y, 0.050), 0.060, 0.030, 0.070, metal_mat, parent, vertices=16)
    cylinder(f"{name}.pad", (x, y, 0.010), 0.066, 0.020, rubber_mat, parent, vertices=18, bevel=0.001)


def side_guard_panel(name, x_center, x_size, y, z_center, z_size, mat, parent, columns=8, rows=6):
    radius = 0.013
    for i in range(columns + 1):
        x = x_center - x_size / 2 + x_size * i / columns
        pipe(f"{name}.vertical.{i + 1:02d}", [(x, y, z_center - z_size / 2), (x, y, z_center + z_size / 2)], radius, mat, parent)
    for i in range(rows + 1):
        z = z_center - z_size / 2 + z_size * i / rows
        pipe(f"{name}.horizontal.{i + 1:02d}", [(x_center - x_size / 2, y, z), (x_center + x_size / 2, y, z)], radius, mat, parent)


def end_guard_panel(name, x, y_center, y_size, z_center, z_size, mat, parent, columns=8, rows=6):
    radius = 0.013
    for i in range(columns + 1):
        y = y_center - y_size / 2 + y_size * i / columns
        pipe(f"{name}.vertical.{i + 1:02d}", [(x, y, z_center - z_size / 2), (x, y, z_center + z_size / 2)], radius, mat, parent)
    for i in range(rows + 1):
        z = z_center - z_size / 2 + z_size * i / rows
        pipe(f"{name}.horizontal.{i + 1:02d}", [(x, y_center - y_size / 2, z), (x, y_center + y_size / 2, z)], radius, mat, parent)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.47, 0.50, 0.51), metallic=0.82, roughness=0.26)
stainless_light = material("stainless_light", (0.72, 0.74, 0.74), metallic=0.78, roughness=0.22)
stainless_dark = material("stainless_dark", (0.12, 0.14, 0.15), metallic=0.72, roughness=0.31)
guard_black = material("guard_black", (0.025, 0.030, 0.032), metallic=0.55, roughness=0.30)
rubber = material("rubber", (0.018, 0.020, 0.021), roughness=0.76)
screen = material("screen", (0.008, 0.070, 0.095), metallic=0.04, roughness=0.18)
control_blue = material("control_blue", (0.00, 0.36, 0.64), metallic=0.10, roughness=0.28)
safety_red = material("safety_red", (0.76, 0.020, 0.015), roughness=0.30)
film = material("film", (0.80, 0.84, 0.85), metallic=0.15, roughness=0.34)
product = material("product", (0.50, 0.25, 0.10), roughness=0.46)
white = material("white", (0.90, 0.91, 0.89), roughness=0.42)

root = empty("machine.hsw-c-10-lane")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["closedFootprint"] = CLOSED_FOOTPRINT
root["laneCount"] = LANE_COUNT
root["engineeringUse"] = False
root["dimensionConfidence"] = "low; image-derived estimate"
root["referenceModel"] = "Gram Equipment HSW-C current ten-lane configured render"

frame_group = empty("structure.frame", root)
infeed_group = empty("inspection.multi_lane_infeed", root, selectable=True)
reel_group = empty("inspection.foil_reels", root, selectable=True)
transfer_group = empty("inspection.transfer_bed", root, selectable=True)
wrapper_group = empty("inspection.wrapping_station", root, selectable=True)
seal_group = empty("inspection.heat_seal_station", root, selectable=True)
knife_group = empty("inspection.knife_station", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
outfeed_group = empty("inspection.outfeed", root, selectable=True)
safety_group = empty("safety.guarding", root)
utilities_group = empty("utilities.top_cabinets", root)

lane_ys = tuple(-0.90 + i * 0.20 for i in range(LANE_COUNT))

# The separate infeed/reel bank establishes the full reference silhouette.
rounded_box("infeed.floor_crossmember", (-2.75, 0.0, 0.42), (0.30, 2.70, 0.10), stainless_dark, infeed_group, bevel=0.012)
rounded_box("infeed.longitudinal.operator", (-2.32, -1.16, 0.47), (1.08, 0.10, 0.12), stainless_dark, infeed_group, bevel=0.008)
rounded_box("infeed.longitudinal.far", (-2.32, 1.16, 0.47), (1.08, 0.10, 0.12), stainless_dark, infeed_group, bevel=0.008)
for side, y in (("operator", -1.16), ("far", 1.16)):
    leveling_foot(f"infeed.foot.end.{side}", -2.82, y, infeed_group, stainless_dark, rubber)
    leveling_foot(f"infeed.foot.bridge.{side}", -1.72, y, infeed_group, stainless_dark, rubber)
    pipe(f"infeed.leg.brace.{side}", [(-2.74, y, 0.48), (-2.50, y, 0.98), (-2.05, y, 0.48)], 0.035, stainless_dark, infeed_group)

rounded_box("infeed.reel_shaft_beam", (-2.45, 0.0, 0.70), (0.16, 2.20, 0.12), stainless, reel_group, bevel=0.010)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"reels.foil.{lane:02d}", (-2.45, y, 0.64), 0.245, 0.165, film, reel_group, axis="Y", vertices=20, bevel=0.004)
    cylinder(f"reels.hub.{lane:02d}.operator", (-2.45, y - 0.093, 0.64), 0.055, 0.022, stainless_dark, reel_group, axis="Y", vertices=14)
    cylinder(f"reels.hub.{lane:02d}.far", (-2.45, y + 0.093, 0.64), 0.055, 0.022, stainless_dark, reel_group, axis="Y", vertices=14)
    pipe(
        f"reels.film_web.{lane:02d}",
        [(-2.45, y, 0.86), (-2.23, y, 1.10), (-1.62, y, 1.10)],
        0.010,
        film,
        reel_group,
    )

# Ten inclined format boxes and guide channels match the prominent comb at the infeed.
rounded_box("infeed.lower_bank", (-2.05, 0.0, 0.93), (0.62, 2.18, 0.16), stainless_dark, infeed_group, bevel=0.015)
rounded_box("infeed.upper_bank", (-2.16, 0.0, 1.25), (0.42, 2.18, 0.13), stainless, infeed_group, bevel=0.012)
for lane, y in enumerate(lane_ys, 1):
    pipe(f"infeed.format_rail.{lane:02d}.a", [(-2.30, y - 0.065, 0.92), (-2.18, y - 0.065, 1.32), (-1.62, y - 0.065, 1.12)], 0.022, stainless_dark, infeed_group)
    pipe(f"infeed.format_rail.{lane:02d}.b", [(-2.30, y + 0.065, 0.92), (-2.18, y + 0.065, 1.32), (-1.62, y + 0.065, 1.12)], 0.022, stainless_dark, infeed_group)
    cylinder(f"infeed.pneumatic.{lane:02d}", (-2.05, y, 1.38), 0.035, 0.18, stainless_light, infeed_group, vertices=14)
    cylinder(f"infeed.pneumatic.{lane:02d}.cap", (-2.05, y, 1.49), 0.047, 0.040, stainless_dark, infeed_group, vertices=14)

# Narrow bridge into the guarded wrapping cell.
rounded_box("transfer.operator_side", (-0.88, -1.08, 0.86), (1.78, 0.10, 0.22), stainless, transfer_group, bevel=0.012)
rounded_box("transfer.far_side", (-0.88, 1.08, 0.86), (1.78, 0.10, 0.22), stainless, transfer_group, bevel=0.012)
for index in range(20):
    x = -1.70 + index * 0.083
    rounded_box(f"transfer.cross_slat.{index + 1:02d}", (x, 0.0, 1.02), (0.055, 2.02, 0.055), stainless_light, transfer_group, bevel=0.004, segments=1)
for lane, y in enumerate(lane_ys, 1):
    rounded_box(f"transfer.lane_guide.{lane:02d}", (-0.88, y, 1.10), (1.78, 0.026, 0.14), stainless_dark, transfer_group, bevel=0.004)
    rounded_box(f"transfer.product.{lane:02d}", (-0.92, y, 1.16), (0.35, 0.12, 0.09), product, transfer_group, bevel=0.030, segments=3)
    rounded_box(f"transfer.stick.{lane:02d}", (-1.17, y, 1.16), (0.22, 0.026, 0.020), white, transfer_group, bevel=0.006)

# Main sanitary skid and lower frame.
rounded_box("frame.main_skid", (0.92, 0.0, 0.38), (3.18, 2.32, 0.18), stainless_dark, frame_group, bevel=0.014)
rounded_box("frame.drain_pan", (0.92, 0.0, 0.62), (2.92, 2.18, 0.16), stainless, frame_group, bevel=0.018)
for x in (-0.48, 0.45, 1.42, 2.35):
    for side, y in (("operator", -1.06), ("far", 1.06)):
        leveling_foot(f"frame.foot.{x:+.2f}.{side}", x, y, frame_group, stainless_dark, rubber)
        rounded_box(f"frame.post.{x:+.2f}.{side}", (x, y, 1.48), (0.11, 0.11, 2.06), stainless_dark, frame_group, bevel=0.008)
for z, suffix in ((0.88, "lower"), (2.16, "upper"), (2.44, "roof")):
    rounded_box(f"frame.rail.{suffix}.operator", (0.92, -1.06, z), (3.00, 0.11, 0.11), stainless_dark, frame_group, bevel=0.007)
    rounded_box(f"frame.rail.{suffix}.far", (0.92, 1.06, z), (3.00, 0.11, 0.11), stainless_dark, frame_group, bevel=0.007)
for x, suffix in ((-0.48, "infeed"), (2.35, "outfeed")):
    rounded_box(f"frame.end_rail.{suffix}.lower", (x, 0.0, 0.88), (0.11, 2.12, 0.11), stainless_dark, frame_group, bevel=0.007)
    rounded_box(f"frame.end_rail.{suffix}.upper", (x, 0.0, 2.44), (0.11, 2.12, 0.11), stainless_dark, frame_group, bevel=0.007)

# Main wrapper bed and lane hardware.
rounded_box("wrapper.bed", (0.88, 0.0, 1.02), (2.75, 2.03, 0.15), stainless, wrapper_group, bevel=0.012)
for index in range(31):
    x = -0.40 + index * 0.087
    rounded_box(f"wrapper.bed_slat.{index + 1:02d}", (x, 0.0, 1.13), (0.050, 1.96, 0.045), stainless_light, wrapper_group, bevel=0.003, segments=1)
for lane, y in enumerate(lane_ys, 1):
    rounded_box(f"wrapper.support_channel.{lane:02d}", (0.80, y, 1.22), (2.55, 0.060, 0.11), stainless_dark, wrapper_group, bevel=0.005)

# Linear sealing rail, pneumatic heads, folding plates, and zig-zag knife bank.
rounded_box("seal.top_beam", (0.38, 0.0, 1.91), (0.22, 2.08, 0.16), stainless_dark, seal_group, bevel=0.010)
rounded_box("seal.moving_beam", (0.38, 0.0, 1.53), (0.25, 2.02, 0.15), stainless, seal_group, bevel=0.010)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"seal.actuator.{lane:02d}", (0.38, y, 1.75), 0.038, 0.30, stainless_light, seal_group, vertices=14)
    rounded_box(f"seal.jaw.{lane:02d}", (0.38, y, 1.34), (0.20, 0.145, 0.10), stainless_dark, seal_group, bevel=0.006)
    pipe(f"seal.air_line.{lane:02d}", [(0.38, y, 1.89), (0.22, y, 2.06), (0.05, y, 2.06)], 0.010, stainless_dark, seal_group)

rounded_box("knife.top_beam", (1.38, 0.0, 1.90), (0.24, 2.08, 0.18), stainless_dark, knife_group, bevel=0.010)
rounded_box("knife.carriage", (1.38, 0.0, 1.55), (0.28, 2.02, 0.16), stainless, knife_group, bevel=0.010)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"knife.pneumatic.{lane:02d}", (1.38, y, 1.77), 0.036, 0.28, stainless_light, knife_group, vertices=14)
    rounded_box(f"knife.zigzag_block.{lane:02d}", (1.38, y, 1.36), (0.18, 0.14, 0.09), stainless_dark, knife_group, bevel=0.004)
    rounded_box(f"knife.folding_plate.{lane:02d}", (1.04, y, 1.29), (0.42, 0.14, 0.035), stainless_light, knife_group, bevel=0.004)

# Perforated black safety cage. The modeled bars keep the pattern legible in GLB.
side_guard_panel("guard.operator.infeed", 0.00, 0.86, -1.125, 1.72, 1.40, guard_black, safety_group, columns=5, rows=6)
side_guard_panel("guard.operator.center", 0.92, 0.86, -1.125, 1.72, 1.40, guard_black, safety_group, columns=5, rows=6)
side_guard_panel("guard.operator.outfeed", 1.86, 0.86, -1.125, 1.72, 1.40, guard_black, safety_group, columns=5, rows=6)
side_guard_panel("guard.far", 0.92, 2.74, 1.125, 1.72, 1.40, guard_black, safety_group, columns=14, rows=6)
end_guard_panel("guard.outfeed_end", 2.405, 0.0, 2.12, 1.72, 1.40, guard_black, safety_group, columns=10, rows=6)

# Two opened service hatches, a distinctive part of the supplied render.
for hatch_index, (x0, x1) in enumerate(((-0.42, 0.82), (0.84, 2.24)), 1):
    y0, y1 = 1.13, 1.72
    z0, z1 = 2.43, 3.045
    pipe(f"guard.hatch.{hatch_index}.bottom", [(x0, y0, z0), (x1, y0, z0)], 0.028, guard_black, safety_group)
    pipe(f"guard.hatch.{hatch_index}.top", [(x0, y1, z1), (x1, y1, z1)], 0.028, guard_black, safety_group)
    pipe(f"guard.hatch.{hatch_index}.left", [(x0, y0, z0), (x0, y1, z1)], 0.028, guard_black, safety_group)
    pipe(f"guard.hatch.{hatch_index}.right", [(x1, y0, z0), (x1, y1, z1)], 0.028, guard_black, safety_group)
    for bar in range(1, 6):
        x = x0 + (x1 - x0) * bar / 6
        pipe(f"guard.hatch.{hatch_index}.grid.{bar:02d}", [(x, y0, z0), (x, y1, z1)], 0.012, guard_black, safety_group)
    for bar in range(1, 4):
        t = bar / 4
        pipe(
            f"guard.hatch.{hatch_index}.cross.{bar:02d}",
            [(x0, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t), (x1, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t)],
            0.012,
            guard_black,
            safety_group,
        )

# Roof-mounted pneumatic/electrical boxes and one exact-height cap.
rounded_box("utilities.cabinet.large", (0.55, 0.20, 2.68), (1.18, 0.74, 0.54), stainless, utilities_group, bevel=0.018)
rounded_box("utilities.cabinet.small", (1.72, 0.14, 2.67), (0.92, 0.68, 0.50), stainless_light, utilities_group, bevel=0.018)
rounded_box("utilities.height_cap", (1.56, 1.68, 3.075), (0.20, 0.04, 0.05), stainless_dark, utilities_group, bevel=0.0)
for y in (-0.72, -0.48, -0.24, 0.0, 0.24, 0.48, 0.72):
    cylinder(f"utilities.valve.{y:+.2f}", (0.46, y, 2.39), 0.025, 0.15, stainless_light, utilities_group, vertices=12)

# Operator HMI is mostly hidden in the reference angle but belongs to the current model.
rounded_box("controls.arm", (1.88, -1.25, 1.79), (0.10, 0.34, 0.10), stainless_dark, control_group, bevel=0.008)
rounded_box("controls.panel_body", (1.88, -1.32, 1.61), (0.52, 0.10, 0.58), stainless_light, control_group, bevel=0.025, segments=3)
rounded_box("controls.screen_bezel", (1.88, -1.376, 1.68), (0.34, 0.020, 0.28), guard_black, control_group, bevel=0.016)
rounded_box("controls.screen", (1.88, -1.389, 1.68), (0.29, 0.010, 0.23), screen, control_group, bevel=0.010)
cylinder("controls.emergency_stop", (2.04, -1.384, 1.43), 0.040, 0.035, safety_red, control_group, axis="Y", vertices=18)
text_facing_operator("controls.model_label", "HSW-C", (1.74, -1.390, 1.43), 0.068, control_blue, control_group)

# Outfeed tray and final exact X bound.
rounded_box("outfeed.side.operator", (2.63, -0.96, 0.92), (0.54, 0.10, 0.18), stainless_dark, outfeed_group, bevel=0.008)
rounded_box("outfeed.side.far", (2.63, 0.96, 0.92), (0.54, 0.10, 0.18), stainless_dark, outfeed_group, bevel=0.008)
rounded_box("outfeed.end_crossmember", (2.80, 0.0, 0.94), (0.20, 2.04, 0.14), stainless, outfeed_group, bevel=0.010)
for index in range(7):
    x = 2.38 + index * 0.075
    rounded_box(f"outfeed.slat.{index + 1:02d}", (x, 0.0, 1.04), (0.045, 1.86, 0.045), stainless_light, outfeed_group, bevel=0.003, segments=1)

text_facing_operator("frame.brand", "GRAM", (2.30, -1.175, 0.66), 0.12, stainless_light, frame_group)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable machine before adding preview-only studio objects.
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


studio_floor = material("studio_floor", (0.56, 0.59, 0.58), roughness=0.72)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (8.2, 6.0, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.77, 0.79, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (2.8, -4.8, 6.5), 1450, 4.0),
    ("studio.fill", (-3.5, -2.4, 4.0), 780, 3.2),
    ("studio.rim", (1.5, 4.4, 5.0), 1100, 3.5),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.25))

render_preview("front", (0.0, -8.7, 2.0), (0.0, 0.0, 1.45), 6.55)
render_preview("side", (8.2, 0.0, 1.95), (0.0, 0.0, 1.42), 4.05)
render_preview("three-quarter", (-6.8, -6.8, 4.7), (0.0, 0.0, 1.40), 6.65)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
