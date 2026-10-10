import bpy
import math
from mathutils import Vector
from pathlib import Path


SCENE_NAME = "JacketedMixingTankScene"
COLLECTION_NAME = "JacketedMixingTank"
OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "jacketed_mixing_tank.blend"
PREVIEW_PATH = OUTPUT_DIR / "jacketed_mixing_tank_preview.png"

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


def add_cube(name, location, scale, material, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        add_bevel(obj, bevel, 4)
    assign_material(obj, material)
    move_to_collection(obj, machine_collection)
    return obj


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=64, bevel=0.04):
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


def add_pipe(name, points, radius, material, resolution=4):
    curve_data = bpy.data.curves.new(name=f"{name}Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = resolution
    curve_data.resolution_u = 12
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


# Work in a new scene so the existing pasteurizer scene remains intact.
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene

machine_collection = bpy.data.collections.get(COLLECTION_NAME)
if machine_collection is None:
    machine_collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(machine_collection)


# Materials
stainless = make_material("Tank Stainless Steel", (0.47, 0.52, 0.54), metallic=0.96, roughness=0.18)
polished = make_material("Polished Stainless", (0.72, 0.77, 0.78), metallic=1.0, roughness=0.11)
dark_metal = make_material("Caster Dark Metal", (0.035, 0.045, 0.05), metallic=0.72, roughness=0.25)
rubber = make_material("Caster Rubber", (0.012, 0.014, 0.016), metallic=0.0, roughness=0.62)
white_rubber = make_material("Caster Wheel", (0.62, 0.67, 0.68), metallic=0.05, roughness=0.42)
blue = make_material("Valve Blue", (0.018, 0.16, 0.42), metallic=0.25, roughness=0.25)
black = make_material("Handle Black", (0.018, 0.022, 0.025), metallic=0.05, roughness=0.46)
floor_material = make_material("Tank Studio Floor", (0.74, 0.76, 0.77), metallic=0.0, roughness=0.72)


# Main jacketed vessel.
body = add_cylinder("Jacketed Vessel Body", (0.0, 0.0, 3.75), 2.15, 3.95, stainless, bevel=0.16, vertices=128)
top_dome = add_uv_sphere("Rounded Top Dome", (0.0, 0.0, 5.72), (2.15, 2.15, 0.72), stainless)
bottom_dome = add_uv_sphere("Rounded Bottom Dome", (0.0, 0.0, 1.82), (2.10, 2.10, 0.42), stainless)
add_torus("Upper Jacket Seam", (0.0, 0.0, 5.55), 2.13, 0.025, polished)
add_torus("Lower Jacket Seam", (0.0, 0.0, 1.96), 2.13, 0.025, polished)


# Four tubular legs, base plates, frame, and swiveling casters.
leg_positions = [(-1.64, -1.48), (1.64, -1.48), (-1.64, 1.48), (1.64, 1.48)]
for index, (x, y) in enumerate(leg_positions, start=1):
    add_cylinder(f"Support Leg {index}", (x, y, 1.02), 0.19, 2.05, polished, vertices=48, bevel=0.035)
    add_cube(f"Leg Plate {index}", (x, y, 0.05), (0.32, 0.28, 0.045), polished, bevel=0.025)
    add_cylinder(f"Caster Stem {index}", (x, y, -0.08), 0.085, 0.34, dark_metal, vertices=32, bevel=0.02)
    add_cube(f"Caster Fork {index}", (x, y, -0.28), (0.18, 0.10, 0.18), dark_metal, bevel=0.04)
    add_torus(
        f"Caster Tire {index}",
        (x, y, -0.46),
        0.25,
        0.075,
        rubber,
        rotation=(math.radians(90), 0.0, 0.0),
    )
    add_cylinder(
        f"Caster Hub {index}",
        (x, y, -0.46),
        0.12,
        0.24,
        white_rubber,
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=40,
        bevel=0.015,
    )

add_cube("Front Frame Rail", (0.0, -1.48, 0.54), (1.65, 0.08, 0.10), polished, bevel=0.04)
add_cube("Rear Frame Rail", (0.0, 1.48, 0.54), (1.65, 0.08, 0.10), polished, bevel=0.04)
add_cube("Left Frame Rail", (-1.64, 0.0, 0.54), (0.08, 1.48, 0.10), polished, bevel=0.04)
add_cube("Right Frame Rail", (1.64, 0.0, 0.54), (0.08, 1.48, 0.10), polished, bevel=0.04)


# Top manway with lid, hinge, and tightening handle.
add_cylinder("Manway Neck", (-0.73, -0.12, 6.18), 0.76, 0.36, polished, vertices=72, bevel=0.04)
add_torus("Manway Clamp Ring", (-0.73, -0.12, 6.38), 0.78, 0.07, polished)
add_cylinder("Manway Lid", (-0.73, -0.12, 6.45), 0.73, 0.13, stainless, vertices=72, bevel=0.05)
add_cube("Manway Hinge", (-1.48, -0.12, 6.43), (0.20, 0.16, 0.12), dark_metal, bevel=0.04)
add_cylinder("Manway Clamp Post", (-0.38, -0.22, 6.86), 0.055, 0.70, polished, vertices=32, bevel=0.015)
add_cube("Manway Hand Knob", (-0.38, -0.22, 7.24), (0.23, 0.13, 0.10), black, bevel=0.08)


# Sanitary top outlet and butterfly valve.
add_pipe(
    "Top Sanitary Outlet Pipe",
    [(0.95, 0.02, 6.20), (0.95, 0.02, 6.72), (1.22, 0.02, 7.05), (1.72, 0.02, 7.08)],
    0.12,
    polished,
)
add_torus("Top Outlet Base Clamp", (0.95, 0.02, 6.28), 0.20, 0.045, polished)
add_cylinder("Top Valve Body", (1.82, 0.02, 7.08), 0.29, 0.23, polished, rotation=(0.0, math.radians(90), 0.0), vertices=64, bevel=0.025)
add_torus("Top Valve Clamp", (1.70, 0.02, 7.08), 0.31, 0.035, dark_metal, rotation=(0.0, math.radians(90), 0.0))
add_cylinder("Top Outlet Nozzle", (2.13, 0.02, 7.08), 0.20, 0.48, polished, rotation=(0.0, math.radians(90), 0.0), vertices=48, bevel=0.025)
add_cylinder("Top Valve Handle Stem", (1.80, 0.02, 7.47), 0.045, 0.57, dark_metal, vertices=24, bevel=0.01)
add_cylinder("Top Valve Handle", (1.80, 0.02, 7.77), 0.065, 0.66, dark_metal, rotation=(0.0, math.radians(90), 0.0), vertices=24, bevel=0.025)
add_uv_sphere("Top Valve Handle Grip", (2.16, 0.02, 7.77), (0.11, 0.11, 0.11), black)


# Small pressure/temperature port and blue lever.
add_cylinder("Instrument Port", (0.15, -0.10, 6.43), 0.095, 0.38, polished, vertices=32, bevel=0.02)
add_cylinder("Blue Lever Stem", (0.30, -0.14, 6.63), 0.035, 0.46, blue, vertices=24, bevel=0.01)
add_cube("Blue Lever", (0.30, -0.14, 6.88), (0.04, 0.05, 0.21), blue, bevel=0.025)


# Side lifting/handling bar visible on the front-left side.
add_pipe(
    "Side Handling Bar",
    [(-1.92, -0.82, 4.56), (-2.26, -1.12, 4.38), (-2.26, -1.12, 4.00), (-1.93, -0.84, 3.82)],
    0.095,
    polished,
)
add_cylinder("Upper Handle Mount", (-1.91, -0.83, 4.56), 0.13, 0.18, polished, rotation=(math.radians(64), 0.0, math.radians(-36)), vertices=32, bevel=0.02)
add_cylinder("Lower Handle Mount", (-1.92, -0.84, 3.82), 0.13, 0.18, polished, rotation=(math.radians(64), 0.0, math.radians(-36)), vertices=32, bevel=0.02)


# Bottom drain pipe, sanitary clamp, valve, and lever.
add_pipe(
    "Bottom Drain Bend",
    [(0.0, 0.0, 1.72), (0.0, -0.03, 1.25), (0.0, -0.54, 0.92), (0.0, -0.95, 0.92)],
    0.13,
    polished,
)
add_torus("Drain Clamp", (0.0, -0.95, 0.92), 0.24, 0.04, dark_metal, rotation=(math.radians(90), 0.0, 0.0))
add_cylinder("Drain Valve Body", (0.0, -1.10, 0.92), 0.28, 0.26, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=64, bevel=0.025)
add_cylinder("Drain Outlet", (0.0, -1.40, 0.92), 0.17, 0.52, polished, rotation=(math.radians(90), 0.0, 0.0), vertices=48, bevel=0.025)
add_cylinder("Drain Valve Stem", (0.0, -1.10, 1.26), 0.04, 0.46, dark_metal, vertices=24, bevel=0.01)
drain_handle = add_cube("Drain Valve Lever", (-0.20, -1.10, 1.48), (0.34, 0.045, 0.045), dark_metal, bevel=0.04)
drain_handle.rotation_euler.y = math.radians(-18)


# Small product information plate.
plate = add_cube("Identification Plate", (0.75, -2.145, 3.25), (0.58, 0.025, 0.24), polished, bevel=0.035)
text_curve = bpy.data.curves.new(type="FONT", name="Tank Label Data")
text_curve.body = "MIXING TANK"
text_curve.align_x = "CENTER"
text_curve.align_y = "CENTER"
text_curve.size = 0.22
text_curve.extrude = 0.006
text_obj = bpy.data.objects.new("Tank Label", text_curve)
text_obj.location = (0.75, -2.19, 3.25)
text_obj.rotation_euler = (math.radians(90), 0.0, 0.0)
text_obj.scale = (0.7, 0.7, 0.7)
machine_collection.objects.link(text_obj)
assign_material(text_obj, dark_metal)


# Ground plane is kept outside the machine collection.
bpy.ops.mesh.primitive_plane_add(size=30, location=(0.0, 0.0, -0.80))
floor = bpy.context.object
floor.name = "Jacketed Tank Studio Floor"
assign_material(floor, floor_material)


# Camera and studio lights.
bpy.ops.object.camera_add(location=(8.9, -10.8, 6.6))
camera = bpy.context.object
camera.name = "Jacketed Tank Camera"
camera.data.lens = 56
look_at(camera, (0.0, 0.0, 3.30))
scene.camera = camera

def add_area_light(name, location, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, (0.0, 0.0, 3.2))
    return light


add_area_light("Tank Key Light", (-4.5, -5.5, 10.0), 1350, 5.5, (1.0, 0.92, 0.83))
add_area_light("Tank Fill Light", (5.8, -2.0, 7.2), 980, 4.0, (0.74, 0.86, 1.0))
add_area_light("Tank Rim Light", (-1.5, 5.5, 7.8), 1250, 3.5, (0.72, 0.84, 1.0))
add_area_light("Tank Front Softbox", (0.0, -6.8, 4.2), 720, 4.0, (1.0, 1.0, 1.0))


# Render and color management.
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = 1.0
scene.render.pixel_aspect_y = 1.0
scene.render.fps = 24

scene.world = bpy.data.worlds.get("Jacketed Tank World") or bpy.data.worlds.new("Jacketed Tank World")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.035, 0.042, 0.05, 1.0)
background.inputs["Strength"].default_value = 0.32

scene.view_settings.look = "AgX - Medium High Contrast"

# Select only the modeled assembly for convenient editing after the script completes.
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
