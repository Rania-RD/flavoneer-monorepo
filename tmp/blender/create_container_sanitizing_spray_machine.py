import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "ContainerSanitizingSprayMachineScene"
COLLECTION_NAME = "ContainerSanitizingSprayMachine"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "container_sanitizing_spray_machine.blend"
PREVIEW_PATH = OUTPUT_DIR / "container_sanitizing_spray_machine_preview.png"

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


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=64, bevel=0.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if bevel:
        add_bevel(obj, bevel, 3)
    assign_material(obj, material)
    smooth(obj)
    move_to_collection(obj)
    return obj


def add_uv_sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=location)
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
        major_segments=64,
        minor_segments=14,
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


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# Create a dedicated scene without removing any existing models.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)


# Materials.
stainless = make_material("Sanitizer Stainless", (0.59, 0.63, 0.65), metallic=0.97, roughness=0.19)
polished = make_material("Sanitizer Polished Steel", (0.79, 0.82, 0.83), metallic=1.0, roughness=0.10)
dark_metal = make_material("Sanitizer Dark Metal", (0.030, 0.038, 0.043), metallic=0.78, roughness=0.27)
blue = make_material("Sanitizer Blue", (0.025, 0.20, 0.62), metallic=0.15, roughness=0.30)
window_blue = make_material("Inspection Window", (0.035, 0.20, 0.32), metallic=0.12, roughness=0.18)
green = make_material("Exit Conveyor Green", (0.05, 0.42, 0.20), metallic=0.05, roughness=0.38)
red = make_material("Emergency Red", (0.80, 0.025, 0.016), metallic=0.10, roughness=0.25)
yellow = make_material("Warning Yellow", (0.95, 0.50, 0.035), metallic=0.10, roughness=0.30)
black = make_material("Sanitizer Rubber", (0.018, 0.022, 0.025), metallic=0.0, roughness=0.62)
screen = make_material("Sanitizer Screen", (0.05, 0.34, 0.50), metallic=0.15, roughness=0.22)
floor_material = make_material("Sanitizer Studio Floor", (0.69, 0.72, 0.74), metallic=0.0, roughness=0.72)


# Main lower recirculation cabinet.
add_cube("Lower Recirculation Cabinet", (0.0, 0.0, 1.48), (2.72, 0.96, 1.38), stainless, bevel=0.075)
add_cube("Lower Service Door", (0.40, -0.985, 1.58), (2.08, 0.035, 1.13), stainless, bevel=0.035)
add_cube("Lower Left Fixed Panel", (-2.05, -0.985, 1.58), (0.58, 0.035, 1.13), stainless, bevel=0.035)
for index, z in enumerate((0.72, 1.34, 2.04), start=1):
    add_cube(f"Lower Door Hinge {index}", (2.46, -1.035, z), (0.055, 0.055, 0.13), dark_metal, bevel=0.018)

# Upper spray tunnel and roof.
add_cube("Upper Spray Chamber", (0.0, 0.0, 3.78), (2.72, 0.96, 1.02), stainless, bevel=0.065)
add_cube("Sloped Roof", (0.0, 0.0, 4.90), (2.84, 1.04, 0.12), polished, rotation=(0.0, math.radians(-2.0), 0.0), bevel=0.055)


# Three front access doors, handles, and top latches.
door_specs = (("Left", -1.72, 1.00), ("Center", 0.0, 1.26), ("Right", 1.76, 0.90))
for name, x, half_width in door_specs:
    add_cube(f"Upper {name} Access Door", (x, -0.985, 3.76), (half_width, 0.035, 0.93), stainless, bevel=0.035)
    add_cube(f"Upper {name} Door Handle", (x + half_width * 0.62, -1.045, 3.70), (0.055, 0.06, 0.25), dark_metal, bevel=0.035)
    add_cube(f"Upper {name} Door Latch", (x, -1.045, 4.72), (0.10, 0.06, 0.13), dark_metal, bevel=0.025)


# Blue inspection window and bezel on the center door.
add_cube("Inspection Window Bezel", (0.10, -1.050, 3.82), (0.56, 0.045, 0.53), blue, bevel=0.13)
add_cube("Inspection Window Pane", (0.10, -1.103, 3.82), (0.47, 0.025, 0.44), window_blue, bevel=0.10)
for index, (x, z) in enumerate(((-0.18, 4.05), (0.26, 3.95), (-0.05, 3.62), (0.34, 3.53)), start=1):
    add_uv_sphere(f"Window Condensation Mark {index}", (x, -1.135, z), (0.035, 0.012, 0.050), polished)


# Left entrance tunnel and roller conveyor.
add_cube("Entrance Conveyor Base", (-3.83, 0.0, 2.42), (1.12, 0.86, 0.13), stainless, bevel=0.04)
add_cube("Entrance Conveyor Front Rail", (-3.83, -0.91, 2.60), (1.22, 0.06, 0.18), stainless, bevel=0.025)
add_cube("Entrance Conveyor Rear Rail", (-3.83, 0.91, 2.60), (1.22, 0.06, 0.18), stainless, bevel=0.025)
for index, x in enumerate((-4.70, -4.38, -4.06, -3.74, -3.42, -3.10, -2.82), start=1):
    add_cylinder(f"Entrance Roller {index}", (x, 0.0, 2.56), 0.105, 1.62, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=36, bevel=0.015)

# Flexible blue entry strips.
for index, y in enumerate((-0.76, -0.52, -0.28, -0.04, 0.20, 0.44, 0.68), start=1):
    strip = add_cube(f"Entry Curtain Strip {index}", (-2.75, y, 3.53), (0.035, 0.115, 1.00), blue, bevel=0.025)
    strip.rotation_euler.y = math.radians(2.5 * math.sin(index))


# Right exit conveyor with green belt.
add_cube("Exit Conveyor Belt", (3.72, 0.0, 2.54), (1.05, 0.79, 0.08), green, bevel=0.035)
add_cube("Exit Conveyor Front Rail", (3.72, -0.88, 2.66), (1.18, 0.055, 0.16), stainless, bevel=0.025)
add_cube("Exit Conveyor Rear Rail", (3.72, 0.88, 2.66), (1.18, 0.055, 0.16), stainless, bevel=0.025)
for index, x in enumerate((2.90, 3.28, 3.66, 4.04, 4.42), start=1):
    add_cylinder(f"Exit Roller {index}", (x, 0.0, 2.53), 0.10, 1.54, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=36, bevel=0.015)


# Internal spray manifold and nozzles visible at the entrance/exit openings.
add_cylinder("Upper Spray Manifold", (0.0, 0.0, 4.35), 0.075, 4.30, polished, rotation=(0.0, math.radians(90), 0.0), vertices=40, bevel=0.015)
add_cylinder("Lower Spray Manifold", (0.0, 0.0, 2.92), 0.075, 4.30, polished, rotation=(0.0, math.radians(90), 0.0), vertices=40, bevel=0.015)
for index, x in enumerate((-1.85, -1.10, -0.35, 0.40, 1.15, 1.90), start=1):
    add_cylinder(f"Upper Spray Nozzle {index}", (x, 0.0, 4.05), 0.045, 0.52, polished, vertices=24, bevel=0.01)
    nozzle = add_cube(f"Upper Spray Tip {index}", (x, 0.0, 3.77), (0.09, 0.05, 0.045), blue, rotation=(0.0, 0.0, math.radians(25 if index % 2 else -25)), bevel=0.02)
    add_cylinder(f"Lower Spray Nozzle {index}", (x, 0.0, 3.18), 0.045, 0.44, polished, vertices=24, bevel=0.01)


# Drive motor and reduction gearbox on the left.
add_cube("Drive Gearbox", (-4.65, -1.12, 2.05), (0.46, 0.40, 0.48), stainless, bevel=0.09)
add_cylinder("Drive Motor Core", (-3.92, -1.12, 2.05), 0.36, 0.94, dark_metal, rotation=(0.0, math.radians(90), 0.0), vertices=56, bevel=0.05)
for fin_index in range(10):
    angle = math.tau * fin_index / 10
    y = -1.12 + math.cos(angle) * 0.38
    z = 2.05 + math.sin(angle) * 0.38
    add_cube(
        f"Drive Motor Fin {fin_index + 1}",
        (-3.92, y, z),
        (0.39, 0.025, 0.08),
        dark_metal,
        rotation=(math.radians(angle), 0.0, 0.0),
        bevel=0.012,
    )
add_cylinder("Drive Motor End Cap", (-3.43, -1.12, 2.05), 0.38, 0.16, polished, rotation=(0.0, math.radians(90), 0.0), vertices=56, bevel=0.045)
add_cylinder("Motor Emergency Stop", (-3.86, -1.15, 2.61), 0.16, 0.12, red, vertices=40, bevel=0.045)


# Operator control panel on the upper-left front.
add_cube("Operator Panel Housing", (-2.28, -1.17, 3.70), (0.68, 0.22, 0.92), stainless, bevel=0.07)
add_cube("Operator Screen", (-2.46, -1.405, 4.10), (0.30, 0.025, 0.18), screen, bevel=0.035)
for index, (x, z, material) in enumerate(((-2.00, 4.15, green), (-1.76, 4.15, green), (-1.52, 4.15, red), (-1.52, 3.83, red)), start=1):
    add_cylinder(f"Panel Button {index}", (x, -1.41, z), 0.075, 0.06, material, rotation=(math.radians(90), 0.0, 0.0), vertices=32, bevel=0.015)
for index, x in enumerate((-2.36, -2.06, -1.76), start=1):
    add_cylinder(f"Panel Toggle {index}", (x, -1.41, 3.83), 0.052, 0.08, dark_metal, rotation=(math.radians(90), 0.0, 0.0), vertices=24, bevel=0.01)
add_cube("Temperature Controller", (-2.21, -1.415, 3.31), (0.34, 0.025, 0.25), dark_metal, bevel=0.035)
for col in range(4):
    for row in range(2):
        add_cylinder(
            f"Controller Key {row + 1}-{col + 1}",
            (-2.39 + col * 0.12, -1.455, 3.22 + row * 0.12),
            0.035,
            0.035,
            green if col < 3 else red,
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=20,
            bevel=0.008,
        )


# Control cables running toward the drive.
add_pipe("Motor Power Cable", [(-2.40, -1.25, 2.95), (-2.65, -1.32, 2.45), (-3.20, -1.25, 2.05), (-3.55, -1.18, 2.05)], 0.045, black)
add_pipe("Sensor Cable", [(-2.10, -1.24, 2.95), (-2.25, -1.15, 2.50), (-2.70, -1.02, 2.30)], 0.030, black)


# Lower recirculation fittings and drains.
add_cylinder("Front Inspection Port", (0.42, -1.00, 1.86), 0.23, 0.20, dark_metal, rotation=(math.radians(90), 0.0, 0.0), vertices=48, bevel=0.025)
add_torus("Front Inspection Port Rim", (0.42, -1.115, 1.86), 0.27, 0.045, polished, rotation=(math.radians(90), 0.0, 0.0))
add_pipe("Sanitary Sample Valve", [(0.05, -1.03, 1.50), (-0.10, -1.25, 1.42), (-0.10, -1.42, 1.18)], 0.095, polished)
add_cylinder("Sample Valve Body", (-0.10, -1.42, 1.18), 0.15, 0.25, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.025)
add_cylinder("Bottom Drain Outlet", (0.82, -0.96, 0.42), 0.13, 0.52, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.025)
add_cylinder("Drain Blue Handle", (0.82, -1.18, 0.68), 0.06, 0.42, blue, rotation=(0.0, math.radians(90), 0.0), vertices=24, bevel=0.018)


# Machine feet.
for index, (x, y) in enumerate(((-2.46, -0.70), (2.46, -0.70), (-2.46, 0.70), (2.46, 0.70)), start=1):
    add_cylinder(f"Sanitizer Foot Stem {index}", (x, y, 0.16), 0.065, 0.32, dark_metal, vertices=24, bevel=0.012)
    add_cylinder(f"Sanitizer Foot Pad {index}", (x, y, 0.025), 0.21, 0.07, polished, vertices=40, bevel=0.02)


# Machine label.
label_data = bpy.data.curves.new(type="FONT", name="Sanitizer Label Data")
label_data.body = "CONTAINER SANITIZER"
label_data.align_x = "CENTER"
label_data.align_y = "CENTER"
label_data.size = 0.28
label_data.extrude = 0.008
label = bpy.data.objects.new("Sanitizer Label", label_data)
label.location = (0.52, -1.03, 2.34)
label.rotation_euler = (math.radians(90), 0.0, 0.0)
machine_collection.objects.link(label)
assign_material(label, dark_metal)


# Studio floor.
bpy.ops.mesh.primitive_plane_add(size=36, location=(0.0, 0.0, -0.03))
floor = bpy.context.object
floor.name = "Container Sanitizer Studio Floor"
assign_material(floor, floor_material)


# Camera and studio lights.
bpy.ops.object.camera_add(location=(10.4, -15.7, 7.3))
camera = bpy.context.object
camera.name = "Container Sanitizer Camera"
camera.data.lens = 58
look_at(camera, (-0.25, -0.05, 2.65))
scene.camera = camera


def add_area_light(name, location, energy, size, color, target=(-0.2, 0.0, 2.8)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)
    return light


add_area_light("Sanitizer Key Light", (-5.2, -6.5, 9.5), 1850, 6.0, (1.0, 0.93, 0.84))
add_area_light("Sanitizer Fill Light", (7.0, -3.0, 7.3), 1500, 5.0, (0.74, 0.86, 1.0))
add_area_light("Sanitizer Rim Light", (-2.0, 6.0, 8.8), 1550, 4.5, (0.68, 0.80, 1.0))
add_area_light("Sanitizer Front Softbox", (0.0, -8.5, 4.3), 1050, 6.0, (1.0, 1.0, 1.0))


# Render configuration.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False

scene.world = bpy.data.worlds.get("Container Sanitizer World") or bpy.data.worlds.new("Container Sanitizer World")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.045, 0.060, 0.075, 1.0)
background.inputs["Strength"].default_value = 0.48
scene.view_settings.look = "AgX - Medium High Contrast"


# Select the machine for convenient editing, then save and render.
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
