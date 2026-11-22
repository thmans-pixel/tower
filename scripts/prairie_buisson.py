# Génère prairie_buisson dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_buisson.png")

def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]

def materiau(nom, hexa):
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(b.outputs[0], out.inputs["Surface"])
    b.inputs["Base Color"].default_value = lin(hexa)
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Emission Strength"].default_value = 0.0
    m.diffuse_color = lin(hexa)
    return m

# --- fichier : on rouvre decor.blend s'il existe, sinon fichier vide
if os.path.exists(BLEND):
    bpy.ops.wm.open_mainfile(filepath=BLEND)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
decor = bpy.data.collections.get("Decor")
if not decor:
    decor = bpy.data.collections.new("Decor"); scene.collection.children.link(decor)

MAT = [materiau("feuillage_fonce", "#2F7D32"), materiau("feuillage_clair", "#4CAF50"),
       materiau("toits", "#C0392B")]
NOM = "prairie_buisson"

def boule(bm, c, r, fl, mat, sub=2, rz=0.0):
    m = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Diagonal((r, r, r * fl, 1))
    res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat

old = bpy.data.objects.get(NOM)
if old: bpy.data.objects.remove(old, do_unlink=True)
rnd = random.Random(NOM)
bm = bmesh.new()
# boule centrale + couronne de 5 boules
boules = [((0, 0, 0.27), 0.26, 0.90)]
for k in range(5):
    a = math.radians(90 + 72 * k + 15)
    boules.append(((0.18 * math.cos(a), 0.18 * math.sin(a), 0.19), 0.21, 0.88))
for k, (c, r, fl) in enumerate(boules):
    boule(bm, c, r, fl, k % 2, rz=rnd.uniform(0, 6.28))
# baies rouges sur la surface, surtout côté face (-Y) et dessus
for az, el, ib in ((-90, 20, 0), (-60, 35, 4), (-125, 15, 1), (-20, 10, 5), (160, 40, 2), (-95, 60, 0), (40, 25, 3)):
    c, r, fl = boules[ib]
    d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
    p = Vector(c) + Vector((d.x * r, d.y * r, d.z * r * fl)) * 0.97
    boule(bm, p, 0.052, 1.0, 2, sub=1)
# pose au sol
zmin = min(v.co.z for v in bm.verts)
for v in bm.verts: v.co.z -= zmin; v.co.x *= 1.05; v.co.y *= 1.05

bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new(NOM); bm.to_mesh(me); bm.free()
for mt in MAT: me.materials.append(mt)
ob = bpy.data.objects.new(NOM, me)
decor.objects.link(ob)
autres = [o for o in decor.objects if o is not ob]
ob.location = ((max(o.location.x for o in autres) + 4) if autres else 0, 0, 0)
ob["cases_l"] = 1; ob["cases_h"] = 1; ob["bloquant"] = 1
bpy.context.view_layer.update()
d = ob.dimensions
print(f"{NOM}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}, min z {min(v.co.z for v in me.vertices):.3f}")
objs = [ob]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = objs[0].location.x
cam.data.type = "ORTHO"; cam.data.ortho_scale = 1.6
cam.location = (cx, -11.5, 9.85); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 700, 600
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
