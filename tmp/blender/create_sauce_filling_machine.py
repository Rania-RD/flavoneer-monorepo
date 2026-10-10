import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "SauceFillingMachineScene"
COLLECTION_NAME = "SauceFillingMachine"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "sauce_filling_machine.blend"
PREVIEW_PATH = OUTPUT_DIR / "sauce_filling_machine_preview.png"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def make_material(name, color, metallic=0.0, roughness=0.4):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return material


def make_glass_material(name):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    glass = nodes.new("ShaderNodeBsdfGlass")
    glass.inputs["Color"].default_value = (0.74, 0.90, 1.0, 1.0)
    glass.inputs["Roughness"].default_value = 0.12
    glass.inputs["IOR"].default_value = 1.45
    links.new(glass.outputs["BSDF"], output.inputs["Surface"])
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
    curve_data.resolution_u = 12
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


# Preserve all earlier equipment by using a dedicated scene.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)


# Materials.
stainless = make_material("Sauce Filler Stainless", (0.60, 0.64, 0.66), metallic=0.97, roughness=0.18)
polished = make_material("Sauce Filler Polished Steel", (0.80, 0.83, 0.84), metallic=1.0, roughness=0.10)
dark_metal = make_material("Sauce Filler Dark Metal", (0.035, 0.045, 0.052), metallic=0.78, roughness=0.25)
glass = make_glass_material("Sauce Filler Safety Glass")
green = make_material("Conveyor Green", (0.08, 0.48, 0.22), metallic=0.05, roughness=0.36)
red = make_material("Status Red", (0.72, 0.028, 0.018), metallic=0.12, roughness=0.28)
yellow = make_material("Status Yellow", (0.95, 0.48, 0.03), metallic=0.10, roughness=0.30)
blue = make_material("Screen Blue", (0.04, 0.34, 0.62), metallic=0.18, roughness=0.24)
sauce = make_material("Tomato Sauce", (0.58, 0.035, 0.018), metallic=0.0, roughness=0.30)
white_plastic = make_material("Bottle Plastic", (0.82, 0.87, 0.89), metallic=0.0, roughness=0.24)
rubber = make_material("Pump Rubber", (0.025, 0.030, 0.034), metallic=0.0, roughness=0.60)
floor_material = make_material("Sauce Filler Studio Floor", (0.73, 0.75, 0.77), metallic=0.0, roughness=0.72)


# Lower stainless cabinet and body frame.
add_cube("Lower Cabinet Body", (0.0, 0.0, 1.55), (2.36, 0.82, 1.23), stainless, bevel=0.075)
add_cube("Lower Left Door", (-1.16, -0.845, 1.58), (1.12, 0.035, 1.13), stainless, bevel=0.035)
add_cube("Lower Right Door", (1.16, -0.845, 1.58), (1.12, 0.035, 1.13), stainless, bevel=0.035)
add_cube("Left Door Handle", (-0.18, -0.905, 1.72), (0.035, 0.045, 0.25), dark_metal, bevel=0.025)
add_cube("Right Door Handle", (0.18, -0.905, 1.72), (0.035, 0.045, 0.25), dark_metal, bevel=0.025)

for side, x in (("Left", -2.30), ("Right", 2.30)):
    for row, z in enumerate((0.72, 1.42, 2.12), start=1):
        add_cube(f"{side} Door Hinge {row}", (x, -0.91, z), (0.055, 0.055, 0.12), dark_metal, bevel=0.018)

# Adjustable machine feet.
for index, (x, y) in enumerate(((-2.12, -0.62), (2.12, -0.62), (-2.12, 0.62), (2.12, 0.62)), start=1):
    add_cylinder(f"Machine Foot Stem {index}", (x, y, 0.20), 0.065, 0.40, dark_metal, vertices=24, bevel=0.012)
    add_cylinder(f"Machine Foot Pad {index}", (x, y, 0.025), 0.22, 0.07, polished, vertices=40, bevel=0.02)


# Upper transparent filling chamber with stainless structural frame.
add_cube("Upper Back Panel", (0.0, 0.78, 3.73), (2.36, 0.05, 1.02), stainless, bevel=0.035)
add_cube("Front Safety Glass", (0.0, -0.79, 3.72), (2.10, 0.025, 0.88), glass, bevel=0.015)
add_cube("Left Safety Glass", (-2.28, 0.0, 3.72), (0.025, 0.75, 0.88), glass, bevel=0.015)
add_cube("Right Safety Glass", (2.28, 0.0, 3.72), (0.025, 0.75, 0.88), glass, bevel=0.015)

for name, location, scale in (
    ("Upper Frame Left", (-2.28, -0.80, 3.72), (0.07, 0.07, 0.98)),
    ("Upper Frame Right", (2.28, -0.80, 3.72), (0.07, 0.07, 0.98)),
    ("Upper Frame Top", (0.0, -0.80, 4.67), (2.34, 0.07, 0.07)),
    ("Upper Frame Bottom", (0.0, -0.80, 2.77), (2.34, 0.07, 0.07)),
    ("Upper Frame Center", (0.0, -0.82, 3.72), (0.045, 0.045, 0.90)),
):
    add_cube(name, location, scale, polished, bevel=0.025)

# Top fascia and colored operating bands.
add_cube("Top Fascia", (0.0, 0.0, 5.00), (2.36, 0.82, 0.32), stainless, bevel=0.06)
add_cube("Red Status Band", (0.0, -0.835, 4.64), (2.02, 0.025, 0.07), red, bevel=0.02)
add_cube("Green Status Band", (0.0, -0.842, 4.45), (2.02, 0.025, 0.07), green, bevel=0.02)


# Brand label on the front fascia.
label_data = bpy.data.curves.new(type="FONT", name="Sauce Filler Label Data")
label_data.body = "SAUCE FILLING"
label_data.align_x = "CENTER"
label_data.align_y = "CENTER"
label_data.size = 0.42
label_data.extrude = 0.012
label = bpy.data.objects.new("Sauce Filling Label", label_data)
label.location = (0.0, -0.845, 5.05)
label.rotation_euler = (math.radians(90), 0.0, 0.0)
machine_collection.objects.link(label)
assign_material(label, dark_metal)


# Conveyor belt, guides, and rollers spanning both sides of the machine.
add_cube("Conveyor Belt", (0.0, -0.28, 2.72), (4.38, 0.48, 0.08), green, bevel=0.035)
add_cube("Conveyor Front Rail", (0.0, -0.78, 2.85), (4.55, 0.055, 0.15), stainless, bevel=0.025)
add_cube("Conveyor Rear Rail", (0.0, 0.22, 2.85), (4.55, 0.055, 0.15), stainless, bevel=0.025)
for index, x in enumerate((-4.10, -2.20, 0.0, 2.20, 4.10), start=1):
    add_cylinder(f"Conveyor Roller {index}", (x, -0.28, 2.72), 0.13, 0.95, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.02)

# Adjustable conveyor guide knobs.
for side, x in (("Left", -3.55), ("Right", 3.55)):
    add_cylinder(f"{side} Guide Post", (x, -0.78, 3.15), 0.045, 0.52, dark_metal, vertices=24, bevel=0.01)
    add_cube(f"{side} Guide Knob", (x, -0.78, 3.43), (0.16, 0.08, 0.07), dark_metal, bevel=0.055)
    add_cube(f"{side} Guide Clamp", (x, -0.78, 2.90), (0.12, 0.07, 0.15), dark_metal, bevel=0.03)


# Filling manifold, six actuator cylinders, hoses, and nozzles.
add_cylinder("Filling Manifold", (0.0, -0.18, 4.10), 0.13, 3.70, polished, rotation=(0.0, math.radians(90), 0.0), vertices=56, bevel=0.025)
nozzle_x_positions = (-1.55, -0.93, -0.31, 0.31, 0.93, 1.55)
for index, x in enumerate(nozzle_x_positions, start=1):
    add_cylinder(f"Filling Actuator {index}", (x, -0.20, 3.78), 0.13, 0.58, stainless, vertices=40, bevel=0.025)
    add_cylinder(f"Filling Nozzle {index}", (x, -0.20, 3.33), 0.055, 0.58, polished, vertices=28, bevel=0.012)
    add_torus(f"Nozzle Clamp {index}", (x, -0.20, 3.63), 0.16, 0.030, dark_metal)
    add_pipe(
        f"Product Hose {index}",
        [(x, 0.10, 4.42), (x, -0.08, 4.25), (x, -0.20, 4.05)],
        0.035,
        blue,
    )


# Sample sauce containers under the nozzle bank.
for index, x in enumerate((-1.24, -0.62, 0.0, 0.62, 1.24), start=1):
    add_cylinder(f"Sauce Container {index}", (x, -0.28, 2.96), 0.17, 0.42, white_plastic, vertices=40, bevel=0.035)
    add_cylinder(f"Sauce Fill {index}", (x, -0.28, 2.90), 0.145, 0.26, sauce, vertices=40, bevel=0.020)
    add_torus(f"Container Rim {index}", (x, -0.28, 3.17), 0.17, 0.025, polished)


# Lower pneumatic and product tubing visible through the chamber.
add_pipe("Lower Product Tube", [(-1.85, -0.42, 3.05), (-0.80, -0.42, 3.00), (0.20, -0.42, 3.08), (1.88, -0.42, 3.02)], 0.045, blue)
add_cylinder("Air Distribution Rail", (0.0, 0.28, 3.16), 0.055, 3.55, polished, rotation=(0.0, math.radians(90), 0.0), vertices=32, bevel=0.012)


# External sanitary loop pipe on the left/top of the machine.
add_pipe(
    "Sanitary Supply Loop",
    [(-2.62, 0.12, 2.48), (-3.05, 0.12, 2.90), (-3.05, 0.12, 5.48), (-2.72, 0.12, 5.82), (1.82, 0.12, 5.82)],
    0.095,
    polished,
)
add_torus("Supply Clamp Lower", (-2.88, 0.12, 2.70), 0.16, 0.030, dark_metal, rotation=(math.radians(90), 0.0, 0.0))
add_torus("Supply Clamp Upper", (-2.85, 0.12, 5.68), 0.16, 0.030, dark_metal, rotation=(math.radians(90), 0.0, 0.0))


# External double-diaphragm pump on the lower left.
pump_center = (-3.02, 0.10, 1.50)
add_cylinder("Pump Center Block", pump_center, 0.28, 0.62, stainless, rotation=(math.radians(90), 0.0, 0.0), vertices=48, bevel=0.055)
add_uv_sphere("Pump Left Diaphragm", (-3.02, -0.22, 1.50), (0.62, 0.18, 0.62), stainless)
add_uv_sphere("Pump Right Diaphragm", (-3.02, 0.42, 1.50), (0.62, 0.18, 0.62), stainless)
add_torus("Pump Front Clamp", (-3.02, -0.40, 1.50), 0.55, 0.055, dark_metal, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Pump Lower Outlet", (-3.02, 0.10, 0.82), 0.12, 0.62, polished, vertices=32, bevel=0.02)
add_pipe("Pump To Supply Pipe", [(-3.02, 0.10, 1.98), (-2.83, 0.10, 2.28), (-2.62, 0.10, 2.48)], 0.085, polished)
add_cube("Pump Mount", (-3.02, 0.10, 0.63), (0.48, 0.32, 0.08), dark_metal, bevel=0.03)


# Right-side operator control panel.
add_cube("Control Box", (2.93, -0.15, 4.64), (0.53, 0.34, 0.76), stainless, bevel=0.065)
add_cube("Control Screen", (2.93, -0.505, 4.86), (0.36, 0.025, 0.30), blue, bevel=0.035)
add_cylinder("Control Red Button", (2.66, -0.52, 4.32), 0.095, 0.07, red, rotation=(math.radians(90), 0.0, 0.0), vertices=36, bevel=0.02)
add_cylinder("Control Yellow Button", (2.93, -0.52, 4.32), 0.095, 0.07, yellow, rotation=(math.radians(90), 0.0, 0.0), vertices=36, bevel=0.02)
add_cylinder("Control Green Button", (3.20, -0.52, 4.32), 0.095, 0.07, green, rotation=(math.radians(90), 0.0, 0.0), vertices=36, bevel=0.02)
add_cube("Control Support Arm", (2.50, 0.10, 4.64), (0.34, 0.08, 0.08), polished, bevel=0.025)
add_pipe("Control Cable", [(2.70, 0.15, 4.10), (2.82, 0.02, 3.88), (2.82, -0.02, 3.62)], 0.035, rubber)


# Studio floor.
bpy.ops.mesh.primitive_plane_add(size=34, location=(0.0, 0.0, -0.03))
floor = bpy.context.object
floor.name = "Sauce Filling Machine Studio Floor"
assign_material(floor, floor_material)


# Camera and studio lights.
bpy.ops.object.camera_add(location=(10.6, -16.4, 7.6))
camera = bpy.context.object
camera.name = "Sauce Filling Machine Camera"
camera.data.lens = 58
look_at(camera, (0.0, -0.05, 2.85))
scene.camera = camera


def add_area_light(name, location, energy, size, color, target=(0.0, 0.0, 3.0)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)
    return light


add_area_light("Sauce Filler Key Light", (-5.0, -6.5, 10.0), 1850, 6.0, (1.0, 0.93, 0.84))
add_area_light("Sauce Filler Fill Light", (7.0, -3.5, 7.4), 1500, 5.0, (0.74, 0.86, 1.0))
add_area_light("Sauce Filler Rim Light", (-2.0, 6.0, 8.8), 1600, 4.5, (0.68, 0.80, 1.0))
add_area_light("Sauce Filler Front Softbox", (0.0, -8.5, 4.6), 1100, 6.0, (1.0, 1.0, 1.0))


# Render configuration.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False

scene.world = bpy.data.worlds.get("Sauce Filling Machine World") or bpy.data.worlds.new("Sauce Filling Machine World")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.045, 0.060, 0.075, 1.0)
background.inputs["Strength"].default_value = 0.48
scene.view_settings.look = "AgX - Medium High Contrast"


# Select assembly, save, and render.
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
