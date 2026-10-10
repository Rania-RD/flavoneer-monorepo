import math
from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "tomato_paste_pasteurizer.blend"
PREVIEW_PATH = OUTPUT_DIR / "tomato_paste_pasteurizer_preview.png"
COLLECTION_NAME = "TomatoPastePasteurizer"


def material(name, color, metallic=0.0, roughness=0.42):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    return mat


def move_to_collection(obj):
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    machine_collection.objects.link(obj)
    return obj


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def bevel(obj, width=0.06, segments=3):
    modifier = obj.modifiers.new("Edge softening", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    return obj


def smooth(obj):
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def add_box(name, location, dimensions, mat, bevel_width=0.05):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_width:
        bevel(obj, bevel_width)
    return assign(obj, mat)


def add_cylinder(
    name,
    location,
    radius,
    depth,
    mat,
    rotation=(0.0, 0.0, 0.0),
    vertices=64,
    bevel_width=0.025,
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    smooth(obj)
    if bevel_width:
        bevel(obj, bevel_width, 2)
    return assign(obj, mat)


def add_uv_sphere(name, location, scale, mat, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(smooth(obj), mat)


def add_torus(name, location, major_radius, minor_radius, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=96,
        minor_segments=16,
        location=location,
        rotation=rotation,
    )
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    return assign(smooth(obj), mat)


def add_pipe(name, start, end, radius, mat):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) / 2
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=40,
        radius=radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    smooth(obj)
    bevel(obj, min(radius * 0.28, 0.025), 2)
    return assign(obj, mat)


def add_bolt_ring(prefix, x, radius, count=12):
    for index in range(count):
        angle = 2 * math.pi * index / count
        y = radius * math.cos(angle)
        z = 2.4 + radius * math.sin(angle)
        add_cylinder(
            f"{prefix}_{index + 1:02d}",
            (x, y, z),
            0.075,
            0.24,
            dark_steel,
            rotation=(0, math.pi / 2, 0),
            vertices=32,
            bevel_width=0.015,
        )


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Preserve anything already in the open Blender scene. The default starter objects
# are hidden and repurposed below instead of being deleted.
for starter_name in ("Cube",):
    starter = bpy.data.objects.get(starter_name)
    if starter:
        starter.hide_viewport = True
        starter.hide_render = True

machine_collection = bpy.data.collections.new(COLLECTION_NAME)
bpy.context.scene.collection.children.link(machine_collection)

stainless = material("Stainless Steel", (0.48, 0.53, 0.56), metallic=0.94, roughness=0.2)
polished = material("Polished Door Steel", (0.67, 0.71, 0.73), metallic=1.0, roughness=0.14)
dark_steel = material("Dark Frame Steel", (0.055, 0.07, 0.075), metallic=0.72, roughness=0.28)
pipe_steel = material("Pipe Steel", (0.3, 0.34, 0.36), metallic=0.9, roughness=0.24)
panel_gray = material("Control Cabinet", (0.63, 0.66, 0.65), metallic=0.35, roughness=0.32)
screen_blue = material("Control Screen", (0.055, 0.34, 0.46), metallic=0.1, roughness=0.2)
blue = material("Instrument Blue", (0.025, 0.27, 0.48), metallic=0.5, roughness=0.28)
red = material("Safety Red", (0.68, 0.025, 0.018), metallic=0.25, roughness=0.3)
green = material("Indicator Green", (0.03, 0.58, 0.21), metallic=0.15, roughness=0.25)
amber = material("Indicator Amber", (0.95, 0.39, 0.03), metallic=0.1, roughness=0.28)
white = material("Dial White", (0.92, 0.94, 0.91), metallic=0.05, roughness=0.34)
black = material("Rubber Black", (0.008, 0.012, 0.014), metallic=0.05, roughness=0.52)
floor_mat = material("Studio Floor", (0.12, 0.15, 0.17), metallic=0.05, roughness=0.68)

# Skid base and support structure.
for y in (-1.42, 1.42):
    add_box(f"BaseRail_{y:+.0f}", (0, y, 0.18), (8.7, 0.2, 0.22), dark_steel, 0.04)
for x in (-3.75, -1.9, 0.0, 1.9, 3.75):
    add_box(f"BaseCrossmember_{x:+.1f}", (x, 0, 0.16), (0.2, 3.05, 0.18), dark_steel, 0.035)
for x in (-2.25, 2.15):
    for y in (-1.03, 1.03):
        post = add_box(f"SaddlePost_{x:+.1f}_{y:+.1f}", (x, y, 0.93), (0.28, 0.34, 1.48), dark_steel, 0.045)
        post.rotation_euler[1] = math.radians(9 if x < 0 else -9)
    add_box(f"SaddleBeam_{x:+.1f}", (x, 0, 0.72), (0.35, 2.35, 0.28), dark_steel, 0.05)

# Horizontal retort vessel and domed end caps.
add_cylinder(
    "PressureVessel",
    (0, 0, 2.42),
    1.46,
    6.55,
    stainless,
    rotation=(0, math.pi / 2, 0),
    bevel_width=0.035,
)
add_uv_sphere("FrontDoorDome", (-3.42, 0, 2.42), (0.47, 1.39, 1.39), polished)
add_uv_sphere("RearDome", (3.34, 0, 2.42), (0.43, 1.39, 1.39), stainless)
add_torus("FrontFlangeOuter", (-3.33, 0, 2.42), 1.47, 0.12, dark_steel, (0, math.pi / 2, 0))
add_torus("FrontFlangeInner", (-3.53, 0, 2.42), 1.28, 0.07, polished, (0, math.pi / 2, 0))
add_torus("RearFlange", (3.18, 0, 2.42), 1.43, 0.06, pipe_steel, (0, math.pi / 2, 0))
add_bolt_ring("DoorClamp", -3.52, 1.48, 12)

# Front locking hub, radial spokes, loading nozzle, and safety handles.
hub_center = (-3.93, 0, 2.42)
add_cylinder("DoorLockHub", hub_center, 0.24, 0.45, dark_steel, (0, math.pi / 2, 0), 48, 0.03)
for index in range(6):
    angle = 2 * math.pi * index / 6
    spoke_end = (-4.02, 0.92 * math.cos(angle), 2.42 + 0.92 * math.sin(angle))
    add_pipe(f"LockSpoke_{index + 1}", hub_center, spoke_end, 0.055, dark_steel)
    add_uv_sphere(f"LockGrip_{index + 1}", spoke_end, (0.09, 0.09, 0.09), red, 32, 16)
add_box("FrontFeedHousing", (-4.02, -0.02, 2.42), (0.72, 0.72, 0.7), pipe_steel, 0.1)
add_cylinder("FrontFeedNeck", (-4.47, -0.02, 2.42), 0.29, 0.36, dark_steel, (0, math.pi / 2, 0), 48, 0.025)
add_cylinder("FrontFeedOpening", (-4.67, -0.02, 2.42), 0.22, 0.055, black, (0, math.pi / 2, 0), 48, 0.01)
add_pipe("DoorHingeTop", (-3.3, 1.5, 3.04), (-3.3, 1.5, 3.62), 0.1, dark_steel)
add_pipe("DoorHingeBottom", (-3.3, 1.5, 1.22), (-3.3, 1.5, 1.8), 0.1, dark_steel)

# Top service rails, supports, sensors, and valves.
for y in (-0.92, 0.92):
    add_pipe(f"TopRail_{y:+.1f}", (-2.75, y, 3.92), (2.9, y, 3.92), 0.055, pipe_steel)
    for x in (-2.55, -1.1, 0.4, 1.9, 2.75):
        add_pipe(f"TopRailPost_{x:+.1f}_{y:+.1f}", (x, y, 3.63), (x, y, 3.92), 0.045, pipe_steel)
add_cylinder("TopPressureSensor", (-1.55, -0.12, 4.08), 0.18, 0.42, blue, (0, math.pi / 2, 0), 48, 0.025)
add_cylinder("SensorFace", (-1.79, -0.12, 4.08), 0.13, 0.045, white, (0, math.pi / 2, 0), 48, 0.01)
add_cylinder("TopOrangeMotor", (-2.6, 0.2, 4.03), 0.21, 0.48, amber, (0, math.pi / 2, 0), 48, 0.03)
add_pipe("RearVentStem", (2.65, 0.35, 3.65), (2.65, 0.35, 4.35), 0.07, pipe_steel)
add_cylinder("RearVentValve", (2.65, 0.35, 4.38), 0.16, 0.12, blue, vertices=36, bevel_width=0.015)
add_pipe("RearTopLine", (1.85, 0.35, 3.82), (3.15, 0.35, 3.82), 0.065, pipe_steel)

# Front-facing control cabinet with screen, chart recorder, buttons, and stack light.
add_box("ControlCabinet", (0.45, -1.64, 3.42), (1.72, 0.5, 1.4), panel_gray, 0.075)
add_box("Touchscreen", (-0.05, -1.91, 3.58), (0.57, 0.04, 0.47), screen_blue, 0.025)
add_box("ScreenGlow", (-0.05, -1.94, 3.58), (0.43, 0.018, 0.33), white, 0.015)
add_cylinder("ChartRecorder", (0.75, -1.93, 3.57), 0.34, 0.07, white, (math.pi / 2, 0, 0), 64, 0.02)
add_cylinder("ChartCenter", (0.75, -1.98, 3.57), 0.055, 0.04, dark_steel, (math.pi / 2, 0, 0), 32, 0.01)
for index, (x, mat) in enumerate(((-0.35, red), (-0.05, green), (0.25, amber))):
    add_cylinder(f"PanelButton_{index + 1}", (x, -1.94, 3.08), 0.07, 0.06, mat, (math.pi / 2, 0, 0), 32, 0.012)
for x in (-0.15, 1.02):
    add_pipe(f"CabinetSupport_{x:+.1f}", (x, -1.45, 0.45), (x, -1.45, 2.72), 0.065, dark_steel)
add_pipe("StackLightMast", (0.92, -1.64, 4.13), (0.92, -1.64, 4.43), 0.045, dark_steel)
for index, mat in enumerate((green, amber, red)):
    add_cylinder(f"StackLight_{index + 1}", (0.92, -1.64, 4.46 + index * 0.13), 0.075, 0.12, mat, vertices=40, bevel_width=0.012)

# Lower recirculation piping and pump assembly.
add_pipe("LowerProcessPipe", (-1.55, -1.72, 0.72), (3.55, -1.72, 0.72), 0.12, pipe_steel)
add_pipe("RiserPipe", (-1.15, -1.72, 0.72), (-1.15, -1.72, 2.08), 0.1, pipe_steel)
add_uv_sphere("LowerElbow", (-1.15, -1.72, 0.72), (0.14, 0.14, 0.14), pipe_steel, 32, 16)
add_cylinder("BluePumpMotor", (3.06, -1.46, 0.64), 0.29, 0.95, blue, (0, math.pi / 2, 0), 48, 0.035)
add_cylinder("PumpHousing", (2.53, -1.49, 0.67), 0.38, 0.3, pipe_steel, (0, math.pi / 2, 0), 64, 0.04)
add_cylinder("PumpFlange", (2.28, -1.49, 0.67), 0.31, 0.12, dark_steel, (0, math.pi / 2, 0), 48, 0.02)
add_pipe("PumpDischarge", (2.55, -1.49, 0.92), (2.55, -1.49, 1.45), 0.1, pipe_steel)
add_pipe("RearOutlet", (3.3, 0.72, 1.72), (3.3, 1.65, 1.72), 0.11, pipe_steel)
add_cylinder("RearOutletFlange", (3.3, 1.72, 1.72), 0.22, 0.12, dark_steel, (math.pi / 2, 0, 0), 48, 0.02)

# Gauges and smaller side details.
add_pipe("GaugeStem", (-0.45, -1.48, 1.85), (-0.45, -1.72, 2.25), 0.045, pipe_steel)
add_cylinder("SideGauge", (-0.45, -1.76, 2.35), 0.18, 0.07, white, (math.pi / 2, 0, 0), 48, 0.012)
add_cylinder("SideGaugeRim", (-0.45, -1.8, 2.35), 0.2, 0.035, dark_steel, (math.pi / 2, 0, 0), 48, 0.01)
for x in (-2.5, -0.9, 1.4, 2.55):
    add_torus(f"VesselBand_{x:+.1f}", (x, 0, 2.42), 1.46, 0.026, pipe_steel, (0, math.pi / 2, 0))

# Readable equipment label on the control cabinet.
bpy.ops.object.text_add(location=(0.43, -1.95, 2.91), rotation=(math.pi / 2, 0, 0))
label = move_to_collection(bpy.context.object)
label.name = "EquipmentLabel"
label.data.body = "PASTEURIZER"
label.data.align_x = "CENTER"
label.data.align_y = "CENTER"
label.data.size = 0.16
label.data.extrude = 0.008
assign(label, dark_steel)

# Studio floor, camera, and three-point lighting.
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0.02))
floor = bpy.context.object
floor.name = "StudioFloor"
assign(floor, floor_mat)

camera = bpy.data.objects.get("Camera")
if camera is None:
    bpy.ops.object.camera_add()
    camera = bpy.context.object
camera.hide_viewport = False
camera.hide_render = False
camera.location = (-8.9, -10.6, 6.5)
camera.data.lens = 56
look_at(camera, (-0.15, 0, 2.15))
bpy.context.scene.camera = camera

key_light = bpy.data.objects.get("Light")
if key_light is None:
    bpy.ops.object.light_add(type="AREA")
    key_light = bpy.context.object
key_light.hide_viewport = False
key_light.hide_render = False
key_light.data.type = "AREA"
key_light.data.energy = 1350
key_light.data.shape = "DISK"
key_light.data.size = 5.0
key_light.location = (-3.7, -5.4, 8.4)
look_at(key_light, (0, 0, 2.1))

def add_area_light(name, location, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 0, 2.1))
    return light


add_area_light("FillLight", (4.8, -3.2, 5.6), 850, 4.0, (0.72, 0.84, 1.0))
add_area_light("RimLight", (1.4, 5.3, 7.2), 1150, 3.2, (1.0, 0.74, 0.48))

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 680
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = False
scene.world.color = (0.025, 0.035, 0.045)
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass

# Select the whole machine collection in the viewport for an easy handoff.
bpy.ops.object.select_all(action="DESELECT")
for obj in machine_collection.objects:
    if not obj.hide_viewport:
        obj.select_set(True)
if machine_collection.objects:
    bpy.context.view_layer.objects.active = machine_collection.objects[0]

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
