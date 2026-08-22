#!/usr/bin/env python3
"""Build the reference-led Danxiao RXGJ-12 QC-floor asset in Blender.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/danxiao-rxgj-12.py

The current manufacturer page supplies the 5.50 x 3.75 x 1.88 m envelope.
Manufacturer photographs and the public process video define the visible station
layout. This is a floor-plan visualization, not fabrication or installation CAD.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "danxiao-rxgj-12"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "danxiao-rxgj-12.blend"
GLB_PATH = MODEL_DIR / "danxiao-rxgj-12.glb"
STL_PATH = MODEL_DIR / "danxiao-rxgj-12.stl"

ENVELOPE = (5.500, 3.750, 1.880)  # Blender X length, Y width, Z height, metres.
TANK_CENTER_X = -0.875


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
    rgba = (*color, 1.0)
    result.diffuse_color = rgba
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba
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


def finish_object(obj, name: str, mat, parent, smooth=False):
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
    if bevel > 0:
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
    vertices=20,
    bevel=0.0015,
):
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


def cone(name, location, radius1, radius2, depth, mat, parent, vertices=20):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def torus(
    name,
    location,
    major_radius,
    minor_radius,
    mat,
    parent,
    major_segments=48,
    minor_segments=8,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def annular_disc(name, center, outer_radius, inner_radius, thickness, mat, parent, segments=64):
    cx, cy, cz = center
    z0 = -thickness / 2
    z1 = thickness / 2
    vertices = []
    for z in (z0, z1):
        for radius in (outer_radius, inner_radius):
            for index in range(segments):
                angle = 2 * math.pi * index / segments
                vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = []
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.extend(
            [
                (outer_top + index, outer_top + nxt, inner_top + nxt, inner_top + index),
                (outer_bottom + nxt, outer_bottom + index, inner_bottom + index, inner_bottom + nxt),
                (outer_bottom + index, outer_bottom + nxt, outer_top + nxt, outer_top + index),
                (inner_bottom + nxt, inner_bottom + index, inner_top + index, inner_top + nxt),
            ]
        )
    mesh = bpy.data.meshes.new(f"mesh.{name}")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = (cx, cy, cz)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def pipe(name, points, radius, mat, parent, bevel_resolution=1):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
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
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.select_set(False)
    return obj


def beam_between(name, start, end, width, mat, parent):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) / 2
    bpy.ops.mesh.primitive_cube_add(location=midpoint)
    obj = bpy.context.object
    obj.dimensions = (width, width, direction.length)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, parent)


def text_on_front(name, body, location, size, mat, parent, extrude=0.001):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0002
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, 0.0)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    obj.select_set(False)
    return obj


def polar_xy(radius, angle_degrees):
    angle = math.radians(angle_degrees)
    return (
        TANK_CENTER_X + radius * math.cos(angle),
        radius * math.sin(angle),
    )


def radial_mould_line(angle_degrees, radii):
    """Return one process head location above each mould lane in a radial row."""
    return [polar_xy(radius, angle_degrees) for radius in radii]


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.48, 0.52, 0.53), metallic=0.84, roughness=0.25)
stainless_light = material("stainless_light", (0.72, 0.76, 0.77), metallic=0.78, roughness=0.21)
stainless_dark = material("stainless_dark", (0.16, 0.19, 0.20), metallic=0.70, roughness=0.34)
slot_dark = material("mould_slot", (0.035, 0.055, 0.055), metallic=0.18, roughness=0.42)
control_blue = material("control_blue", (0.02, 0.31, 0.57), metallic=0.05, roughness=0.30)
runyu_cyan = material("runyu_cyan", (0.00, 0.56, 0.73), metallic=0.08, roughness=0.28)
safety_red = material("safety_red", (0.78, 0.025, 0.018), roughness=0.30)
product_green = material("product_green", (0.23, 0.78, 0.13), roughness=0.36)
stick_wood = material("stick_wood", (0.72, 0.50, 0.25), roughness=0.62)
rubber = material("rubber", (0.018, 0.025, 0.028), roughness=0.76)

root = empty("machine.rxgj-12")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["manufacturer"] = "Wuxi Danxiao Machinery Co., Ltd."
root["model"] = "RXGJ-12"
root["capacityPiecesPerHour"] = 14000
root["laneCount"] = 12
root["mouldLines"] = 140
root["dimensionConfidence"] = "high for current manufacturer envelope; medium for visible station proportions"

frame_group = empty("structure.circular_frame", root)
tank_group = empty("inspection.double_annular_tank", root, selectable=True)
carousel_group = empty("inspection.twelve_lane_mould_carousel", root, selectable=True)
fill_group = empty("inspection.filling_station", root, selectable=True)
suction_group = empty("inspection.suction_station", root, selectable=True)
stick_group = empty("inspection.stick_insertion_station", root, selectable=True)
demould_group = empty("inspection.demould_pickup_station", root, selectable=True)
coat_group = empty("inspection.coating_station", root, selectable=True)
outfeed_group = empty("flow.outfeed", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
utility_group = empty("utilities.brine_pump_and_pneumatics", root)
walkway_group = empty("safety.operator_walkway", root)

# Circular frame, feet, grating and guard rails. The outer rail establishes the
# exact 3.75 m depth and the machine's left bound without invisible markers.
annular_disc(
    "walkway.grating",
    (TANK_CENTER_X, 0.0, 0.225),
    1.845,
    1.585,
    0.070,
    stainless_dark,
    walkway_group,
    segments=64,
)
torus("walkway.outer_edge", (TANK_CENTER_X, 0.0, 0.225), 1.840, 0.035, stainless_light, walkway_group, major_segments=64)
torus("walkway.inner_edge", (TANK_CENTER_X, 0.0, 0.225), 1.605, 0.025, stainless_light, walkway_group, major_segments=64)

for index in range(20):
    angle = 360 * index / 20
    x, y = polar_xy(1.72, angle)
    cylinder(f"frame.foot.{index + 1:02d}", (x, y, 0.095), 0.040, 0.190, stainless_dark, frame_group, vertices=12, bevel=0.002)
    cylinder(f"frame.pad.{index + 1:02d}", (x, y, 0.018), 0.060, 0.036, rubber, frame_group, vertices=14, bevel=0.001)
    if 20 <= angle <= 340:
        cylinder(f"guard.post.{index + 1:02d}", (x, y, 0.555), 0.018, 0.620, stainless_light, walkway_group, vertices=10)

torus("guard.top_rail", (TANK_CENTER_X, 0.0, 0.855), 1.830, 0.045, stainless_light, walkway_group, major_segments=64)
torus("guard.mid_rail", (TANK_CENTER_X, 0.0, 0.585), 1.820, 0.025, stainless_light, walkway_group, major_segments=64)

# The stainless lower drum and visibly separated concentric brine decks.
cylinder("tank.outer_drum", (TANK_CENTER_X, 0.0, 0.585), 1.565, 0.720, stainless, tank_group, vertices=64, bevel=0.012)
cylinder("tank.lower_shadow", (TANK_CENTER_X, 0.0, 0.280), 1.495, 0.080, stainless_dark, tank_group, vertices=64, bevel=0.005)
torus("tank.upper_lip", (TANK_CENTER_X, 0.0, 0.945), 1.515, 0.050, stainless_light, tank_group, major_segments=64)
annular_disc("tank.outer_brine_deck", (TANK_CENTER_X, 0.0, 0.965), 1.485, 0.965, 0.065, stainless_light, tank_group, segments=64)
annular_disc("tank.inner_brine_deck", (TANK_CENTER_X, 0.0, 0.965), 0.925, 0.455, 0.065, stainless_light, tank_group, segments=64)
cylinder("tank.central_well", (TANK_CENTER_X, 0.0, 0.770), 0.420, 0.390, slot_dark, tank_group, vertices=48, bevel=0.006)
torus("tank.inner_separator", (TANK_CENTER_X, 0.0, 0.995), 0.945, 0.028, stainless_dark, tank_group, major_segments=64)
torus("tank.central_rim", (TANK_CENTER_X, 0.0, 0.995), 0.445, 0.025, stainless_dark, tank_group, major_segments=48)

# Forty-eight visible sectors stand in for the published 140 indexed mould
# lines. Twelve dark mould openings per sector preserve the RXGJ-12 lane count.
mould_radii = [0.53 + index * 0.065 for index in range(6)] + [1.015 + index * 0.075 for index in range(6)]
for sector in range(48):
    angle = 360 * sector / 48
    angle_radians = math.radians(angle)
    for lane, radius in enumerate(mould_radii, 1):
        x, y = polar_xy(radius, angle)
        rounded_box(
            f"mould.slot.{sector + 1:02d}.{lane:02d}",
            (x, y, 1.006),
            (0.034, 0.090, 0.020),
            slot_dark,
            carousel_group,
            rotation=(0.0, 0.0, angle_radians),
            bevel=0.0,
        )

# Blue motors and electrical junction boxes repeated around the tank perimeter.
for index, angle in enumerate((160, 205, 250, 292, 335, 22), 1):
    x, y = polar_xy(1.48, angle)
    cylinder(f"utility.junction.{index:02d}", (x, y, 0.670), 0.105, 0.250, stainless_light, utility_group, vertices=16, bevel=0.004)
    cylinder(f"utility.valve.{index:02d}", (x, y, 0.820), 0.030, 0.055, safety_red, utility_group, vertices=12, bevel=0.001)

pump_x, pump_y = polar_xy(1.50, 328)
cylinder("utility.brine_pump.body", (pump_x, pump_y, 0.495), 0.135, 0.360, runyu_cyan, utility_group, axis="X", vertices=18, bevel=0.004)
cylinder("utility.brine_pump.motor", (pump_x + 0.22, pump_y, 0.495), 0.105, 0.290, control_blue, utility_group, axis="X", vertices=18, bevel=0.004)
pipe(
    "utility.brine_pipe",
    [(pump_x - 0.18, pump_y, 0.49), (pump_x - 0.30, pump_y, 0.34), (TANK_CENTER_X + 0.4, -1.42, 0.34)],
    0.035,
    stainless_dark,
    utility_group,
)

# Suction and prefill bank at the left-rear quadrant. The angle is one of the
# 48 modeled carousel indexes, and every head sits over a published mould lane.
suction_angle = 150.0
suction_center = polar_xy((mould_radii[0] + mould_radii[-1]) / 2, suction_angle)
suction_points = radial_mould_line(suction_angle, mould_radii)
for side, point in enumerate((suction_points[0], suction_points[-1]), 1):
    cylinder(f"suction.support.{side}", (point[0], point[1], 1.330), 0.050, 0.690, stainless_dark, suction_group, vertices=14)
beam_between(
    "suction.crossbeam",
    (suction_points[0][0], suction_points[0][1], 1.590),
    (suction_points[-1][0], suction_points[-1][1], 1.590),
    0.110,
    stainless_light,
    suction_group,
)
for lane, (x, y) in enumerate(suction_points, 1):
    cylinder(f"suction.head.{lane:02d}", (x, y, 1.365), 0.025, 0.380, stainless_light, suction_group, vertices=12)
    cone(f"suction.cup.{lane:02d}", (x, y, 1.145), 0.034, 0.016, 0.060, rubber, suction_group, vertices=12)

# Twelve-lane filling manifold. The box, vertical nozzles and clear-looking hose
# arcs are taken directly from the official detail and video frames. The bank is
# radial, so each nozzle is centered over its matching inner or outer mould.
fill_angle = 210.0
fill_center = polar_xy((mould_radii[0] + mould_radii[-1]) / 2, fill_angle)
fill_points = radial_mould_line(fill_angle, mould_radii)
angle_fill = math.radians(fill_angle)
rounded_box(
    "filling.manifold_box",
    (fill_center[0], fill_center[1], 1.535),
    (1.05, 0.42, 0.34),
    stainless,
    fill_group,
    rotation=(0.0, 0.0, angle_fill),
    bevel=0.012,
)
for lane, (x, y) in enumerate(fill_points, 1):
    cylinder(f"filling.nozzle.{lane:02d}", (x, y, 1.255), 0.027, 0.370, stainless_light, fill_group, vertices=12)
    cylinder(f"filling.tip.{lane:02d}", (x, y, 1.055), 0.017, 0.070, stainless_dark, fill_group, vertices=10)
    pipe(
        f"filling.hose.{lane:02d}",
        [(fill_center[0] - 0.28, fill_center[1] - 0.16, 1.745), (x, y, 1.735), (x, y, 1.585)],
        0.009,
        rubber,
        fill_group,
    )
cylinder("filling.lift_actuator", (fill_center[0] - 0.26, fill_center[1] + 0.08, 1.580), 0.075, 0.590, stainless_dark, fill_group, vertices=16)

# The blue-banded center hopper is the strongest upper silhouette in the sales
# photographs. Its cap establishes the exact 1.88 m height.
stick_center = polar_xy(0.72, 35)
cylinder("stick.hopper_body", (stick_center[0], stick_center[1], 1.445), 0.295, 0.640, stainless_light, stick_group, vertices=32, bevel=0.008)
cylinder("stick.hopper_blue_band", (stick_center[0], stick_center[1], 1.530), 0.303, 0.180, runyu_cyan, stick_group, vertices=32, bevel=0.001)
cone("stick.hopper_cap", (stick_center[0], stick_center[1], 1.800), 0.315, 0.225, 0.160, stainless, stick_group, vertices=32)
text_on_front("stick.hopper_label", "RXGJ-12", (stick_center[0], stick_center[1] - 0.307, 1.535), 0.075, stainless_light, stick_group)

stick_angle = 15.0
stick_points = radial_mould_line(stick_angle, mould_radii)
beam_between(
    "stick.inserter_crossbeam",
    (stick_points[0][0], stick_points[0][1], 1.430),
    (stick_points[-1][0], stick_points[-1][1], 1.430),
    0.105,
    stainless_light,
    stick_group,
)
for lane, (x, y) in enumerate(stick_points, 1):
    cylinder(f"stick.guide.{lane:02d}", (x, y, 1.270), 0.028, 0.270, stainless_dark, stick_group, vertices=10)
    rounded_box(f"stick.sample.{lane:02d}", (x, y, 1.090), (0.018, 0.010, 0.245), stick_wood, stick_group, bevel=0.002)
    pipe(
        f"stick.feed_hose.{lane:02d}",
        [(stick_center[0] + 0.1, stick_center[1], 1.37), (x, y, 1.48), (x, y, 1.37)],
        0.008,
        rubber,
        stick_group,
    )

# Demould water and pickup bank at the rear-right quadrant.
demould_angle = 67.5
demould_center = polar_xy((mould_radii[0] + mould_radii[-1]) / 2, demould_angle)
demould_points = radial_mould_line(demould_angle, mould_radii)
for side, point in enumerate((demould_points[0], demould_points[-1]), 1):
    cylinder(f"demould.support.{side}", (point[0], point[1], 1.390), 0.055, 0.770, stainless_dark, demould_group, vertices=14)
beam_between(
    "demould.pickup_beam",
    (demould_points[0][0], demould_points[0][1], 1.570),
    (demould_points[-1][0], demould_points[-1][1], 1.570),
    0.125,
    stainless_light,
    demould_group,
)
for lane, (x, y) in enumerate(demould_points, 1):
    cylinder(f"demould.gripper_rod.{lane:02d}", (x, y, 1.340), 0.022, 0.430, stainless_light, demould_group, vertices=10)
    rounded_box(f"demould.gripper.{lane:02d}", (x, y, 1.105), (0.055, 0.035, 0.070), stainless_dark, demould_group, bevel=0.006)
cylinder("demould.lift_actuator", (demould_center[0] - 0.18, demould_center[1] + 0.15, 1.555), 0.080, 0.610, stainless_dark, demould_group, vertices=16)
pipe(
    "demould.warm_water_line",
    [(demould_center[0] - 0.35, demould_center[1] + 0.2, 1.72), (demould_center[0], demould_center[1], 1.62), (demould_center[0] + 0.35, demould_center[1] - 0.2, 1.42)],
    0.020,
    runyu_cyan,
    demould_group,
)

# Chocolate coating tank and the green product samples visible at pickup.
coat_center = polar_xy(1.22, 320)
cylinder("coating.tank", (coat_center[0], coat_center[1], 0.995), 0.260, 0.470, stainless_light, coat_group, vertices=28, bevel=0.006)
cylinder("coating.tank_lid", (coat_center[0], coat_center[1], 1.245), 0.275, 0.040, stainless, coat_group, vertices=28, bevel=0.002)
cylinder("coating.lift", (coat_center[0] - 0.25, coat_center[1], 1.285), 0.055, 0.520, stainless_dark, coat_group, vertices=14)
for lane, radius in enumerate(mould_radii):
    x, y = polar_xy(radius, demould_angle)
    rounded_box(f"product.bar.{lane + 1:02d}", (x, y, 1.150), (0.055, 0.035, 0.240), product_green, demould_group, bevel=0.014)
    rounded_box(f"product.stick.{lane + 1:02d}", (x, y, 1.010), (0.018, 0.010, 0.100), stick_wood, demould_group, bevel=0.002)

# Tangential transfer and discharge conveyor. The end deck establishes the
# exact +2.75 m model bound.
rounded_box("outfeed.transfer_housing", (0.78, 0.72, 1.385), (0.76, 0.78, 0.38), stainless, outfeed_group, rotation=(0.0, 0.0, math.radians(18)), bevel=0.012)
for lane in range(12):
    y = 0.37 + lane * 0.055
    cylinder(f"outfeed.pickup_rod.{lane + 1:02d}", (0.83, y, 1.355), 0.018, 0.470, stainless_dark, outfeed_group, axis="X", vertices=10)
rounded_box("outfeed.conveyor_bed", (2.025, 0.720, 1.075), (1.450, 0.710, 0.180), stainless_light, outfeed_group, bevel=0.0)
rounded_box("outfeed.end_bound", (2.700, 0.720, 0.870), (0.100, 0.710, 0.580), stainless, outfeed_group, bevel=0.0)
for rail_y in (0.405, 1.035):
    rounded_box("outfeed.rail." + ("operator" if rail_y < 0.7 else "far"), (2.025, rail_y, 1.245), (1.40, 0.035, 0.035), stainless_dark, outfeed_group, bevel=0.003)
for index in range(16):
    x = 1.35 + index * 0.085
    cylinder(f"outfeed.roller.{index + 1:02d}", (x, 0.720, 1.175), 0.025, 0.620, stainless_dark, outfeed_group, axis="Y", vertices=10, bevel=0.001)
for x in (1.42, 2.52):
    for y in (0.43, 1.01):
        rounded_box(f"outfeed.leg.{x}.{y}", (x, y, 0.655), (0.055, 0.055, 0.830), stainless_dark, outfeed_group, bevel=0.003)

# Separate operator cabinet from the isolated product view.
rounded_box("control.cabinet", (2.18, -1.205, 0.930), (0.690, 0.390, 1.380), stainless, control_group, bevel=0.020, segments=3)
rounded_box("control.blue_face", (2.18, -1.407, 1.110), (0.515, 0.016, 0.690), control_blue, control_group, bevel=0.010)
rounded_box("control.hmi", (2.18, -1.420, 1.305), (0.245, 0.018, 0.180), slot_dark, control_group, bevel=0.006)
for index in range(7):
    x = 1.94 + index * 0.080
    button_mat = (runyu_cyan, stainless_light, safety_red)[index % 3]
    cylinder(f"control.button.{index + 1:02d}", (x, -1.426, 1.020), 0.024, 0.022, button_mat, control_group, axis="Y", vertices=12, bevel=0.001)
cylinder("control.emergency_stop", (2.47, -1.430, 0.875), 0.045, 0.030, safety_red, control_group, axis="Y", vertices=14, bevel=0.002)
text_on_front("control.brand", "RUNYU", (2.18, -1.430, 1.545), 0.090, stainless_light, control_group)
text_on_front("control.model", "RXGJ-12", (2.18, -1.430, 0.790), 0.070, stainless_light, control_group)
for x in (1.94, 2.42):
    rounded_box(f"control.leg.{x}", (x, -1.205, 0.160), (0.055, 0.055, 0.320), stainless_dark, control_group, bevel=0.003)

# Visible service hoses tie the cabinet, coating tank and process stations into
# one machine silhouette without attempting undocumented process piping.
pipe("utility.control_cable", [(1.84, -1.18, 0.40), (1.25, -1.10, 0.28), (0.48, -1.22, 0.34)], 0.035, rubber, utility_group)
pipe("utility.product_line", [(-2.05, -0.60, 1.64), (-1.75, -0.95, 1.73), (fill_center[0], fill_center[1], 1.72)], 0.025, stainless_light, utility_group)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable asset before adding preview-only studio objects.
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


studio_floor = material("studio_floor", (0.53, 0.56, 0.55), roughness=0.76)
rounded_box("studio.floor", (0.0, 0.0, -0.055), (7.4, 5.5, 0.10), studio_floor, None, bevel=0.025)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.73, 0.76, 0.78, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

for name, location, energy, size in (
    ("studio.key", (3.8, -4.5, 5.5), 1450, 4.0),
    ("studio.fill", (-4.2, -2.0, 3.6), 820, 3.2),
    ("studio.rim", (1.0, 4.8, 4.6), 1100, 3.6),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.95))

render_preview("front", (3.0, -8.2, 2.8), (0.0, 0.0, 0.95), 5.85)
render_preview("side", (7.5, 0.0, 2.3), (0.0, 0.0, 0.95), 4.35)
render_preview("three-quarter", (6.4, -6.4, 4.6), (0.0, 0.0, 0.90), 5.55)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
