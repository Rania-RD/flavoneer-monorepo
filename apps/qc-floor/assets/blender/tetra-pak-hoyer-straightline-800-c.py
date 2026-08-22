#!/usr/bin/env python3
"""Build the reference-led Tetra Pak Hoyer Straightline 800 C QC-floor asset.

Run from the repository root with Blender 5.x:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --factory-startup --python \
    apps/qc-floor/assets/blender/tetra-pak-hoyer-straightline-800-c.py

The model follows the S8 02 D 12 manual's published installed envelope and
visible equipment layout. It is an exterior QC-floor visualization, not a
fabrication, refrigeration, installation, maintenance, or safety model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent.parent
MODEL_DIR = APP_DIR / "public" / "models"
PREVIEW_DIR = APP_DIR / "assets" / "previews" / "tetra-pak-hoyer-straightline-800-c"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SCRIPT_DIR / "tetra-pak-hoyer-straightline-800-c.blend"
GLB_PATH = MODEL_DIR / "tetra-pak-hoyer-straightline-800-c.glb"
STL_PATH = MODEL_DIR / "tetra-pak-hoyer-straightline-800-c.stl"

# Section 3.5 and Fig. 3.3 of the S8 02 D 12 manual. Blender is Z-up.
ENVELOPE = (13.780, 4.400, 2.500)  # X length, Y width, Z height, metres.
TUNNEL_LENGTH = 8.580
WORKTABLE_LENGTH = ENVELOPE[0] - TUNNEL_LENGTH
WORK_Y = -1.38
TRAY_ROWS_Y = (-1.66, -1.48, -1.30, -1.12)


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


def text_on_operator_side(name, body, location, size, mat, parent, align="CENTER"):
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


def text_on_end(name, body, location, size, mat, parent, align="CENTER"):
    curve = bpy.data.curves.new(f"font.{name}", "FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.0008
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0.0, -math.pi / 2)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.name = name
    obj.data.name = f"mesh.{name}"
    return obj


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


def leveling_foot(name, x, y, parent, steel_mat, rubber_mat):
    cylinder(f"{name}.stem", (x, y, 0.095), 0.024, 0.15, steel_mat, parent, vertices=14)
    cone(f"{name}.bell", (x, y, 0.046), 0.060, 0.030, 0.06, steel_mat, parent, vertices=18)
    cylinder(f"{name}.pad", (x, y, 0.009), 0.064, 0.018, rubber_mat, parent, vertices=20)


clear_scene()
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.scene.render.engine = "BLENDER_EEVEE"

stainless = material("stainless", (0.47, 0.50, 0.51), metallic=0.84, roughness=0.25)
stainless_light = material("stainless_light", (0.74, 0.77, 0.78), metallic=0.78, roughness=0.22)
stainless_dark = material("stainless_dark", (0.16, 0.19, 0.20), metallic=0.72, roughness=0.34)
insulated_panel = material("insulated_panel", (0.72, 0.74, 0.73), metallic=0.58, roughness=0.33)
rubber = material("rubber", (0.022, 0.027, 0.029), roughness=0.74)
control_blue = material("control_blue", (0.015, 0.30, 0.55), metallic=0.08, roughness=0.30)
control_orange = material("control_orange", (0.95, 0.49, 0.04), roughness=0.32)
screen = material("screen", (0.025, 0.09, 0.12), metallic=0.05, roughness=0.20)
signal_red = material("signal_red", (0.76, 0.025, 0.018), roughness=0.30)
signal_green = material("signal_green", (0.02, 0.48, 0.18), roughness=0.32)
conveyor_green = material("conveyor_green", (0.02, 0.42, 0.16), roughness=0.38)

root = empty("machine.hoyer-straightline-800-c")
root["units"] = "meters"
root["origin"] = "footprint center at floor level"
root["productFlowAxis"] = "+X"
root["externalEnvelope"] = ENVELOPE
root["engineeringUse"] = False
root["dimensionConfidence"] = "high for published installed envelope; medium for exterior layout; low-medium for hidden tray routing"
root["referenceModel"] = "Tetra Pak Hoyer Straightline 800 C, manual S8 02 D 12, 2004"
root["trayCount"] = 834

tunnel_group = empty("inspection.hardening_tunnel", root, selectable=True)
evaporator_group = empty("inspection.evaporator_module", root, selectable=True)
spiral_group = empty("inspection.internal_tray_path", root, selectable=True)
worktable_group = empty("inspection.worktable_conveyor", root, selectable=True)
station_group = empty("inspection.extrusion_and_filling_stations", root, selectable=True)
transfer_group = empty("inspection.transfer_and_discharge", root, selectable=True)
control_group = empty("inspection.control_panels", root, selectable=True)
utility_group = empty("utilities.refrigeration_and_pneumatics", root)

# The two joined insulated boxes establish the exact published 8.58 x 4.40 x
# 2.50 m tunnel/evaporator block and the whole installed envelope's Y/Z bounds.
TUNNEL_CENTER_X = ENVELOPE[0] / 2 - TUNNEL_LENGTH / 2
rounded_box(
    "tunnel.insulated_shell",
    (TUNNEL_CENTER_X, -0.72, 1.25),
    (TUNNEL_LENGTH, 2.88, ENVELOPE[2]),
    insulated_panel,
    tunnel_group,
    bevel=0.018,
    segments=3,
)
rounded_box(
    "evaporator.insulated_shell",
    (TUNNEL_CENTER_X, 1.48, 1.25),
    (TUNNEL_LENGTH, 1.36, ENVELOPE[2]),
    insulated_panel,
    evaporator_group,
    bevel=0.018,
    segments=3,
)

# Vertical panel seams, base rails and roof joint match the corrugated modular
# enclosure visible in the manual and the installed-condition photographs.
for group, y, width in ((tunnel_group, -0.72, 2.88), (evaporator_group, 1.48, 1.36)):
    rounded_box(f"{group.name}.base_rail", (TUNNEL_CENTER_X, y, 0.075), (8.44, width - 0.05, 0.10), stainless_dark, group, bevel=0.006)
    rounded_box(f"{group.name}.roof_cap", (TUNNEL_CENTER_X, y, 2.455), (8.44, width - 0.05, 0.07), stainless_light, group, bevel=0.006)
    for index, x in enumerate((-0.80, 0.92, 2.64, 4.36, 6.08), 1):
        rounded_box(f"{group.name}.panel_seam.{index:02d}", (x, y - width / 2 + 0.006, 1.28), (0.018, 0.012, 2.24), stainless_dark, group, bevel=0)

# Operator-side access doors, compression latches and inspection windows.
for index, x in enumerate((0.20, 3.10, 5.88), 1):
    rounded_box(f"tunnel.service_door.{index:02d}", (x, -2.180, 1.25), (1.32, 0.018, 1.88), stainless_light, tunnel_group, bevel=0.010)
    rounded_box(f"tunnel.door_seal.{index:02d}", (x, -2.188, 1.25), (1.18, 0.012, 1.72), stainless_dark, tunnel_group, bevel=0.010)
    rounded_box(f"tunnel.door_panel.{index:02d}", (x, -2.195, 1.25), (1.12, 0.010, 1.66), insulated_panel, tunnel_group, bevel=0.008)
    cylinder(f"tunnel.door_latch.{index:02d}", (x + 0.44, -2.178, 1.27), 0.045, 0.035, rubber, tunnel_group, axis="Y", vertices=14)

# Five evaporator fans are a defining feature in Fig. 3.1 and Fig. 4.5.
for index, x in enumerate((-0.55, 0.95, 2.45, 3.95, 5.45), 1):
    rounded_box(f"evaporator.fan_bay.{index:02d}", (x, 2.178, 1.42), (1.08, 0.012, 1.10), stainless_dark, evaporator_group, bevel=0.012)
    torus(f"evaporator.fan_guard.{index:02d}", (x, 2.180, 1.42), 0.39, 0.020, stainless_light, evaporator_group, rotation=(math.pi / 2, 0, 0))
    cylinder(f"evaporator.fan_hub.{index:02d}", (x, 2.180, 1.42), 0.085, 0.035, stainless_light, evaporator_group, axis="Y", vertices=18)
    for blade in range(6):
        angle = blade * math.tau / 6
        x_blade = x + math.cos(angle) * 0.22
        z_blade = 1.42 + math.sin(angle) * 0.22
        rounded_box(f"evaporator.fan_blade.{index:02d}.{blade + 1}", (x_blade, 2.178, z_blade), (0.25, 0.022, 0.065), stainless, evaporator_group, bevel=0.02)

# Far end doors and the exposed multi-tier tray path based on the used-machine
# interior photograph. The tiers remain inside the formal enclosure bounds.
rounded_box("tunnel.end_access_frame", (6.878, -0.67, 1.30), (0.018, 2.42, 2.14), stainless_dark, spiral_group, bevel=0.008)
rounded_box("tunnel.end_access_opening", (6.884, -0.67, 1.30), (0.010, 2.24, 1.96), rubber, spiral_group, bevel=0.008)
for tier in range(6):
    z = 0.42 + tier * 0.32
    for y in (-1.42, 0.08):
        torus(f"tray_path.return.{tier + 1}.{1 if y < 0 else 2}", (6.872, y, z), 0.30, 0.020, conveyor_green, spiral_group, rotation=(0, math.pi / 2, 0))
        for tray in range(10):
            angle = tray * math.tau / 10
            tray_y = y + math.cos(angle) * 0.30
            tray_z = z + math.sin(angle) * 0.30
            rounded_box(f"tray_path.carrier.{tier + 1}.{1 if y < 0 else 2}.{tray + 1:02d}", (6.86, tray_y, tray_z), (0.045, 0.14, 0.060), stainless_light, spiral_group, bevel=0.008)

# Long external worktable. The rounded return nose reaches X=-6.89, while the
# tunnel shell reaches X=+6.89, so the origin remains the footprint centre.
rounded_box("worktable.lower_bed", (-4.07, WORK_Y, 0.57), (4.56, 1.30, 0.52), stainless, worktable_group, bevel=0.035, segments=3)
cylinder("worktable.rounded_return_base", (-6.24, WORK_Y, 0.57), 0.65, 0.52, stainless, worktable_group, vertices=32, bevel=0.010)
rounded_box("worktable.top_run", (-4.02, WORK_Y, 1.02), (4.66, 1.18, 0.16), stainless_light, worktable_group, bevel=0.020, segments=3)
cylinder("worktable.rounded_return_top", (-6.24, WORK_Y, 1.02), 0.59, 0.16, stainless_light, worktable_group, vertices=32, bevel=0.008)

for index, x in enumerate((-5.90, -4.86, -3.82, -2.78, -1.86), 1):
    leveling_foot(f"worktable.foot.operator.{index:02d}", x, WORK_Y - 0.52, worktable_group, stainless_light, rubber)
    leveling_foot(f"worktable.foot.far.{index:02d}", x, WORK_Y + 0.52, worktable_group, stainless_light, rubber)

# Repeated tray carriers and four product rows make the 800 C work surface
# legible from QC-floor camera distances without modelling all 834 trays.
for tray_index in range(30):
    x = -6.52 + tray_index * (4.62 / 29)
    rounded_box(f"worktable.tray.{tray_index + 1:02d}", (x, WORK_Y, 1.125), (0.125, 1.04, 0.045), stainless_light, worktable_group, bevel=0.004)
    for row, y in enumerate(TRAY_ROWS_Y, 1):
        torus(f"worktable.product_seat.{tray_index + 1:02d}.{row}", (x, y, 1.158), 0.047, 0.008, rubber, worktable_group)

# Conveyor rails and chain strips follow the photographs' perforated workbed.
for y in (WORK_Y - 0.55, WORK_Y + 0.55):
    rounded_box("worktable.guide_rail." + ("operator" if y < WORK_Y else "far"), (-4.30, y, 1.18), (5.08, 0.055, 0.11), stainless_dark, worktable_group, bevel=0.004)
for index in range(5):
    x = -5.95 + index * 0.93
    rounded_box(f"worktable.skirt_panel.{index + 1:02d}", (x, WORK_Y - 0.656, 0.62), (0.84, 0.016, 0.48), stainless_light, worktable_group, bevel=0.014)

# Tall stainless station fascia and support frame visible over the workbed.
rounded_box("stations.upper_fascia", (-3.08, WORK_Y + 0.44, 2.05), (2.92, 0.62, 0.72), stainless, station_group, bevel=0.022, segments=3)
for index, x in enumerate((-4.38, -3.48, -2.58, -1.78), 1):
    rounded_box(f"stations.fascia_door.{index:02d}", (x, WORK_Y + 0.121, 2.05), (0.78, 0.018, 0.63), stainless_light, station_group, bevel=0.010)
    cylinder(f"stations.fascia_latch.{index:02d}", (x + 0.29, WORK_Y + 0.108, 2.06), 0.024, 0.026, rubber, station_group, axis="Y", vertices=12)
for index, x in enumerate((-4.48, -3.78, -3.08, -2.38, -1.72), 1):
    rounded_box(f"stations.support_post.{index:02d}", (x, WORK_Y + 0.43, 1.48), (0.075, 0.075, 0.82), stainless_dark, station_group, bevel=0.004)

# Horizontal extruder carriage with the white clamp blocks seen in photos 2-3.
rounded_box("stations.horizontal_extruder.body", (-4.55, WORK_Y - 0.14, 1.44), (0.62, 0.38, 0.30), stainless_light, station_group, bevel=0.025, segments=3)
cylinder("stations.horizontal_extruder.bar", (-4.55, WORK_Y - 0.36, 1.44), 0.092, 0.66, stainless, station_group, axis="X", vertices=24)
for index, x in enumerate((-4.80, -4.55, -4.30), 1):
    rounded_box(f"stations.horizontal_extruder.clamp.{index:02d}", (x, WORK_Y - 0.38, 1.44), (0.10, 0.10, 0.36), insulated_panel, station_group, bevel=0.016)

# Four-head vertical filler and hose bank.
rounded_box("stations.filler_crosshead", (-2.62, WORK_Y, 1.61), (0.46, 1.10, 0.16), stainless, station_group, bevel=0.010)
for row, y in enumerate(TRAY_ROWS_Y, 1):
    cylinder(f"stations.filler_body.{row}", (-2.62, y, 1.47), 0.072, 0.30, stainless_light, station_group, vertices=18)
    cone(f"stations.filler_nozzle.{row}", (-2.62, y, 1.25), 0.038, 0.012, 0.16, stainless_dark, station_group, vertices=16)
    pipe(f"stations.product_hose.{row}", [(-2.28, WORK_Y + 0.42, 2.34), (-2.42, y, 2.18), (-2.62, y, 1.58)], 0.024, rubber, station_group)
cylinder("stations.filler_actuator", (-2.62, WORK_Y + 0.02, 1.92), 0.070, 0.42, stainless_dark, station_group, vertices=18)

# Stick/cup magazine and dry-ingredient hopper cover other common 800 C setups.
for index, x in enumerate((-3.92, -3.70), 1):
    rounded_box(f"stations.stick_magazine.rail.{index}", (x, WORK_Y - 0.05, 1.82), (0.055, 0.68, 1.18), stainless_dark, station_group, bevel=0.004)
rounded_box("stations.stick_magazine.bridge", (-3.81, WORK_Y - 0.05, 2.31), (0.34, 0.72, 0.10), stainless, station_group, bevel=0.006)
rectangular_frustum("stations.dry_ingredient_hopper", (-1.92, WORK_Y + 0.10, 1.91), (0.26, 0.54), (0.52, 0.82), 0.56, stainless_light, station_group)
rounded_box("stations.hopper_rim", (-1.92, WORK_Y + 0.10, 2.205), (0.56, 0.86, 0.040), stainless, station_group, bevel=0.006)

# The blue drive motor and linked gearbox are visible below the upper fascia.
cylinder("utilities.worktable_motor", (-2.05, WORK_Y + 0.44, 1.22), 0.145, 0.42, control_blue, utility_group, axis="X", vertices=24)
rounded_box("utilities.worktable_gearbox", (-1.78, WORK_Y + 0.44, 1.22), (0.24, 0.30, 0.30), stainless_dark, utility_group, bevel=0.018)
pipe("utilities.pneumatic_header", [(-4.70, WORK_Y + 0.58, 2.35), (-3.00, WORK_Y + 0.58, 2.42), (-1.70, WORK_Y + 0.58, 2.34)], 0.040, stainless_light, utility_group)
for index, x in enumerate((-4.20, -3.52, -2.84, -2.16), 1):
    pipe(f"utilities.air_line.{index}", [(x, WORK_Y + 0.56, 2.34), (x, WORK_Y + 0.25, 2.02), (x - 0.10, TRAY_ROWS_Y[index - 1], 1.55)], 0.012, conveyor_green, utility_group)

# Control HMI uses the exact blue/orange layout from the listing photographs.
rounded_box("control.hmi_post", (-1.67, WORK_Y - 0.46, 1.36), (0.12, 0.12, 1.36), stainless_dark, control_group, bevel=0.008)
rounded_box("control.hmi_cabinet", (-1.67, WORK_Y - 0.50, 1.84), (0.92, 0.18, 0.62), control_blue, control_group, bevel=0.025, segments=3)
rounded_box("control.hmi_orange_strip", (-1.67, WORK_Y - 0.597, 1.64), (0.86, 0.018, 0.17), control_orange, control_group, bevel=0.006)
rounded_box("control.hmi_screen", (-1.78, WORK_Y - 0.607, 1.92), (0.44, 0.018, 0.27), screen, control_group, bevel=0.008)
for index, x in enumerate((-1.94, -1.78, -1.62, -1.46), 1):
    cylinder(f"control.hmi_button.{index}", (x, WORK_Y - 0.615, 1.64), 0.035, 0.025, signal_green if index > 1 else signal_red, control_group, axis="Y", vertices=16)

# Separate power cabinet on the evaporator side, with meters and button rows.
rounded_box("control.power_cabinet", (1.12, 2.085, 1.28), (1.18, 0.18, 1.92), stainless_light, control_group, bevel=0.018, segments=3)
for index, x in enumerate((0.82, 1.12, 1.42), 1):
    rounded_box(f"control.power_meter.{index}", (x, 2.182, 1.66), (0.17, 0.016, 0.10), screen, control_group, bevel=0.003)
for row in range(2):
    for column in range(7):
        x = 0.70 + column * 0.14
        z = 1.34 - row * 0.18
        cylinder(f"control.power_button.{row + 1}.{column + 1}", (x, 2.182, z), 0.030, 0.025, signal_red if row == 0 else signal_green, control_group, axis="Y", vertices=14)
cylinder("control.power_isolator", (1.12, 2.1825, 1.50), 0.075, 0.035, signal_red, control_group, axis="Y", vertices=18)

# Transfer conveyor and discharge guide at the outer end of the worktable.
rounded_box("transfer.guide_frame", (-6.34, WORK_Y + 0.02, 1.34), (0.52, 1.14, 0.12), stainless, transfer_group, bevel=0.008)
for row, y in enumerate(TRAY_ROWS_Y, 1):
    cylinder(f"transfer.gripper_column.{row}", (-6.34, y, 1.48), 0.034, 0.42, stainless_dark, transfer_group, vertices=14)
    cone(f"transfer.gripper.{row}", (-6.34, y, 1.23), 0.034, 0.014, 0.08, rubber, transfer_group, vertices=14)
rounded_box("transfer.outfeed_conveyor", (-5.86, -0.35, 0.98), (1.94, 0.48, 0.20), stainless, transfer_group, bevel=0.020)
for index in range(7):
    cylinder(f"transfer.outfeed_roller.{index + 1:02d}", (-6.62 + index * 0.25, -0.35, 1.09), 0.040, 0.39, stainless_dark, transfer_group, axis="Y", vertices=14)

# Refrigerant headers, roof stubs and a stack light break up the box silhouette.
for index, x in enumerate((0.30, 2.20, 4.10), 1):
    pipe(f"utilities.roof_header.{index}", [(x, 1.55, 2.43), (x, 1.55, 2.34), (x + 0.32, 1.30, 2.30)], 0.048, stainless_light, utility_group)
cylinder("utilities.stack_light.pole", (-0.95, -2.02, 2.29), 0.026, 0.28, stainless_dark, utility_group, vertices=12)
cylinder("utilities.stack_light.red", (-0.95, -2.02, 2.455), 0.052, 0.08, signal_red, utility_group, vertices=16)

# Brand and model markings are meshes so they survive the GLB export.
text_on_operator_side("label.brand", "TETRA PAK  HOYER", (4.52, -2.198, 1.89), 0.115, control_blue, tunnel_group)
text_on_operator_side("label.model", "STRAIGHTLINE 800 C", (4.52, -2.198, 1.70), 0.088, stainless_dark, tunnel_group)


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
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


studio_floor = material("studio_floor", (0.55, 0.58, 0.57), roughness=0.76)
rounded_box("studio.floor", (0.0, 0.0, -0.05), (17.0, 9.0, 0.08), studio_floor, None, bevel=0.02)

world = bpy.context.scene.world or bpy.data.worlds.new("studio.world")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.72, 0.75, 0.77, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34

for name, location, energy, size in (
    ("studio.key", (-1.0, -8.0, 8.0), 1800, 5.5),
    ("studio.fill", (-7.0, 2.0, 5.0), 980, 4.5),
    ("studio.rim", (6.0, 6.0, 6.0), 1300, 5.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 1.2))

render_preview("front", (0.0, -17.0, 3.4), (0.0, 0.0, 1.2), 14.9)
render_preview("side", (0.0, 17.0, 3.4), (0.0, 0.0, 1.20), 14.9)
render_preview("three-quarter", (-13.5, -12.5, 8.5), (0.15, -0.25, 1.05), 13.6)

print(f"Saved {BLEND_PATH}")
print(f"Generated {GLB_PATH}")
print(f"Generated {STL_PATH}")
print(f"Rendered {PREVIEW_DIR}/*.png")
