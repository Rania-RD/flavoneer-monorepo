#!/usr/bin/env python3
"""Build the reference-led Danxiao GTA450-120 asset for the AI QC floor.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/danxiao-gta450-120.py

The model follows the published overall envelope and the visible exterior in
manufacturer and marketplace photographs. It is not a fabrication, guarding,
maintenance, or machine-installation model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "danxiao-gta450-120"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "danxiao-gta450-120.blend"
GLB_PATH = MODEL_DIR / "danxiao-gta450-120.glb"
STL_PATH = MODEL_DIR / "danxiao-gta450-120.stl"

# Published by Danxiao's Made-in-China listing. Blender uses Z-up while the
# exported GLB is Y-up. The values are length, width, and height in meters.
ENVELOPE = (5.05, 0.96, 1.55)


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
    rgba = (color[0], color[1], color[2], alpha)
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


def rounded_box(name, location, dimensions, mat, parent, bevel=0.01, segments=2):
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


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=20):
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


def pipe(name, points, radius, mat, parent, bevel_resolution=1):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_resolution
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
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


def plate_mesh(name, points, depth, mat, parent):
    """Create a front-facing extruded plate from X/Z profile points."""
    vertices = []
    for y in (-depth / 2, depth / 2):
        vertices.extend((x, y, z) for x, z in points)
    count = len(points)
    faces = [tuple(range(count)), tuple(range(count, count * 2))[::-1]]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new(f"mesh.{name}")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    bevel = obj.modifiers.new("edge_radius", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 2
    bevel.affect = "EDGES"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def text_front(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.001
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


def caster(name, x, y, parent, metal_mat, tire_mat):
    rounded_box(f"{name}.fork", (x, y, 0.105), (0.075, 0.060, 0.12), metal_mat, parent, bevel=0.006)
    cylinder(f"{name}.wheel", (x, y, 0.045), 0.045, 0.055, tire_mat, parent, axis="Y", vertices=18)
    cylinder(f"{name}.hub", (x, y - 0.031, 0.045), 0.016, 0.012, metal_mat, parent, axis="Y", vertices=14)


def leveling_foot(name, x, y, parent, metal_mat, tire_mat):
    cylinder(f"{name}.stem", (x, y, 0.095), 0.018, 0.13, metal_mat, parent, vertices=14)
    cone(f"{name}.bell", (x, y, 0.038), 0.050, 0.028, 0.050, metal_mat, parent, vertices=18)
    cylinder(f"{name}.pad", (x, y, 0.008), 0.052, 0.016, tire_mat, parent, vertices=20, bevel=0.001)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.56, 0.59, 0.59), metallic=0.86, roughness=0.24)
stainless_light = material("stainless_light", (0.76, 0.78, 0.77), metallic=0.80, roughness=0.20)
stainless_dark = material("stainless_dark", (0.20, 0.23, 0.23), metallic=0.72, roughness=0.34)
belt_white = material("belt_white", (0.88, 0.89, 0.85), metallic=0.0, roughness=0.42)
rubber = material("rubber", (0.018, 0.023, 0.023), metallic=0.0, roughness=0.74)
screen_blue = material("screen_blue", (0.018, 0.18, 0.28), metallic=0.05, roughness=0.20)
control_blue = material("control_blue", (0.02, 0.35, 0.62), metallic=0.10, roughness=0.30)
safety_red = material("safety_red", (0.74, 0.018, 0.012), metallic=0.02, roughness=0.34)

root = empty("machine.gta450-120")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "high envelope; medium exterior proportions; low hidden mechanisms"
root["referenceModel"] = "Wuxi Danxiao GTA450-120"

frame_group = empty("structure.frame", root)
infeed_group = empty("inspection.infeed_conveyor", root, selectable=True)
transfer_group = empty("inspection.product_transfer", root, selectable=True)
film_group = empty("inspection.film_feed", root, selectable=True)
longitudinal_group = empty("inspection.longitudinal_seal", root, selectable=True)
end_seal_group = empty("inspection.end_seal", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
utilities_group = empty("utilities.electrical", root)
safety_group = empty("safety.emergency_controls", root, selectable=True)

# The outer footprint is established by the infeed nose, discharge nose, main
# base width, and floor-contact hardware. Product enters at -X and exits at +X.
rounded_box("frame.main_base", (1.32, 0.0, 0.20), (1.42, 0.96, 0.27), stainless, frame_group, bevel=0.025, segments=3)
rounded_box("frame.main_cabinet", (1.32, 0.0, 0.52), (1.16, 0.76, 0.52), stainless_light, frame_group, bevel=0.025, segments=3)
rounded_box("frame.cabinet_plinth", (1.32, 0.0, 0.23), (1.30, 0.86, 0.14), stainless, frame_group, bevel=0.014)

for side, y in (("operator", -0.385), ("far", 0.385)):
    rounded_box(f"frame.cabinet.{side}.door_left", (1.07, y, 0.55), (0.48, 0.012, 0.40), stainless, frame_group, bevel=0.012)
    rounded_box(f"frame.cabinet.{side}.door_right", (1.57, y, 0.55), (0.43, 0.012, 0.40), stainless, frame_group, bevel=0.012)
    cylinder(f"frame.cabinet.{side}.latch_left", (1.18, y - (0.009 if y < 0 else -0.009), 0.56), 0.020, 0.022, stainless_dark, frame_group, axis="Y", vertices=14)
    cylinder(f"frame.cabinet.{side}.latch_right", (1.48, y - (0.009 if y < 0 else -0.009), 0.56), 0.020, 0.022, stainless_dark, frame_group, axis="Y", vertices=14)

# Base rails mirror the welded skid in the installed and catalog views.
for side, y in (("operator", -0.39), ("far", 0.39)):
    rounded_box(f"frame.skid.{side}", (-0.15, y, 0.16), (3.75, 0.065, 0.075), stainless, frame_group, bevel=0.008)
rounded_box("frame.skid.infeed_cross", (-1.99, 0.0, 0.16), (0.065, 0.83, 0.075), stainless, frame_group, bevel=0.008)
rounded_box("frame.skid.drive_cross", (1.70, 0.0, 0.16), (0.065, 0.83, 0.075), stainless, frame_group, bevel=0.008)

for index, (x, y) in enumerate(((0.88, -0.38), (0.88, 0.38), (1.78, -0.38), (1.78, 0.38)), 1):
    caster(f"frame.caster.{index:02d}", x, y, frame_group, stainless_dark, rubber)
for index, (x, y) in enumerate(((-2.20, -0.27), (-2.20, 0.27), (-0.95, -0.31), (-0.95, 0.31)), 1):
    leveling_foot(f"frame.foot.{index:02d}", x, y, frame_group, stainless_dark, rubber)

# Long infeed bed and visible white belt. Individual stainless side fasteners
# give the five-meter silhouette enough detail at floor-view distance.
rounded_box("infeed.left_side", (-0.78, -0.255, 0.69), (3.49, 0.060, 0.20), stainless, infeed_group, bevel=0.008)
rounded_box("infeed.right_side", (-0.78, 0.255, 0.69), (3.49, 0.060, 0.20), stainless, infeed_group, bevel=0.008)
rounded_box("infeed.belt", (-0.78, 0.0, 0.795), (3.49, 0.43, 0.045), belt_white, infeed_group, bevel=0.012)
rounded_box("infeed.nose", (-2.4775, 0.0, 0.69), (0.095, 0.54, 0.20), stainless, infeed_group, bevel=0.010)
cylinder("infeed.nose_roller", (-2.47, 0.0, 0.79), 0.055, 0.41, stainless_dark, infeed_group, axis="Y", vertices=18)

for index in range(14):
    x = -2.30 + index * 0.245
    for side, y in (("operator", -0.288), ("far", 0.288)):
        cylinder(f"infeed.fastener.{index + 1:02d}.{side}", (x, y, 0.69), 0.012, 0.010, stainless_dark, infeed_group, axis="Y", vertices=12, bevel=0.0)

# Conveyor support frames and braces.
for index, x in enumerate((-2.16, -0.86, 0.15), 1):
    for side, y in (("operator", -0.25), ("far", 0.25)):
        rounded_box(f"infeed.leg.{index:02d}.{side}", (x, y, 0.43), (0.055, 0.055, 0.50), stainless_light, infeed_group, bevel=0.005)
    rounded_box(f"infeed.crossbar.{index:02d}", (x, 0.0, 0.22), (0.06, 0.54, 0.06), stainless, infeed_group, bevel=0.005)
    pipe(f"infeed.brace.{index:02d}.operator", [(x, -0.25, 0.25), (x + 0.22, -0.25, 0.67)], 0.016, stainless_dark, infeed_group)

# Optional automatic loading bridge shown on the manufacturer page. It is
# modeled as the compact transfer belt and chain head, not the sandwich former.
rounded_box("transfer.loader_cabinet", (-2.03, 0.0, 0.51), (0.58, 0.62, 0.47), stainless_light, transfer_group, bevel=0.018)
rounded_box("transfer.loader_belt", (-2.03, 0.0, 0.845), (0.62, 0.39, 0.055), belt_white, transfer_group, bevel=0.010)
rounded_box("transfer.loader_upper_frame", (-1.88, 0.0, 0.99), (0.52, 0.34, 0.065), stainless_dark, transfer_group, bevel=0.008)
for x in (-2.09, -1.74):
    cylinder(f"transfer.chain_sprocket.{x:+.2f}", (x, -0.19, 1.00), 0.10, 0.045, stainless_dark, transfer_group, axis="Y", vertices=18)
pipe("transfer.chain_top", [(-2.09, -0.19, 1.07), (-1.74, -0.19, 1.07)], 0.018, rubber, transfer_group)
pipe("transfer.chain_bottom", [(-2.09, -0.19, 0.93), (-1.74, -0.19, 0.93)], 0.018, rubber, transfer_group)
rounded_box("transfer.sensor_arch.left", (-2.13, 0.0, 1.13), (0.045, 0.50, 0.30), stainless_light, transfer_group, bevel=0.004)
rounded_box("transfer.sensor_arch.top", (-2.13, 0.0, 1.29), (0.28, 0.045, 0.045), stainless_light, transfer_group, bevel=0.004)

# Main upright bulkhead and sloped film-carriage plate.
rounded_box("frame.drive_bulkhead", (0.87, 0.0, 1.02), (0.33, 0.76, 0.82), stainless_light, frame_group, bevel=0.020, segments=3)
plate_mesh(
    "film.carrier_plate",
    [(0.62, 0.96), (0.62, 1.29), (1.46, 1.42), (1.48, 1.03)],
    0.075,
    stainless_light,
    film_group,
)

# Twin film-roll spindles, hubs, and film web rollers.
for index, (x, z) in enumerate(((0.80, 1.31), (1.24, 1.38)), 1):
    cylinder(f"film.roll.{index:02d}.web", (x, -0.02, z), 0.150, 0.38, belt_white, film_group, axis="Y", vertices=24)
    cylinder(f"film.roll.{index:02d}.hub", (x, -0.225, z), 0.074, 0.055, rubber, film_group, axis="Y", vertices=22)
    cylinder(f"film.roll.{index:02d}.spindle", (x, -0.285, z), 0.025, 0.08, stainless_dark, film_group, axis="Y", vertices=16)
    cylinder(f"film.roll.{index:02d}.cap", (x, -0.332, z), 0.050, 0.025, rubber, film_group, axis="Y", vertices=18)

for index, (x, z, radius) in enumerate(((0.72, 1.08, 0.035), (1.02, 1.15, 0.038), (1.33, 1.12, 0.035), (1.47, 1.02, 0.030)), 1):
    cylinder(f"film.guide_roller.{index:02d}", (x, -0.15, z), radius, 0.44, stainless_dark, film_group, axis="Y", vertices=18)

# Photo-eye mast and top status tower establish the published 1.55 m height.
rounded_box("film.photoeye_mast", (1.49, 0.20, 1.32), (0.055, 0.055, 0.36), stainless_light, film_group, bevel=0.006)
rounded_box("film.photoeye", (1.49, 0.15, 1.42), (0.10, 0.10, 0.08), control_blue, film_group, bevel=0.010)
cylinder("controls.tower.stem", (1.02, 0.22, 1.465), 0.020, 0.13, stainless_dark, utilities_group, vertices=14)
cylinder("controls.tower.blue", (1.02, 0.22, 1.505), 0.034, 0.045, control_blue, utilities_group, vertices=18)
cylinder("controls.tower.red", (1.02, 0.22, 1.535), 0.034, 0.030, safety_red, utilities_group, vertices=18)

# Operator panel, screen, selector switches, and emergency stop face -Y.
rounded_box("controls.panel_body", (1.44, -0.405, 1.19), (0.66, 0.13, 0.44), stainless_light, control_group, bevel=0.020, segments=3)
rounded_box("controls.blue_bezel", (1.42, -0.466, 1.23), (0.45, 0.025, 0.29), control_blue, control_group, bevel=0.012)
rounded_box("controls.hmi", (1.32, -0.478, 1.25), (0.22, 0.004, 0.14), screen_blue, control_group, bevel=0.001)
for row, z in enumerate((1.26, 1.17, 1.08), 1):
    for column, x in enumerate((1.50, 1.59), 1):
        cylinder(f"controls.button.{row:02d}.{column:02d}", (x, -0.467, z), 0.021, 0.022, control_blue if row < 3 else stainless_dark, control_group, axis="Y", vertices=14)
cylinder("controls.emergency_base", (1.67, -0.458, 1.08), 0.035, 0.024, stainless_light, safety_group, axis="Y", vertices=16)
cylinder("controls.emergency_stop", (1.67, -0.463, 1.08), 0.028, 0.030, safety_red, safety_group, axis="Y", vertices=16)
text_front("controls.model_label", "GTA450", (1.42, -0.478, 0.995), 0.055, stainless_dark, control_group)

# Film-forming tunnel and the three longitudinal sealing rollers visible below
# the HMI. Their axis follows product flow.
rounded_box("seal.forming_box", (1.25, 0.0, 0.84), (0.74, 0.56, 0.20), stainless, longitudinal_group, bevel=0.016)
rounded_box("seal.former_shoulder", (0.68, 0.0, 0.85), (0.34, 0.42, 0.13), stainless_light, longitudinal_group, bevel=0.030, segments=3)
for index, (y, z) in enumerate(((-0.39, 0.91), (-0.41, 0.82), (-0.39, 0.73)), 1):
    cylinder(f"seal.longitudinal_roller.{index:02d}", (1.42, y, z), 0.045, 0.63, stainless_dark, longitudinal_group, axis="X", vertices=20)
    cylinder(f"seal.longitudinal_hub.{index:02d}", (1.08, y, z), 0.060, 0.04, rubber, longitudinal_group, axis="X", vertices=18)
rounded_box("seal.adjustment_frame.left", (1.08, -0.445, 0.82), (0.055, 0.045, 0.28), stainless_light, longitudinal_group, bevel=0.008)
rounded_box("seal.adjustment_frame.right", (1.76, -0.445, 0.82), (0.055, 0.045, 0.28), stainless_light, longitudinal_group, bevel=0.008)
rounded_box("seal.adjustment_frame.top", (1.42, -0.445, 0.95), (0.73, 0.045, 0.035), stainless_light, longitudinal_group, bevel=0.008)
rounded_box("seal.adjustment_frame.bottom", (1.42, -0.445, 0.69), (0.73, 0.045, 0.035), stainless_light, longitudinal_group, bevel=0.008)
cylinder("seal.handwheel", (1.45, -0.460, 0.82), 0.080, 0.032, rubber, longitudinal_group, axis="Y", vertices=18)
cylinder("seal.handwheel_hub", (1.45, -0.466, 0.82), 0.025, 0.025, stainless_light, longitudinal_group, axis="Y", vertices=14)

# End-seal and cutting head, top clamps, discharge belt, and trim wheel.
rounded_box("end_seal.cross_head", (1.98, 0.0, 0.83), (0.34, 0.76, 0.60), stainless_light, end_seal_group, bevel=0.020, segments=3)
rounded_box("end_seal.jaw_guard", (1.87, -0.405, 0.84), (0.25, 0.13, 0.38), stainless, end_seal_group, bevel=0.015)
for index, y in enumerate((-0.26, 0.26), 1):
    cylinder(f"end_seal.top_clamp.{index:02d}.stem", (1.94, y, 1.23), 0.020, 0.18, stainless_dark, end_seal_group, vertices=14)
    rounded_box(f"end_seal.top_clamp.{index:02d}.handle", (1.94, y, 1.33), (0.18, 0.035, 0.035), rubber, end_seal_group, bevel=0.012)
cylinder("end_seal.trim_roll", (2.20, 0.30, 1.02), 0.105, 0.08, belt_white, end_seal_group, axis="Y", vertices=24)
cylinder("end_seal.trim_hub", (2.20, 0.345, 1.02), 0.028, 0.03, stainless_dark, end_seal_group, axis="Y", vertices=16)

rounded_box("end_seal.discharge_frame", (2.34, 0.0, 0.77), (0.37, 0.50, 0.17), stainless, end_seal_group, bevel=0.010)
rounded_box("end_seal.discharge_belt", (2.34, 0.0, 0.87), (0.37, 0.40, 0.045), belt_white, end_seal_group, bevel=0.010)
rounded_box("end_seal.discharge_nose", (2.4775, 0.0, 0.77), (0.095, 0.50, 0.17), stainless, end_seal_group, bevel=0.010)
cylinder("end_seal.discharge_roller", (2.47, 0.0, 0.87), 0.050, 0.38, stainless_dark, end_seal_group, axis="Y", vertices=18)

# Small electrical enclosure, warning labels, and a simplified visible cable.
rounded_box("utilities.lower_box", (0.73, -0.39, 0.62), (0.22, 0.14, 0.32), stainless_light, utilities_group, bevel=0.014)
rounded_box("utilities.warning_plate", (0.73, -0.468, 0.67), (0.095, 0.010, 0.11), control_blue, utilities_group, bevel=0.004)
pipe("utilities.control_cable", [(0.80, -0.39, 0.52), (0.92, -0.43, 0.34), (1.10, -0.42, 0.28)], 0.016, rubber, utilities_group)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable source before adding preview-only studio objects.
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


studio_floor = material("studio_floor", (0.57, 0.60, 0.59), roughness=0.74)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (6.6, 4.2, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.75, 0.78, 0.80, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (2.4, -3.5, 4.8), 1150, 3.5),
    ("studio.fill", (-2.8, -2.0, 3.0), 720, 3.0),
    ("studio.rim", (1.8, 3.2, 3.6), 900, 3.2),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.8))

render_preview("front", (0.0, -6.8, 1.55), (0.0, 0.0, 0.82), 5.70)
render_preview("side", (6.3, 0.0, 1.40), (0.0, 0.0, 0.80), 2.25)
render_preview("three-quarter", (5.4, -5.4, 3.3), (0.0, 0.0, 0.72), 5.50)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
