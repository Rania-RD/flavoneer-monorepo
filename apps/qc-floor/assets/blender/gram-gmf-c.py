#!/usr/bin/env python3
"""Build the reference-led Gram GMF-C asset for the AI QC floor.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python apps/qc-floor/assets/blender/gram-gmf-c.py

This is an approximate exterior visualization. It is not an engineering,
installation, guarding, process-piping, or service model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "gram-gmf-c"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "gram-gmf-c.blend"
GLB_PATH = MODEL_DIR / "gram-gmf-c.glb"
STL_PATH = MODEL_DIR / "gram-gmf-c.stl"

# Image-derived installed envelope. The main frame is about 2.25 m high; the
# utility stack establishes the 3.30 m maximum height.
ENVELOPE = (6.20, 1.60, 3.30)  # Blender X length, Y width, Z height in meters.


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.materials if hasattr(bpy, "materials") else bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name, color, metallic=0.0, roughness=0.45, transmission=0.0, alpha=1.0):
    result = bpy.data.materials.new(f"material.{name}")
    rgba = (color[0], color[1], color[2], alpha)
    result.diffuse_color = rgba
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Alpha"].default_value = alpha
    if "Transmission Weight" in principled.inputs:
        principled.inputs["Transmission Weight"].default_value = transmission
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


def rounded_box(name, location, dimensions, mat, parent, bevel=0.012, segments=2):
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


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=24):
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
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, bevel_resolution=2):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 4
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


def text_facing_front(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.001
    curve.bevel_depth = 0.0003
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    # Text local normal +Z faces the operator side (-Y).
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


def leveling_foot(name, x, y, parent, stainless_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.105), 0.028, 0.17, stainless_mat, parent, vertices=16)
    cone(f"{name}.bell", (x, y, 0.055), 0.070, 0.035, 0.07, stainless_mat, parent, vertices=20)
    cylinder(f"{name}.pad", (x, y, 0.010), 0.075, 0.020, rubber_mat, parent, vertices=24, bevel=0.001)


def frame_post(name, x, y, parent, mat):
    rounded_box(name, (x, y, 1.22), (0.13, 0.13, 2.03), mat, parent, bevel=0.009)
    rounded_box(f"{name}.gusset", (x, y - 0.005, 0.39), (0.32, 0.12, 0.20), mat, parent, bevel=0.006)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.50, 0.54, 0.55), metallic=0.82, roughness=0.27)
stainless_light = material("stainless_light", (0.72, 0.75, 0.75), metallic=0.78, roughness=0.22)
stainless_dark = material("stainless_dark", (0.20, 0.24, 0.25), metallic=0.72, roughness=0.34)
screen = material("screen", (0.018, 0.055, 0.07), metallic=0.05, roughness=0.20)
control_blue = material("control_blue", (0.00, 0.38, 0.66), metallic=0.15, roughness=0.30)
pneumatic_blue = material("pneumatic_blue", (0.00, 0.58, 0.84), metallic=0.05, roughness=0.25)
safety_red = material("safety_red", (0.72, 0.025, 0.018), metallic=0.02, roughness=0.32)
white_plastic = material("white_plastic", (0.90, 0.92, 0.90), metallic=0.0, roughness=0.38)
rubber = material("rubber", (0.025, 0.030, 0.030), metallic=0.0, roughness=0.70)
polycarbonate = material("polycarbonate", (0.40, 0.72, 0.82), metallic=0.0, roughness=0.18, transmission=0.35, alpha=0.24)

root = empty("machine.gmf-c")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "low-medium; image-derived estimate"
root["referenceModel"] = "Gram Equipment GMF-C current configured render"

frame_group = empty("structure.frame", root)
conveyor_group = empty("inspection.slat_conveyor", root, selectable=True)
magazine_group = empty("inspection.container_magazine", root, selectable=True)
filler_group = empty("inspection.filling_station", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
topping_group = empty("inspection.topping_station", root, selectable=True)
closing_group = empty("inspection.closing_station", root, selectable=True)
wash_group = empty("inspection.wash_unit", root, selectable=True)
utilities_group = empty("utilities.connections", root)
safety_group = empty("safety.guarding", root)

# Floor skid, drain pans, lower access panels, and the two end-drive housings.
rounded_box("frame.lower_skid", (0.0, 0.0, 0.28), (5.78, 1.28, 0.20), stainless, frame_group, bevel=0.018)
rounded_box("frame.center_drain_pan", (0.20, 0.0, 0.49), (4.50, 1.18, 0.10), stainless_light, wash_group, bevel=0.015)
rounded_box("frame.infeed_drive_cover", (-2.88, 0.0, 0.57), (0.44, 1.34, 0.68), stainless, frame_group, bevel=0.045, segments=3)
rounded_box("frame.outfeed_drive_cover", (2.88, 0.0, 0.57), (0.44, 1.34, 0.68), stainless, frame_group, bevel=0.045, segments=3)
rounded_box("frame.infeed_extension", (-3.00, 0.0, 0.80), (0.20, 1.20, 0.16), stainless_light, conveyor_group, bevel=0.012)
rounded_box("frame.outfeed_extension", (3.00, 0.0, 0.80), (0.20, 1.20, 0.16), stainless_light, conveyor_group, bevel=0.012)

# Vent slots and access seams make the solid lower housings read like the reference.
for side, y in (("operator", -0.681), ("far", 0.681)):
    for end, base_x in (("infeed", -2.88), ("outfeed", 2.88)):
        for index in range(5):
            rounded_box(
                f"frame.{end}.{side}.vent.{index + 1:02d}",
                (base_x - 0.12 + index * 0.06, y, 0.49),
                (0.035, 0.008, 0.12),
                stainless_dark,
                frame_group,
                bevel=0.006,
            )
        rounded_box(
            f"frame.{end}.{side}.service_seam",
            (base_x, y, 0.69),
            (0.31, 0.007, 0.008),
            stainless_dark,
            frame_group,
            bevel=0.0,
        )

# Eight leveling feet follow the long skid and establish floor contact.
for index, x in enumerate((-2.72, -1.70, -0.62, 0.62, 1.70, 2.72), 1):
    for suffix, y in (("a", -0.55), ("b", 0.55)):
        if index in (2, 5) and suffix == "b":
            continue
        leveling_foot(f"frame.foot.{index:02d}{suffix}", x, y, frame_group, stainless_dark, rubber)

# Primary posts and overhead integrated electrical cabinet/side rails.
post_xs = (-2.56, -0.78, 1.30, 2.67)
for index, x in enumerate(post_xs, 1):
    for side, y in (("operator", -0.64), ("far", 0.64)):
        frame_post(f"frame.post.{index:02d}.{side}", x, y, frame_group, stainless_light)

rounded_box("frame.top_electrical_cabinet", (0.02, 0.0, 2.04), (5.30, 1.26, 0.36), stainless, frame_group, bevel=0.025, segments=3)
rounded_box("frame.operator_station_rail", (0.02, -0.735, 1.79), (5.30, 0.095, 0.13), stainless_light, frame_group, bevel=0.008)
rounded_box("frame.far_station_rail", (0.02, 0.735, 1.79), (5.30, 0.095, 0.13), stainless_light, frame_group, bevel=0.008)
rounded_box("frame.operator_lower_rail", (0.02, -0.755, 1.63), (5.30, 0.090, 0.075), stainless, frame_group, bevel=0.005)
rounded_box("frame.far_lower_rail", (0.02, 0.755, 1.63), (5.30, 0.090, 0.075), stainless, frame_group, bevel=0.005)

# Triangular-looking braces are simplified as diagonal round struts.
for index, x in enumerate((-2.30, -0.48, 1.58, 2.38), 1):
    for side, y in (("operator", -0.67), ("far", 0.67)):
        pipe(
            f"frame.brace.{index:02d}.{side}",
            [(x - 0.18, y, 1.57), (x, y, 1.79), (x + 0.16, y, 1.58)],
            0.024,
            stainless_dark,
            frame_group,
            bevel_resolution=1,
        )

# A few transparent upper access panels retain the open two-side-access look.
for index, (x, width) in enumerate(((-1.67, 1.40), (0.25, 1.70), (2.00, 1.08)), 1):
    rounded_box(
        f"guard.far_panel.{index:02d}",
        (x, 0.692, 1.30),
        (width, 0.018, 0.58),
        polycarbonate,
        safety_group,
        bevel=0.008,
    )

# Slatted conveyor. Individual slats and guide rails are visible at floor-view distance.
rounded_box("conveyor.left_guide", (0.0, -0.53, 0.82), (5.70, 0.075, 0.17), stainless_dark, conveyor_group, bevel=0.009)
rounded_box("conveyor.right_guide", (0.0, 0.53, 0.82), (5.70, 0.075, 0.17), stainless_dark, conveyor_group, bevel=0.009)
for index in range(52):
    x = -2.72 + index * (5.44 / 51)
    rounded_box(
        f"conveyor.slat.{index + 1:02d}",
        (x, 0.0, 0.85),
        (0.082, 0.94, 0.075),
        stainless_light,
        conveyor_group,
        bevel=0.006,
        segments=1,
    )

# Visible cups in the configured render, arranged eight wide through the process bays.
lane_ys = tuple(-0.39 + lane * (0.78 / 7) for lane in range(8))
for column, x in enumerate((0.10, 0.48, 0.86, 1.24, 1.62, 2.00, 2.38), 1):
    for lane, y in enumerate(lane_ys, 1):
        cone(
            f"conveyor.cup.{column:02d}.{lane:02d}",
            (x, y, 0.94),
            0.040,
            0.051,
            0.13,
            white_plastic,
            conveyor_group,
            vertices=12,
        )

# Side-loaded container magazine with eight tall guide lanes and a feed bridge.
rounded_box("magazine.lower_bridge", (-2.20, 0.0, 1.02), (0.42, 1.12, 0.13), stainless_light, magazine_group, bevel=0.010)
rounded_box("magazine.upper_bridge", (-2.20, 0.0, 1.76), (0.22, 1.10, 0.10), stainless_light, magazine_group, bevel=0.008)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"magazine.guide.{lane:02d}.left", (-2.24, y - 0.027, 1.43), 0.015, 0.72, stainless_light, magazine_group, vertices=12)
    cylinder(f"magazine.guide.{lane:02d}.right", (-2.24, y + 0.027, 1.43), 0.015, 0.72, stainless_light, magazine_group, vertices=12)
    cylinder(f"magazine.plunger.{lane:02d}", (-2.24, y, 1.10), 0.025, 0.18, pneumatic_blue, magazine_group, vertices=14)

# First eight-wide filler bank with the blue product cylinders visible in the render.
rounded_box("filler.primary_manifold", (-1.34, 0.0, 1.56), (0.52, 1.04, 0.14), stainless, filler_group, bevel=0.012)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"filler.servo.{lane:02d}.body", (-1.34, y, 1.36), 0.043, 0.36, stainless_light, filler_group, vertices=16)
    cylinder(f"filler.servo.{lane:02d}.blue_tube", (-1.34, y, 1.34), 0.025, 0.27, pneumatic_blue, filler_group, vertices=14)
    cylinder(f"filler.servo.{lane:02d}.rod", (-1.34, y, 1.08), 0.012, 0.25, stainless_dark, filler_group, vertices=12)
    cone(f"filler.nozzle.{lane:02d}", (-1.34, y, 0.99), 0.025, 0.009, 0.09, stainless_light, filler_group, vertices=14)

for line_index, y in enumerate((-0.36, -0.12, 0.12, 0.36), 1):
    pipe(
        f"filler.product_hose.{line_index:02d}",
        [(-1.55, y, 1.64), (-1.55, y, 1.92), (-1.18, y, 2.06)],
        0.022,
        pneumatic_blue,
        filler_group,
        bevel_resolution=2,
    )

# Central multi-head decoration/filling station.
rounded_box("filler.central_lift_beam", (0.18, 0.0, 1.61), (0.70, 1.02, 0.14), stainless_light, filler_group, bevel=0.012)
for index, y in enumerate((-0.26, 0.26), 1):
    cylinder(f"filler.central_servo.{index:02d}", (0.18, y, 1.39), 0.070, 0.38, stainless_light, filler_group, vertices=18)
    cylinder(f"filler.central_rod.{index:02d}", (0.18, y, 1.10), 0.020, 0.27, stainless_dark, filler_group, vertices=14)
    cone(f"filler.central_distributor.{index:02d}", (0.18, y, 1.22), 0.14, 0.055, 0.16, stainless_light, filler_group, vertices=18)
    for branch in (-0.075, 0.0, 0.075):
        pipe(
            f"filler.central_head.{index:02d}.{branch:+.3f}",
            [(0.18, y + branch * 1.8, 1.18), (0.18, y + branch, 1.04), (0.18, y + branch, 0.98)],
            0.013,
            stainless_light,
            filler_group,
            bevel_resolution=1,
        )

# Operator panel mounted at the near-side center-left, facing -Y.
rounded_box("controls.panel_body", (-0.56, -0.720, 1.18), (0.68, 0.10, 0.72), stainless_light, control_group, bevel=0.025, segments=3)
rounded_box("controls.hmi_bezel", (-0.56, -0.773, 1.30), (0.42, 0.022, 0.31), white_plastic, control_group, bevel=0.020, segments=3)
rounded_box("controls.hmi_screen", (-0.56, -0.788, 1.30), (0.34, 0.012, 0.235), screen, control_group, bevel=0.012, segments=2)
for index, x in enumerate((-0.76, -0.66, -0.56, -0.46, -0.36), 1):
    cylinder(f"controls.push_button.{index:02d}", (x, -0.784, 1.02), 0.026, 0.026, stainless_dark, control_group, axis="Y", vertices=16)
cylinder("controls.emergency_stop_base", (-0.82, -0.776, 0.93), 0.043, 0.030, white_plastic, control_group, axis="Y", vertices=18)
cylinder("controls.emergency_stop", (-0.82, -0.780, 0.93), 0.034, 0.040, safety_red, control_group, axis="Y", vertices=18)
text_facing_front("controls.model_label", "GMF-C", (-0.43, -0.790, 0.93), 0.075, control_blue, control_group)

# Conical dry-topping hopper and small auger housing.
cylinder("topping.hopper.rim", (1.38, -0.10, 1.55), 0.28, 0.06, stainless_light, topping_group, vertices=28)
cone("topping.hopper.body", (1.38, -0.10, 1.34), 0.10, 0.26, 0.40, stainless_light, topping_group, vertices=28)
cylinder("topping.hopper.outlet", (1.38, -0.10, 1.08), 0.065, 0.16, stainless_dark, topping_group, vertices=18)
rounded_box("topping.auger_body", (1.63, -0.10, 1.08), (0.44, 0.18, 0.18), stainless_light, topping_group, bevel=0.025)
cylinder("topping.auger_motor", (1.87, -0.10, 1.08), 0.11, 0.18, control_blue, topping_group, axis="X", vertices=18)
for lane, y in enumerate(lane_ys, 1):
    pipe(
        f"topping.distribution.{lane:02d}",
        [(1.46, -0.10, 1.08), (1.52, y, 1.00), (1.52, y, 0.96)],
        0.009,
        stainless_dark,
        topping_group,
        bevel_resolution=1,
    )

# Downstream closing station and side-loaded lid guides.
rounded_box("closing.lift_beam", (2.12, 0.0, 1.56), (0.46, 1.04, 0.14), stainless, closing_group, bevel=0.012)
for lane, y in enumerate(lane_ys, 1):
    cylinder(f"closing.guide.{lane:02d}", (2.36, y, 1.36), 0.018, 0.60, stainless_light, closing_group, vertices=12)
    cylinder(f"closing.press.{lane:02d}", (2.12, y, 1.28), 0.040, 0.40, stainless_light, closing_group, vertices=14)
    cylinder(f"closing.press_pad.{lane:02d}", (2.12, y, 1.04), 0.055, 0.05, white_plastic, closing_group, vertices=16)

# Under-belt wash box, nozzles, drain pipe, and visible utility valves.
rounded_box("wash.enclosure", (0.48, 0.37, 0.58), (1.08, 0.34, 0.28), stainless, wash_group, bevel=0.018)
for index, x in enumerate((0.08, 0.34, 0.60, 0.86), 1):
    cone(f"wash.spray_nozzle.{index:02d}", (x, 0.35, 0.77), 0.030, 0.010, 0.08, stainless_light, wash_group, vertices=12)
pipe("wash.drain", [(0.80, 0.48, 0.53), (0.80, 0.62, 0.40), (0.96, 0.62, 0.30)], 0.025, stainless_dark, wash_group)
for index, x in enumerate((-0.10, 0.10, 0.30), 1):
    cylinder(f"utilities.valve.{index:02d}", (x, 0.66, 0.58), 0.045, 0.16, stainless_light, utilities_group, axis="Y", vertices=16)
    cylinder(f"utilities.valve.{index:02d}.handle", (x, 0.76, 0.58), 0.012, 0.15, control_blue, utilities_group, axis="X", vertices=12)

# Tall sanitary/utility stack from the current manufacturer view. The cap sets
# the 3.30 m envelope maximum and the side rails set the 1.60 m width.
cylinder("utilities.stack", (-0.34, 0.24, 2.77), 0.055, 1.02, stainless_light, utilities_group, vertices=22)
cylinder("utilities.stack.flange", (-0.34, 0.24, 2.28), 0.085, 0.045, stainless_dark, utilities_group, vertices=22)
cylinder("utilities.stack.cap", (-0.34, 0.24, 3.285), 0.095, 0.030, stainless_light, utilities_group, vertices=22)
cylinder("utilities.stack.cap_bar", (-0.34, 0.24, 3.286), 0.014, 0.22, stainless_dark, utilities_group, axis="X", vertices=12, bevel=0.001)

# Brand mark on the near-side infeed cover. This is modeled geometry, not a
# copied manufacturer texture.
text_facing_front("frame.brand_text", "GRAM", (-2.88, -0.688, 0.73), 0.12, stainless_dark, frame_group)
text_facing_front("frame.brand_subtext", "EQUIPMENT", (-2.88, -0.690, 0.61), 0.042, stainless_dark, frame_group)


def asset_objects():
    result = []
    stack = [root]
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(list(current.children))
    return result


# Save the editable source asset before adding any preview-only studio objects.
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


# Preview-only neutral studio.
studio_floor = material("studio_floor", (0.56, 0.59, 0.58), roughness=0.72)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (8.4, 5.6, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.77, 0.79, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

for name, location, energy, size in (
    ("studio.key", (2.5, -4.4, 6.2), 1350, 4.0),
    ("studio.fill", (-3.4, -2.2, 3.5), 760, 3.2),
    ("studio.rim", (1.5, 4.2, 4.8), 1050, 3.5),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.1))

render_preview("front", (0.0, -8.5, 1.75), (0.0, 0.0, 1.45), 7.00)
render_preview("side", (8.2, 0.0, 1.65), (0.0, 0.0, 1.42), 4.05)
render_preview("three-quarter", (6.8, -6.8, 4.3), (0.0, 0.0, 1.35), 6.70)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
