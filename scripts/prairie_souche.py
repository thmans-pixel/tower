# Génère prairie_souche dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_souche.png")

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

MAT = [materiau("tronc", "#6B4423"), materiau("bois", "#9B6B3D"),
       materiau("terre", "#C8A165"), materiau("toits", "#C0392B")]
NOM = "prairie_souche"
SEG = 10

def anneau(bm, r, z, a0=0.0, dx=0.0, dy=0.0, seg=SEG):
    return [bm.verts.new((dx + r * math.cos(a0 + 2 * math.pi * i / seg),
                          dy + r * math.sin(a0 + 2 * math.pi * i / seg), z)) for i in range(seg)]

def quads(bm, a, b, mat):
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i])).material_index = mat

def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
                                depth=d.length, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat

old = bpy.data.objects.get(NOM)
if old: bpy.data.objects.remove(old, do_unlink=True)
bm = bmesh.new()
# corps de la souche (écorce), évasé en bas, dessus légèrement penché
cotes = [(0.0, 0.34), (0.08, 0.30), (0.25, 0.29), (0.40, 0.30)]
rings = []
for z, r in cotes:
    rings.append(anneau(bm, r, z, 0.1 * z))
for v in rings[-1]:                       # coupe un peu en biais
    v.co.z += 0.04 * v.co.x / 0.3
for a, b in zip(rings, rings[1:]): quads(bm, a, b, 0)
bm.faces.new(list(reversed(rings[0]))).material_index = 0
# dessus : anneaux concentriques clair / foncé
prev = rings[-1]
for k, f in enumerate([0.82, 0.60, 0.36]):
    cur = [bm.verts.new((v.co.x * f, v.co.y * f, v.co.z * f + 0.40 * (1 - f) + 0.004)) for v in rings[-1]]
    quads(bm, prev, cur, 2 if k % 2 == 0 else 1)
    prev = cur
centre = bm.verts.new((0, 0, sum(v.co.z for v in prev) / SEG + 0.004))
for i in range(SEG):
    bm.faces.new((prev[i], prev[(i + 1) % SEG], centre)).material_index = 2
# deux racines côté face (-Y)
for ang, long in ((math.radians(-35), 0.48), (math.radians(200), 0.44)):
    p0 = (0.18 * math.cos(ang), 0.18 * math.sin(ang), 0.16)
    p1 = (long * math.cos(ang), long * math.sin(ang), 0.045)
    cone(bm, p0, p1, 0.11, 0.045, 6, 0)
# petit champignon rouge au pied, devant à gauche
mx, my = 0.42 * math.cos(math.radians(250)), 0.42 * math.sin(math.radians(250))
cone(bm, (mx, my, 0.0), (mx, my, 0.12), 0.035, 0.028, 6, 2)
chap = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0,
        matrix=Matrix.Translation((mx, my, 0.13)) @ Matrix.Diagonal((0.10, 0.10, 0.065, 1)))
for f in {f for v in chap["verts"] for f in v.link_faces}: f.material_index = 3

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
