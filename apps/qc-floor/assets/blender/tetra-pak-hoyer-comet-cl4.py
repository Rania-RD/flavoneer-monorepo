#!/usr/bin/env python3
"""Build the reference-led Tetra Pak Hoyer Comet CL4 QC-floor asset.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/tetra-pak-hoyer-comet-cl4.py

The model follows the 2002 CL603B operation manual's published envelope and
visible station layout. It is an exterior QC-floor visualization, not a
fabrication, guarding, installation, maintenance, or food-process model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "tetra-pak-hoyer-comet-cl4"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "tetra-pak-hoyer-comet-cl4.blend"
GLB_PATH = MODEL_DIR / "tetra-pak-hoyer-comet-cl4.glb"
STL_PATH = MODEL_DIR / "tetra-pak-hoyer-comet-cl4.stl"

# Published in section 3.3 of the CL603B operation manual.
ENVELOPE = (5.650, 1.550, 2.200)  # Blender X length, Y width, Z height, metres.
LANE_Y = (-0.405, -0.135, 0.135, 0.405)


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


def cylinder(name, location, radius, depth, mat, parent, axis="Z", vertices=20, bevel=0.0015):
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


def cone(name, location, radius1, radius2, depth, mat, parent, axis="Z", vertices=20):
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
        major_segments=16,
        minor_segments=6,
        location=location,
        rotation=rotation,
    )
    return finish_object(bpy.context.object, name, mat, parent, smooth=True)


def pipe(name, points, radius, mat, parent, bevel_resolution=1):
    curve = bpy.data.curves.new(f"curve.{name}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
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


def rectangular_frustum(name, location, lower, upper, height, mat, parent):
    lx, ly = lower
    ux, uy = upper
    z0 = -height / 2
    z1 = height / 2
    vertices = [
        (-lx / 2, -ly / 2, z0), (lx / 2, -ly / 2, z0),
        (lx / 2, ly / 2, z0), (-lx / 2, ly / 2, z0),
        (-ux / 2, -uy / 2, z1), (ux / 2, -uy / 2, z1),
        (ux / 2, uy / 2, z1), (-ux / 2, uy / 2, z1),
    ]
    faces = [
        (0, 3, 2, 1), (4, 5, 6, 7),
        (0, 1, 5, 4), (1, 2, 6, 5),
        (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new(f"mesh.{name}")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def text_facing_operator(name, body, location, size, mat, parent, align="CENTER"):
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


def leveling_foot(name, x, y, parent, steel_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.095), 0.024, 0.15, steel_mat, parent, vertices=14)
    cone(f"{name}.bell", (x, y, 0.046), 0.060, 0.030, 0.06, steel_mat, parent, vertices=18)
    cylinder(f"{name}.pad", (x, y, 0.009), 0.064, 0.018, rubber_mat, parent, vertices=20, bevel=0.001)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.46, 0.50, 0.51), metallic=0.82, roughness=0.26)
stainless_light = material("stainless_light", (0.73, 0.76, 0.76), metallic=0.76, roughness=0.22)
stainless_dark = material("stainless_dark", (0.17, 0.20, 0.21), metallic=0.70, roughness=0.35)
white_plastic = material("white_plastic", (0.90, 0.91, 0.88), roughness=0.38)
rubber = material("rubber", (0.025, 0.030, 0.032), roughness=0.72)
control_blue = material("control_blue", (0.015, 0.30, 0.55), metallic=0.08, roughness=0.30)
signal_red = material("signal_red", (0.74, 0.025, 0.018), roughness=0.30)
signal_green = material("signal_green", (0.02, 0.47, 0.18), roughness=0.32)
signal_amber = material("signal_amber", (0.95, 0.42, 0.025), roughness=0.30)
chocolate = material("chocolate", (0.19, 0.055, 0.022), roughness=0.42)

root = empty("machine.hoyer-comet-cl4")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "high for published overall envelope; medium for station proportions"
root["referenceModel"] = "Tetra Laval Food Hoyer CL 4, manual CL603B, 2002"
root["laneCount"] = 4

frame_group = empty("structure.frame", root)
conveyor_group = empty("inspection.four_lane_conveyor", root, selectable=True)
infeed_group = empty("inspection.cup_cone_dispenser", root, selectable=True)
sprayer_group = empty("inspection.chocolate_sprayer", root, selectable=True)
filler_group = empty("inspection.filling_station", root, selectable=True)
topping_group = empty("inspection.topping_station", root, selectable=True)
dry_group = empty("inspection.dry_ingredient_station", root, selectable=True)
lid_group = empty("inspection.lid_station", root, selectable=True)
ejection_group = empty("inspection.ejection_station", root, selectable=True)
control_group = empty("inspection.control_panel", root, selectable=True)
utility_group = empty("utilities.drive_and_pneumatics", root)

# Full-width lower casing establishes the published 1.55 m bound. The long
# machine bed establishes the 5.65 m bound without invisible scale markers.
rounded_box("frame.lower_bed", (0.0, 0.0, 0.28), (5.650, 1.550, 0.22), stainless, frame_group, bevel=0.018)
rounded_box("frame.operator_skirt", (0.0, -0.704, 0.52), (5.20, 0.10, 0.38), stainless_light, frame_group, bevel=0.010)
rounded_box("frame.far_skirt", (0.0, 0.704, 0.52), (5.20, 0.10, 0.38), stainless_light, frame_group, bevel=0.010)

for index, x in enumerate((-2.45, -1.45, -0.45, 0.55, 1.55, 2.45), 1):
    for side, y in (("operator", -0.60), ("far", 0.60)):
        rounded_box(f"frame.post.{side}.{index:02d}", (x, y, 0.54), (0.07, 0.07, 0.62), stainless_dark, frame_group, bevel=0.004)
    leveling_foot(f"frame.foot.operator.{index:02d}", x, -0.60, frame_group, stainless_light, rubber)
    leveling_foot(f"frame.foot.far.{index:02d}", x, 0.60, frame_group, stainless_light, rubber)

rounded_box("frame.lower_rail.operator", (0.0, -0.60, 0.38), (5.20, 0.065, 0.065), stainless_dark, frame_group, bevel=0.004)
rounded_box("frame.lower_rail.far", (0.0, 0.60, 0.38), (5.20, 0.065, 0.065), stainless_dark, frame_group, bevel=0.004)
for index, x in enumerate((-1.95, -0.95, 0.05, 1.05, 2.00), 1):
    beam_between(f"frame.brace.operator.{index:02d}", (x - 0.40, -0.605, 0.34), (x + 0.40, -0.605, 0.69), 0.035, stainless_dark, frame_group)
    beam_between(f"frame.brace.far.{index:02d}", (x - 0.40, 0.605, 0.69), (x + 0.40, 0.605, 0.34), 0.035, stainless_dark, frame_group)

# Four-lane lamella conveyor. Repeated carrier plates and cup seats are the
# strongest recognition feature in the manual's installed photographs.
rounded_box("conveyor.left_rail", (0.0, -0.585, 0.84), (5.30, 0.075, 0.18), stainless_dark, conveyor_group, bevel=0.006)
rounded_box("conveyor.right_rail", (0.0, 0.585, 0.84), (5.30, 0.075, 0.18), stainless_dark, conveyor_group, bevel=0.006)
for tray_index in range(22):
    x = -2.50 + tray_index * (5.00 / 21)
    rounded_box(f"conveyor.lamella.{tray_index + 1:02d}", (x, 0.0, 0.865), (0.205, 1.04, 0.050), stainless_light, conveyor_group, bevel=0.004)
    for lane, y in enumerate(LANE_Y, 1):
        torus(f"conveyor.seat.{tray_index + 1:02d}.{lane}", (x, y, 0.902), 0.086, 0.012, white_plastic, conveyor_group)

# End sprockets and the chain/indexing drive visible behind removable covers.
for y in (-0.54, 0.54):
    cylinder("conveyor.infeed_sprocket" + (".operator" if y < 0 else ".far"), (-2.58, y, 0.84), 0.135, 0.055, stainless_dark, conveyor_group, axis="Y", vertices=20)
    cylinder("conveyor.outfeed_sprocket" + (".operator" if y < 0 else ".far"), (2.58, y, 0.84), 0.135, 0.055, stainless_dark, conveyor_group, axis="Y", vertices=20)
rounded_box("drive.indexing_cover", (2.28, -0.64, 0.55), (0.62, 0.17, 0.48), stainless, utility_group, bevel=0.025, segments=3)
cylinder("drive.large_pulley", (2.30, -0.735, 0.58), 0.145, 0.035, stainless_dark, utility_group, axis="Y", vertices=24)
cylinder("drive.small_pulley", (2.52, -0.735, 0.43), 0.082, 0.035, stainless_dark, utility_group, axis="Y", vertices=20)
beam_between("drive.belt", (2.30, -0.758, 0.58), (2.52, -0.758, 0.43), 0.024, rubber, utility_group)

# Common station support spine and four vertical portals.
rounded_box("frame.station_beam.operator", (0.0, -0.56, 1.18), (5.10, 0.075, 0.11), stainless, frame_group, bevel=0.006)
rounded_box("frame.station_beam.far", (0.0, 0.56, 1.18), (5.10, 0.075, 0.11), stainless, frame_group, bevel=0.006)
for index, x in enumerate((-2.30, -1.55, -0.75, 0.10, 0.90, 1.70, 2.35), 1):
    rounded_box(f"frame.upper_post.operator.{index:02d}", (x, -0.56, 1.38), (0.065, 0.065, 0.44), stainless_dark, frame_group, bevel=0.004)
    rounded_box(f"frame.upper_post.far.{index:02d}", (x, 0.56, 1.38), (0.065, 0.065, 0.44), stainless_dark, frame_group, bevel=0.004)

# Cup/cone infeed. Four tall magazine cages reach the exact 2.20 m envelope.
rounded_box("infeed.magazine_bridge", (-2.34, 0.0, 1.50), (0.44, 1.10, 0.12), stainless, infeed_group, bevel=0.008)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"infeed.magazine.tube.{lane}", (-2.34, y, 1.825), 0.050, 0.750, stainless_light, infeed_group, vertices=16)
    torus(f"infeed.magazine.top_ring.{lane}", (-2.34, y, 2.175), 0.066, 0.010, stainless_dark, infeed_group)
    cylinder(f"infeed.jaw_cylinder.{lane}", (-2.20, y, 1.28), 0.038, 0.22, stainless_dark, infeed_group, axis="X", vertices=14)
    cone(f"infeed.suction_cup.{lane}", (-2.20, y, 1.02), 0.040, 0.018, 0.055, rubber, infeed_group, vertices=16)

# Cone sizing and chocolate spray. The manual shows a hose-heavy four-head
# bank supplied by a side tank and pump.
rounded_box("sprayer.crosshead", (-1.55, 0.0, 1.48), (0.42, 1.08, 0.13), stainless, sprayer_group, bevel=0.008)
cylinder("sprayer.actuator", (-1.55, 0.0, 1.72), 0.070, 0.36, stainless_dark, sprayer_group, vertices=18)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"sprayer.head.{lane}", (-1.55, y, 1.23), 0.045, 0.28, stainless_light, sprayer_group, vertices=16)
    cone(f"sprayer.nozzle.{lane}", (-1.55, y, 1.05), 0.035, 0.012, 0.08, stainless_dark, sprayer_group, vertices=16)
    pipe(f"sprayer.hose.{lane}", [(-1.86, -0.52, 1.52), (-1.75, y, 1.62), (-1.55, y, 1.38)], 0.012, rubber, sprayer_group)
cylinder("sprayer.chocolate_tank", (-1.82, -0.52, 1.12), 0.22, 0.50, stainless_light, sprayer_group, vertices=24)
cylinder("sprayer.tank_lid", (-1.82, -0.52, 1.385), 0.235, 0.05, stainless, sprayer_group, vertices=24)
cylinder("sprayer.pump", (-1.82, -0.52, 0.82), 0.095, 0.22, stainless_dark, sprayer_group, axis="X", vertices=18)

# Dual-flavour filler: four black timer bodies, sanitary nozzles and a single
# pneumatic lift cylinder on a mobile crosshead.
rounded_box("filler.mobile_crosshead", (-0.72, 0.0, 1.52), (0.52, 1.10, 0.15), stainless, filler_group, bevel=0.010)
cylinder("filler.central_actuator", (-0.72, 0.0, 1.78), 0.075, 0.48, stainless_dark, filler_group, vertices=18)
cylinder("filler.actuator_cap", (-0.72, 0.0, 2.025), 0.092, 0.03, stainless_light, filler_group, vertices=18)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"filler.body.{lane}", (-0.72, y, 1.31), 0.092, 0.28, rubber, filler_group, vertices=20)
    cylinder(f"filler.band.{lane}", (-0.72, y, 1.32), 0.102, 0.055, stainless_light, filler_group, vertices=20)
    cone(f"filler.nozzle.{lane}", (-0.72, y, 1.08), 0.045, 0.014, 0.18, stainless_light, filler_group, vertices=18)
    pipe(f"filler.product_pipe.a.{lane}", [(-1.05, -0.58, 1.92), (-0.95, y, 1.92), (-0.72, y, 1.47)], 0.022, stainless_light, filler_group)
    pipe(f"filler.product_pipe.b.{lane}", [(-0.40, 0.58, 1.86), (-0.50, y, 1.78), (-0.72, y, 1.47)], 0.018, stainless_light, filler_group)

# Chocolate topping tank and four dispensing nozzles.
cylinder("topping.tank", (0.12, -0.49, 1.47), 0.20, 0.48, stainless_light, topping_group, vertices=24)
cylinder("topping.tank_lid", (0.12, -0.49, 1.725), 0.215, 0.035, stainless, topping_group, vertices=24)
cylinder("topping.actuator", (0.12, -0.49, 1.90), 0.055, 0.30, stainless_dark, topping_group, vertices=16)
rounded_box("topping.dosing_plate", (0.12, 0.02, 1.28), (0.32, 1.02, 0.10), stainless, topping_group, bevel=0.008)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"topping.nozzle.{lane}", (0.12, y, 1.12), 0.028, 0.24, stainless_light, topping_group, vertices=14)
pipe("topping.supply", [(0.12, -0.49, 1.58), (0.12, -0.30, 1.52), (0.12, 0.0, 1.31)], 0.018, chocolate, topping_group)

# Dry ingredient hopper, shaker and lane chutes.
rectangular_frustum("dry.hopper", (0.82, 0.02, 1.74), (0.26, 0.68), (0.52, 0.92), 0.55, stainless_light, dry_group)
rounded_box("dry.hopper.rim", (0.82, 0.02, 2.025), (0.56, 0.96, 0.035), stainless, dry_group, bevel=0.006)
rounded_box("dry.shaker", (0.82, 0.02, 1.42), (0.34, 0.84, 0.13), stainless_dark, dry_group, bevel=0.008)
for lane, y in enumerate(LANE_Y, 1):
    rectangular_frustum(f"dry.chute.{lane}", (0.82, y, 1.20), (0.055, 0.055), (0.12, 0.12), 0.32, stainless_light, dry_group)

# Four lid magazines and the downstream four-head pressing bridge.
rounded_box("lid.magazine_bridge", (1.52, 0.0, 1.49), (0.44, 1.10, 0.12), stainless, lid_group, bevel=0.008)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"lid.magazine.tube.{lane}", (1.52, y, 1.82), 0.057, 0.70, stainless_light, lid_group, vertices=16)
    torus(f"lid.magazine.top_ring.{lane}", (1.52, y, 2.145), 0.072, 0.010, stainless_dark, lid_group)
    cylinder(f"lid.rotating_piston.{lane}", (1.68, y, 1.27), 0.040, 0.24, stainless_dark, lid_group, axis="X", vertices=14)
    cone(f"lid.suction_cup.{lane}", (1.68, y, 1.07), 0.042, 0.018, 0.055, rubber, lid_group, vertices=16)

rounded_box("lid.press_bridge", (2.15, 0.0, 1.49), (0.40, 1.10, 0.14), stainless, lid_group, bevel=0.008)
cylinder("lid.press_actuator", (2.15, 0.0, 1.77), 0.065, 0.44, stainless_dark, lid_group, vertices=18)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"lid.press_plunger.{lane}", (2.15, y, 1.20), 0.040, 0.34, stainless_light, lid_group, vertices=14)
    cylinder(f"lid.press_pad.{lane}", (2.15, y, 1.02), 0.082, 0.040, white_plastic, lid_group, vertices=18)

# Ejection plungers, puller rail and downward discharge chute.
rounded_box("ejection.puller_beam", (2.54, 0.0, 1.29), (0.44, 1.12, 0.12), stainless, ejection_group, bevel=0.008)
cylinder("ejection.side_actuator", (2.55, -0.58, 1.42), 0.055, 0.38, stainless_dark, ejection_group, axis="Z", vertices=16)
for lane, y in enumerate(LANE_Y, 1):
    cylinder(f"ejection.plunger.{lane}", (2.50, y, 1.05), 0.035, 0.24, stainless_light, ejection_group, vertices=14)
    rounded_box(f"ejection.puller.{lane}", (2.58, y, 1.22), (0.30, 0.055, 0.055), stainless_dark, ejection_group, bevel=0.004)
rectangular_frustum("ejection.chute", (2.59, 0.0, 0.76), (0.30, 1.02), (0.46, 1.08), 0.28, stainless_light, ejection_group)

# Operator control panel based on the manual's PRG display and four rows of
# selector switches. It is angled only slightly for floor-view legibility.
rounded_box("control.cabinet", (-1.05, -0.685, 1.45), (1.05, 0.17, 0.63), stainless, control_group, bevel=0.018, segments=3)
rounded_box("control.programmer", (-1.34, -0.765, 1.53), (0.28, 0.018, 0.15), control_blue, control_group, bevel=0.004)
for row in range(4):
    for column in range(7):
        x = -0.96 + column * 0.105
        z = 1.65 - row * 0.115
        button_mat = (signal_green, signal_amber, signal_red)[(row + column) % 3]
        cylinder(f"control.selector.{row + 1}.{column + 1}", (x, -0.763, z), 0.023, 0.022, button_mat, control_group, axis="Y", vertices=14, bevel=0.001)
cylinder("control.emergency_stop", (-0.58, -0.756, 1.25), 0.055, 0.035, signal_red, control_group, axis="Y", vertices=18, bevel=0.002)
text_facing_operator("control.brand", "TETRA LAVAL FOOD", (-1.10, -0.771, 1.84), 0.072, stainless_dark, control_group)
text_facing_operator("control.model", "HOYER  CL 4", (-1.10, -0.771, 1.75), 0.060, control_blue, control_group)

# Pneumatic manifold, gauges and hoses on the far side. The rail sets the far
# edge cleanly while the full-width lower casing remains the formal bound.
rounded_box("utilities.pneumatic_manifold", (0.25, 0.67, 1.32), (1.15, 0.12, 0.18), stainless, utility_group, bevel=0.008)
for index, x in enumerate((-0.18, 0.08, 0.34, 0.60), 1):
    cylinder(f"utilities.pressure_gauge.{index}", (x, 0.742, 1.37), 0.055, 0.022, white_plastic, utility_group, axis="Y", vertices=20)
    cylinder(f"utilities.valve.{index}", (x, 0.735, 1.27), 0.025, 0.060, control_blue, utility_group, axis="Y", vertices=14)
    pipe(f"utilities.air_hose.{index}", [(x, 0.70, 1.25), (x - 0.10, 0.48, 1.45), (x - 0.22, LANE_Y[index - 1], 1.55)], 0.009, control_blue, utility_group)

# A few visible containers make lane count and product flow obvious without
# turning the runtime model into a product catalogue.
for tray_index, x in enumerate((-1.10, -0.32, 0.48, 1.20, 1.92), 1):
    for lane, y in enumerate(LANE_Y, 1):
        cone(f"conveyor.product.{tray_index}.{lane}", (x, y, 1.01), 0.068, 0.050, 0.18, white_plastic, conveyor_group, vertices=18)


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


# Neutral studio used only for review renders.
studio_floor = material("studio_floor", (0.55, 0.58, 0.57), roughness=0.74)
rounded_box("studio.floor", (0.0, 0.0, -0.045), (7.4, 4.8, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.77, 0.79, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (2.7, -4.2, 5.4), 1250, 3.8),
    ("studio.fill", (-3.2, -2.0, 3.2), 680, 3.0),
    ("studio.rim", (1.2, 3.8, 4.3), 950, 3.4),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.1))

render_preview("front", (0.0, -8.0, 1.65), (0.0, 0.0, 1.12), 6.25)
render_preview("side", (7.0, 0.0, 1.60), (0.0, 0.0, 1.10), 3.10)
render_preview("three-quarter", (6.2, -6.2, 3.9), (0.0, 0.0, 1.10), 5.90)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
