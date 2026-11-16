"""Export a Blender scene as a PlayCanvas-friendly GLB with original rig intact.

Example:
  blender --background --python scripts/blender/export_glb.py -- \
    --input artwork/skier.blend --output artwork/skier-export.glb

Never replace the production athlete until joint names, skin weights and
gameplay have been tested. This helper does not generate mocap.
"""
import argparse
import os
import sys
try:
    import bpy
except ModuleNotFoundError:
    raise SystemExit("Run this script from Blender, not standalone Python.")

extra = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True, help="Source .blend file")
parser.add_argument("--output", required=True, help="New .glb path")
args = parser.parse_args(extra)
source, dest = os.path.abspath(args.input), os.path.abspath(args.output)
if not os.path.isfile(source) or not source.lower().endswith(".blend"):
    raise SystemExit("Expected an existing .blend file: " + source)
if not dest.lower().endswith(".glb") or source == dest:
    raise SystemExit("Output must be a new .glb file.")
bpy.ops.wm.open_mainfile(filepath=source)
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
if not meshes:
    raise SystemExit("No mesh to export")
for mesh in meshes:
    if not mesh.data.uv_layers:
        print("WARNING: " + mesh.name + " has no UV coordinates")
    if len(mesh.data.polygons) > 100000:
        print("WARNING: " + mesh.name + " has over 100000 polygons")
rigs = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
print("Exporting", len(meshes), "meshes and", len(rigs), "armatures")
os.makedirs(os.path.dirname(dest), exist_ok=True)
# Use Blender glTF exporter defaults for skins, animations, UV and PBR.
# Do not apply destructive modifiers/transforms to animated skeletons here.
bpy.ops.export_scene.gltf(filepath=dest, export_format="GLB",
                           use_selection=False)
if not os.path.isfile(dest) or os.stat(dest).st_size < 100:
    raise SystemExit("Export failed")
print("Saved", dest, "(", os.stat(dest).st_size, "bytes )")
