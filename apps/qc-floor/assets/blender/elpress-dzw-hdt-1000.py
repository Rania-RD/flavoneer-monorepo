#!/usr/bin/env python3
"""Build an approximate Elpress DZW-HDT-1000 hygiene station.

Run from the repository root with Blender:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/elpress-dzw-hdt-1000.py

The published DZW-HDT-1000 envelope is 2.125 x 0.918 x 1.513 m. The
user-supplied image controls the older twin-tower arrangement, striped brush
rollers, orange hand module, green chemical can, grated deck, rails, and
turnstile. This is an exterior floor-plan asset, not fabrication geometry.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "elpress-dzw-hdt-1000"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "elpress-dzw-hdt-1000.blend"
GLB_PATH = MODEL_DIR / "elpress-dzw-hdt-1000-hygiene-station.glb"
STL_PATH = MODEL_DIR / "elpress-dzw-hdt-1000-hygiene-station.stl"

LENGTH = 2.125
WIDTH = 0.918
HEIGHT = 1.513


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


def rounded_box(name, location, dimensions, mat, parent, bevel=0.006, segments=2, rotation=None):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation or (0.0, 0.0, 0.0))
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


def cylinder(name, location, radius, depth, mat, parent, axis="Z", vertices=32, bevel=0.002):
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
        modifier.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_object(obj, name, mat, parent, smooth=True)


def torus(name, location, major_radius, minor_radius, mat, parent, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=28,
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
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
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


def text_mesh(name, body, location, size, mat, parent, rotation=(math.pi / 2, 0.0, 0.0)):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.0004
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
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

stainless = material("stainless", (0.60, 0.63, 0.63, 1.0), 0.82, 0.24)
stainless_light = material("stainless_light", (0.78, 0.80, 0.79, 1.0), 0.86, 0.20)
stainless_dark = material("stainless_dark", (0.32, 0.35, 0.35, 1.0), 0.75, 0.31)
grate_dark = material("grate_dark", (0.18, 0.21, 0.22, 1.0), 0.68, 0.38)
brush_blue = material("brush_blue", (0.04, 0.18, 0.72, 1.0), 0.05, 0.72)
brush_white = material("brush_white", (0.90, 0.92, 0.91, 1.0), 0.02, 0.68)
hose_blue = material("hose_blue", (0.04, 0.18, 0.62, 1.0), 0.05, 0.48)
can_green = material("can_green", (0.08, 0.48, 0.20, 1.0), 0.03, 0.42)
can_dark = material("can_dark", (0.015, 0.08, 0.035, 1.0), 0.01, 0.50)
orange = material("sanitizer_orange", (0.95, 0.50, 0.12, 1.0), 0.03, 0.38)
orange_light = material("sanitizer_orange_light", (1.0, 0.66, 0.25, 1.0), 0.02, 0.35)
black = material("rubber_black", (0.012, 0.016, 0.018, 1.0), 0.02, 0.44)
red = material("signal_red", (0.72, 0.02, 0.02, 1.0), 0.04, 0.29)
green = material("signal_green", (0.02, 0.48, 0.12, 1.0), 0.03, 0.30)
yellow = material("warning_yellow", (0.96, 0.58, 0.02, 1.0), 0.02, 0.35)
white = material("label_white", (0.96, 0.96, 0.93, 1.0), 0.0, 0.43)

root = empty("machine.elpress-dzw-hdt-1000")
root["units"] = "meters"
root["origin"] = "published footprint center at floor level"
root["productFlowAxis"] = "+X"
root["manufacturer"] = "Elpress"
root["model"] = "DZW-HDT-1000-R family, attached older revision"
root["publishedEnvelopeMeters"] = [LENGTH, WIDTH, HEIGHT]
root["engineeringUse"] = False

base_group = empty("structure.wash_platform", root, selectable=True)
brush_group = empty("process.sole_brushes", root, selectable=True)
grate_group = empty("process.drain_grate", root, selectable=True)
rail_group = empty("safety.handrails", root, selectable=True)
small_tower = empty("control.entry_hand_station", root, selectable=True)
main_tower = empty("control.primary_hand_station", root, selectable=True)
turnstile_group = empty("safety.release_turnstile", root, selectable=True)
chemical_group = empty("utilities.chemical_dosing", root, selectable=True)

# Low stainless wash trough and two tread-plate end steps.
rounded_box("base.main_trough", (0.0, 0.0, 0.115), (1.72, 0.78, 0.23), stainless, base_group, bevel=0.025, segments=3)
rounded_box("base.entry_step", (-0.955, 0.0, 0.075), (0.215, 0.70, 0.15), stainless_light, base_group, bevel=0.015, segments=3)
rounded_box("base.exit_step", (0.955, 0.0, 0.070), (0.215, 0.70, 0.14), stainless_light, base_group, bevel=0.015, segments=3)
for x in (-1.020, 1.020):
    for y in (-0.345, 0.345):
        cylinder(f"base.leveling_foot.{x}.{y}", (x, y, 0.018), 0.036, 0.036, stainless_dark, base_group, vertices=24, bevel=0.001)

# Raised diagonal tread marks suggest the embossed end plates at floor-view scale.
for side, center_x in (("entry", -0.955), ("exit", 0.955)):
    for index in range(7):
        x = center_x - 0.075 + index * 0.025
        for row, y in enumerate((-0.22, -0.07, 0.08, 0.23)):
            rounded_box(
                f"tread.{side}.{index:02d}.{row:02d}",
                (x, y, 0.153 if side == "entry" else 0.143),
                (0.030, 0.006, 0.004),
                stainless_dark,
                base_group,
                bevel=0.001,
                rotation=(0.0, 0.0, math.radians(35)),
            )

# Two striped rollers run in the passage direction as in the supplied render.
roller_start = -0.68
roller_segment = 0.085
for row, y in enumerate((-0.145, 0.145), start=1):
    cylinder(f"brush.axle.{row}", (-0.24, y, 0.255), 0.035, 0.94, stainless_dark, brush_group, axis="X", vertices=20, bevel=0.001)
    for index in range(11):
        x = roller_start + roller_segment / 2 + index * roller_segment
        mat = brush_white if index in (2, 6, 9) else brush_blue
        cylinder(
            f"brush.roller.{row}.{index:02d}",
            (x, y, 0.255),
            0.095,
            roller_segment - 0.005,
            mat,
            brush_group,
            axis="X",
            vertices=24,
            bevel=0.003,
        )
    cylinder(f"brush.endcap.front.{row}", (-0.715, y, 0.255), 0.054, 0.035, stainless_light, brush_group, axis="X", vertices=24)
    cylinder(f"brush.endcap.rear.{row}", (0.235, y, 0.255), 0.054, 0.035, stainless_light, brush_group, axis="X", vertices=24)

# Open drain grating behind the brushes.
rounded_box("grate.recess", (0.57, 0.0, 0.236), (0.53, 0.60, 0.025), grate_dark, grate_group, bevel=0.004)
for index in range(17):
    x = 0.32 + index * 0.031
    rounded_box(f"grate.longitudinal.{index:02d}", (x, 0.0, 0.258), (0.009, 0.60, 0.018), stainless_light, grate_group, bevel=0.001)
for index in range(9):
    y = -0.29 + index * 0.0725
    rounded_box(f"grate.crossbar.{index:02d}", (0.57, y, 0.260), (0.53, 0.009, 0.020), stainless_light, grate_group, bevel=0.001)

# Handrails follow the full sides and stop around the two hand stations.
for side, y in (("left", -0.399), ("right", 0.399)):
    pipe(
        f"rail.top.{side}",
        [(-0.93, y, 0.18), (-0.93, y, 0.86), (0.88, y, 0.86), (0.88, y, 0.18)],
        0.018,
        stainless_light,
        rail_group,
    )
    pipe(
        f"rail.mid.{side}",
        [(-0.93, y, 0.56), (0.88, y, 0.56)],
        0.014,
        stainless_light,
        rail_group,
    )
    for index, x in enumerate((-0.93, 0.02, 0.88), start=1):
        cylinder(f"rail.post.{side}.{index}", (x, y, 0.50), 0.018, 0.72, stainless_light, rail_group, vertices=20)

# Smaller entry hand station from the attached image.
rounded_box("entry.column", (-0.62, 0.335, 0.77), (0.25, 0.24, 0.96), stainless, small_tower, bevel=0.015, segments=3)
rounded_box("entry.lower_door", (-0.62, 0.205, 0.60), (0.21, 0.018, 0.43), stainless_light, small_tower, bevel=0.006)
rounded_box("entry.head", (-0.62, 0.235, 1.18), (0.44, 0.31, 0.40), stainless_light, small_tower, bevel=0.020, segments=3)
rounded_box("entry.face", (-0.62, 0.070, 1.15), (0.40, 0.025, 0.24), stainless, small_tower, bevel=0.012)
for index, x in enumerate((-0.70, -0.54), start=1):
    cylinder(f"entry.hand_port.{index}", (x, 0.052, 1.16), 0.060, 0.030, black, small_tower, axis="Y", vertices=32, bevel=0.003)
    torus(f"entry.hand_ring.{index}", (x, 0.034, 1.16), 0.063, 0.009, stainless_dark, small_tower, rotation=(math.pi / 2, 0.0, 0.0))
cylinder("entry.status_sensor", (-0.62, 0.032, 1.33), 0.035, 0.030, black, small_tower, axis="Y", vertices=28)
rounded_box("entry.side_dispenser", (-0.83, 0.28, 0.91), (0.12, 0.15, 0.22), stainless_light, small_tower, bevel=0.018, segments=3)
cylinder("entry.dispenser_button", (-0.83, 0.195, 0.92), 0.022, 0.025, black, small_tower, axis="Y", vertices=20)

# Main control tower and hand-disinfection hood. The face copies the attached
# rectangular opening plus two round ports rather than the current blue plate.
rounded_box("main.column", (0.26, 0.334, 0.82), (0.34, 0.248, 1.08), stainless, main_tower, bevel=0.018, segments=3)
rounded_box("main.service_door", (0.26, 0.197, 0.71), (0.30, 0.020, 0.55), stainless_light, main_tower, bevel=0.006)
rounded_box("main.door_latch", (0.37, 0.180, 0.72), (0.035, 0.025, 0.085), black, main_tower, bevel=0.008)
rounded_box("main.head", (0.26, 0.235, 1.285), (0.82, 0.34, 0.42), stainless_light, main_tower, bevel=0.025, segments=3)
rounded_box("main.face", (0.26, 0.055, 1.255), (0.76, 0.028, 0.27), stainless, main_tower, bevel=0.015)
rounded_box("main.hand_slot", (0.055, 0.034, 1.245), (0.19, 0.030, 0.115), black, main_tower, bevel=0.040, segments=5)
for index, x in enumerate((0.32, 0.50), start=1):
    cylinder(f"main.hand_port.{index}", (x, 0.032, 1.26), 0.065, 0.035, black, main_tower, axis="Y", vertices=32, bevel=0.003)
    torus(f"main.hand_ring.{index}", (x, 0.012, 1.26), 0.068, 0.009, stainless_dark, main_tower, rotation=(math.pi / 2, 0.0, 0.0))
cylinder("main.black_sensor", (-0.03, 0.030, 1.415), 0.040, 0.030, black, main_tower, axis="Y", vertices=28)
for name, x, mat in (("red", 0.34, red), ("green", 0.43, green), ("red_aux", 0.58, red), ("green_aux", 0.64, green)):
    cylinder(f"main.indicator.{name}", (x, 0.048, 1.475), 0.014, 0.018, mat, main_tower, axis="Y", vertices=20, bevel=0.001)

# Orange attachment, metal nose, and sanitary coupling shown on the left end.
rounded_box("main.orange_module", (-0.22, 0.20, 1.34), (0.31, 0.30, 0.23), orange, main_tower, bevel=0.035, segments=4)
rounded_box("main.orange_lid", (-0.24, 0.195, 1.39), (0.29, 0.29, 0.09), orange_light, main_tower, bevel=0.025, segments=4)
cylinder("main.orange_nozzle", (-0.39, 0.185, 1.32), 0.045, 0.11, stainless_light, main_tower, axis="X", vertices=28, bevel=0.004)
cylinder("main.orange_clamp", (-0.33, 0.185, 1.32), 0.058, 0.030, stainless_dark, main_tower, axis="X", vertices=28, bevel=0.002)

# Tripod access gate between the hand stations.
cylinder("turnstile.hub", (-0.18, 0.045, 0.95), 0.060, 0.17, stainless_dark, turnstile_group, axis="Y", vertices=32, bevel=0.004)
for index, angle_deg in enumerate((15, 135, 255), start=1):
    angle = math.radians(angle_deg)
    end = (-0.18 + math.cos(angle) * 0.44, -0.05, 0.95 + math.sin(angle) * 0.44)
    pipe(f"turnstile.arm.{index}", [(-0.18, -0.05, 0.95), end], 0.018, stainless_light, turnstile_group)
    cylinder(f"turnstile.cap.{index}", end, 0.024, 0.024, stainless_dark, turnstile_group, axis="Y", vertices=20)

# Chemical can, fill cap, level label, and dosing hose.
rounded_box("chemical.can", (-0.84, 0.35, 0.25), (0.25, 0.20, 0.42), can_green, chemical_group, bevel=0.040, segments=4)
rounded_box("chemical.handle_opening", (-0.84, 0.31, 0.43), (0.12, 0.06, 0.055), black, chemical_group, bevel=0.018, segments=4)
cylinder("chemical.cap", (-0.90, 0.35, 0.48), 0.035, 0.032, can_dark, chemical_group, vertices=24, bevel=0.002)
rounded_box("chemical.label", (-0.84, 0.244, 0.24), (0.12, 0.008, 0.10), white, chemical_group, bevel=0.003)
text_mesh("chemical.label_text", "CLEAN", (-0.84, 0.238, 0.24), 0.022, black, chemical_group)
pipe(
    "chemical.dosing_hose",
    [(-0.90, 0.35, 0.50), (-0.79, 0.35, 0.60), (-0.65, 0.30, 0.73), (-0.49, 0.18, 0.84)],
    0.014,
    hose_blue,
    chemical_group,
    bevel_resolution=3,
)
cylinder("chemical.yellow_connector", (-0.49, 0.18, 0.84), 0.028, 0.035, yellow, chemical_group, axis="Y", vertices=20)

# Visible bounds come from real modeled parts. The top cap fixes the published
# height and the rail feet fix the published width.
rounded_box("bounds.top_cap", (0.26, 0.235, 1.503), (0.24, 0.20, 0.020), stainless_light, main_tower, bevel=0.004)
for side, y in (("near", -0.429), ("far", 0.429)):
    cylinder(f"bounds.rail_foot.{side}", (0.72, y, 0.025), 0.030, 0.050, stainless_dark, rail_group, vertices=24, bevel=0.001)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the clean editable asset before adding preview-only studio objects.
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


studio_floor = material("studio_floor", (0.52, 0.55, 0.54, 1.0), roughness=0.78)
rounded_box("studio.floor", (0.0, 0.0, -0.055), (4.3, 3.0, 0.10), studio_floor, None, bevel=0.025)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.76, 0.79, 0.80, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.33

for name, location, energy, size in (
    ("studio.key", (-3.5, -4.0, 4.5), 1250, 3.2),
    ("studio.fill", (3.3, -2.4, 3.0), 780, 2.7),
    ("studio.rim", (0.5, 3.6, 4.0), 1000, 2.8),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.75))

render_preview("front", (0.0, -4.0, 2.0), (0.0, 0.0, 0.75), 2.55)
render_preview("side", (-4.1, 0.0, 1.95), (0.0, 0.0, 0.72), 2.45)
render_preview("three-quarter", (-3.4, -3.2, 2.65), (0.0, 0.0, 0.72), 2.75)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
