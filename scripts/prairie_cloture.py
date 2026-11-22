# Génère prairie_cloture dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_cloture.png")

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

MAT = [materiau("bois", "#9B6B3D")]
NOM = "prairie_cloture"

def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
                                depth=d.length, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat


def planche(bm, c, taille, ry=0.0, rz=0.0):
    m = (Matrix.Translation(c) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y")
         @ Matrix.Diagonal((taille[0], taille[1], taille[2], 1)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)

old = bpy.data.objects.get(NOM)
if old: bpy.data.objects.remove(old, do_unlink=True)
bm = bmesh.new()
# deux piquets à 6 pans, un peu de travers, sommet en pointe basse
for x, dx, dy, h in ((-0.40, -0.015, 0.01, 0.62), (0.40, 0.02, -0.01, 0.58)):
    cone(bm, (x, 0, 0), (x + dx, dy, h), 0.065, 0.058, 6, 0)
    cone(bm, (x + dx, dy, h), (x + dx, dy, h + 0.06), 0.058, 0.012, 6, 0)
# deux traverses côté face (-Y), longues de 1 pour se raccorder au segment voisin
planche(bm, (0, -0.075, 0.24), (1.0, 0.045, 0.095), ry=0.025, rz=0.01)
planche(bm, (0, -0.075, 0.45), (1.0, 0.045, 0.090), ry=-0.02, rz=-0.01)

for v in bm.verts: v.co.z = max(v.co.z, 0.0)   # pieds posés au sol
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
