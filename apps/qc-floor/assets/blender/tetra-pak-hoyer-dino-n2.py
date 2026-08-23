#!/usr/bin/env python3
"""Build the reference-led Tetra Pak Hoyer Dino N2 QC-floor asset.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/tetra-pak-hoyer-dino-n2.py

The model follows the 2007 Tetra Pak line drawing B59404537876, photographs
of the exact 2008 Dino N2 installation, and the related Dino C manual. It is
an exterior QC-floor visualization, not fabrication or safety geometry.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "tetra-pak-hoyer-dino-n2"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "tetra-pak-hoyer-dino-n2.blend"
GLB_PATH = MODEL_DIR / "tetra-pak-hoyer-dino-n2.glb"
STL_PATH = MODEL_DIR / "tetra-pak-hoyer-dino-n2.stl"

# Drawing B59404537876 gives 3326 mm from the Straightline outlet to the Dino
# transfer centreline and a 6520 mm tunnel width. The exact N2 photographs show
# the transfer spanning that cross-line width. The 2450 mm height is scaled from
# the same elevation. These dimensions describe the installed N2 visualization.
ENVELOPE = (3.326, 6.520, 2.450)  # X length, Y width, Z height, metres.
WORK_HEIGHT = 1.350
LANE_Y = tuple(-2.24 + index * 0.56 for index in range(9))
CARRIER_X = tuple(-1.14 + index * (2.28 / 17) for index in range(18))


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
    rgba = (*color, alpha)
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


def rounded_box(name, location, dimensions, mat, parent, bevel=0.008, segments=2):
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
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def torus(name, location, major_radius, minor_radius, mat, parent, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=20,
        minor_segments=6,
        location=location,
        rotation=rotation,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def beam_between(name, start, end, thickness, mat, parent):
    midpoint = (Vector(start) + Vector(end)) / 2
    direction = Vector(end) - Vector(start)
    obj = rounded_box(
        name,
        midpoint,
        (thickness, thickness, direction.length),
        mat,
        parent,
        bevel=min(0.004, thickness * 0.12),
    )
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def text_on_outfeed_face(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.0008
    curve.bevel_depth = 0.0002
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, math.pi / 2)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    return obj


def leveling_foot(name, x, y, parent, steel_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.080), 0.022, 0.13, steel_mat, parent, vertices=14)
    cone(f"{name}.bell", (x, y, 0.040), 0.058, 0.029, 0.055, steel_mat, parent, vertices=18)
    cylinder(f"{name}.pad", (x, y, 0.010), 0.064, 0.020, rubber_mat, parent, vertices=20, bevel=0.001)


def caster(name, x, y, parent, steel_mat, rubber_mat):
    rounded_box(f"{name}.fork", (x, y, 0.19), (0.075, 0.055, 0.18), steel_mat, parent, bevel=0.008)
    cylinder(f"{name}.wheel", (x, y, 0.085), 0.070, 0.045, rubber_mat, parent, axis="Y", vertices=20)
    cylinder(f"{name}.hub", (x, y, 0.085), 0.022, 0.050, steel_mat, parent, axis="Y", vertices=14)


def guard_panel_y(name, x, y, z, width_y, height_z, grid_mat, frame_mat, parent):
    rounded_box(f"{name}.frame.top", (x, y, z + height_z / 2), (0.032, width_y, 0.040), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.bottom", (x, y, z - height_z / 2), (0.032, width_y, 0.040), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.left", (x, y - width_y / 2, z), (0.032, 0.040, height_z), frame_mat, parent, bevel=0.002)
    rounded_box(f"{name}.frame.right", (x, y + width_y / 2, z), (0.032, 0.040, height_z), frame_mat, parent, bevel=0.002)
    for index in range(1, 10):
        grid_y = y - width_y / 2 + index * width_y / 10
        rounded_box(f"{name}.grid.v{index:02d}", (x, grid_y, z), (0.012, 0.010, height_z - 0.04), grid_mat, parent, bevel=0.001)
    for index in range(1, 5):
        grid_z = z - height_z / 2 + index * height_z / 5
        rounded_box(f"{name}.grid.h{index:02d}", (x, y, grid_z), (0.012, width_y - 0.04, 0.010), grid_mat, parent, bevel=0.001)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.48, 0.52, 0.53), metallic=0.84, roughness=0.24)
stainless_light = material("stainless_light", (0.72, 0.75, 0.76), metallic=0.78, roughness=0.20)
stainless_dark = material("stainless_dark", (0.15, 0.18, 0.19), metallic=0.72, roughness=0.33)
rubber = material("rubber", (0.022, 0.027, 0.030), roughness=0.78)
hoyer_blue = material("hoyer_blue", (0.006, 0.075, 0.28), metallic=0.06, roughness=0.31)
screen_blue = material("screen_blue", (0.025, 0.31, 0.48), metallic=0.02, roughness=0.18)
signal_red = material("signal_red", (0.78, 0.018, 0.012), roughness=0.27)
signal_green = material("signal_green", (0.015, 0.52, 0.17), roughness=0.27)
signal_amber = material("signal_amber", (0.98, 0.42, 0.015), roughness=0.27)
warning_yellow = material("warning_yellow", (0.96, 0.70, 0.035), roughness=0.34)
chocolate = material("chocolate", (0.13, 0.035, 0.012), roughness=0.44)
white = material("white", (0.91, 0.92, 0.92), roughness=0.38)

root = empty("machine.hoyer-dino-n2")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "medium line-derived N2 footprint; medium image-scaled height; low hidden mechanisms"
root["referenceModel"] = "Tetra Pak Hoyer Dino N2, drawing 5940242438, 2008"
root["laneCount"] = 9
root["carrierCount"] = 18
root["productWorkingHeightMeters"] = WORK_HEIGHT

frame_group = empty("structure.frame", root)
pickup_group = empty("inspection.pickup_head", root, selectable=True)
carrier_group = empty("inspection.carrier_conveyor", root, selectable=True)
tank_group = empty("inspection.chocolate_tank", root, selectable=True)
outfeed_group = empty("inspection.nine_lane_outfeed", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
guard_group = empty("safety.guarding", root, selectable=True)
utility_group = empty("utilities.drives_and_pneumatics", root)

# Full-length base rails establish the 3.326 m product-flow envelope. The wide
# upper cabinet establishes the 6.520 m cross-line envelope and 2.450 m height.
for side, y in (("left", -3.17), ("right", 3.17)):
    rounded_box(f"frame.base_rail.{side}", (0.0, y, 0.23), (3.326, 0.10, 0.10), stainless_dark, frame_group, bevel=0.006)
    for index, x in enumerate((-1.50, -0.55, 0.48, 1.50), 1):
        rounded_box(f"frame.post.{side}.{index:02d}", (x, y, 0.78), (0.090, 0.090, 1.05), stainless, frame_group, bevel=0.006)
        leveling_foot(f"frame.foot.{side}.{index:02d}", x, y, frame_group, stainless_light, rubber)

for y in (-2.66, -1.32, 0.0, 1.32, 2.66):
    rounded_box(f"frame.cross_member.{y:+.2f}", (0.0, y, 0.44), (3.04, 0.075, 0.075), stainless_dark, frame_group, bevel=0.004)

for y in (-3.17, 3.17):
    beam_between(f"frame.brace.low.{y:+.2f}", (-1.45, y, 0.28), (-0.62, y, 0.92), 0.042, stainless_dark, frame_group)
    beam_between(f"frame.brace.high.{y:+.2f}", (0.60, y, 0.92), (1.43, y, 0.28), 0.042, stainless_dark, frame_group)

rounded_box("frame.overhead_cabinet", (-0.48, 0.0, 2.265), (1.18, 6.520, 0.370), stainless, frame_group, bevel=0.018, segments=3)
for index, y in enumerate((-2.45, -1.22, 0.0, 1.22, 2.45), 1):
    rounded_box(f"frame.overhead_access_door.{index}", (0.116, y, 2.265), (0.012, 1.04, 0.285), stainless_light, frame_group, bevel=0.010)
    rounded_box(f"frame.overhead_latch.{index}", (0.124, y, 2.265), (0.012, 0.060, 0.055), stainless_dark, frame_group, bevel=0.004)

rounded_box("frame.fascia_beam", (0.34, 0.0, 1.82), (0.42, 6.26, 0.32), stainless, frame_group, bevel=0.018, segments=3)
rounded_box("frame.fascia_blue", (0.556, 0.0, 1.86), (0.012, 6.08, 0.105), hoyer_blue, frame_group, bevel=0.002)
text_on_outfeed_face("branding.hoyer_dino", "Hoyer Dino", (0.566, -2.30, 1.86), 0.125, white, frame_group)
text_on_outfeed_face("branding.n2", "N2", (0.566, -1.54, 1.86), 0.092, white, frame_group)

# Tall end cheeks and blue inspection insets match the exact installed N2.
for side, y in (("left", -3.05), ("right", 3.05)):
    rounded_box(f"frame.end_cheek.{side}", (0.30, y, 1.04), (0.48, 0.30, 1.52), stainless, frame_group, bevel=0.020, segments=3)
    rounded_box(f"frame.end_inset.{side}", (0.548, y, 0.84), (0.012, 0.16, 0.18), hoyer_blue, frame_group, bevel=0.018, segments=3)

# Open carrier deck. Eighteen transverse carrier rollers move nine products per
# cycle. Repeated gripper blocks make the lane count readable in the floor view.
rounded_box("carrier.deck_pan", (-0.02, 0.0, 1.19), (2.58, 5.62, 0.16), stainless, carrier_group, bevel=0.014)
for side, y in (("left", -2.83), ("right", 2.83)):
    rounded_box(f"carrier.chain_rail.{side}", (-0.02, y, 1.34), (2.64, 0.11, 0.18), stainless_dark, carrier_group, bevel=0.010)
    for index, x in enumerate(CARRIER_X, 1):
        torus(f"carrier.chain_link.{side}.{index:02d}", (x, y, 1.37), 0.040, 0.012, stainless_light, carrier_group, rotation=(math.pi / 2, 0.0, 0.0))

for carrier, x in enumerate(CARRIER_X, 1):
    cylinder(f"carrier.roller.{carrier:02d}", (x, 0.0, 1.365), 0.027, 5.44, stainless_light, carrier_group, axis="Y", vertices=14, bevel=0.001)
    for lane, y in enumerate(LANE_Y, 1):
        rounded_box(
            f"carrier.gripper.{carrier:02d}.{lane}",
            (x, y, 1.405),
            (0.070, 0.115, 0.050),
            stainless_dark,
            carrier_group,
            bevel=0.008,
        )

for x in (-1.25, 1.25):
    cylinder(f"carrier.end_shaft.{x:+.2f}", (x, 0.0, 1.365), 0.095, 5.54, stainless_dark, carrier_group, axis="Y", vertices=22)
    for y in (-2.83, 2.83):
        cylinder(f"carrier.sprocket.{x:+.2f}.{y:+.2f}", (x, y, 1.365), 0.145, 0.08, stainless_light, carrier_group, axis="Y", vertices=18)

# Tunnel-side pickup shaft, servo housings, rotating arms and the nine-product
# gripper bar follow the Dino manual's pick-up sequence.
for y in (-2.74, 2.74):
    rounded_box(f"pickup.upright.{y:+.2f}", (-1.43, y, 1.54), (0.13, 0.13, 0.92), stainless, pickup_group, bevel=0.008)
cylinder("pickup.main_shaft", (-1.43, 0.0, 1.76), 0.075, 5.54, stainless_dark, pickup_group, axis="Y", vertices=22)
for y in (-2.60, 2.60):
    cylinder(f"pickup.bearing.{y:+.2f}", (-1.43, y, 1.76), 0.135, 0.15, stainless_light, pickup_group, axis="Y", vertices=20)
    beam_between(f"pickup.swing_arm.{y:+.2f}", (-1.43, y, 1.76), (-1.12, y, 1.48), 0.065, stainless, pickup_group)
rounded_box("pickup.gripper_bar", (-1.12, 0.0, 1.48), (0.10, 5.32, 0.10), stainless, pickup_group, bevel=0.008)
for lane, y in enumerate(LANE_Y, 1):
    rounded_box(f"pickup.gripper_body.{lane}", (-1.08, y, 1.42), (0.16, 0.12, 0.11), stainless_dark, pickup_group, bevel=0.010)
    for jaw_side in (-1, 1):
        beam_between(
            f"pickup.gripper_jaw.{lane}.{jaw_side:+d}",
            (-1.02, y + jaw_side * 0.035, 1.40),
            (-0.96, y + jaw_side * 0.060, 1.32),
            0.018,
            stainless_light,
            pickup_group,
        )

cylinder("pickup.servo_motor", (-1.48, 2.93, 1.76), 0.16, 0.34, hoyer_blue, pickup_group, axis="Y", vertices=24)
rounded_box("pickup.servo_gearbox", (-1.48, 2.75, 1.76), (0.34, 0.22, 0.30), stainless_dark, pickup_group, bevel=0.025, segments=3)

# Nine short outfeed lanes align the transfer to the downstream MW 1700-9.
for lane, y in enumerate(LANE_Y, 1):
    rounded_box(f"outfeed.belt.{lane}", (1.43, y, 1.33), (0.44, 0.38, 0.035), rubber, outfeed_group, bevel=0.005)
    rounded_box(f"outfeed.guide.left.{lane}", (1.43, y - 0.205, 1.39), (0.44, 0.020, 0.13), stainless_light, outfeed_group, bevel=0.003)
    rounded_box(f"outfeed.guide.right.{lane}", (1.43, y + 0.205, 1.39), (0.44, 0.020, 0.13), stainless_light, outfeed_group, bevel=0.003)

# Mobile double-wall chocolate tank with visible liquid, screw pump and four
# casters. The cart can be removed from beneath the carrier deck for cleaning.
rounded_box("tank.mobile_body", (0.25, -0.72, 0.68), (1.18, 3.20, 0.78), stainless, tank_group, bevel=0.035, segments=3)
rounded_box("tank.opening", (0.25, -0.72, 1.085), (0.98, 2.98, 0.060), stainless_dark, tank_group, bevel=0.020, segments=3)
rounded_box("tank.chocolate_surface", (0.25, -0.72, 1.105), (0.86, 2.84, 0.028), chocolate, tank_group, bevel=0.012)
for y in (-1.98, 0.54):
    for x in (-0.15, 0.65):
        caster(f"tank.caster.{x:+.2f}.{y:+.2f}", x, y, tank_group, stainless_light, rubber)
cylinder("tank.pump_tube", (0.25, 0.70, 1.16), 0.055, 0.54, stainless_light, tank_group, axis="Z", vertices=18)
cylinder("tank.pump_motor", (0.25, 0.70, 1.43), 0.13, 0.30, hoyer_blue, tank_group, axis="Z", vertices=24)
torus("tank.return_elbow", (0.25, 0.52, 1.30), 0.16, 0.035, stainless_light, tank_group, rotation=(math.pi / 2, 0.0, 0.0))

# Blue Siemens-style HMI and button bank on a stainless pedestal.
rounded_box("control.pedestal", (1.49, -2.42, 1.23), (0.28, 0.64, 0.94), stainless, control_group, bevel=0.020, segments=3)
rounded_box("control.blue_surround", (1.636, -2.42, 1.38), (0.012, 0.46, 0.38), hoyer_blue, control_group, bevel=0.012)
rounded_box("control.screen", (1.644, -2.42, 1.45), (0.012, 0.31, 0.19), screen_blue, control_group, bevel=0.006)
for row in range(2):
    for column in range(4):
        y = -2.56 + column * 0.095
        z = 1.22 - row * 0.10
        button_mat = (signal_green, signal_amber, hoyer_blue, signal_red)[column]
        cylinder(f"control.button.{row + 1}.{column + 1}", (1.648, y, z), 0.024, 0.022, button_mat, control_group, axis="X", vertices=14, bevel=0.001)
cylinder("control.emergency_stop", (1.648, -2.42, 1.04), 0.048, 0.028, signal_red, control_group, axis="X", vertices=18)
text_on_outfeed_face("control.model", "DINO N2", (1.650, -2.42, 1.65), 0.050, white, control_group)

# Warning plates, status lights and wire guards record the installed guard
# volumes without claiming certified safety clearances.
for y in (-2.72, 2.72):
    rounded_box(f"guard.warning_plate.{y:+.2f}", (0.560, y, 1.60), (0.014, 0.22, 0.22), warning_yellow, guard_group, bevel=0.008)
    text_on_outfeed_face(f"guard.warning_mark.{y:+.2f}", "!", (0.569, y, 1.60), 0.13, stainless_dark, guard_group)
guard_panel_y("guard.infeed.left", -1.60, -1.54, 1.55, 2.75, 0.78, stainless_dark, stainless, guard_group)
guard_panel_y("guard.infeed.right", -1.60, 1.54, 1.55, 2.75, 0.78, stainless_dark, stainless, guard_group)

cylinder("control.stack_pole", (0.04, -3.05, 2.22), 0.018, 0.30, stainless_dark, control_group, vertices=12)
for index, (z, mat) in enumerate(((2.40, signal_red), (2.33, signal_amber), (2.26, signal_green)), 1):
    cylinder(f"control.stack_light.{index}", (0.04, -3.05, z), 0.038, 0.060, mat, control_group, vertices=18)

# Visible drive housing, pneumatic manifold, gauges and colored air hoses.
rounded_box("utilities.chain_drive_housing", (0.92, 2.96, 1.12), (0.66, 0.30, 0.64), stainless, utility_group, bevel=0.035, segments=3)
cylinder("utilities.chain_motor", (0.92, 2.82, 0.92), 0.17, 0.36, hoyer_blue, utility_group, axis="Y", vertices=24)
rounded_box("utilities.pneumatic_manifold", (-0.18, 2.96, 1.02), (1.20, 0.22, 0.22), stainless, utility_group, bevel=0.010)
for index, x in enumerate((-0.60, -0.32, -0.04, 0.24), 1):
    cylinder(f"utilities.gauge.{index}", (x, 3.085, 1.07), 0.052, 0.024, stainless_light, utility_group, axis="Y", vertices=18)
    cylinder(f"utilities.valve.{index}", (x, 3.08, 0.97), 0.023, 0.050, hoyer_blue, utility_group, axis="Y", vertices=14)


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


studio_floor = material("studio_floor", (0.53, 0.56, 0.56), roughness=0.76)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (5.4, 8.2, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.77, 0.79, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (6.0, -5.0, 6.2), 1500, 4.5),
    ("studio.fill", (3.0, 5.8, 4.4), 820, 4.0),
    ("studio.rim", (-4.0, -2.0, 5.0), 1050, 3.8),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.25))

render_preview("front", (8.6, 0.0, 2.80), (0.0, 0.0, 1.20), 7.35)
render_preview("side", (0.0, -8.8, 2.35), (0.0, 0.0, 1.18), 4.30)
render_preview("three-quarter", (7.7, -8.7, 5.60), (0.0, 0.0, 1.12), 7.10)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
