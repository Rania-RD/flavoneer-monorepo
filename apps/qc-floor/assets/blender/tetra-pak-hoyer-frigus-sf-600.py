#!/usr/bin/env python3
"""Build the reference-led Tetra Pak Hoyer Frigus SF 600 QC-floor asset.

Run from the repository root with Blender 4.2 or newer:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/tetra-pak-hoyer-frigus-sf-600.py

The result is an exterior visualization for the QC floor. It is not a
fabrication, installation, piping, maintenance, or safety model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "tetra-pak-hoyer-frigus-sf-600"
BLEND_PATH = SCRIPT_DIR / "tetra-pak-hoyer-frigus-sf-600.blend"
GLB_PATH = MODEL_DIR / "tetra-pak-hoyer-frigus-sf-600.glb"
STL_PATH = MODEL_DIR / "tetra-pak-hoyer-frigus-sf-600.stl"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Frigus 600 manual F60 03 CB 04, Fig. 3.6. Blender is Z-up. GLB is Y-up.
ENVELOPE = (1.330, 0.755, 1.665)


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


def cone(name, location, radius1, radius2, depth, mat, parent, vertices=18):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, resolution=4):
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
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    # Text local X maps to global +Y, local Y to +Z, normal to +X.
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
            0.009,
            0.016,
            mat,
            parent,
            vertices=10,
            bevel=0.001,
        )


def gauge(name, y, z, radius, parent):
    cylinder(f"{name}.bezel", (0.646, y, z), radius, 0.038, stainless_dark, parent, vertices=32, bevel=0.002)
    cylinder(f"{name}.face", (0.660, y, z), radius * 0.82, 0.010, white, parent, vertices=32, bevel=0.001)
    pipe(
        f"{name}.needle",
        [(0.660, y, z), (0.660, y - radius * 0.38, z + radius * 0.34)],
        0.003,
        safety_red,
        parent,
        resolution=2,
    )


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.47, 0.50, 0.50, 1.0), 0.84, 0.27)
stainless_light = material("polished_stainless", (0.72, 0.75, 0.74, 1.0), 0.92, 0.18)
stainless_dark = material("dark_metal", (0.10, 0.12, 0.12, 1.0), 0.70, 0.35)
hoyer_blue = material("hoyer_blue", (0.025, 0.17, 0.50, 1.0), 0.08, 0.30)
panel_blue = material("panel_blue", (0.045, 0.32, 0.66, 1.0), 0.06, 0.34)
white = material("white", (0.92, 0.94, 0.91, 1.0), 0.02, 0.40)
black = material("black", (0.015, 0.018, 0.018, 1.0), 0.04, 0.36)
safety_red = material("safety_red", (0.76, 0.025, 0.018, 1.0), 0.04, 0.31)
signal_green = material("signal_green", (0.02, 0.42, 0.18, 1.0), 0.03, 0.31)
warning_yellow = material("warning_yellow", (0.92, 0.61, 0.02, 1.0), 0.02, 0.36)

root = empty("machine.hoyer-frigus-sf-600")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["referenceModel"] = "Tetra Pak Hoyer Frigus SF 600, manual F60 03 CB 04"

cabinet_group = empty("structure.cabinet", root)
control_group = empty("inspection.control_panel", root, selectable=True)
outlet_group = empty("inspection.product_outlet", root, selectable=True)
inlet_group = empty("inspection.mix_inlet", root, selectable=True)
piping_group = empty("utilities.sanitary_piping", root)

# The attached photo and manual show a deep, narrow stainless cabinet.
rounded_box("cabinet.main_skin", (-0.035, 0.0, 0.880), (1.220, 0.735, 1.430), stainless, cabinet_group, bevel=0.010, segments=3)
rounded_box("cabinet.front_face", (0.579, 0.0, 0.880), (0.012, 0.715, 1.410), stainless_light, cabinet_group, bevel=0.003)
rounded_box("cabinet.top_cap", (0.0, 0.0, 1.610), (1.330, 0.755, 0.055), stainless_light, cabinet_group, bevel=0.006)
rounded_box("cabinet.rear_top_vent", (-0.540, 0.0, 1.645), (0.245, 0.735, 0.040), stainless_dark, cabinet_group, bevel=0.003)

# Photo-visible blue fascia wraps across the front and both long sides.
rounded_box("branding.front_stripe", (0.588, -0.030, 1.475), (0.014, 0.655, 0.090), hoyer_blue, cabinet_group, bevel=0.002)
for side in (-1, 1):
    rounded_box(f"branding.side_stripe.{side:+d}", (-0.005, side * 0.369, 1.475), (1.295, 0.010, 0.090), hoyer_blue, cabinet_group, bevel=0.002)
text_mesh("branding.model", "Hoyer Frigus SF", (0.598, -0.180, 1.478), 0.062, white, cabinet_group, align="LEFT")

# Four tapered adjustable legs establish the manual's floor-level envelope.
for index, (x, y) in enumerate(((-0.545, -0.285), (-0.545, 0.285), (0.545, -0.285), (0.545, 0.285)), 1):
    cone(f"cabinet.leg.{index:02d}", (x, y, 0.115), 0.035, 0.050, 0.145, stainless_dark, cabinet_group)
    cylinder(f"cabinet.foot_stem.{index:02d}", (x, y, 0.030), 0.013, 0.060, stainless_dark, cabinet_group, axis="Z", vertices=14, bevel=0.001)
    cylinder(f"cabinet.foot_pad.{index:02d}", (x, y, 0.008), 0.040, 0.016, stainless_dark, cabinet_group, axis="Z", vertices=18, bevel=0.001)

# Side access-panel seams, fasteners, and upper rear ventilation slots.
for side in (-1, 1):
    side_name = "right" if side < 0 else "left"
    y = side * 0.370
    rounded_box(f"cabinet.{side_name}.lower_seam", (-0.010, y, 0.525), (1.210, 0.005, 0.004), stainless_dark, cabinet_group, bevel=0)
    rounded_box(f"cabinet.{side_name}.vertical_seam", (-0.300, y, 1.070), (0.004, 0.005, 0.960), stainless_dark, cabinet_group, bevel=0)
    rounded_box(f"cabinet.{side_name}.handle", (-0.110, side * 0.373, 1.020), (0.120, 0.006, 0.060), stainless_dark, cabinet_group, bevel=0.006, segments=3)
    for row in range(2):
        for slot in range(7):
            rounded_box(
                f"cabinet.{side_name}.louver.{row + 1}.{slot + 1}",
                (-0.545 + slot * 0.047, side * 0.374, 1.535 + row * 0.032),
                (0.034, 0.006, 0.006),
                stainless_dark,
                cabinet_group,
                bevel=0.001,
            )

# The attached photo places the projecting operator panel at viewer-left.
rounded_box("controls.enclosure", (0.585, -0.286, 1.240), (0.100, 0.175, 0.780), stainless_light, control_group, bevel=0.006, segments=3)
rounded_box("controls.blue_face", (0.639, -0.286, 1.240), (0.012, 0.150, 0.740), panel_blue, control_group, bevel=0.004, segments=3)
text_mesh("controls.header", "Hoyer", (0.647, -0.286, 1.565), 0.026, white, control_group)

# Instrument stack follows manual Fig. 3.5 and the attached blue/yellow panel.
rounded_box("controls.top_display_bezel", (0.648, -0.286, 1.525), (0.012, 0.105, 0.062), black, control_group, bevel=0.004)
rounded_box("controls.top_display", (0.657, -0.286, 1.525), (0.006, 0.080, 0.040), panel_blue, control_group, bevel=0.002)
for index, (y, z, mat) in enumerate(((-0.255, 1.458, white), (-0.315, 1.458, safety_red), (-0.255, 1.382, black), (-0.315, 1.382, signal_green), (-0.255, 1.305, black), (-0.315, 1.305, signal_green), (-0.255, 1.230, black), (-0.315, 1.230, signal_green)), 1):
    cylinder(f"controls.switch.{index:02d}", (0.654, y, z), 0.018, 0.018, mat, control_group, vertices=20, bevel=0.002)

rounded_box("controls.emergency_backplate", (0.650, -0.286, 1.145), (0.008, 0.142, 0.070), warning_yellow, control_group, bevel=0.001)
cylinder("controls.emergency_stop", (0.650, -0.286, 1.145), 0.028, 0.026, safety_red, control_group, vertices=24, bevel=0.003)
for index, z in enumerate((1.060, 0.985, 0.910), 1):
    gauge(f"controls.gauge.{index:02d}", -0.286, z, 0.034, control_group)

# Upper outlet housing and central freezing-cylinder cover match the user photo.
rounded_box("process.upper_pump.body", (0.590, -0.040, 1.270), (0.105, 0.165, 0.150), stainless_light, outlet_group, bevel=0.020, segments=4)
cylinder("process.upper_pump.top_valve", (0.593, -0.040, 1.385), 0.030, 0.075, stainless_light, outlet_group, axis="Z", vertices=20, bevel=0.002)
cylinder("process.upper_pump.side_flange", (0.623, 0.125, 1.270), 0.040, 0.040, stainless_light, outlet_group, axis="Y", vertices=24, bevel=0.002)

cylinder("process.freezer_flange.plate", (0.590, -0.015, 0.915), 0.125, 0.075, stainless_light, outlet_group, vertices=36, bevel=0.004)
cylinder("process.freezer_flange.cap", (0.637, -0.015, 0.915), 0.075, 0.040, stainless_dark, outlet_group, vertices=28, bevel=0.003)
ring_of_bolts("process.freezer_flange.bolt", -0.015, 0.915, 0.645, 0.092, 6, stainless_dark, outlet_group)
cylinder("process.freezer_flange.lower_port", (0.635, -0.015, 0.790), 0.035, 0.055, stainless_light, inlet_group, vertices=24, bevel=0.002)

# Curved sanitary transfer pipe is the strongest silhouette cue in the photo.
pipe(
    "process.product_transfer_pipe",
    [
        (0.615, 0.125, 1.270),
        (0.625, 0.205, 1.235),
        (0.625, 0.220, 1.130),
        (0.625, 0.190, 1.045),
        (0.625, 0.115, 0.975),
        (0.625, 0.070, 0.930),
    ],
    0.024,
    stainless_light,
    piping_group,
    resolution=5,
)
cylinder("process.pipe_clamp.upper", (0.625, 0.125, 1.270), 0.032, 0.015, stainless_dark, piping_group, axis="Y", vertices=18, bevel=0.001)
cylinder("process.pipe_clamp.lower", (0.625, 0.070, 0.930), 0.032, 0.015, stainless_dark, piping_group, axis="Y", vertices=18, bevel=0.001)

# Front service connections and the isolated low connection visible in the photo.
for index, (y, z, radius) in enumerate(((0.185, 0.820, 0.028), (-0.070, 0.780, 0.025), (0.145, 0.260, 0.030)), 1):
    cylinder(f"utilities.front_connection.{index:02d}", (0.620, y, z), radius, 0.060, stainless_light, piping_group, vertices=22, bevel=0.002)

# Circular manufacturer and inspection decals from the supplied front view.
for name, y, color in (("service", -0.135, safety_red), ("inspection", 0.145, panel_blue)):
    cylinder(f"branding.{name}_decal", (0.587, y, 1.330), 0.055, 0.008, color, cabinet_group, vertices=32, bevel=0.001)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable Blender source before preview-only studio objects are added.
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
    point_at(camera, (0.0, 0.0, 0.80))

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


floor_mat = material("studio_floor", (0.68, 0.71, 0.69, 1.0), 0.0, 0.70)
rounded_box("studio.floor", (0.0, 0.0, -0.035), (3.4, 3.4, 0.06), floor_mat, None, bevel=0.01)

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

render_preview("front", (4.2, 0.0, 0.92), 2.24)
render_preview("side", (0.0, -4.2, 0.92), 2.24)
render_preview("three-quarter", (3.4, -3.0, 2.35), 2.50)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
