import bpy
from mathutils import Vector
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "jacketed_mixing_tank.blend"
PREVIEW_PATH = OUTPUT_DIR / "jacketed_mixing_tank_preview.png"

scene = bpy.data.scenes["JacketedMixingTankScene"]
bpy.context.window.scene = scene

camera = bpy.data.objects["Jacketed Tank Camera"]
camera.location = (10.8, -13.15, 6.85)
direction = Vector((0.0, 0.0, 3.45)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 55
scene.camera = camera

front_light = bpy.data.objects.get("Tank Front Softbox")
if front_light is not None:
    front_light.data.energy = 930

world = bpy.data.worlds.get("Jacketed Tank World")
if world and world.use_nodes:
    background = world.node_tree.nodes.get("Background")
    background.inputs["Strength"].default_value = 0.42

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Updated Blender model: {BLEND_PATH}")
print(f"Updated preview render: {PREVIEW_PATH}")
