import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "TunnelTypeContinuousSpraySterilizerScene"
COLLECTION_NAME = "TunnelTypeContinuousSpraySterilizer"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "tunnel_type_continuous_spray_sterilizer.blend"
PREVIEW_PATH = OUTPUT_DIR / "tunnel_type_continuous_spray_sterilizer_preview.png"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def make_material(name, color, metallic=0.0, roughness=0.4, transmission=0.0, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.5
    return material


def assign_material(obj, material):
    if hasattr(obj.data, "materials"):
        obj.data.materials.clear()
        obj.data.materials.append(material)


def move_to_collection(obj):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    machine_collection.objects.link(obj)


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def bevel(obj, width=0.05, segments=3):
    modifier = obj.modifiers.new(name="Edge Softening", type="BEVEL")
    modifier.width = width
    modifier.segments = segments


def add_cube(name, location, scale, material, rotation=(0.0, 0.0, 0.0), bevel_width=0.04):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_width:
        bevel(obj, bevel_width, 3)
    assign_material(obj, material)
    move_to_collection(obj)
    return obj


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=64, bevel_width=0.025):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    if bevel_width:
        bevel(obj, bevel_width, 3)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj)
    return obj


def add_torus(name, location, major_radius, minor_radius, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=16,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj)
    return obj


def add_pipe(name, points, radius, material):
    curve_data = bpy.data.curves.new(name=f"{name}Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 10
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 4
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinates in zip(spline.bezier_points, points):
        point.co = coordinates
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    machine_collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def add_text(name, body, location, size, material, rotation=(math.radians(90), 0.0, 0.0), align="CENTER"):
    curve = bpy.data.curves.new(type="FONT", name=f"{name}Curve")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.007
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    machine_collection.objects.link(obj)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# Keep every prior machine intact by using a dedicated Blender scene.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)
else:
    # Make retries deterministic without touching any other machine scene.
    for existing_object in list(machine_collection.objects):
        bpy.data.objects.remove(existing_object, do_unlink=True)


# Materials.
stainless = make_material("Tunnel Unit Stainless", (0.62, 0.67, 0.69), metallic=0.97, roughness=0.18)
polished = make_material("Tunnel Unit Polished Steel", (0.83, 0.86, 0.87), metallic=1.0, roughness=0.10)
brushed = make_material("Tunnel Unit Brushed Steel", (0.49, 0.53, 0.55), metallic=0.91, roughness=0.27)
black = make_material("Tunnel Unit Rubber", (0.015, 0.020, 0.024), metallic=0.05, roughness=0.52)
dark_metal = make_material("Tunnel Unit Dark Metal", (0.025, 0.030, 0.038), metallic=0.80, roughness=0.28)
blue = make_material("Tunnel Unit Conveyor Blue", (0.018, 0.36, 0.82), metallic=0.05, roughness=0.31)
deep_blue = make_material("Tunnel Unit Wrap Belt", (0.020, 0.085, 0.55), metallic=0.06, roughness=0.30)
white = make_material("Tunnel Unit Label Web", (0.91, 0.93, 0.93), metallic=0.0, roughness=0.48)
screen = make_material("Tunnel Unit Touchscreen", (0.10, 0.20, 0.31), metallic=0.15, roughness=0.20)
screen_glow = make_material("Tunnel Unit Screen Glow", (0.19, 0.48, 0.68), metallic=0.0, roughness=0.20, emission=(0.08, 0.26, 0.40))
red = make_material("Tunnel Unit Emergency Red", (0.90, 0.025, 0.012), metallic=0.05, roughness=0.23)
green = make_material("Tunnel Unit Button Green", (0.02, 0.66, 0.28), metallic=0.08, roughness=0.24, emission=(0.01, 0.18, 0.05))
amber = make_material("Tunnel Unit Amber", (1.0, 0.36, 0.025), metallic=0.05, roughness=0.25)
floor_material = make_material("Tunnel Unit Studio Floor", (0.70, 0.73, 0.75), metallic=0.0, roughness=0.72)


# Lower machine cabinet and black top cover.
add_cube("Lower Control Cabinet", (0.0, 0.0, 0.80), (2.70, 1.12, 0.67), stainless, bevel_width=0.075)
add_cube("Black Cabinet Top", (0.0, 0.0, 1.54), (2.78, 1.15, 0.095), black, bevel_width=0.04)
add_cube("Front Control Console", (0.05, -1.25, 0.87), (2.15, 0.24, 0.54), stainless, rotation=(math.radians(-5.0), 0.0, 0.0), bevel_width=0.055)

# Feet and side plinths.
for index, x in enumerate((-2.35, 2.35), start=1):
    add_cube(f"Foot Rail {index}", (x, 0.0, 0.30), (0.30, 1.18, 0.12), dark_metal, bevel_width=0.035)
    for side, y in enumerate((-0.78, 0.78), start=1):
        add_cylinder(f"Leveling Foot {index}-{side}", (x, y, 0.11), 0.24, 0.15, black)
        add_cylinder(f"Foot Stem {index}-{side}", (x, y, 0.25), 0.07, 0.20, polished)


# Main conveyor bridge, blue belt, end drums and side rails.
conveyor_z = 2.04
add_cube("Conveyor Chassis", (0.0, 0.0, conveyor_z - 0.17), (5.25, 0.66, 0.18), stainless, bevel_width=0.045)
add_cube("Blue Conveyor Belt", (0.0, 0.0, conveyor_z + 0.06), (5.05, 0.58, 0.065), blue, bevel_width=0.055)
add_cylinder("Left Conveyor Drum", (-5.04, 0.0, conveyor_z + 0.02), 0.16, 1.17, brushed, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Right Conveyor Drum", (5.04, 0.0, conveyor_z + 0.02), 0.16, 1.17, brushed, rotation=(math.radians(90), 0.0, 0.0))
for side, y in enumerate((-0.69, 0.69), start=1):
    add_cube(f"Conveyor Side Rail {side}", (0.0, y, conveyor_z - 0.04), (5.35, 0.055, 0.21), stainless, bevel_width=0.025)
for index, x in enumerate((-4.65, -3.05, -1.45, 0.15, 1.75, 3.35, 4.65), start=1):
    add_cylinder(f"Visible Belt Roller {index}", (x, -0.72, conveyor_z), 0.055, 0.14, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=32)


# Product guide rails and adjustable clamps along the front side.
add_cube("Front Product Guide Rail", (-2.0, -0.78, 2.44), (2.75, 0.045, 0.055), white, bevel_width=0.035)
add_cube("Rear Product Guide Rail", (-1.25, 0.67, 2.39), (3.20, 0.045, 0.055), white, bevel_width=0.035)
for index, x in enumerate((-3.65, -1.65), start=1):
    add_cube(f"Guide Clamp Block {index}", (x, -0.88, 1.94), (0.18, 0.20, 0.24), black, bevel_width=0.035)
    add_cylinder(f"Guide Clamp Knob {index}", (x, -1.08, 1.94), 0.18, 0.13, black, rotation=(math.radians(90), 0.0, 0.0), vertices=40)
    add_cylinder(f"Guide Clamp Rod {index}", (x, -0.82, 1.45), 0.025, 1.05, polished)
    for spoke in range(4):
        angle = spoke * math.pi / 2
        add_cube(
            f"Clamp Knob Spoke {index}-{spoke}",
            (x + math.cos(angle) * 0.20, -1.15, 1.94 + math.sin(angle) * 0.20),
            (0.13, 0.035, 0.04),
            black,
            rotation=(0.0, angle, 0.0),
            bevel_width=0.025,
        )


# Right conveyor drive motor and gearbox.
add_cube("Right Drive Gearbox", (4.77, 0.90, 1.68), (0.42, 0.42, 0.40), dark_metal, bevel_width=0.10)
add_cylinder("Right Drive Motor", (4.80, 1.38, 1.63), 0.36, 0.70, black, rotation=(math.radians(90), 0.0, 0.0), vertices=48)
add_cylinder("Right Motor Fan Cover", (4.80, 1.75, 1.63), 0.29, 0.08, dark_metal, rotation=(math.radians(90), 0.0, 0.0))
for blade in range(6):
    angle = blade * math.pi / 3
    add_cube(
        f"Right Motor Vent {blade + 1}",
        (4.80 + math.cos(angle) * 0.14, 1.80, 1.63 + math.sin(angle) * 0.14),
        (0.018, 0.02, 0.085),
        brushed,
        rotation=(0.0, angle, 0.0),
        bevel_width=0.01,
    )


# Label unwind and backing-paper reel platform on the upper left.
add_cube("Label Mechanism Base Plate", (-1.75, 0.30, 2.35), (2.20, 0.92, 0.09), polished, bevel_width=0.045)
for index, (x, y, height) in enumerate(((-3.15, 0.40, 1.25), (-2.45, 0.82, 1.55), (-1.75, 0.80, 1.35), (-1.10, 0.63, 1.18), (-0.45, 0.52, 1.05)), start=1):
    add_cylinder(f"Label Path Post {index}", (x, y, 2.45 + height / 2), 0.085, height, polished)
    add_cylinder(f"Label Path Top Knob {index}", (x, y, 2.47 + height), 0.15, 0.08, black)

# Large supply reel and take-up reel.
for prefix, x, y, radius in (("Supply", -3.34, 0.10, 0.62), ("Takeup", -2.78, 0.79, 0.42)):
    add_cylinder(f"{prefix} Reel Lower Disc", (x, y, 2.58), radius, 0.075, white)
    add_cylinder(f"{prefix} Reel Core", (x, y, 3.02), 0.15, 0.80, black)
    add_cylinder(f"{prefix} Reel Upper Disc", (x, y, 3.43), radius * 0.86, 0.075, polished)
    add_cylinder(f"{prefix} Reel Retaining Knob", (x, y, 3.57), 0.18, 0.18, black)

# Label web represented as a clean routed strip across the guide rollers.
add_cube("Label Web Feed A", (-2.58, 0.22, 3.13), (0.70, 0.025, 0.31), white, rotation=(0.0, math.radians(-8.0), math.radians(-8.0)), bevel_width=0.018)
add_cube("Label Web Feed B", (-1.62, 0.14, 3.03), (0.44, 0.025, 0.31), white, rotation=(0.0, math.radians(6.0), math.radians(8.0)), bevel_width=0.018)
add_cube("Label Web Feed C", (-0.88, 0.08, 2.85), (0.48, 0.025, 0.28), white, rotation=(0.0, math.radians(14.0), math.radians(-6.0)), bevel_width=0.018)


# Central labeling head motor, press tower, and peel plate.
add_cube("Label Head Motor", (-1.55, -0.10, 3.20), (0.38, 0.36, 0.48), dark_metal, bevel_width=0.07)
for rib in range(7):
    add_cube(f"Label Motor Cooling Rib {rib + 1}", (-1.55, -0.47, 2.91 + rib * 0.095), (0.30, 0.025, 0.026), black, bevel_width=0.008)
for x in (-1.92, -1.18):
    add_cylinder(f"Label Head Tower Post {x}", (x, -0.18, 3.78), 0.09, 1.95, polished)
add_cube("Label Head Tower Bridge", (-1.55, -0.18, 4.72), (0.48, 0.34, 0.10), polished, bevel_width=0.035)
add_cylinder("Label Head Lead Screw", (-1.55, -0.18, 4.02), 0.055, 1.42, dark_metal)
add_cylinder("Label Head Adjustment Wheel", (-1.55, -0.18, 4.86), 0.30, 0.10, black)
add_torus("Label Head Wheel Grip", (-1.55, -0.18, 4.86), 0.24, 0.045, black)
add_cylinder("Label Head Wheel Handle", (-1.34, -0.18, 5.04), 0.055, 0.30, black)
add_cube("Peel Plate", (-0.30, -0.06, 2.78), (0.46, 0.42, 0.045), polished, rotation=(0.0, math.radians(-15.0), 0.0), bevel_width=0.018)


# Rear/top wrap belt module with a blue pressure belt.
add_cube("Wrap Belt Stainless Backplate", (1.73, 0.60, 3.26), (2.05, 0.12, 0.43), stainless, bevel_width=0.08)
add_cube("Blue Wrap Belt", (1.73, 0.42, 3.25), (1.86, 0.11, 0.27), deep_blue, bevel_width=0.14)
add_cylinder("Wrap Belt Left Pulley", (-0.12, 0.42, 3.25), 0.28, 0.22, black, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Wrap Belt Right Pulley", (3.58, 0.42, 3.25), 0.28, 0.22, black, rotation=(math.radians(90), 0.0, 0.0))
add_cube("Wrap Belt Top Arm", (1.75, 0.53, 3.78), (1.97, 0.19, 0.10), polished, bevel_width=0.075)
add_cube("Wrap Belt Motor Housing", (0.78, 0.82, 4.16), (0.46, 0.42, 0.48), dark_metal, bevel_width=0.14)
for rib in range(6):
    add_cube(f"Wrap Motor Vent Rib {rib + 1}", (0.34 + rib * 0.15, 0.42, 4.20), (0.035, 0.06, 0.31), black, bevel_width=0.01)


# Front-right height-adjustable pressure roller assembly.
assembly_x = 1.95
for index, x in enumerate((1.45, 2.45), start=1):
    add_cylinder(f"Pressure Tower Post {index}", (x, -0.82, 3.16), 0.10, 2.05, polished)
add_cube("Pressure Tower Top", (assembly_x, -0.82, 4.16), (0.67, 0.34, 0.10), polished, bevel_width=0.04)
add_cube("Pressure Tower Carriage", (assembly_x, -0.82, 2.62), (0.78, 0.38, 0.25), polished, bevel_width=0.055)
add_cylinder("Pressure Tower Lead Screw", (assembly_x, -0.82, 3.28), 0.055, 1.78, brushed)
add_cylinder("Pressure Height Wheel", (assembly_x, -0.82, 4.34), 0.28, 0.11, black)
add_torus("Pressure Height Wheel Grip", (assembly_x, -0.82, 4.34), 0.22, 0.04, black)
add_cylinder("Pressure Height Handle", (2.17, -0.82, 4.50), 0.05, 0.28, black)
for x in (1.66, 2.22):
    add_cylinder(f"Pressure Carriage Shaft {x}", (x, -1.19, 2.62), 0.075, 0.75, polished, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Pressure Roller", (2.42, -1.33, 2.47), 0.42, 0.30, black, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Pressure Roller Hub", (2.42, -1.50, 2.47), 0.12, 0.14, polished, rotation=(math.radians(90), 0.0, 0.0))
add_cube("Pressure Sensor Arm", (2.91, -1.08, 2.24), (0.48, 0.06, 0.055), dark_metal, rotation=(0.0, math.radians(-40.0), 0.0), bevel_width=0.025)


# Front touch panel, status buttons and speed controllers.
add_cube("Touchscreen Bezel", (-0.88, -1.52, 0.93), (0.79, 0.055, 0.48), dark_metal, rotation=(math.radians(5.0), 0.0, 0.0), bevel_width=0.05)
add_cube("Touchscreen Glass", (-0.88, -1.585, 0.93), (0.66, 0.025, 0.37), screen_glow, rotation=(math.radians(5.0), 0.0, 0.0), bevel_width=0.035)
add_text("Screen Caption", "PROCESS CONTROL", (-0.88, -1.63, 1.17), 0.09, white, rotation=(math.radians(95.0), 0.0, 0.0))

button_specs = (
    ("Power Green", 0.55, 1.13, 0.13, green),
    ("Start Green", 0.55, 0.62, 0.14, green),
    ("Emergency Stop", 1.20, 0.88, 0.22, red),
)
for name, x, z, radius, material in button_specs:
    add_cylinder(name, (x, -1.60, z), radius, 0.10, material, rotation=(math.radians(90), 0.0, 0.0))
    if name == "Emergency Stop":
        add_cylinder("Emergency Stop Base", (x, -1.535, z), radius * 0.72, 0.05, black, rotation=(math.radians(90), 0.0, 0.0))

for index, z in enumerate((1.14, 0.62), start=1):
    add_cube(f"Speed Controller {index}", (1.82, -1.57, z), (0.25, 0.06, 0.23), black, rotation=(math.radians(5.0), 0.0, 0.0), bevel_width=0.025)
    add_cylinder(f"Speed Dial {index}", (1.82, -1.66, z), 0.12, 0.10, dark_metal, rotation=(math.radians(90), 0.0, 0.0), vertices=40)
    add_cube(f"Speed Dial Pointer {index}", (1.82, -1.72, z + 0.07), (0.012, 0.012, 0.07), white, rotation=(0.0, 0.0, math.radians(-25.0)), bevel_width=0.006)
    add_text(f"Speed Label {index}", f"SPEED {index}", (1.82, -1.635, z - 0.18), 0.055, white, rotation=(math.radians(95.0), 0.0, 0.0))


# Visible wiring and sensor cable loops.
add_pipe(
    "Label Head Cable",
    [(-1.55, -0.42, 2.78), (-1.44, -0.85, 2.25), (-0.80, -1.04, 1.72), (-0.40, -0.90, 1.56)],
    0.025,
    black,
)
add_pipe(
    "Pressure Assembly Cable",
    [(2.70, -1.10, 2.76), (2.95, -1.30, 2.02), (3.30, -1.00, 1.64), (3.58, -0.78, 1.56)],
    0.027,
    black,
)
add_pipe(
    "Drive Motor Cable",
    [(4.79, 1.46, 1.42), (4.30, 1.35, 1.20), (3.75, 1.14, 1.46), (3.15, 0.85, 1.55)],
    0.032,
    black,
)


# Small fasteners and hardware for a production-machine finish.
for index, x in enumerate((-4.90, -4.10, -3.30, -2.50, -1.70, -0.90, -0.10, 0.70, 1.50, 2.30, 3.10, 3.90, 4.70), start=1):
    add_cylinder(f"Conveyor Rail Fastener {index}", (x, -0.755, 1.94), 0.035, 0.025, dark_metal, rotation=(math.radians(90), 0.0, 0.0), vertices=24, bevel_width=0.008)

add_text(
    "Machine Nameplate",
    "CONTINUOUS PROCESSING SYSTEM",
    (0.05, -1.505, 0.33),
    0.13,
    dark_metal,
    rotation=(math.radians(95.0), 0.0, 0.0),
)


# Floor and studio lighting.
add_cube("Studio Floor", (0.0, 0.0, -0.07), (8.0, 6.0, 0.07), floor_material, bevel_width=0.0)

bpy.ops.object.light_add(type="AREA", location=(-4.0, -6.0, 8.5))
key_light = bpy.context.object
key_light.name = "Tunnel Unit Key Light"
key_light.data.energy = 1450
key_light.data.shape = "RECTANGLE"
key_light.data.size = 5.0
key_light.data.size_y = 4.0
look_at(key_light, (0.0, 0.0, 2.0))
move_to_collection(key_light)

bpy.ops.object.light_add(type="AREA", location=(5.8, -1.2, 6.5))
fill_light = bpy.context.object
fill_light.name = "Tunnel Unit Fill Light"
fill_light.data.energy = 1050
fill_light.data.size = 4.0
look_at(fill_light, (1.0, 0.0, 2.2))
move_to_collection(fill_light)

bpy.ops.object.light_add(type="AREA", location=(-1.0, 5.0, 7.0))
rim_light = bpy.context.object
rim_light.name = "Tunnel Unit Rim Light"
rim_light.data.energy = 1250
rim_light.data.size = 4.0
look_at(rim_light, (-0.5, 0.2, 2.7))
move_to_collection(rim_light)


# Camera favors the machine's front-left to reveal reels, controls and right-side modules.
bpy.ops.object.camera_add(location=(-9.8, -12.8, 7.1))
camera = bpy.context.object
camera.name = "Tunnel Unit Camera"
camera.data.lens = 57
look_at(camera, (0.0, 0.0, 2.25))
scene.camera = camera
move_to_collection(camera)


# World and render settings.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_percentage = 100

if scene.world is None:
    scene.world = bpy.data.worlds.new("Tunnel Unit Studio World")
scene.world.use_nodes = True
world_bsdf = scene.world.node_tree.nodes.get("Background")
world_bsdf.inputs["Color"].default_value = (0.018, 0.025, 0.033, 1.0)
world_bsdf.inputs["Strength"].default_value = 0.35

scene.view_settings.look = "AgX - Medium High Contrast"

# Select the main collection's objects and save/render.
bpy.ops.object.select_all(action="DESELECT")
for obj in machine_collection.objects:
    obj.select_set(True)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Saved Blender model: {BLEND_PATH}")
print(f"Saved preview render: {PREVIEW_PATH}")
