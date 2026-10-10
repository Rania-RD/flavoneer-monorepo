import bpy
from mathutils import Vector
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "container_sanitizing_spray_machine.blend"
PREVIEW_PATH = OUTPUT_DIR / "container_sanitizing_spray_machine_preview.png"

scene = bpy.data.scenes["ContainerSanitizingSprayMachineScene"]
bpy.context.window.scene = scene

camera = bpy.data.objects["Container Sanitizer Camera"]
camera.location = (-10.6, -15.9, 7.3)
direction = Vector((-0.20, -0.05, 2.65)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 58
scene.camera = camera

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Updated Blender model: {BLEND_PATH}")
print(f"Updated preview render: {PREVIEW_PATH}")
