# Génère prairie_entree dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_entree.png")

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

MAT = [materiau("pierre_foncee", "#8D9099"), materiau("pierre_claire", "#A9ACB4"),
       materiau("herbe", "#5C9E3F"), materiau("feuillage_fonce", "#2F7D32"),
       materiau("tronc", "#6B4423"), materiau("ombre_grotte", "#1F1B18")]
PF, PC, HERBE, FEUIL, TRONC, OMBRE = range(6)
NOM = "prairie_entree"
HAUT = 1.40                     # hauteur de la falaise
OUV_R, OUV_Z, FOND_X = 0.38, 0.36, -0.02   # ouverture : rayon, hauteur du centre de l'arc, fond

def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
                                depth=d.length, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat


def boule(bm, c, r, mat, rnd, sub=1):
    m = Matrix.Translation(c) @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, "Z") @ Matrix.Diagonal((r[0], r[1], r[2], 1))
    res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=m)
    for v in res["verts"]:
        v.co = Vector(c) + (v.co - Vector(c)) * rnd.uniform(0.88, 1.08)
        v.co.z = max(v.co.z, 0.0)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat

def nettoie(nom):
    o = bpy.data.objects.get(nom)
    if o:
        me = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if me and me.users == 0: bpy.data.meshes.remove(me)

for n in (NOM, "_falaise_tmp", "_coupe_tmp"): nettoie(n)
rnd = random.Random(NOM)

# 1) falaise : prisme facetté à parois presque verticales, contour arrondi dans l'emprise 1 x 3
N = 24
def contour(f, jit):
    pts = []
    for i in range(N):
        a = 2 * math.pi * i / N
        ca, sa = math.cos(a), math.sin(a)
        x = 0.49 * math.copysign(abs(ca) ** 0.35, ca)
        y = 1.49 * math.copysign(abs(sa) ** 0.35, sa)
        face_ouv = x > 0.3 and abs(y) < 0.75          # paroi de l'ouverture : on la garde plane
        k = f * (1.0 if face_ouv else rnd.uniform(1 - jit, 1.0))
        xx = x * k * (0.72 if x > 0 else 1.0)       # paroi +X reculée : rebord pour les rochers
        pts.append((xx, y * (1 - (1 - k) * 0.3)))
    return pts
niveaux = [(0.0, 1.00, 0.05), (0.45, 0.98, 0.07), (0.90, 0.95, 0.08), (HAUT - 0.10, 0.90, 0.08)]
bm = bmesh.new()
rings = []
for z, f, jit in niveaux:
    rings.append([bm.verts.new((x, y, z + (rnd.uniform(0, 0.08) if z > 1 else 0))) for x, y in contour(f, jit)])
for r0, r1 in zip(rings, rings[1:]):
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
top = [bm.verts.new((v.co.x * 0.92, v.co.y * 0.97, HAUT - rnd.uniform(0.0, 0.04))) for v in rings[-1]]
for i in range(N):
    j = (i + 1) % N
    bm.faces.new((rings[-1][i], rings[-1][j], top[j], top[i]))
bm.faces.new(top)
bm.faces.new(list(reversed(rings[0])))
bmesh.ops.triangulate(bm, faces=bm.faces)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("_falaise_tmp"); bm.to_mesh(me); bm.free()
falaise = bpy.data.objects.new("_falaise_tmp", me); decor.objects.link(falaise)

# 2) volume de l'ouverture : arc (cylindre axe X) + bas rectangulaire, creusé jusqu'à FOND_X
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=OUV_R, radius2=OUV_R, depth=1.0,
    matrix=Matrix.Translation((FOND_X + 0.5, 0, OUV_Z)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((FOND_X + 0.5, 0, (0.02 + OUV_Z) / 2))
    @ Matrix.Diagonal((1.0, 2 * OUV_R, OUV_Z - 0.02, 1)))
me2 = bpy.data.meshes.new("_coupe_tmp"); bm.to_mesh(me2); bm.free()
coupe = bpy.data.objects.new("_coupe_tmp", me2); decor.objects.link(coupe)
coupe.hide_render = True
creuse = None
for solveur in ("EXACT", "MANIFOLD", "FLOAT", "FAST"):
    try:
        falaise.modifiers.clear()
        mod = falaise.modifiers.new("ouverture", "BOOLEAN")
        mod.operation = "DIFFERENCE"; mod.solver = solveur; mod.object = coupe
    except TypeError:
        continue
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    m = bpy.data.meshes.new_from_object(falaise.evaluated_get(dg))   # modificateur appliqué
    print("découpe", solveur, len(falaise.data.polygons), "->", len(m.polygons))
    if len(m.polygons) > len(falaise.data.polygons) * 0.9:
        creuse = m; break
    bpy.data.meshes.remove(m)
assert creuse is not None, "découpe de l'ouverture impossible"

# 3) on reprend le résultat et on ajoute rochers, racines, herbe
bm = bmesh.new(); bm.from_mesh(creuse)
bpy.data.meshes.remove(creuse)
nettoie("_falaise_tmp"); nettoie("_coupe_tmp")
bm.normal_update()
for f in bm.faces:
    c = f.calc_center_median()
    dedans = (FOND_X - 0.02 < c.x < 0.33 and abs(c.y) < OUV_R + 0.005 and c.z < OUV_Z + OUV_R + 0.01)
    if dedans:
        f.material_index = OMBRE
    elif f.normal.z > 0.8 and c.z > HAUT - 0.25:
        f.material_index = HERBE
    elif f.normal.z > 0.35:
        f.material_index = PC
    else:
        f.material_index = PF
# rochers sur le rebord, au pied de l'ouverture et le long de la paroi
for c, r in (((0.40, -0.56, 0.06), (0.10, 0.12, 0.11)), ((0.41, 0.53, 0.05), (0.09, 0.10, 0.10)),
             ((0.43, 0.76, 0.04), (0.06, 0.07, 0.07)), ((0.40, -1.10, 0.06), (0.10, 0.12, 0.10)),
             ((0.42, 1.12, 0.05), (0.08, 0.09, 0.08)), ((0.43, -0.80, 0.03), (0.06, 0.06, 0.05))):
    boule(bm, c, r, PC, rnd)
# racines qui pendent du haut de la paroi, de part et d'autre de l'ouverture
for y0, z1 in ((-0.50, 0.55), (-0.30, 0.95), (0.42, 0.75), (0.58, 1.00)):
    mid = (0.345, y0 + 0.03, (HAUT + z1) / 2 + 0.05)
    cone(bm, (0.29, y0, HAUT - 0.02), mid, 0.045, 0.032, 5, TRONC)
    cone(bm, mid, (0.365, y0 + 0.06, z1), 0.032, 0.012, 5, TRONC)
# touffes d'herbe sur le dessus
for x, y in ((0.30, -0.9), (-0.25, -0.3), (0.32, 0.35), (-0.20, 0.95), (0.15, 1.25), (0.25, -0.15)):
    for k in range(3):
        a = k * 2.1 + rnd.uniform(0, 1)
        cone(bm, (x, y, HAUT - 0.06), (x + 0.06 * math.cos(a), y + 0.06 * math.sin(a), HAUT + 0.16), 0.035, 0.0, 4, FEUIL)

for v in bm.verts: v.co.z = max(v.co.z, 0.0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new(NOM); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = False
for mt in MAT: me.materials.append(mt)
ob = bpy.data.objects.new(NOM, me)
decor.objects.link(ob)
autres = [o for o in decor.objects if o is not ob]
ob.location = ((max(o.location.x + o.dimensions.x / 2 for o in autres) + 4.5) if autres else 0, 0, 0)
ob["cases_l"] = 1; ob["cases_h"] = 3; ob["bloquant"] = 1
bpy.context.view_layer.update()
d = ob.dimensions
print(f"{NOM}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}, min z {min(v.co.z for v in me.vertices):.3f}, x={ob.location.x:.1f}")
objs = [ob]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = objs[0].location.x
cam.data.type = "ORTHO"; cam.data.ortho_scale = 4.5
cam.location = (cx, -11.5, 10.25); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 900, 800
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
# seconde vue : côté porte (-X)
import mathutils
d = mathutils.Vector((-0.542, 0.542, -0.643))
cam.location = mathutils.Vector((cx, 0, 0.6)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(45))
scene.render.filepath = RENDU.replace(".png", "_ouverture.png")
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
