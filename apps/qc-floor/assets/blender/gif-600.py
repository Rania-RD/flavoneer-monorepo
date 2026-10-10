#!/usr/bin/env python3
"""Build the reference-led Gram GIF 600 QC-floor asset in Blender.

Run from the repository root with Blender 4.2 or newer:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/gif-600.py

The result is an exterior visualization for the QC floor, not a fabrication,
installation, piping, maintenance, or safety model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "gif-600"
BLEND_PATH = SCRIPT_DIR / "gif-600.blend"
GLB_PATH = MODEL_DIR / "gram-gif-600.glb"
STL_PATH = MODEL_DIR / "gram-gif-600.stl"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Gram/Sidam manual M8620000GB-UL, Fig. 2-1. The 1.47 m overall length
# includes the process hardware. Blender is Z-up; the GLB export is Y-up.
ENVELOPE = (1.47, 0.60, 1.60)


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


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=20):
    rotation = {
        "X": (0.0, math.pi / 2, 0.0),
        "Y": (math.pi / 2, 0.0, 0.0),
        "Z": (0.0, 0.0, 0.0),
    }[axis]
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, resolution=3):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
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
    curve.resolution_u = 1
    curve.extrude = 0.00035
    curve.bevel_depth = 0.0
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    # Text local X -> global +Y, local Y -> global +Z, normal -> global +X.
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


def ring_of_bolts(name, center_y, center_z, front_x, radius, bolt_radius, count, mat, parent):
    for index in range(count):
        angle = index * math.tau / count
        y = center_y + math.cos(angle) * radius
        z = center_z + math.sin(angle) * radius
        cylinder(
            f"{name}.{index + 1:02d}",
            (front_x, y, z),
            bolt_radius,
            0.012,
            mat,
            parent,
            vertices=10,
            bevel=0.001,
        )


def pump_housing(name, center_y, center_z, radius, mat, dark_mat, parent, with_handle=False):
    cylinder(f"{name}.body", (0.490, center_y, center_z), radius * 0.91, 0.390, mat, parent, vertices=32, bevel=0.004)
    cylinder(f"{name}.rear_flange", (0.300, center_y, center_z), radius, 0.036, mat, parent, vertices=32, bevel=0.002)
    cylinder(f"{name}.front_cap", (0.706, center_y, center_z), radius, 0.050, mat, parent, vertices=32, bevel=0.003)
    cylinder(f"{name}.center_hub", (0.726, center_y, center_z), radius * 0.21, 0.018, dark_mat, parent, vertices=16, bevel=0.001)
    ring_of_bolts(name + ".cap_bolt", center_y, center_z, 0.729, radius * 0.71, 0.008, 6, dark_mat, parent)
    if with_handle:
        pipe(
            f"{name}.valve_stem",
            [(0.610, center_y, center_z + radius * 0.80), (0.610, center_y, center_z + radius + 0.050)],
            0.008,
            mat,
            parent,
        )
        cylinder(
            f"{name}.valve_handle",
            (0.610, center_y, center_z + radius + 0.055),
            0.008,
            0.108,
            dark_mat,
            parent,
            axis="Y",
            vertices=12,
            bevel=0.001,
        )


def add_side_service_details(side, mat, dark_mat, parent):
    y = side * 0.292
    side_name = "right" if side < 0 else "left"
    # Large upper and lower removable panels visible in used-equipment photos.
    rounded_box(f"cabinet.{side_name}.upper_seam", (-0.235, y, 0.875), (0.82, 0.004, 0.004), dark_mat, parent, bevel=0)
    rounded_box(f"cabinet.{side_name}.vertical_seam", (0.155, y, 1.18), (0.004, 0.004, 0.62), dark_mat, parent, bevel=0)
    rounded_box(f"cabinet.{side_name}.handle", (-0.070, side * 0.296, 1.08), (0.115, 0.006, 0.070), dark_mat, parent, bevel=0.006, segments=3)
    # Two louver banks near the rear upper corner.
    for bank_z in (1.32, 1.42):
        for index in range(5):
            rounded_box(
                f"cabinet.{side_name}.louver.{bank_z:.2f}.{index + 1}",
                (-0.525 + index * 0.035, side * 0.296, bank_z),
                (0.025, 0.006, 0.006),
                dark_mat,
                parent,
                bevel=0.001,
            )
    cylinder(f"cabinet.{side_name}.service_port", (-0.120, side * 0.295, 1.31), 0.022, 0.010, mat, parent, axis="Y", vertices=20, bevel=0.001)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.41, 0.44, 0.44, 1.0), 0.82, 0.29)
stainless_light = material("stainless_light", (0.68, 0.71, 0.70, 1.0), 0.88, 0.22)
stainless_dark = material("stainless_dark", (0.12, 0.14, 0.14, 1.0), 0.66, 0.38)
panel_blue = material("gram_blue", (0.18, 0.48, 0.64, 1.0), 0.10, 0.34)
screen = material("hmi_screen", (0.025, 0.075, 0.085, 1.0), 0.04, 0.24)
safety_red = material("safety_red", (0.74, 0.025, 0.018, 1.0), 0.04, 0.31)
warning_yellow = material("warning_yellow", (0.90, 0.62, 0.025, 1.0), 0.02, 0.36)
black = material("black", (0.018, 0.022, 0.022, 1.0), 0.06, 0.39)

root = empty("machine.gif-600")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["referenceModel"] = "Gram Equipment/Sidam GIF 600, 2002 revision"

cabinet_group = empty("structure.cabinet", root)
control_group = empty("inspection.control_panel", root, selectable=True)
outlet_group = empty("inspection.product_outlet", root, selectable=True)
inlet_group = empty("inspection.mix_inlet", root, selectable=True)
piping_group = empty("utilities.sanitary_piping", root)

# Manual Fig. 2-1 shows a 1.00 m deep cabinet and 0.47 m front hardware zone.
rounded_box("cabinet.main_skin", (-0.235, 0.0, 0.870), (1.000, 0.580, 1.380), stainless, cabinet_group, bevel=0.008, segments=3)
rounded_box("cabinet.top_cap", (-0.235, 0.0, 1.580), (1.000, 0.600, 0.040), stainless_light, cabinet_group, bevel=0.006, segments=2)
rounded_box("cabinet.front_face", (0.269, 0.0, 0.875), (0.008, 0.580, 1.340), stainless_light, cabinet_group, bevel=0.002)
rounded_box("cabinet.front_control_divider", (0.275, 0.075, 1.210), (0.004, 0.004, 0.600), stainless_dark, cabinet_group, bevel=0)
rounded_box("cabinet.front_lower_seam", (0.275, 0.0, 0.225), (0.004, 0.545, 0.004), stainless_dark, cabinet_group, bevel=0)

for index, (x, y) in enumerate(((-0.600, -0.225), (-0.600, 0.225), (0.130, -0.225), (0.130, 0.225)), 1):
    cone(f"cabinet.leg.{index:02d}", (x, y, 0.105), 0.025, 0.043, 0.130, stainless_dark, cabinet_group, vertices=16)
    cylinder(f"cabinet.leg_stem.{index:02d}", (x, y, 0.035), 0.012, 0.050, stainless_dark, cabinet_group, axis="Z", vertices=14, bevel=0.001)
    cylinder(f"cabinet.foot_pad.{index:02d}", (x, y, 0.010), 0.045, 0.020, stainless_dark, cabinet_group, axis="Z", vertices=20, bevel=0.001)

for side in (-1, 1):
    add_side_service_details(side, stainless_light, stainless_dark, cabinet_group)

# Blue operator strip matches the 2002 photographed machine: HMI at top,
# five vertically stacked white controls, a dark model badge, and E-stop.
rounded_box("controls.blue_panel", (0.282, 0.188, 1.245), (0.018, 0.190, 0.535), panel_blue, control_group, bevel=0.006, segments=3)
rounded_box("controls.hmi_bezel", (0.296, 0.188, 1.408), (0.014, 0.160, 0.160), stainless_light, control_group, bevel=0.008, segments=3)
rounded_box("controls.hmi_inner", (0.305, 0.188, 1.408), (0.008, 0.130, 0.128), black, control_group, bevel=0.004)
rounded_box("controls.hmi_screen", (0.311, 0.188, 1.433), (0.006, 0.098, 0.046), screen, control_group, bevel=0.002)
for row in range(2):
    for column in range(4):
        rounded_box(
            f"controls.hmi_key.{row + 1}.{column + 1}",
            (0.312, 0.155 + column * 0.022, 1.378 - row * 0.020),
            (0.004, 0.014, 0.010),
            stainless_light,
            control_group,
            bevel=0.001,
        )

text_mesh("controls.brand_text", "Gram Equipment", (0.313, 0.188, 1.315), 0.018, stainless_light, control_group)
for index, z in enumerate((1.260, 1.205, 1.150, 1.095, 1.040), 1):
    cylinder(f"controls.button_bezel.{index:02d}", (0.307, 0.220, z), 0.020, 0.012, black, control_group, vertices=20, bevel=0.001)
    cylinder(f"controls.push_button.{index:02d}", (0.315, 0.220, z), 0.014, 0.010, stainless_light, control_group, vertices=20, bevel=0.002)
    rounded_box(f"controls.symbol.{index:02d}", (0.314, 0.155, z), (0.004, 0.035, 0.004), stainless_light, control_group, bevel=0)

rounded_box("controls.model_badge", (0.308, 0.188, 0.977), (0.010, 0.185, 0.070), stainless_dark, control_group, bevel=0.001)
text_mesh("controls.model_text", "GIF 600", (0.315, 0.140, 0.978), 0.020, stainless_light, control_group, align="LEFT")
cylinder("controls.emergency_stop_base", (0.315, 0.232, 0.925), 0.039, 0.022, warning_yellow, control_group, vertices=24, bevel=0.002)
cylinder("controls.emergency_stop", (0.332, 0.232, 0.925), 0.027, 0.026, safety_red, control_group, vertices=24, bevel=0.003)

# Front process layout follows the used GIF 600 photographs and manual Fig. 2-1.
pump_housing("process.discharge_pump", -0.130, 1.185, 0.110, stainless_light, stainless_dark, outlet_group, with_handle=False)
pump_housing("process.mix_pump", -0.140, 0.410, 0.098, stainless_light, stainless_dark, inlet_group, with_handle=True)

# Central freezing-cylinder flange.
cylinder("process.freezer_flange.plate", (0.335, 0.055, 0.775), 0.132, 0.130, stainless_light, outlet_group, vertices=36, bevel=0.003)
cylinder("process.freezer_flange.neck", (0.420, 0.055, 0.775), 0.070, 0.070, stainless_light, outlet_group, vertices=28, bevel=0.002)
cylinder("process.freezer_flange.cap", (0.468, 0.055, 0.775), 0.050, 0.030, stainless_dark, outlet_group, vertices=24, bevel=0.002)
ring_of_bolts("process.freezer_flange.bolt", 0.055, 0.775, 0.410, 0.098, 0.009, 8, stainless_dark, outlet_group)

# The large polished S-pipe is the most recognizable GIF 600 silhouette cue.
pipe(
    "process.product_transfer_pipe",
    [
        (0.610, -0.130, 1.110),
        (0.620, -0.130, 1.035),
        (0.620, -0.090, 0.965),
        (0.605, -0.005, 0.900),
        (0.565, 0.045, 0.835),
        (0.500, 0.055, 0.775),
    ],
    0.027,
    stainless_light,
    piping_group,
    resolution=5,
)
cylinder("process.pipe_clamp.upper", (0.610, -0.130, 1.110), 0.036, 0.014, stainless_dark, piping_group, axis="Z", vertices=18, bevel=0.001)
cylinder("process.pipe_clamp.center", (0.500, 0.055, 0.775), 0.036, 0.014, stainless_dark, piping_group, axis="X", vertices=18, bevel=0.001)

# Short inlet return and photo-visible blue pneumatic tails.
pipe(
    "process.mix_inlet_return",
    [(0.500, -0.140, 0.505), (0.500, -0.140, 0.555), (0.470, -0.100, 0.575), (0.420, -0.055, 0.575)],
    0.018,
    stainless_light,
    piping_group,
    resolution=4,
)
pipe(
    "utilities.upper_pneumatic_tail",
    [(0.600, -0.205, 1.165), (0.575, -0.245, 1.120), (0.500, -0.250, 1.070)],
    0.004,
    panel_blue,
    piping_group,
    resolution=3,
)
pipe(
    "utilities.lower_pneumatic_tail",
    [(0.600, -0.205, 0.390), (0.565, -0.245, 0.350), (0.505, -0.250, 0.345)],
    0.004,
    panel_blue,
    piping_group,
    resolution=3,
)

# Rear-side utility connection markers are kept flush to the 0.60 m envelope.
for index, (x, z, radius) in enumerate(((-0.600, 0.400, 0.017), (-0.600, 0.875, 0.017), (-0.600, 1.385, 0.025)), 1):
    cylinder(f"utilities.side_connection.{index:02d}", (x, -0.295, z), radius, 0.010, stainless_dark, piping_group, axis="Y", vertices=18, bevel=0.001)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable Blender source before adding any preview-only studio objects.
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
    point_at(camera, (0.0, 0.0, 0.78))

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


# Studio is preview-only and is created after GLB/STL/.blend output.
floor_mat = material("studio_floor", (0.68, 0.71, 0.69, 1.0), 0.0, 0.70)
rounded_box("studio.floor", (0.0, 0.0, -0.035), (3.2, 3.2, 0.06), floor_mat, None, bevel=0.01)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.70, 0.73, 0.75, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.30

for name, location, energy, size in (
    ("studio.key", (3.0, -2.5, 4.2), 760, 3.0),
    ("studio.fill", (1.0, 3.2, 2.5), 390, 2.6),
    ("studio.rim", (-2.5, -1.5, 3.2), 520, 2.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.8))

render_preview("front", (4.0, 0.0, 0.88), 2.18)
render_preview("side", (0.0, -4.0, 0.88), 2.18)
render_preview("three-quarter", (3.0, -2.8, 2.20), 2.48)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
