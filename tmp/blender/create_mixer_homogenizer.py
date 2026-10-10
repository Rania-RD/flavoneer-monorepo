import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "MixerHomogenizerScene"
COLLECTION_NAME = "MixerHomogenizer"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "mixer_homogenizer.blend"
PREVIEW_PATH = OUTPUT_DIR / "mixer_homogenizer_preview.png"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def make_material(name, color, metallic=0.0, roughness=0.4):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
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


def add_bevel(obj, width=0.06, segments=3):
    modifier = obj.modifiers.new(name="Edge Softening", type="BEVEL")
    modifier.width = width
    modifier.segments = segments


def add_cube(name, location, scale, material, rotation=(0.0, 0.0, 0.0), bevel=0.05):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        add_bevel(obj, bevel, 3)
    assign_material(obj, material)
    move_to_collection(obj)
    return obj


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=64, bevel=0.035, open_ends=False):
    kwargs = dict(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    if open_ends:
        kwargs["end_fill_type"] = "NOTHING"
    bpy.ops.mesh.primitive_cylinder_add(**kwargs)
    obj = bpy.context.object
    obj.name = name
    if bevel:
        add_bevel(obj, bevel, 3)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj)
    return obj


def add_cone(name, location, radius1, radius2, depth, material, rotation=(0.0, 0.0, 0.0), vertices=96):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    smooth(obj)
    add_bevel(obj, 0.035, 3)
    move_to_collection(obj)
    return obj


def add_uv_sphere(name, location, scale, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj)
    return obj


def add_torus(name, location, major_radius, minor_radius, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=72,
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


def add_cylinder_between(name, start, end, radius, material, vertices=24):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) * 0.5
    obj = add_cylinder(name, midpoint, radius, direction.length, material, vertices=vertices, bevel=0.015)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def add_helix(name, center, radius, height, turns, material, tube_radius=0.028):
    curve_data = bpy.data.curves.new(name=f"{name}Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = tube_radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new("POLY")
    count = 96
    spline.points.add(count - 1)
    for index in range(count):
        t = index / (count - 1)
        angle = turns * math.tau * t
        x = center[0] + math.cos(angle) * radius
        y = center[1] + math.sin(angle) * radius
        z = center[2] - height * t
        spline.points[index].co = (x, y, z, 1.0)
    obj = bpy.data.objects.new(name, curve_data)
    machine_collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_motor(prefix, location, radius, height):
    x, y, z = location
    add_cylinder(f"{prefix} Gearbox", (x, y, z - height * 0.62), radius * 0.82, height * 0.42, polished, vertices=56, bevel=0.055)
    add_cylinder(f"{prefix} Motor Core", (x, y, z), radius * 0.78, height, motor_dark, vertices=64, bevel=0.055)
    for fin_index in range(14):
        angle = math.tau * fin_index / 14
        fin_radius = radius * 0.86
        add_cube(
            f"{prefix} Cooling Fin {fin_index + 1}",
            (x + math.cos(angle) * fin_radius, y + math.sin(angle) * fin_radius, z),
            (radius * 0.030, radius * 0.12, height * 0.43),
            motor_dark,
            rotation=(0.0, 0.0, angle),
            bevel=0.012,
        )
    add_cylinder(f"{prefix} Top Cap", (x, y, z + height * 0.57), radius * 0.88, height * 0.16, silver_gray, vertices=64, bevel=0.055)
    add_cube(f"{prefix} Terminal Box", (x + radius * 0.93, y, z - height * 0.16), (radius * 0.22, radius * 0.30, height * 0.19), silver_gray, bevel=0.04)


# Preserve previous models by working in a new scene.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)


# Materials.
stainless = make_material("Homogenizer Stainless", (0.58, 0.62, 0.64), metallic=0.97, roughness=0.17)
inner_steel = make_material("Homogenizer Inner Bowl", (0.34, 0.38, 0.40), metallic=0.94, roughness=0.24)
polished = make_material("Homogenizer Polished Steel", (0.78, 0.82, 0.83), metallic=1.0, roughness=0.10)
frame_steel = make_material("Homogenizer Frame", (0.43, 0.47, 0.49), metallic=0.93, roughness=0.21)
motor_dark = make_material("Homogenizer Motor", (0.08, 0.09, 0.10), metallic=0.70, roughness=0.28)
silver_gray = make_material("Homogenizer Motor Cap", (0.52, 0.56, 0.58), metallic=0.87, roughness=0.22)
rubber = make_material("Homogenizer Caster Rubber", (0.012, 0.014, 0.017), metallic=0.0, roughness=0.65)
control_white = make_material("Homogenizer Control Panel", (0.78, 0.80, 0.81), metallic=0.25, roughness=0.32)
accent_blue = make_material("Homogenizer Dial Accent", (0.025, 0.22, 0.50), metallic=0.18, roughness=0.32)
floor_material = make_material("Homogenizer Studio Floor", (0.70, 0.73, 0.75), metallic=0.0, roughness=0.72)


# Base frame.
add_cube("Base Front Rail", (0.0, -1.72, 0.55), (2.65, 0.09, 0.11), frame_steel, bevel=0.035)
add_cube("Base Rear Rail", (0.0, 1.72, 0.55), (2.65, 0.09, 0.11), frame_steel, bevel=0.035)
add_cube("Base Left Rail", (-2.56, 0.0, 0.55), (0.09, 1.72, 0.11), frame_steel, bevel=0.035)
add_cube("Base Right Rail", (2.56, 0.0, 0.55), (0.09, 1.72, 0.11), frame_steel, bevel=0.035)

# Four swivel casters.
caster_positions = [(-2.46, -1.61), (2.46, -1.61), (-2.46, 1.61), (2.46, 1.61)]
for index, (x, y) in enumerate(caster_positions, start=1):
    add_cylinder(f"Caster Stem {index}", (x, y, 0.25), 0.085, 0.38, frame_steel, vertices=28, bevel=0.02)
    add_cube(f"Caster Fork {index}", (x, y, 0.02), (0.17, 0.11, 0.18), frame_steel, bevel=0.045)
    add_torus(f"Caster Tire {index}", (x, y, -0.16), 0.24, 0.070, rubber, rotation=(math.radians(90), 0.0, 0.0))
    add_cylinder(f"Caster Hub {index}", (x, y, -0.16), 0.095, 0.24, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.015)


# Portal support frame and top bridge.
add_cube("Left Portal Upright", (-2.35, 0.72, 3.65), (0.10, 0.10, 3.05), frame_steel, bevel=0.035)
add_cube("Right Portal Upright", (2.35, 0.72, 3.65), (0.10, 0.10, 3.05), frame_steel, bevel=0.035)
add_cube("Top Motor Bridge", (0.0, 0.72, 6.63), (2.45, 0.11, 0.14), frame_steel, bevel=0.040)
add_cube("Lower Frame Brace", (0.0, 1.40, 1.20), (2.45, 0.08, 0.09), frame_steel, bevel=0.03)
add_cylinder_between("Left Diagonal Brace", (-2.34, 1.55, 0.62), (-1.12, 0.90, 2.38), 0.055, frame_steel)
add_cylinder_between("Right Diagonal Brace", (2.34, 1.55, 0.62), (1.12, 0.90, 2.38), 0.055, frame_steel)


# Tilting open vessel, angled slightly upward toward the viewer.
tank_center = Vector((0.0, -0.05, 3.27))
tank_rotation = (math.radians(78), 0.0, 0.0)
tank_axis = Vector((0.0, -math.sin(math.radians(78)), math.cos(math.radians(78))))
tank_depth = 3.15
front_center = tank_center + tank_axis * (tank_depth * 0.5)
rear_center = tank_center - tank_axis * (tank_depth * 0.5)

add_cylinder("Open Mixing Vessel Shell", tank_center, 1.92, tank_depth, stainless, rotation=tank_rotation, vertices=128, bevel=0.06, open_ends=True)
add_cylinder("Inner Mixing Vessel Liner", tank_center + tank_axis * 0.06, 1.82, tank_depth * 0.94, inner_steel, rotation=tank_rotation, vertices=128, bevel=0.025, open_ends=True)
add_torus("Polished Vessel Mouth", front_center, 1.92, 0.085, polished, rotation=tank_rotation)
add_torus("Inner Vessel Lip", front_center + tank_axis * 0.015, 1.81, 0.032, inner_steel, rotation=tank_rotation)
add_torus("Rear Jacket Band", rear_center + tank_axis * 0.28, 1.92, 0.045, polished, rotation=tank_rotation)

# Rear outer head and internal conical working surface.
add_uv_sphere("Rear Vessel Head", rear_center - tank_axis * 0.10, (1.92, 1.92, 0.56), stainless, rotation=tank_rotation)
cone_center = tank_center - tank_axis * 0.72
add_cone("Internal Conical Base", cone_center, 1.62, 0.25, 1.35, inner_steel, rotation=tank_rotation, vertices=128)
add_cylinder("Central Homogenizer Boss", cone_center + tank_axis * 0.62, 0.19, 0.24, polished, rotation=tank_rotation, vertices=48, bevel=0.025)

# Pivot shafts and side bearing housings.
add_cylinder("Left Pivot Shaft", (-2.02, 0.03, 3.25), 0.23, 0.54, polished, rotation=(0.0, math.radians(90), 0.0), vertices=56, bevel=0.035)
add_cylinder("Right Pivot Shaft", (2.02, 0.03, 3.25), 0.23, 0.54, polished, rotation=(0.0, math.radians(90), 0.0), vertices=56, bevel=0.035)
add_torus("Left Pivot Flange", (-1.94, 0.03, 3.25), 0.34, 0.052, polished, rotation=(0.0, math.radians(90), 0.0))
add_torus("Right Pivot Flange", (1.94, 0.03, 3.25), 0.34, 0.052, polished, rotation=(0.0, math.radians(90), 0.0))


# Right-side tilting gearbox and handwheel.
add_cube("Tilting Gearbox", (2.48, -0.02, 3.10), (0.48, 0.50, 0.55), frame_steel, bevel=0.10)
wheel_center = (2.98, -0.49, 3.10)
add_torus("Tilting Handwheel Rim", wheel_center, 0.43, 0.055, polished, rotation=(0.0, math.radians(90), 0.0))
add_cylinder("Tilting Handwheel Hub", wheel_center, 0.11, 0.16, polished, rotation=(0.0, math.radians(90), 0.0), vertices=40, bevel=0.02)
for index, angle in enumerate((0, 120, 240), start=1):
    radians = math.radians(angle)
    endpoint = (wheel_center[0], wheel_center[1] + math.cos(radians) * 0.39, wheel_center[2] + math.sin(radians) * 0.39)
    add_cylinder_between(f"Handwheel Spoke {index}", wheel_center, endpoint, 0.028, polished, vertices=20)
add_cylinder("Handwheel Grip", (3.08, -0.84, 3.38), 0.06, 0.26, motor_dark, rotation=(0.0, math.radians(90), 0.0), vertices=24, bevel=0.02)


# Top homogenizer drive, shaft, coupling, and disperser head.
add_motor("Vertical Homogenizer", (0.0, 0.70, 7.45), 0.46, 1.45)
add_cylinder("Homogenizer Mounting Collar", (0.0, 0.70, 6.35), 0.30, 0.42, polished, vertices=52, bevel=0.04)
add_cylinder("Mixer Shaft", (0.0, -0.08, 5.13), 0.065, 2.75, polished, vertices=32, bevel=0.012)
add_cylinder("Mixer Shaft Coupling", (0.0, 0.22, 6.25), 0.15, 0.32, polished, vertices=40, bevel=0.025)
add_cylinder("Rotor Head", (0.0, -0.08, 3.76), 0.25, 0.24, polished, vertices=48, bevel=0.035)
for blade_index, angle in enumerate((0, 90), start=1):
    blade = add_cube(
        f"Mixing Blade {blade_index}",
        (0.0, -0.08, 3.74),
        (0.48, 0.07, 0.055),
        polished,
        rotation=(0.0, 0.0, math.radians(angle)),
        bevel=0.025,
    )


# Electrical control box and coiled pendant lead.
add_cube("Control Panel Housing", (2.43, 0.66, 6.98), (0.36, 0.18, 0.48), control_white, bevel=0.055)
add_cube("Control Panel Face", (2.43, 0.46, 6.98), (0.31, 0.025, 0.42), polished, bevel=0.03)
add_cylinder("Control Speed Dial", (2.43, 0.41, 7.12), 0.095, 0.06, accent_blue, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.015)
add_cylinder("Control Toggle", (2.43, 0.40, 6.83), 0.055, 0.08, motor_dark, rotation=(math.radians(90), 0.0, 0.0), vertices=24, bevel=0.012)
add_helix("Coiled Control Cable", (2.84, 0.58, 6.63), 0.11, 1.45, 12, motor_dark, tube_radius=0.025)
add_cylinder_between("Cable Tail", (2.84, 0.58, 5.18), (2.70, 0.33, 4.80), 0.026, motor_dark, vertices=16)


# Small drain fitting at the rear/lower portion of the vessel.
drain_location = rear_center - tank_axis * 0.42 + Vector((0.0, 0.0, -0.65))
add_cylinder("Vessel Drain Neck", drain_location, 0.13, 0.42, polished, rotation=tank_rotation, vertices=36, bevel=0.02)
add_torus("Vessel Drain Flange", drain_location - tank_axis * 0.20, 0.21, 0.040, polished, rotation=tank_rotation)


# Studio floor.
bpy.ops.mesh.primitive_plane_add(size=30, location=(0.0, 0.0, -0.43))
floor = bpy.context.object
floor.name = "Mixer Homogenizer Studio Floor"
assign_material(floor, floor_material)


# Camera and lights.
bpy.ops.object.camera_add(location=(8.5, -12.8, 7.2))
camera = bpy.context.object
camera.name = "Mixer Homogenizer Camera"
camera.data.lens = 55
look_at(camera, (0.0, -0.05, 3.65))
scene.camera = camera


def add_area_light(name, location, energy, size, color, target=(0.0, 0.0, 3.7)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)
    return light


add_area_light("Homogenizer Key Light", (-4.5, -6.0, 10.2), 1750, 5.5, (1.0, 0.92, 0.84))
add_area_light("Homogenizer Fill Light", (6.2, -3.0, 7.5), 1350, 4.5, (0.75, 0.86, 1.0))
add_area_light("Homogenizer Rim Light", (-2.0, 5.8, 9.2), 1500, 4.0, (0.68, 0.80, 1.0))
add_area_light("Homogenizer Front Softbox", (0.0, -7.5, 4.6), 950, 5.0, (1.0, 1.0, 1.0))


# Render configuration.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False

scene.world = bpy.data.worlds.get("Mixer Homogenizer World") or bpy.data.worlds.new("Mixer Homogenizer World")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.055, 0.070, 0.085, 1.0)
background.inputs["Strength"].default_value = 0.50
scene.view_settings.look = "AgX - Medium High Contrast"


# Select the modeled assembly for easy editing, then save and render.
bpy.ops.object.select_all(action="DESELECT")
for obj in machine_collection.objects:
    obj.select_set(True)
if machine_collection.objects:
    bpy.context.view_layer.objects.active = machine_collection.objects[0]

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Saved Blender model: {BLEND_PATH}")
print(f"Saved preview render: {PREVIEW_PATH}")
