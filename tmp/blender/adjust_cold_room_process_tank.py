import bpy
from mathutils import Vector
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "cold_room_process_tank.blend"
PREVIEW_PATH = OUTPUT_DIR / "cold_room_process_tank_preview.png"

scene = bpy.data.scenes["ColdRoomProcessTankScene"]
bpy.context.window.scene = scene

stainless = bpy.data.materials.get("Cold Room Tank Stainless")
if stainless and stainless.use_nodes:
    bsdf = stainless.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.62, 0.66, 0.68, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.96
    bsdf.inputs["Roughness"].default_value = 0.19

world = bpy.data.worlds.get("Cold Room Process Tank World")
if world and world.use_nodes:
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.065, 0.085, 0.105, 1.0)
    background.inputs["Strength"].default_value = 0.52

for name, energy in (
    ("Process Tank Key Light", 1950),
    ("Process Tank Fill Light", 1650),
    ("Process Tank Rim Light", 1700),
    ("Platform Softbox", 1050),
):
    light = bpy.data.objects.get(name)
    if light is not None:
        light.data.energy = energy

front_light = bpy.data.objects.get("Process Tank Front Softbox")
if front_light is None:
    bpy.ops.object.light_add(type="AREA", location=(1.0, -8.8, 5.6))
    front_light = bpy.context.object
    front_light.name = "Process Tank Front Softbox"
    front_light.data.shape = "DISK"
    front_light.data.size = 5.5
    front_light.data.energy = 1100
    front_light.data.color = (0.86, 0.92, 1.0)
    direction = Vector((-0.7, 0.0, 4.0)) - front_light.location
    front_light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Updated Blender model: {BLEND_PATH}")
print(f"Updated preview render: {PREVIEW_PATH}")
