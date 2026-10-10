from pathlib import Path

import bpy


output_dir = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
blend_path = output_dir / "tomato_paste_pasteurizer.blend"
preview_path = output_dir / "tomato_paste_pasteurizer_preview.png"
output_dir.mkdir(parents=True, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 680
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(preview_path)
scene.render.film_transparent = False
scene.world.color = (0.025, 0.035, 0.045)
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass

machine_collection = bpy.data.collections.get("TomatoPastePasteurizer")
if machine_collection:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in machine_collection.objects:
        if not obj.hide_viewport:
            obj.select_set(True)
    if machine_collection.objects:
        bpy.context.view_layer.objects.active = machine_collection.objects[0]

bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
