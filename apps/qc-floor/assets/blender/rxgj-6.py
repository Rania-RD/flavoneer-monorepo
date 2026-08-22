#!/usr/bin/env python3
"""Build the Wuxi Danxiao RXGJ-6 rotary stick-machine QC-floor asset.

Run from the repository root with Blender 4.2 or newer:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/rxgj-6.py

The result is a reference-led exterior visualization. It is not a fabrication,
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
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "rxgj-6"
BLEND_PATH = SCRIPT_DIR / "rxgj-6.blend"
GLB_PATH = MODEL_DIR / "danxiao-rxgj-6.glb"
STL_PATH = MODEL_DIR / "danxiao-rxgj-6.stl"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Manufacturer dimensions. Blender is Z-up; GLB export is Y-up.
ENVELOPE = (4.50, 2.60, 1.82)
TANK_CENTER = (-0.95, 0.0)


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


def material(name, color, metallic=0.0, roughness=0.4):
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


def rounded_box(
    name,
    location,
    dimensions,
    mat,
    parent,
    rotation=(0.0, 0.0, 0.0),
    bevel=0.008,
    segments=2,
):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
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


def cylinder(
    name,
    location,
    radius,
    depth,
    mat,
    parent,
    axis="Z",
    vertices=32,
    bevel=0.003,
):
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


def cone(name, location, radius1, radius2, depth, mat, parent, vertices=24):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def torus(name, location, major_radius, minor_radius, mat, parent):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=8,
        location=location,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def annulus(name, center, inner_radius, outer_radius, depth, mat, parent, segments=96):
    cx, cy, cz = center
    z_low = cz - depth / 2
    z_high = cz + depth / 2
    vertices = []
    faces = []
    for index in range(segments):
        angle = index * math.tau / segments
        cosine = math.cos(angle)
        sine = math.sin(angle)
        vertices.extend(
            (
                (cx + inner_radius * cosine, cy + inner_radius * sine, z_low),
                (cx + outer_radius * cosine, cy + outer_radius * sine, z_low),
                (cx + inner_radius * cosine, cy + inner_radius * sine, z_high),
                (cx + outer_radius * cosine, cy + outer_radius * sine, z_high),
            )
        )
    for index in range(segments):
        next_index = (index + 1) % segments
        a = index * 4
        b = next_index * 4
        faces.extend(
            (
                (a + 2, a + 3, b + 3, b + 2),
                (a, b, b + 1, a + 1),
                (a + 1, b + 1, b + 3, a + 3),
                (a, a + 2, b + 2, b),
            )
        )
    mesh = bpy.data.meshes.new(f"mesh.{name}")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return finish_object(obj, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, resolution=3):
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


def text_on_y_face(name, body, location, size, mat, parent):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.resolution_u = 1
    curve.extrude = 0.0005
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, 0.0)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj.name = name
    obj.data.name = f"mesh.{name}"
    return obj


def radial_box(name, radius, angle, z, dimensions, mat, parent, radial_offset=(0.0, 0.0)):
    cx, cy = TANK_CENTER
    x = cx + math.cos(angle) * radius + radial_offset[0]
    y = cy + math.sin(angle) * radius + radial_offset[1]
    return rounded_box(
        name,
        (x, y, z),
        dimensions,
        mat,
        parent,
        rotation=(0.0, 0.0, angle + math.pi / 2),
        bevel=0.002,
        segments=1,
    )


def station_frame(name, angle, radius, width, height, mat, parent, span="tangent"):
    cx, cy = TANK_CENTER
    tangent = Vector((-math.sin(angle), math.cos(angle), 0.0))
    radial = Vector((math.cos(angle), math.sin(angle), 0.0))
    center = Vector((cx, cy, 0.0)) + radial * radius
    span_vector = radial if span == "radial" else tangent
    frame_angle = angle - math.pi / 2 if span == "radial" else angle
    rotation = (0.0, 0.0, frame_angle)
    for side in (-1, 1):
        position = center + span_vector * side * width / 2
        rounded_box(
            f"{name}.post.{side:+d}",
            (position.x, position.y, 1.335),
            (0.055, 0.055, height),
            mat,
            parent,
            rotation=rotation,
            bevel=0.004,
        )
    rounded_box(
        f"{name}.crossbeam",
        (center.x, center.y, 1.62),
        (0.075, width + 0.12, 0.075),
        mat,
        parent,
        rotation=rotation,
        bevel=0.004,
    )
    return center, tangent, radial


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.42, 0.46, 0.47, 1.0), 0.88, 0.24)
stainless_light = material("stainless_light", (0.70, 0.74, 0.74, 1.0), 0.92, 0.18)
stainless_dark = material("stainless_dark", (0.075, 0.090, 0.095, 1.0), 0.62, 0.36)
slot_dark = material("mould_well", (0.018, 0.026, 0.028, 1.0), 0.18, 0.32)
control_blue = material("runyu_blue", (0.015, 0.39, 0.67, 1.0), 0.10, 0.30)
screen = material("hmi_screen", (0.015, 0.050, 0.055, 1.0), 0.02, 0.18)
safety_red = material("safety_red", (0.72, 0.018, 0.012, 1.0), 0.02, 0.30)
button_green = material("button_green", (0.02, 0.48, 0.14, 1.0), 0.02, 0.30)
pump_blue = material("pump_blue", (0.025, 0.21, 0.58, 1.0), 0.36, 0.28)
tube_blue = material("pneumatic_tube", (0.18, 0.58, 0.78, 1.0), 0.02, 0.24)
white_plastic = material("food_plastic", (0.88, 0.90, 0.88, 1.0), 0.02, 0.38)

root = empty("machine.rxgj-6")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["referenceModel"] = "Wuxi Danxiao RXGJ-6 rotary stick ice cream machine"
root["referenceConfidence"] = "medium exterior; low hidden mechanisms"

tank_group = empty("structure.double_annular_tank", root, selectable=True)
deck_group = empty("inspection.rotary_mould_deck", root, selectable=True)
filling_group = empty("inspection.filling_station", root, selectable=True)
stick_group = empty("inspection.stick_insertion_station", root, selectable=True)
pickup_group = empty("inspection.demould_pickup_station", root, selectable=True)
guard_group = empty("structure.transfer_guard", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
utility_group = empty("utilities.brine_and_air", root)

cx, cy = TANK_CENTER

# The circular jacket, double waist bands, and open annular deck set the RXGJ silhouette.
cylinder("tank.outer_jacket", (cx, cy, 0.535), 1.300, 0.690, stainless, tank_group, vertices=96, bevel=0.0)
cylinder("tank.lower_shadow", (cx, cy, 0.205), 1.255, 0.055, stainless_dark, tank_group, vertices=96, bevel=0.003)
torus("tank.lower_band", (cx, cy, 0.315), 1.263, 0.027, stainless_light, tank_group)
torus("tank.upper_band", (cx, cy, 0.815), 1.263, 0.027, stainless_light, tank_group)
annulus("tank.top_deck", (cx, cy, 0.905), 0.345, 1.285, 0.070, stainless_light, deck_group)
cylinder("tank.center_well", (cx, cy, 0.840), 0.345, 0.150, stainless_dark, deck_group, vertices=64, bevel=0.002)
torus("tank.center_well_rim", (cx, cy, 0.945), 0.327, 0.022, stainless_light, deck_group)

# Three concentric rows of mould pockets. Dark shallow inserts read as openings at floor scale.
for row_index, radius in enumerate((0.61, 0.83, 1.055), 1):
    for slot_index in range(40):
        angle = slot_index * math.tau / 40
        radial_box(
            f"mould.row_{row_index}.slot_{slot_index + 1:02d}",
            radius,
            angle,
            0.944,
            (0.075, 0.112, 0.014),
            slot_dark,
            deck_group,
        )

# Exterior latches, service boxes, and adjustable feet visible around the tank skirt.
for index, angle in enumerate((0.20, 1.08, 2.00, 2.92, 3.84, 4.76, 5.68), 1):
    radial_box(
        f"tank.service_box.{index:02d}",
        1.160,
        angle,
        0.555,
        (0.19, 0.25, 0.31),
        stainless,
        tank_group,
    )
for index, angle in enumerate((0.35, 1.30, 2.25, 3.20, 4.15, 5.10), 1):
    x = cx + math.cos(angle) * 1.10
    y = cy + math.sin(angle) * 1.10
    cylinder(f"tank.foot_stem.{index:02d}", (x, y, 0.095), 0.025, 0.160, stainless_dark, tank_group, bevel=0.001)
    cylinder(f"tank.foot_pad.{index:02d}", (x, y, 0.015), 0.070, 0.030, stainless_dark, tank_group, vertices=24, bevel=0.0)

# Filling manifold at the left-front quadrant. Its three tips share one angular
# index and sit directly above the three concentric mould rows.
fill_angle = math.radians(216)
fill_center, fill_tangent, fill_radial = station_frame(
    "filling.frame", fill_angle, 0.83, 0.64, 0.62, stainless_light, filling_group, span="radial"
)
rounded_box(
    "filling.product_box",
    (fill_center.x, fill_center.y, 1.475),
    (0.66, 0.34, 0.34),
    stainless,
    filling_group,
    rotation=(0.0, 0.0, fill_angle),
    bevel=0.012,
)
for nozzle_index, row_radius in enumerate((0.61, 0.83, 1.055), 1):
    nozzle_center = Vector((cx, cy, 0.0)) + fill_radial * row_radius
    cylinder(
        f"filling.nozzle.{nozzle_index:02d}",
        (nozzle_center.x, nozzle_center.y, 1.205),
        0.035,
        0.275,
        stainless_light,
        filling_group,
        bevel=0.002,
    )
    cylinder(
        f"filling.tip.{nozzle_index:02d}",
        (nozzle_center.x, nozzle_center.y, 1.055),
        0.022,
        0.070,
        stainless_dark,
        filling_group,
        bevel=0.001,
    )
cylinder("filling.pneumatic_ram", (fill_center.x, fill_center.y, 1.705), 0.060, 0.220, stainless_light, filling_group)

# Tall stick insertion frame. Each magazine and guide matches one mould row.
stick_angle = math.radians(144)
stick_center, stick_tangent, stick_radial = station_frame(
    "stick.frame", stick_angle, 0.83, 0.66, 0.68, stainless_light, stick_group, span="radial"
)
for magazine_index, row_radius in enumerate((0.61, 0.83, 1.055), 1):
    position = Vector((cx, cy, 0.0)) + stick_radial * row_radius
    rounded_box(
        f"stick.magazine.{magazine_index:02d}",
        (position.x, position.y, 1.395),
        (0.11, 0.095, 0.49),
        stainless,
        stick_group,
        rotation=(0.0, 0.0, stick_angle),
        bevel=0.005,
    )
    rounded_box(
        f"stick.guide.{magazine_index:02d}",
        (position.x, position.y, 1.090),
        (0.035, 0.018, 0.280),
        stainless_dark,
        stick_group,
        rotation=(0.0, 0.0, stick_angle),
        bevel=0.001,
    )

# Demould and pickup station based on the close-up with twin radial clamp arms.
pickup_angle = math.radians(324)
pickup_center, pickup_tangent, pickup_radial = station_frame(
    "pickup.frame", pickup_angle, 1.00, 0.72, 0.66, stainless_light, pickup_group
)
cylinder("pickup.air_cylinder", (pickup_center.x, pickup_center.y, 1.505), 0.095, 0.420, stainless_light, pickup_group)
cylinder("pickup.cross_shaft", (pickup_center.x, pickup_center.y, 1.345), 0.060, 0.720, stainless_dark, pickup_group, axis="Y")
for side in (-1, 1):
    for clamp_index in range(3):
        offset = side * (0.16 + clamp_index * 0.15)
        position = pickup_center + pickup_tangent * offset
        rounded_box(
            f"pickup.clamp_arm.{side:+d}.{clamp_index + 1}",
            (position.x, position.y, 1.205),
            (0.035, 0.085, 0.330),
            stainless_light,
            pickup_group,
            rotation=(0.0, 0.0, pickup_angle),
            bevel=0.004,
        )
        rounded_box(
            f"pickup.gripper_pad.{side:+d}.{clamp_index + 1}",
            (position.x, position.y, 1.055),
            (0.058, 0.055, 0.110),
            white_plastic,
            pickup_group,
            rotation=(0.0, 0.0, pickup_angle),
            bevel=0.012,
        )

# Rear transfer shroud. The open end shows the stacked carrier path seen in the hero photo.
rounded_box("guard.roof", (1.05, 0.57, 1.790), (2.40, 0.92, 0.060), stainless_light, guard_group, bevel=0.0)
rounded_box("guard.outer_side", (1.05, 1.010, 1.560), (2.40, 0.040, 0.460), stainless, guard_group, bevel=0.002)
rounded_box("guard.inner_side", (1.05, 0.130, 1.560), (2.40, 0.040, 0.460), stainless, guard_group, bevel=0.002)
rounded_box("guard.end_panel", (2.220, 0.57, 1.560), (0.060, 0.92, 0.460), stainless, guard_group, bevel=0.0)
for post_index, x in enumerate((0.10, 0.75, 1.40, 2.12), 1):
    for y in (0.17, 0.97):
        rounded_box(
            f"guard.support.{post_index:02d}.{y:.2f}",
            (x, y, 1.285),
            (0.055, 0.055, 0.560),
            stainless_dark,
            guard_group,
            bevel=0.003,
        )
for tier_index, z in enumerate((1.405, 1.515, 1.625), 1):
    rounded_box(f"guard.carrier_rail.{tier_index:02d}", (1.20, 0.57, z), (1.92, 0.70, 0.030), stainless_dark, guard_group, bevel=0.002)
    for roller_index in range(9):
        cylinder(
            f"guard.roller.{tier_index:02d}.{roller_index + 1:02d}",
            (0.38 + roller_index * 0.20, 0.57, z + 0.025),
            0.025,
            0.70,
            stainless_light,
            guard_group,
            axis="Y",
            vertices=16,
            bevel=0.001,
        )

# Freestanding PLC cabinet with the characteristic cyan control fascia.
rounded_box("controls.cabinet", (1.42, -0.985, 0.900), (0.58, 0.42, 1.260), stainless, control_group, bevel=0.010)
for leg_index, x in enumerate((1.20, 1.64), 1):
    rounded_box(f"controls.leg.{leg_index:02d}", (x, -0.985, 0.170), (0.055, 0.055, 0.280), stainless_dark, control_group, bevel=0.002)
rounded_box("controls.lower_rail", (1.42, -0.985, 0.065), (0.52, 0.055, 0.055), stainless_dark, control_group, bevel=0.002)
rounded_box("controls.blue_fascia", (1.42, -1.200, 1.060), (0.420, 0.018, 0.610), control_blue, control_group, bevel=0.012)
rounded_box("controls.hmi_bezel", (1.42, -1.215, 1.220), (0.205, 0.014, 0.150), stainless_light, control_group, bevel=0.008)
rounded_box("controls.hmi_screen", (1.42, -1.225, 1.220), (0.158, 0.010, 0.102), screen, control_group, bevel=0.004)
text_on_y_face("controls.brand", "RUNYU", (1.42, -1.231, 1.395), 0.055, stainless_light, control_group)
for button_index, (x, mat) in enumerate(((1.31, button_green), (1.39, button_green), (1.47, safety_red), (1.55, button_green)), 1):
    cylinder(
        f"controls.pushbutton.{button_index:02d}",
        (x, -1.228, 0.975),
        0.024,
        0.018,
        mat,
        control_group,
        axis="Y",
        vertices=20,
        bevel=0.002,
    )

# Blue brine pump, sanitary tubes, air lines, and local valve boxes.
cylinder("utilities.brine_pump.motor", (0.47, -0.86, 0.560), 0.165, 0.350, pump_blue, utility_group, axis="Z", vertices=32)
cylinder("utilities.brine_pump.housing", (0.47, -0.86, 0.355), 0.205, 0.145, stainless_light, utility_group, axis="Z", vertices=32)
cylinder("utilities.brine_pump.outlet", (0.47, -1.085, 0.420), 0.090, 0.250, stainless_light, utility_group, axis="Y", vertices=24)
pipe(
    "utilities.brine_return",
    [(0.47, -1.08, 0.42), (0.15, -1.08, 0.42), (-0.02, -1.02, 0.50), (-0.05, -0.94, 0.70)],
    0.060,
    stainless_light,
    utility_group,
)
pipe(
    "utilities.fill_product_hose",
    [(-1.76, -0.78, 1.55), (-1.72, -0.95, 1.67), (-1.50, -1.03, 1.62), (-1.36, -0.90, 1.48)],
    0.018,
    tube_blue,
    utility_group,
)
pipe(
    "utilities.pickup_air_line",
    [(-0.05, -0.95, 1.64), (0.10, -1.08, 1.71), (0.28, -1.03, 1.54), (0.24, -0.88, 1.35)],
    0.010,
    tube_blue,
    utility_group,
)
for valve_index, angle in enumerate((0.45, 2.55, 4.20), 1):
    x = cx + math.cos(angle) * 1.25
    y = cy + math.sin(angle) * 1.25
    cylinder(f"utilities.valve_body.{valve_index:02d}", (x, y, 0.740), 0.040, 0.130, stainless_light, utility_group)
    cylinder(f"utilities.valve_handle.{valve_index:02d}", (x, y, 0.825), 0.065, 0.025, safety_red, utility_group, vertices=18)


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

# Clean the colorless STL copy without changing the editable source or GLB names.
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
    point_at(camera, (0.0, 0.0, 0.82))

    scene = bpy.context.scene
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.engine = "BLENDER_EEVEE"
    bpy.ops.render.render(write_still=True)


# Preview-only studio objects are added after the asset exports.
floor_mat = material("studio_floor", (0.66, 0.69, 0.68, 1.0), 0.0, 0.72)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (7.2, 7.2, 0.080), floor_mat, None, bevel=0.012)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.69, 0.72, 0.74, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

for name, location, energy, size in (
    ("studio.key", (5.0, -4.2, 6.2), 1200, 4.0),
    ("studio.fill", (-2.0, -4.5, 3.7), 640, 3.5),
    ("studio.rim", (-4.0, 3.0, 4.5), 900, 3.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.85))

render_preview("front", (0.0, -8.2, 2.55), 5.25)
render_preview("side", (8.2, 0.0, 2.45), 5.25)
render_preview("three-quarter", (6.0, -6.2, 4.35), 5.45)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
