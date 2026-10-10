import bpy
from mathutils import Vector
from pathlib import Path


scene = bpy.data.scenes["TunnelTypeContinuousSpraySterilizerScene"]
bpy.context.window.scene = scene

camera = bpy.data.objects["Tunnel Unit Camera"]
camera.location = (-11.2, -14.6, 7.4)
camera.rotation_euler = (Vector((0.0, 0.0, 2.20)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 58

front_light = bpy.data.objects.get("Tunnel Unit Front Softbox")
if front_light is None:
    light_data = bpy.data.lights.new(name="Tunnel Unit Front Softbox Data", type="AREA")
    front_light = bpy.data.objects.new("Tunnel Unit Front Softbox", light_data)
    bpy.data.collections["TunnelTypeContinuousSpraySterilizer"].objects.link(front_light)
front_light.location = (0.0, -7.2, 5.4)
front_light.data.energy = 2100
front_light.data.shape = "RECTANGLE"
front_light.data.size = 6.5
front_light.data.size_y = 4.0
front_light.rotation_euler = (Vector((0.0, 0.0, 2.0)) - front_light.location).to_track_quat("-Z", "Y").to_euler()

world_bsdf = scene.world.node_tree.nodes.get("Background")
world_bsdf.inputs["Color"].default_value = (0.060, 0.075, 0.090, 1.0)
world_bsdf.inputs["Strength"].default_value = 0.52

output_dir = Path(r"C:\Users\PC LAND\Downloads\flavoneer-monorepo\output\blender")
blend_path = output_dir / "tunnel_type_continuous_spray_sterilizer.blend"
preview_path = output_dir / "tunnel_type_continuous_spray_sterilizer_preview.png"
scene.render.filepath = str(preview_path)

bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

print(f"Updated Blender model: {blend_path}")
print(f"Updated preview render: {preview_path}")
