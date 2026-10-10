import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "ColdRoomProcessTankScene"
COLLECTION_NAME = "ColdRoomProcessTank"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "cold_room_process_tank.blend"
PREVIEW_PATH = OUTPUT_DIR / "cold_room_process_tank_preview.png"

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


def move_to_collection(obj, collection):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def add_bevel(obj, width=0.08, segments=3):
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
    move_to_collection(obj, machine_collection)
    return obj


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=64, bevel=0.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if bevel:
        add_bevel(obj, bevel, 3)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj, machine_collection)
    return obj


def add_uv_sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj, machine_collection)
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
    move_to_collection(obj, machine_collection)
    return obj


def add_cylinder_between(name, start, end, radius, material, vertices=24):
    start_v = Vector(start)
    end_v = Vector(end)
    midpoint = (start_v + end_v) * 0.5
    direction = end_v - start_v
    obj = add_cylinder(name, midpoint, radius, direction.length, material, vertices=vertices, bevel=0.015)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_motor(prefix, location, body_radius, body_height):
    x, y, z = location
    add_cylinder(f"{prefix} Gearbox", (x, y, z - body_height * 0.62), body_radius * 0.72, body_height * 0.46, polished, vertices=48, bevel=0.05)
    add_cylinder(f"{prefix} Lower Coupling", (x, y, z - body_height * 0.88), body_radius * 0.52, body_height * 0.18, dark_metal, vertices=40, bevel=0.025)
    add_cylinder(f"{prefix} Motor Core", (x, y, z), body_radius * 0.82, body_height, motor_dark, vertices=64, bevel=0.05)
    for fin_index in range(12):
        angle = math.tau * fin_index / 12
        fin_radius = body_radius * 0.88
        fin_x = x + math.cos(angle) * fin_radius
        fin_y = y + math.sin(angle) * fin_radius
        fin = add_cube(
            f"{prefix} Cooling Fin {fin_index + 1}",
            (fin_x, fin_y, z),
            (body_radius * 0.035, body_radius * 0.12, body_height * 0.43),
            motor_dark,
            rotation=(0.0, 0.0, angle),
            bevel=0.015,
        )
    add_cylinder(f"{prefix} Top Cap", (x, y, z + body_height * 0.57), body_radius * 0.92, body_height * 0.19, silver_gray, vertices=64, bevel=0.06)
    add_cube(f"{prefix} Terminal Box", (x + body_radius * 0.98, y, z + body_height * 0.05), (body_radius * 0.20, body_radius * 0.28, body_height * 0.22), silver_gray, bevel=0.04)


# Create a separate scene, preserving the previously generated equipment.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)


# Materials.
stainless = make_material("Cold Room Tank Stainless", (0.54, 0.58, 0.60), metallic=0.98, roughness=0.16)
polished = make_material("Cold Room Polished Steel", (0.76, 0.80, 0.82), metallic=1.0, roughness=0.10)
frame_steel = make_material("Access Frame Steel", (0.26, 0.29, 0.31), metallic=0.92, roughness=0.22)
motor_dark = make_material("Motor Housing", (0.065, 0.075, 0.082), metallic=0.72, roughness=0.28)
dark_metal = make_material("Mechanical Dark Metal", (0.025, 0.030, 0.034), metallic=0.80, roughness=0.26)
silver_gray = make_material("Motor Cap Silver", (0.48, 0.52, 0.54), metallic=0.88, roughness=0.21)
blue_accent = make_material("Process Blue", (0.02, 0.20, 0.48), metallic=0.25, roughness=0.30)
floor_material = make_material("Cold Room Studio Floor", (0.67, 0.71, 0.74), metallic=0.0, roughness=0.70)


# Main tank shell and jacket seams.
add_cylinder("Main Jacketed Vessel", (0.0, 0.0, 4.12), 2.28, 3.55, stainless, vertices=128, bevel=0.14)
add_uv_sphere("Upper Domed Head", (0.0, 0.0, 5.88), (2.25, 2.25, 0.78), stainless)
add_uv_sphere("Lower Domed Head", (0.0, 0.0, 2.34), (2.22, 2.22, 0.58), stainless)
add_torus("Upper Jacket Seam", (0.0, 0.0, 5.72), 2.26, 0.030, polished)
add_torus("Lower Jacket Seam", (0.0, 0.0, 2.50), 2.24, 0.032, polished)
add_torus("Mid Jacket Detail", (0.0, 0.0, 4.95), 2.275, 0.020, polished)


# Four long vessel legs with foot plates.
leg_positions = [(-1.72, -1.42), (1.72, -1.42), (-1.72, 1.42), (1.72, 1.42)]
for index, (x, y) in enumerate(leg_positions, start=1):
    add_cylinder(f"Vessel Leg {index}", (x, y, 1.22), 0.16, 2.45, polished, vertices=48, bevel=0.03)
    add_cylinder(f"Vessel Foot {index}", (x, y, 0.03), 0.31, 0.08, polished, vertices=48, bevel=0.02)


# Product port on the front and a smaller side port.
add_cylinder("Front Process Neck", (-0.52, -2.17, 4.18), 0.24, 0.34, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=48, bevel=0.025)
add_torus("Front Process Flange", (-0.52, -2.35, 4.18), 0.31, 0.055, polished, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Front Process Opening", (-0.52, -2.43, 4.18), 0.15, 0.08, dark_metal, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.01)
add_cylinder("Right Jacket Port", (2.23, 0.18, 4.58), 0.11, 0.43, polished, rotation=(0.0, math.radians(90), 0.0), vertices=32, bevel=0.02)
add_torus("Right Port Flange", (2.45, 0.18, 4.58), 0.17, 0.035, polished, rotation=(0.0, math.radians(90), 0.0))


# Slanted sanitary manway on the upper head.
manway_rotation = (math.radians(67), 0.0, math.radians(-10))
add_cylinder("Upper Manway Neck", (-0.82, -1.02, 6.15), 0.75, 0.34, polished, rotation=manway_rotation, vertices=72, bevel=0.045)
add_torus("Upper Manway Clamp Ring", (-0.84, -1.12, 6.33), 0.77, 0.065, polished, rotation=manway_rotation)
add_cylinder("Upper Manway Lid", (-0.86, -1.18, 6.41), 0.70, 0.13, stainless, rotation=manway_rotation, vertices=72, bevel=0.045)
add_cube("Upper Manway Hinge", (-1.52, -1.02, 6.32), (0.20, 0.15, 0.13), dark_metal, rotation=manway_rotation, bevel=0.035)
for index, angle in enumerate((20, 150, 270), start=1):
    radians = math.radians(angle)
    add_cylinder(
        f"Manway Clamp {index}",
        (-0.84 + math.cos(radians) * 0.74, -1.12 + math.sin(radians) * 0.26, 6.33 + math.sin(radians) * 0.17),
        0.045,
        0.30,
        dark_metal,
        rotation=manway_rotation,
        vertices=24,
        bevel=0.01,
    )


# Three top-mounted agitator/drive motors with finned housings.
add_motor("Left Auxiliary Drive", (-0.92, 0.42, 6.98), 0.40, 1.08)
add_motor("Center Main Drive", (0.28, 0.42, 7.32), 0.43, 1.16)
add_motor("Right Main Drive", (1.28, 0.35, 7.26), 0.43, 1.18)


# Drive mounting collars and shafts on the tank head.
for index, (x, y, z, radius) in enumerate(((-0.92, 0.42, 6.38, 0.30), (0.28, 0.42, 6.60, 0.32), (1.28, 0.35, 6.56, 0.32)), start=1):
    add_cylinder(f"Drive Mount Collar {index}", (x, y, z), radius, 0.42, polished, vertices=56, bevel=0.04)
    add_torus(f"Drive Mount Flange {index}", (x, y, z - 0.18), radius + 0.10, 0.045, polished)


# Access platform behind/left of the vessel.
platform_center = (-3.35, -0.10, 4.14)
add_cube("Service Platform Deck", platform_center, (1.24, 1.42, 0.10), frame_steel, bevel=0.025)
for index, (x, y) in enumerate(((-4.42, -1.25), (-2.30, -1.25), (-4.42, 1.05), (-2.30, 1.05)), start=1):
    add_cube(f"Platform Support {index}", (x, y, 2.05), (0.085, 0.085, 2.05), frame_steel, bevel=0.025)
    add_cube(f"Platform Foot {index}", (x, y, 0.04), (0.20, 0.20, 0.04), frame_steel, bevel=0.02)

# Cross braces beneath the deck.
add_cylinder_between("Platform Front Cross Brace A", (-4.40, -1.25, 0.50), (-2.32, -1.25, 3.85), 0.055, frame_steel)
add_cylinder_between("Platform Front Cross Brace B", (-2.32, -1.25, 0.50), (-4.40, -1.25, 3.85), 0.055, frame_steel)
add_cylinder_between("Platform Rear Cross Brace A", (-4.40, 1.05, 0.50), (-2.32, 1.05, 3.85), 0.055, frame_steel)


# Platform safety rail posts and horizontal rails.
rail_post_points = [(-4.48, -1.32), (-4.48, 0.00), (-4.48, 1.12), (-3.38, 1.12), (-2.28, 1.12), (-2.28, 0.15)]
for index, (x, y) in enumerate(rail_post_points, start=1):
    add_cube(f"Platform Railing Post {index}", (x, y, 4.92), (0.045, 0.045, 0.80), polished, bevel=0.02)

add_cube("Platform Left Top Rail", (-4.48, -0.10, 5.71), (0.045, 1.22, 0.045), polished, bevel=0.02)
add_cube("Platform Left Mid Rail", (-4.48, -0.10, 5.05), (0.035, 1.22, 0.035), polished, bevel=0.015)
add_cube("Platform Rear Top Rail", (-3.38, 1.12, 5.71), (1.10, 0.045, 0.045), polished, bevel=0.02)
add_cube("Platform Rear Mid Rail", (-3.38, 1.12, 5.05), (1.10, 0.035, 0.035), polished, bevel=0.015)
add_cube("Platform Near Top Rail", (-3.38, -1.32, 5.71), (1.10, 0.045, 0.045), polished, bevel=0.02)
add_cube("Platform Near Mid Rail", (-3.38, -1.32, 5.05), (1.10, 0.035, 0.035), polished, bevel=0.015)


# Staircase: seven treads, stringers, and handrails descending left/front.
stair_bottom_x = -6.02
stair_top_x = -4.42
stair_y = -0.35
stair_bottom_z = 0.32
stair_top_z = 4.02
step_count = 7
for index in range(step_count):
    t = index / (step_count - 1)
    x = stair_bottom_x + (stair_top_x - stair_bottom_x) * t
    z = stair_bottom_z + (stair_top_z - stair_bottom_z) * t
    add_cube(f"Stair Tread {index + 1}", (x, stair_y, z), (0.32, 0.78, 0.075), frame_steel, bevel=0.025)

for side_index, y in enumerate((-1.10, 0.40), start=1):
    add_cylinder_between(
        f"Stair Stringer {side_index}",
        (stair_bottom_x - 0.18, y, stair_bottom_z - 0.16),
        (stair_top_x + 0.18, y, stair_top_z - 0.02),
        0.075,
        frame_steel,
        vertices=32,
    )
    add_cylinder_between(
        f"Stair Handrail {side_index}",
        (stair_bottom_x - 0.10, y, stair_bottom_z + 0.78),
        (stair_top_x + 0.12, y, stair_top_z + 1.05),
        0.045,
        polished,
        vertices=24,
    )
    for post_index, t in enumerate((0.20, 0.48, 0.76), start=1):
        x = stair_bottom_x + (stair_top_x - stair_bottom_x) * t
        z = stair_bottom_z + (stair_top_z - stair_bottom_z) * t
        add_cylinder_between(
            f"Stair Rail Post {side_index}-{post_index}",
            (x, y, z),
            (x, y, z + 0.88),
            0.04,
            polished,
            vertices=20,
        )


# Lower drain and rectangular service housing.
add_cylinder("Bottom Drain Neck", (0.10, -0.10, 1.92), 0.18, 0.60, polished, vertices=40, bevel=0.025)
add_torus("Bottom Drain Flange", (0.10, -0.10, 1.63), 0.25, 0.045, polished)
add_cube("Lower Service Housing", (0.72, 0.65, 1.48), (0.54, 0.42, 0.58), frame_steel, bevel=0.08)


# Identification plate.
add_cube("Process Tank Nameplate", (0.78, -2.285, 3.32), (0.66, 0.025, 0.25), polished, bevel=0.035)
text_curve = bpy.data.curves.new(type="FONT", name="Cold Room Tank Label Data")
text_curve.body = "PROCESS TANK"
text_curve.align_x = "CENTER"
text_curve.align_y = "CENTER"
text_curve.size = 0.22
text_curve.extrude = 0.006
text_obj = bpy.data.objects.new("Process Tank Label", text_curve)
text_obj.location = (0.78, -2.33, 3.32)
text_obj.rotation_euler = (math.radians(90), 0.0, 0.0)
text_obj.scale = (0.72, 0.72, 0.72)
machine_collection.objects.link(text_obj)
assign_material(text_obj, dark_metal)


# Studio floor.
bpy.ops.mesh.primitive_plane_add(size=34, location=(-0.8, 0.0, -0.02))
floor = bpy.context.object
floor.name = "Cold Room Process Tank Studio Floor"
assign_material(floor, floor_material)


# Camera and lighting.
bpy.ops.object.camera_add(location=(10.8, -14.5, 8.2))
camera = bpy.context.object
camera.name = "Cold Room Process Tank Camera"
camera.data.lens = 54
look_at(camera, (-1.10, -0.05, 3.85))
scene.camera = camera


def add_area_light(name, location, energy, size, color, target=(-1.0, 0.0, 4.0)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)
    return light


add_area_light("Process Tank Key Light", (-5.0, -7.0, 11.5), 1700, 6.0, (1.0, 0.92, 0.82))
add_area_light("Process Tank Fill Light", (7.0, -3.0, 8.5), 1250, 5.0, (0.72, 0.84, 1.0))
add_area_light("Process Tank Rim Light", (-2.0, 6.0, 10.0), 1550, 4.5, (0.68, 0.80, 1.0))
add_area_light("Platform Softbox", (-6.5, -3.5, 6.0), 850, 4.0, (1.0, 1.0, 1.0), target=(-3.5, 0.0, 3.2))


# Render configuration.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False

scene.world = bpy.data.worlds.get("Cold Room Process Tank World") or bpy.data.worlds.new("Cold Room Process Tank World")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.025, 0.035, 0.045, 1.0)
background.inputs["Strength"].default_value = 0.40
scene.view_settings.look = "AgX - Medium High Contrast"


# Select the assembly for convenient editing and save/render.
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
