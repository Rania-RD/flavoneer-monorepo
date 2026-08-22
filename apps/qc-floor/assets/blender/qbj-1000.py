#!/usr/bin/env python3
"""Build the reference-led QBJ1000 chocolate holding tank asset.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/qbj-1000.py

The published tank size is diameter 1.25 m by 1.70 m high. The attached HULK
revision fixes the control cabinet, motor, feet, heater terminals, and outlet
arrangement. This is a QC-floor exterior model, not fabrication geometry.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "qbj-1000"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "qbj-1000.blend"
GLB_PATH = MODEL_DIR / "qbj-1000-chocolate-holding-tank.glb"
STL_PATH = MODEL_DIR / "qbj-1000-chocolate-holding-tank.stl"

NOMINAL_DIAMETER = 1.25
NOMINAL_HEIGHT = 1.70


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


def material(name, color, metallic=0.0, roughness=0.45):
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
    if mat:
        obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = smooth
    return obj


def rounded_box(name, location, dimensions, mat, parent, bevel=0.006, segments=2):
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


def cylinder(name, location, radius, depth, mat, parent, axis="Z", vertices=48, bevel=0.003):
    rotation = (
        (0.0, math.pi / 2, 0.0)
        if axis == "X"
        else ((math.pi / 2, 0.0, 0.0) if axis == "Y" else (0.0, 0.0, 0.0))
    )
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


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=32):
    rotation = (
        (0.0, math.pi / 2, 0.0)
        if axis == "X"
        else ((math.pi / 2, 0.0, 0.0) if axis == "Y" else (0.0, 0.0, 0.0))
    )
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def torus(name, location, major_radius, minor_radius, mat, parent, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, bevel_resolution=2):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_resolution
    spline = curve.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    spline.order_u = min(3, len(points))
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


def text_mesh(name, body, location, size, mat, parent):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.0005
    curve.bevel_depth = 0.00015
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    # Text faces +X, the operator side.
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


clear_scene()

bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.48, 0.52, 0.53, 1.0), 0.82, 0.26)
stainless_light = material("stainless_light", (0.70, 0.73, 0.73, 1.0), 0.88, 0.20)
stainless_dark = material("stainless_dark", (0.21, 0.24, 0.25, 1.0), 0.72, 0.34)
cabinet_metal = material("cabinet_metal", (0.62, 0.64, 0.63, 1.0), 0.68, 0.30)
motor_blue = material("motor_blue", (0.035, 0.22, 0.34, 1.0), 0.52, 0.31)
motor_blue_dark = material("motor_blue_dark", (0.018, 0.08, 0.12, 1.0), 0.30, 0.40)
black = material("rubber_black", (0.018, 0.022, 0.024, 1.0), 0.02, 0.50)
screen = material("screen", (0.025, 0.055, 0.065, 1.0), 0.08, 0.20)
red = material("safety_red", (0.72, 0.025, 0.025, 1.0), 0.05, 0.29)
green = material("run_green", (0.02, 0.52, 0.22, 1.0), 0.03, 0.31)
cyan = material("indicator_cyan", (0.12, 0.62, 0.71, 1.0), 0.08, 0.30)
yellow = material("heater_yellow", (0.94, 0.55, 0.02, 1.0), 0.03, 0.38)
white = material("label_white", (0.94, 0.94, 0.91, 1.0), 0.0, 0.40)

root = empty("machine.qbj-1000")
root["units"] = "meters"
root["origin"] = "tank footprint center at floor level"
root["nominalTankDiameterMeters"] = NOMINAL_DIAMETER
root["nominalHeightMeters"] = NOMINAL_HEIGHT
root["operatorSideAxis"] = "+X"
root["capacityLiters"] = 1000
root["agitatorSpeedRpm"] = 22.5
root["engineeringUse"] = False
root["referenceRevision"] = "attached HULK QBJ1000 exterior"

tank_group = empty("structure.jacketed_tank", root, selectable=True)
lid_group = empty("inspection.split_dust_cover", root, selectable=True)
drive_group = empty("inspection.agitator_drive", root, selectable=True)
drive_group.location.z = -0.055
control_group = empty("inspection.control_cabinet", root, selectable=True)
outlet_group = empty("inspection.sanitary_outlet", root, selectable=True)
utility_group = empty("utilities.heating_and_water", root, selectable=True)

# Jacketed cylindrical shell, open lower skirt, and four sanitary tube legs.
cylinder("tank.outer_jacket", (0.0, 0.0, 0.815), 0.625, 1.115, stainless, tank_group, vertices=96, bevel=0.006)
torus("tank.top_rolled_lip", (0.0, 0.0, 1.380), 0.607, 0.018, stainless_light, tank_group)
torus("tank.lower_seam", (0.0, 0.0, 0.265), 0.607, 0.014, stainless_dark, tank_group)

for index, angle_deg in enumerate((42, 138, 222, 318), start=1):
    angle = math.radians(angle_deg)
    x = math.cos(angle) * 0.525
    y = math.sin(angle) * 0.525
    cylinder(f"leg.tube.{index:02d}", (x, y, 0.160), 0.037, 0.285, stainless_dark, tank_group, vertices=20, bevel=0.002)
    cylinder(f"leg.pad.{index:02d}", (x, y, 0.018), 0.073, 0.036, stainless_dark, tank_group, vertices=28, bevel=0.001)
    cone(f"leg.gusset.{index:02d}", (x, y, 0.300), 0.073, 0.037, 0.095, stainless, tank_group, vertices=18)

# The manual shows a segmented round dust cover with side clamps and lifting eyes.
cylinder("lid.cover_plate", (0.0, 0.0, 1.386), 0.595, 0.022, stainless_light, lid_group, vertices=72, bevel=0.002)
for y in (-0.235, 0.235):
    rounded_box(f"lid.split_seam.{y}", (0.0, y, 1.401), (1.15, 0.008, 0.010), stainless_dark, lid_group, bevel=0.001)
for index, y in enumerate((-0.34, 0.34), start=1):
    torus(f"lid.lifting_eye.{index:02d}", (-0.18, y, 1.455), 0.045, 0.009, stainless_dark, lid_group, rotation=(math.pi / 2, 0.0, 0.0))
for index, y in enumerate((-0.60, 0.60), start=1):
    rounded_box(f"lid.edge_clamp.{index:02d}", (0.10, y, 1.405), (0.12, 0.030, 0.045), stainless_dark, lid_group, bevel=0.003)

# Horizontal motor and compact reduction gearbox from the supplied image.
rounded_box("drive.gear_reducer", (-0.10, 0.05, 1.485), (0.30, 0.25, 0.19), motor_blue, drive_group, bevel=0.022, segments=3)
cylinder("drive.output_flange", (-0.10, 0.05, 1.405), 0.115, 0.045, stainless_dark, drive_group, vertices=28, bevel=0.003)
cylinder("drive.motor_body", (-0.22, -0.205, 1.535), 0.145, 0.43, motor_blue, drive_group, axis="Y", vertices=40, bevel=0.010)
cylinder("drive.motor_front", (-0.22, -0.430, 1.535), 0.155, 0.030, motor_blue, drive_group, axis="Y", vertices=40, bevel=0.004)
cylinder("drive.motor_grille", (-0.22, -0.448, 1.535), 0.122, 0.014, motor_blue_dark, drive_group, axis="Y", vertices=36, bevel=0.001)
cylinder("drive.motor_hub", (-0.22, -0.459, 1.535), 0.030, 0.022, motor_blue, drive_group, axis="Y", vertices=24, bevel=0.002)
for index in range(10):
    x = -0.22 - 0.095 + index * 0.021
    rounded_box(f"drive.grille.vertical.{index:02d}", (x, -0.468, 1.535), (0.006, 0.006, 0.205), motor_blue, drive_group, bevel=0.001)
for index in range(8):
    z = 1.535 - 0.075 + index * 0.021
    rounded_box(f"drive.grille.horizontal.{index:02d}", (-0.22, -0.471, z), (0.205, 0.006, 0.006), motor_blue, drive_group, bevel=0.001)
rounded_box("drive.terminal_box", (-0.22, -0.12, 1.698), (0.23, 0.18, 0.085), motor_blue, drive_group, bevel=0.010)
rounded_box("drive.terminal_lid", (-0.22, -0.12, 1.744), (0.25, 0.20, 0.014), motor_blue_dark, drive_group, bevel=0.005)
cylinder("drive.cable_gland", (-0.08, -0.12, 1.700), 0.026, 0.055, white, drive_group, axis="X", vertices=16, bevel=0.002)

# Projecting operator cabinet. Its face and hardware follow the attached revision.
rounded_box("control.cabinet", (0.655, -0.04, 1.015), (0.235, 0.485, 0.505), cabinet_metal, control_group, bevel=0.012, segments=3)
rounded_box("control.door_face", (0.778, -0.04, 1.015), (0.018, 0.455, 0.465), stainless_light, control_group, bevel=0.006)
rounded_box("control.temperature_frame", (0.792, -0.105, 1.145), (0.020, 0.120, 0.090), stainless_dark, control_group, bevel=0.003)
rounded_box("control.temperature_display", (0.804, -0.105, 1.155), (0.012, 0.082, 0.040), screen, control_group, bevel=0.002)
for index in range(4):
    rounded_box(f"control.temperature_key.{index:02d}", (0.805, -0.138 + index * 0.022, 1.120), (0.012, 0.014, 0.012), white, control_group, bevel=0.001)
cylinder("control.emergency_stop", (0.812, 0.115, 1.155), 0.043, 0.048, red, control_group, axis="X", vertices=20, bevel=0.002)
cylinder("control.selector", (0.808, -0.118, 0.995), 0.035, 0.040, black, control_group, axis="X", vertices=16, bevel=0.002)
rounded_box("control.selector_handle", (0.832, -0.118, 1.010), (0.035, 0.070, 0.025), black, control_group, bevel=0.004)
rounded_box("control.start_stop_body", (0.806, 0.105, 1.005), (0.030, 0.090, 0.122), white, control_group, bevel=0.020)
cylinder("control.start_button", (0.826, 0.105, 1.040), 0.031, 0.035, green, control_group, axis="X", vertices=20, bevel=0.002)
cylinder("control.stop_button", (0.826, 0.105, 0.972), 0.031, 0.035, red, control_group, axis="X", vertices=20, bevel=0.002)
rounded_box("control.door_latch", (0.816, 0.185, 0.875), (0.040, 0.040, 0.100), white, control_group, bevel=0.015)
cylinder("control.latch_key", (0.840, 0.185, 0.875), 0.016, 0.020, cyan, control_group, axis="X", vertices=16, bevel=0.001)
text_mesh("control.model_label", "QBJ1000", (0.817, -0.055, 0.815), 0.042, black, control_group)

# Low 1.5-inch sanitary discharge with tri-clamp ferrule and valve handle.
cylinder("outlet.neck", (0.605, -0.325, 0.405), 0.040, 0.135, stainless_light, outlet_group, axis="X", vertices=24, bevel=0.002)
cylinder("outlet.triclamp", (0.690, -0.325, 0.405), 0.074, 0.035, stainless_dark, outlet_group, axis="X", vertices=28, bevel=0.002)
cylinder("outlet.valve_body", (0.750, -0.325, 0.405), 0.060, 0.080, stainless_light, outlet_group, axis="X", vertices=28, bevel=0.003)
cylinder("outlet.nozzle", (0.815, -0.325, 0.405), 0.035, 0.075, stainless_light, outlet_group, axis="X", vertices=24, bevel=0.002)
pipe("outlet.valve_stem", [(0.750, -0.325, 0.450), (0.750, -0.325, 0.525)], 0.010, stainless_dark, outlet_group)
rounded_box("outlet.valve_handle", (0.750, -0.325, 0.535), (0.035, 0.145, 0.018), stainless_dark, outlet_group, bevel=0.004)

# Three yellow electric-heater terminals are clearly visible under the front shell.
for index, y in enumerate((-0.125, 0.0, 0.125), start=1):
    cylinder(f"heater.terminal.{index:02d}", (0.405, y, 0.235), 0.038, 0.105, yellow, utility_group, axis="X", vertices=16, bevel=0.003)
    cylinder(f"heater.gland.{index:02d}", (0.462, y, 0.235), 0.016, 0.018, black, utility_group, axis="X", vertices=12, bevel=0.001)

# Water-jacket level tube, overflow elbow, drain socket, and visible cable runs.
pipe("water.level_tube", [(-0.24, 0.624, 0.72), (-0.24, 0.650, 1.18)], 0.012, stainless_light, utility_group)
for z in (0.75, 1.15):
    rounded_box(f"water.level_bracket.{z}", (-0.24, 0.625, z), (0.08, 0.025, 0.025), stainless_dark, utility_group, bevel=0.003)
pipe("water.overflow", [(-0.34, 0.56, 1.36), (-0.34, 0.66, 1.39), (-0.34, 0.69, 1.31)], 0.016, stainless_light, utility_group)
cylinder("water.drain_socket", (0.585, 0.265, 0.350), 0.038, 0.085, stainless_light, utility_group, axis="X", vertices=20, bevel=0.002)
pipe("cable.motor_to_control", [(-0.07, -0.18, 1.69), (0.32, -0.23, 1.48), (0.55, -0.22, 1.25)], 0.014, black, utility_group)
pipe("cable.control_drop", [(0.675, 0.20, 0.79), (0.59, 0.24, 0.55), (0.52, 0.22, 0.25)], 0.011, black, utility_group)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save before adding preview-only floor, lights, and camera.
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


def render_preview(name, camera_location, target, ortho_scale):
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
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


studio_floor = material("studio_floor", (0.54, 0.56, 0.55, 1.0), roughness=0.77)
rounded_box("studio.floor", (0.0, 0.0, -0.055), (4.2, 4.2, 0.10), studio_floor, None, bevel=0.025)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.76, 0.78, 0.80, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (3.4, -4.0, 4.8), 1200, 3.0),
    ("studio.fill", (-3.0, -2.4, 3.0), 760, 2.6),
    ("studio.rim", (-1.0, 3.5, 4.2), 980, 2.8),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.85))

render_preview("front", (4.2, -0.15, 2.25), (0.03, 0.0, 0.87), 2.15)
render_preview("side", (0.0, -4.2, 2.10), (0.02, 0.0, 0.87), 2.10)
render_preview("three-quarter", (3.7, -3.7, 2.85), (0.03, 0.0, 0.85), 2.25)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
