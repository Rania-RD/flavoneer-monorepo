import bpy
from mathutils import Vector
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "mixer_homogenizer.blend"
PREVIEW_PATH = OUTPUT_DIR / "mixer_homogenizer_preview.png"

scene = bpy.data.scenes["MixerHomogenizerScene"]
bpy.context.window.scene = scene

camera = bpy.data.objects["Mixer Homogenizer Camera"]
camera.location = (9.25, -13.95, 7.45)
direction = Vector((0.0, -0.02, 3.58)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 55
scene.camera = camera

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Updated Blender model: {BLEND_PATH}")
print(f"Updated preview render: {PREVIEW_PATH}")
