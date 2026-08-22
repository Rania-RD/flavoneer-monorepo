#!/usr/bin/env python3
"""Build and render the reference-led Gram/ISF GIF 400 QC-floor asset.

Run with Blender 5.x from the repository root:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/gif-400.py

The model is an exterior visualization, not an engineering or service model.
Blender uses Z-up coordinates. The GLB exporter converts them to Y-up while
preserving +X as the documented product-flow/depth axis.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "gif-400"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

GLB_PATH = MODEL_DIR / "gram-gif-400.glb"
STL_PATH = MODEL_DIR / "gram-gif-400.stl"

# Published installed envelope from the exact GIF 400 listing.
ENVELOPE = (1.45, 0.60, 1.60)  # X depth, Y width, Z height in meters.


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name: str, color: tuple[float, float, float, float], metallic: float, roughness: float):
    result = bpy.data.materials.new(f"material.{name}")
    result.diffuse_color = color
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    return result


def empty(name: str, parent=None, selectable: bool = False):
    result = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(result)
    result.parent = parent
    if selectable:
        result["selectable"] = True
    return result


def finish_object(obj, name: str, mat, parent):
    obj.name = name
    obj.data.name = f"mesh.{name}"
    obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def rounded_box(name, location, dimensions, mat, parent, bevel=0.004, segments=2):
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


def cylinder(name, location, radius, depth, mat, parent, axis="X", vertices=24, bevel=0.002):
    rotation = (0.0, math.pi / 2, 0.0) if axis == "X" else ((math.pi / 2, 0.0, 0.0) if axis == "Y" else (0.0, 0.0, 0.0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish_object(obj, name, mat, parent)


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=20, bevel=0.001):
    rotation = (0.0, math.pi / 2, 0.0) if axis == "X" else ((math.pi / 2, 0.0, 0.0) if axis == "Y" else (0.0, 0.0, 0.0))
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("edge_radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish_object(obj, name, mat, parent)


def pipe(name, points, radius, mat, parent, resolution=3):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.resolution_u = 4
    curve.twist_smooth = 8
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
    curve.extrude = 0.0005
    curve.bevel_depth = 0.0002
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    # local X -> global +Y, local Y -> global +Z, local normal -> global +X
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


def flange(name, center_y, center_z, radius, front_x, mat, dark_mat, parent, bolt_count=8):
    cylinder(f"{name}.plate", (front_x - 0.035, center_y, center_z), radius, 0.07, mat, parent, vertices=32, bevel=0.003)
    cylinder(f"{name}.neck", (front_x + 0.018, center_y, center_z), radius * 0.49, 0.045, mat, parent, vertices=24, bevel=0.002)
    for index in range(bolt_count):
        angle = index * math.tau / bolt_count
        y = center_y + math.cos(angle) * radius * 0.72
        z = center_z + math.sin(angle) * radius * 0.72
        cylinder(f"{name}.bolt.{index + 1:02d}", (front_x + 0.007, y, z), 0.009, 0.018, dark_mat, parent, vertices=10, bevel=0.001)


def housing(name, center_y, center_z, body_radius, front_x, mat, dark_mat, parent):
    cylinder(f"{name}.body", (front_x - 0.115, center_y, center_z), body_radius, 0.26, mat, parent, vertices=28, bevel=0.004)
    cylinder(f"{name}.rear_flange", (0.438, center_y, center_z), body_radius * 1.06, 0.035, mat, parent, vertices=28, bevel=0.002)
    cylinder(f"{name}.front_cap", (front_x + 0.018, center_y, center_z), body_radius * 0.94, 0.036, mat, parent, vertices=24, bevel=0.002)
    cone(f"{name}.cap_hub", (front_x + 0.049, center_y, center_z), body_radius * 0.36, 0.015, 0.028, mat, parent, axis="X", vertices=16)
    for index in range(6):
        angle = index * math.tau / 6
        y = center_y + math.cos(angle) * body_radius * 0.68
        z = center_z + math.sin(angle) * body_radius * 0.68
        cylinder(f"{name}.cap_bolt.{index + 1:02d}", (front_x + 0.040, y, z), 0.008, 0.014, dark_mat, parent, vertices=10, bevel=0.001)
    # Compact sanitary T-handle above the housing.
    pipe(f"{name}.top_valve_stem", [(front_x - 0.05, center_y, center_z + body_radius * 0.88), (front_x - 0.05, center_y, center_z + body_radius + 0.055)], 0.009, mat, parent)
    cylinder(f"{name}.top_valve_bar", (front_x - 0.05, center_y, center_z + body_radius + 0.062), 0.009, 0.105, dark_mat, parent, axis="Y", vertices=12, bevel=0.001)


clear_scene()

bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.36, 0.40, 0.41, 1.0), 0.78, 0.30)
stainless_light = material("stainless_light", (0.58, 0.62, 0.62, 1.0), 0.84, 0.24)
stainless_dark = material("stainless_dark", (0.15, 0.18, 0.19, 1.0), 0.70, 0.36)
panel_blue = material("panel_blue", (0.16, 0.47, 0.61, 1.0), 0.12, 0.34)
screen = material("screen", (0.025, 0.09, 0.12, 1.0), 0.08, 0.22)
safety_red = material("safety_red", (0.72, 0.035, 0.025, 1.0), 0.05, 0.30)
white = material("white", (0.92, 0.94, 0.92, 1.0), 0.0, 0.46)
black = material("black", (0.025, 0.03, 0.03, 1.0), 0.1, 0.36)

root = empty("machine.gif-400")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["referenceModel"] = "Gram/ISF GIF 400 licensed variant"

cabinet_group = empty("structure.cabinet", root)
control_group = empty("inspection.control_panel", root, selectable=True)
outlet_group = empty("inspection.product_outlet", root, selectable=True)
inlet_group = empty("inspection.mix_inlet", root, selectable=True)
piping_group = empty("utilities.sanitary_piping", root)

# Cabinet and top cap. The rear skin and front process fittings establish the
# exact 1.45 m X envelope; the cabinet skin establishes the 0.60 m width.
rounded_box("cabinet.main_skin", (-0.1575, 0.0, 0.855), (1.115, 0.60, 1.43), stainless, cabinet_group, bevel=0.008, segments=3)
rounded_box("cabinet.top_cap", (-0.1575, 0.0, 1.5725), (1.115, 0.60, 0.055), stainless_light, cabinet_group, bevel=0.006, segments=2)
rounded_box("cabinet.control_column", (0.407, 0.185, 0.86), (0.018, 0.215, 1.33), stainless_light, cabinet_group, bevel=0.003)

# Front and side panel seams are thin dark insets, not separate invented doors.
rounded_box("cabinet.front_vertical_seam", (0.418, 0.071, 0.84), (0.004, 0.004, 1.32), stainless_dark, cabinet_group, bevel=0.0)
rounded_box("cabinet.front_lower_seam", (0.418, 0.06, 0.185), (0.004, 0.255, 0.004), stainless_dark, cabinet_group, bevel=0.0)
for side in (-1, 1):
    y = side * 0.2985
    rounded_box(f"cabinet.side_seam.{side:+d}", (-0.18, y, 0.86), (0.72, 0.003, 0.004), stainless_dark, cabinet_group, bevel=0.0)
    rounded_box(f"cabinet.side_handle.{side:+d}", (-0.18, side * 0.293, 0.84), (0.16, 0.014, 0.026), stainless_dark, cabinet_group, bevel=0.003)

# Four tapered leveling legs and circular pads.
for index, (x, y) in enumerate(((-0.60, -0.225), (-0.60, 0.225), (0.25, -0.225), (0.25, 0.225)), 1):
    cone(f"cabinet.leg.{index:02d}", (x, y, 0.087), 0.026, 0.045, 0.106, stainless_dark, cabinet_group, vertices=16, bevel=0.001)
    cylinder(f"cabinet.leg_stem.{index:02d}", (x, y, 0.033), 0.012, 0.045, stainless_dark, cabinet_group, axis="Z", vertices=14, bevel=0.001)
    cylinder(f"cabinet.foot_pad.{index:02d}", (x, y, 0.010), 0.045, 0.020, stainless_dark, cabinet_group, axis="Z", vertices=20, bevel=0.001)

# HMI/control column from the licensed GIF 400 reference.
rounded_box("controls.blue_panel", (0.424, -0.185, 1.285), (0.020, 0.180, 0.445), panel_blue, control_group, bevel=0.007, segments=3)
rounded_box("controls.hmi_bezel", (0.437, -0.185, 1.405), (0.012, 0.145, 0.145), stainless_light, control_group, bevel=0.009, segments=3)
rounded_box("controls.hmi_screen", (0.445, -0.185, 1.405), (0.008, 0.106, 0.086), screen, control_group, bevel=0.004, segments=2)

for index, z in enumerate((1.300, 1.245, 1.190, 1.135), 1):
    cylinder(f"controls.push_button.{index:02d}", (0.447, -0.205, z), 0.014, 0.018, white, control_group, vertices=16, bevel=0.002)
    rounded_box(f"controls.button_legend.{index:02d}", (0.445, -0.155, z), (0.006, 0.040, 0.004), white, control_group, bevel=0.0)

rounded_box("controls.identity_strip", (0.438, -0.185, 1.030), (0.012, 0.198, 0.090), stainless_dark, control_group, bevel=0.002)
cylinder("controls.emergency_stop_base", (0.449, -0.145, 1.030), 0.035, 0.018, white, control_group, vertices=20, bevel=0.002)
cylinder("controls.emergency_stop", (0.466, -0.145, 1.030), 0.026, 0.030, safety_red, control_group, vertices=20, bevel=0.003)
cylinder("controls.blue_selector", (0.451, -0.170, 1.105), 0.017, 0.022, panel_blue, control_group, vertices=16, bevel=0.002)
rounded_box("controls.danish_flag.red", (0.448, -0.215, 1.040), (0.005, 0.034, 0.024), safety_red, control_group, bevel=0.0)
rounded_box("controls.danish_flag.vertical", (0.452, -0.221, 1.040), (0.006, 0.004, 0.024), white, control_group, bevel=0.0)
rounded_box("controls.danish_flag.horizontal", (0.452, -0.215, 1.040), (0.006, 0.034, 0.004), white, control_group, bevel=0.0)
text_mesh("controls.brand_text", "GRAM", (0.454, -0.272, 1.056), 0.020, white, control_group, align="LEFT")
text_mesh("controls.model_text", "GIF 400", (0.454, -0.272, 1.010), 0.018, white, control_group, align="LEFT")

# Upper product housing, central freezing-cylinder flange, and lower mix pump.
housing("process.upper_housing", 0.125, 1.095, 0.105, 0.662, stainless_light, stainless_dark, outlet_group)
flange("process.center_flange", 0.015, 0.750, 0.122, 0.505, stainless_light, stainless_dark, outlet_group, bolt_count=8)
cone("process.center_flange.nose", (0.555, 0.015, 0.750), 0.050, 0.026, 0.055, stainless_light, outlet_group, axis="X", vertices=20, bevel=0.002)
housing("process.lower_mix_pump", 0.120, 0.405, 0.092, 0.662, stainless_light, stainless_dark, inlet_group)

# Curved exposed sanitary product pipe. Its route follows the exact GIF 400
# licensed-variant photo and the used Gram GIF 600 front photograph.
pipe(
    "process.product_transfer_pipe",
    [
        (0.615, 0.125, 0.990),
        (0.620, 0.125, 0.945),
        (0.620, 0.095, 0.910),
        (0.610, 0.050, 0.855),
        (0.595, 0.022, 0.790),
        (0.575, 0.015, 0.750),
    ],
    0.025,
    stainless_light,
    piping_group,
    resolution=5,
)
cylinder("process.pipe_clamp.upper", (0.620, 0.125, 0.980), 0.034, 0.014, stainless_dark, piping_group, axis="Z", vertices=16, bevel=0.001)
cylinder("process.pipe_clamp.center", (0.575, 0.015, 0.750), 0.035, 0.014, stainless_dark, piping_group, axis="X", vertices=16, bevel=0.001)

# Lower sanitary inlet elbow and compact valve handle.
pipe(
    "process.lower_inlet_pipe",
    [
        (0.585, 0.120, 0.493),
        (0.585, 0.120, 0.535),
        (0.575, 0.095, 0.558),
        (0.560, 0.060, 0.560),
    ],
    0.019,
    stainless_light,
    piping_group,
    resolution=4,
)
cylinder("process.lower_inlet.handle", (0.565, 0.060, 0.590), 0.008, 0.105, stainless_dark, piping_group, axis="Y", vertices=12, bevel=0.001)

# A small rear utility stub is visible in the exact three-quarter reference.
cylinder("utilities.rear_connection", (-0.716, 0.165, 1.080), 0.038, 0.018, stainless_dark, piping_group, axis="X", vertices=16, bevel=0.001)

# The reference front has its HMI on the operator's right and process fittings
# on the left. Groups keep that handedness explicit without mirroring labels.
control_group.location.y = 0.37
outlet_group.scale.y = -1.0
inlet_group.scale.y = -1.0
piping_group.scale.y = -1.0


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


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


def point_camera(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(name: str, camera_location, ortho_scale: float):
    # Reuse one neutral studio for each deterministic preview.
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
    point_camera(camera, (0.0, 0.0, 0.75))

    scene = bpy.context.scene
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    bpy.ops.render.render(write_still=True)


# Studio geometry is created after export so it can never enter the runtime GLB.
floor_mat = material("studio_floor", (0.70, 0.73, 0.70, 1.0), 0.0, 0.70)
rounded_box("studio.floor", (0.0, 0.0, -0.035), (3.2, 3.2, 0.06), floor_mat, None, bevel=0.01)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.72, 0.75, 0.77, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.28

for name, location, energy, size in (
    ("studio.key", (3.0, -2.5, 4.2), 700, 3.0),
    ("studio.fill", (1.0, 3.2, 2.5), 360, 2.6),
    ("studio.rim", (-2.5, -1.5, 3.2), 500, 2.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (0.0, 0.0, 0.0)
    point_camera(light, (0.0, 0.0, 0.8))

render_preview("front", (4.0, 0.0, 0.85), 2.20)
render_preview("side", (0.0, -4.0, 0.85), 2.20)
render_preview("three-quarter", (3.0, -2.8, 2.20), 2.50)

print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
