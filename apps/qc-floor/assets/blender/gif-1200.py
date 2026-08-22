#!/usr/bin/env python3
"""Build the reference-led Gram GIF 1200 QC-floor asset in Blender.

Run from the repository root with Blender 4.2 or newer:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/gif-1200.py

The result is an exterior visualization for the QC floor, not a fabrication,
installation, piping, maintenance, or safety model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "gif-1200"
BLEND_PATH = SCRIPT_DIR / "gif-1200.blend"
GLB_PATH = MODEL_DIR / "gram-gif-1200.glb"
STL_PATH = MODEL_DIR / "gram-gif-1200.stl"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Gram Equipment GIF 600/1200 presentation, technical specifications 1/2 and
# 2/2: 1950 mm overall length, 690 mm width, 1700 +/- 30 mm nominal height.
# Blender is Z-up; GLB export is Y-up.
ENVELOPE = (1.95, 0.69, 1.70)
FACE_X = 0.745


def clear_scene():
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


def material(name, color, metallic, roughness):
    result = bpy.data.materials.new(f"material.{name}")
    result.diffuse_color = color
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    return result


def empty(name, parent=None, selectable=False):
    result = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(result)
    result.parent = parent
    if selectable:
        result["selectable"] = True
    return result


def finish_object(obj, name, mat, parent, smooth=False):
    obj.name = name
    obj.data.name = f"mesh.{name}"
    obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = smooth
    return obj


def rounded_box(name, location, dimensions, mat, parent, bevel=0.004, segments=2):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_object(obj, name, mat, parent)


def cylinder(name, location, radius, depth, mat, parent, axis="X", vertices=24, bevel=0.002):
    rotation = {
        "X": (0.0, math.pi / 2, 0.0),
        "Y": (math.pi / 2, 0.0, 0.0),
        "Z": (0.0, 0.0, 0.0),
    }[axis]
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_object(obj, name, mat, parent, smooth=True)


def cone(name, location, radius1, radius2, depth, mat, parent, vertices=18):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, resolution=4):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    spline.order_u = min(4, len(points))
    spline.use_endpoint_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj.name = name
    obj.data.name = f"mesh.{name}"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def text_mesh(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.resolution_u = 1
    curve.extrude = 0.00035
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, math.pi / 2)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj.name = name
    obj.data.name = f"mesh.{name}"
    return obj


def ring_of_bolts(name, center_y, center_z, front_x, radius, count, mat, parent):
    for index in range(count):
        angle = index * math.tau / count
        cylinder(
            f"{name}.{index + 1:02d}",
            (front_x, center_y + math.cos(angle) * radius, center_z + math.sin(angle) * radius),
            0.008,
            0.012,
            mat,
            parent,
            vertices=10,
            bevel=0.001,
        )


def pump_housing(name, center_y, center_z, radius, mat, dark_mat, parent, with_handle=False):
    cylinder(f"{name}.body", (0.850, center_y, center_z), radius * 0.91, 0.180, mat, parent, vertices=32, bevel=0.004)
    cylinder(f"{name}.rear_flange", (0.770, center_y, center_z), radius, 0.034, mat, parent, vertices=32, bevel=0.002)
    cylinder(f"{name}.front_cap", (0.950, center_y, center_z), radius, 0.050, mat, parent, vertices=32, bevel=0.003)
    cylinder(f"{name}.center_hub", (0.970, center_y, center_z), radius * 0.19, 0.010, dark_mat, parent, vertices=16, bevel=0.001)
    ring_of_bolts(name + ".cap_bolt", center_y, center_z, 0.969, radius * 0.72, 6, dark_mat, parent)
    if with_handle:
        pipe(
            f"{name}.valve_stem",
            [(0.870, center_y, center_z + radius * 0.78), (0.870, center_y, center_z + radius + 0.055)],
            0.008,
            mat,
            parent,
        )
        cylinder(
            f"{name}.valve_handle",
            (0.870, center_y, center_z + radius + 0.060),
            0.008,
            0.112,
            dark_mat,
            parent,
            axis="Y",
            vertices=12,
            bevel=0.001,
        )


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.43, 0.46, 0.46, 1.0), 0.86, 0.27)
stainless_light = material("stainless_light", (0.69, 0.72, 0.71, 1.0), 0.90, 0.20)
stainless_dark = material("stainless_dark", (0.08, 0.095, 0.10, 1.0), 0.60, 0.39)
control_grey = material("control_grey", (0.055, 0.075, 0.090, 1.0), 0.16, 0.34)
screen = material("hmi_screen", (0.020, 0.055, 0.060, 1.0), 0.02, 0.20)
safety_red = material("safety_red", (0.72, 0.020, 0.015, 1.0), 0.03, 0.31)
warning_yellow = material("warning_yellow", (0.90, 0.62, 0.025, 1.0), 0.02, 0.36)
pneumatic_blue = material("pneumatic_blue", (0.08, 0.34, 0.72, 1.0), 0.06, 0.34)

root = empty("machine.gif-1200")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["referenceModel"] = "Gram Equipment GIF 1200, 2015 presentation revision"

cabinet_group = empty("structure.cabinet", root)
control_group = empty("inspection.control_panel", root, selectable=True)
outlet_group = empty("inspection.product_outlet", root, selectable=True)
inlet_group = empty("inspection.mix_inlet", root, selectable=True)
piping_group = empty("utilities.sanitary_piping", root)

# The technical drawing gives a 1.72 m cabinet and 0.23 m front hardware zone.
rounded_box("cabinet.main_skin", (-0.115, 0.0, 0.920), (1.720, 0.670, 1.500), stainless, cabinet_group, bevel=0.009, segments=3)
rounded_box("cabinet.top_cap", (-0.115, 0.0, 1.680), (1.720, 0.690, 0.040), stainless_light, cabinet_group, bevel=0.006)
rounded_box("cabinet.front_face", (FACE_X + 0.004, 0.0, 0.925), (0.008, 0.670, 1.470), stainless_light, cabinet_group, bevel=0.002)

# Front seams and the raised dark control fascia match the manufacturer photos.
rounded_box("cabinet.front_center_seam", (0.756, 0.062, 0.805), (0.004, 0.004, 1.175), stainless_dark, cabinet_group, bevel=0)
rounded_box("cabinet.front_lower_seam", (0.756, 0.0, 0.300), (0.004, 0.625, 0.004), stainless_dark, cabinet_group, bevel=0)
rounded_box("controls.fascia", (0.760, 0.205, 1.255), (0.022, 0.225, 0.620), control_grey, control_group, bevel=0.006, segments=3)
rounded_box("controls.hmi_bezel", (0.776, 0.205, 1.475), (0.018, 0.178, 0.150), stainless_light, control_group, bevel=0.008, segments=3)
rounded_box("controls.hmi_inner", (0.788, 0.205, 1.475), (0.008, 0.142, 0.112), stainless_dark, control_group, bevel=0.004)
rounded_box("controls.hmi_screen", (0.794, 0.205, 1.485), (0.006, 0.108, 0.064), screen, control_group, bevel=0.002)
text_mesh("controls.brand_text", "Gram Equipment", (0.798, 0.205, 1.365), 0.018, stainless_light, control_group)
text_mesh("controls.model_text", "GIF 1200", (0.798, 0.170, 1.145), 0.022, stainless_light, control_group, align="LEFT")
cylinder("controls.status_button", (0.798, 0.170, 1.090), 0.013, 0.014, pneumatic_blue, control_group, vertices=20, bevel=0.002)
cylinder("controls.emergency_stop_base", (0.800, 0.245, 1.090), 0.039, 0.022, warning_yellow, control_group, vertices=24, bevel=0.002)
cylinder("controls.emergency_stop", (0.817, 0.245, 1.090), 0.027, 0.026, safety_red, control_group, vertices=24, bevel=0.003)

# Four tapered adjustable legs touch the floor and establish the 1.70 m bound.
for index, (x, y) in enumerate(((-0.825, -0.270), (-0.825, 0.270), (0.595, -0.270), (0.595, 0.270)), 1):
    cone(f"cabinet.leg.{index:02d}", (x, y, 0.115), 0.024, 0.045, 0.150, stainless_dark, cabinet_group)
    cylinder(f"cabinet.leg_stem.{index:02d}", (x, y, 0.035), 0.012, 0.060, stainless_dark, cabinet_group, axis="Z", vertices=14, bevel=0.001)
    cylinder(f"cabinet.foot_pad.{index:02d}", (x, y, 0.010), 0.045, 0.020, stainless_dark, cabinet_group, axis="Z", vertices=20, bevel=0.001)

# Long side service doors, recessed handles, and high/low ventilation banks.
for side in (-1, 1):
    side_name = "right" if side < 0 else "left"
    y = side * 0.337
    for x in (-0.55, 0.10, 0.52):
        rounded_box(f"cabinet.{side_name}.vertical_seam.{x}", (x, y, 0.925), (0.004, 0.004, 1.430), stainless_dark, cabinet_group, bevel=0)
    rounded_box(f"cabinet.{side_name}.handle", (0.155, side * 0.340, 1.080), (0.125, 0.006, 0.072), stainless_dark, cabinet_group, bevel=0.006, segments=3)
    for bank_z in (0.335, 1.515):
        for index in range(8):
            rounded_box(
                f"cabinet.{side_name}.louver.{bank_z:.2f}.{index + 1}",
                (-0.70 + index * 0.055, side * 0.342, bank_z),
                (0.038, 0.006, 0.008),
                stainless_dark,
                cabinet_group,
                bevel=0.001,
            )

# Two-level front process layout from the exact GIF 1200 manufacturer photos.
pump_housing("process.discharge_pump", -0.145, 1.285, 0.120, stainless_light, stainless_dark, outlet_group)
pump_housing("process.mix_pump", -0.150, 0.470, 0.108, stainless_light, stainless_dark, inlet_group, with_handle=True)

cylinder("process.freezer_flange.plate", (0.810, 0.060, 0.830), 0.142, 0.130, stainless_light, outlet_group, vertices=36, bevel=0.003)
cylinder("process.freezer_flange.neck", (0.888, 0.060, 0.830), 0.075, 0.058, stainless_light, outlet_group, vertices=28, bevel=0.002)
cylinder("process.freezer_flange.cap", (0.925, 0.060, 0.830), 0.054, 0.018, stainless_dark, outlet_group, vertices=24, bevel=0.002)
ring_of_bolts("process.freezer_flange.bolt", 0.060, 0.830, 0.872, 0.106, 8, stainless_dark, outlet_group)

pipe(
    "process.product_transfer_pipe",
    [
        (0.880, -0.145, 1.195),
        (0.880, -0.145, 1.115),
        (0.875, -0.100, 1.060),
        (0.900, -0.010, 1.005),
        (0.930, 0.075, 0.955),
        (0.940, 0.105, 0.900),
        (0.925, 0.060, 0.830),
    ],
    0.030,
    stainless_light,
    piping_group,
    resolution=5,
)
cylinder("process.pipe_clamp.upper", (0.880, -0.145, 1.195), 0.040, 0.014, stainless_dark, piping_group, axis="Z", vertices=18, bevel=0.001)
cylinder("process.pipe_clamp.center", (0.925, 0.060, 0.830), 0.040, 0.014, stainless_dark, piping_group, axis="X", vertices=18, bevel=0.001)

pipe(
    "process.mix_inlet_return",
    [(0.875, -0.150, 0.570), (0.875, -0.150, 0.630), (0.845, -0.115, 0.655), (0.805, -0.070, 0.655)],
    0.019,
    stainless_light,
    piping_group,
)
pipe(
    "utilities.product_temperature_probe",
    [(0.900, -0.245, 1.260), (0.870, -0.285, 1.205), (0.825, -0.285, 1.135)],
    0.004,
    pneumatic_blue,
    piping_group,
    resolution=3,
)
pipe(
    "utilities.lower_pneumatic_tail",
    [(0.900, -0.235, 0.455), (0.865, -0.285, 0.415), (0.815, -0.285, 0.410)],
    0.004,
    pneumatic_blue,
    piping_group,
    resolution=3,
)

# Rear utility connections shown in the exact GIF 1200 elevation drawing.
for index, (z, radius) in enumerate(((0.42, 0.018), (0.82, 0.018), (1.50, 0.026)), 1):
    cylinder(f"utilities.rear_connection.{index:02d}", (-0.970, -0.250, z), radius, 0.010, stainless_dark, piping_group, axis="X", vertices=18, bevel=0.001)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

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

# Remove zero-length edges from the colorless interchange copy. The GLB and
# editable source retain their original named mesh structure.
for obj in asset_objects():
    if obj.type != "MESH":
        continue
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.dissolve_degenerate(mesh, dist=0.0000001, edges=list(mesh.edges))
    mesh.to_mesh(obj.data)
    mesh.free()

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


def render_preview(name, camera_location, ortho_scale):
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
    point_at(camera, (0.0, 0.0, 0.83))

    scene = bpy.context.scene
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.engine = "BLENDER_EEVEE"
    bpy.ops.render.render(write_still=True)


# Preview-only studio objects are created after the asset exports.
floor_mat = material("studio_floor", (0.68, 0.71, 0.69, 1.0), 0.0, 0.70)
rounded_box("studio.floor", (0.0, 0.0, -0.035), (3.8, 3.8, 0.06), floor_mat, None, bevel=0.01)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.70, 0.73, 0.75, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.30

for name, location, energy, size in (
    ("studio.key", (3.6, -2.8, 4.4), 840, 3.2),
    ("studio.fill", (1.0, 3.5, 2.8), 430, 2.8),
    ("studio.rim", (-3.0, -1.8, 3.4), 560, 2.2),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.85))

render_preview("front", (4.7, 0.0, 0.92), 2.35)
render_preview("side", (0.0, -4.7, 0.92), 2.35)
render_preview("three-quarter", (3.7, -3.2, 2.45), 2.80)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
