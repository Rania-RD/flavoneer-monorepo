import bpy
from mathutils import Vector
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
BLEND_PATH = OUTPUT_DIR / "sauce_filling_machine.blend"
PREVIEW_PATH = OUTPUT_DIR / "sauce_filling_machine_preview.png"

scene = bpy.data.scenes["SauceFillingMachineScene"]
bpy.context.window.scene = scene

# Keep the physical safety panels editable while making the product chamber
# optically clear in the presentation render.
for name in ("Front Safety Glass", "Left Safety Glass", "Right Safety Glass"):
    panel = bpy.data.objects.get(name)
    if panel is not None:
        panel.hide_render = True

interior_light = bpy.data.objects.get("Filling Chamber Softbox")
if interior_light is None:
    bpy.ops.object.light_add(type="AREA", location=(0.0, -2.2, 4.05))
    interior_light = bpy.context.object
    interior_light.name = "Filling Chamber Softbox"
    interior_light.data.energy = 720
    interior_light.data.shape = "RECTANGLE"
    interior_light.data.size = 3.8
    interior_light.data.color = (0.80, 0.91, 1.0)
    direction = Vector((0.0, -0.10, 3.60)) - interior_light.location
    interior_light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

print(f"Updated Blender model: {BLEND_PATH}")
print(f"Updated preview render: {PREVIEW_PATH}")
