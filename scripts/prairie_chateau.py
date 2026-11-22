# Génère prairie_chateau dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_chateau.png")

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
       materiau("toits", "#C0392B"), materiau("or", "#F2C14E"), materiau("bois", "#9B6B3D"),
       materiau("tronc", "#6B4423"), materiau("terre", "#C8A165")]
PF, PC, TOIT, OR, BOIS, TRONC, TERRE = range(7)
NOM = "prairie_chateau"

def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
                                depth=d.length, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat


def boite(bm, x0, y0, z0, x1, y1, z1, mat):
    m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ \
        Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1))
    res = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat

def creneaux(bm, a, b, ep, z, mat, pas=0.30, larg=0.16, h=0.16):
    """Merlons le long du segment a->b (axe X ou Y), épaisseur ep, posés à la hauteur z."""
    (xa, ya), (xb, yb) = a, b
    L = math.hypot(xb - xa, yb - ya)
    n = max(2, int(L / pas) + 1)
    for i in range(n):
        t = i / (n - 1)
        cx, cy = xa + (xb - xa) * t, ya + (yb - ya) * t
        if abs(xb - xa) > abs(yb - ya):
            boite(bm, cx - larg / 2, cy - ep / 2, z, cx + larg / 2, cy + ep / 2, z + h, mat)
        else:
            boite(bm, cx - ep / 2, cy - larg / 2, z, cx + ep / 2, cy + larg / 2, z + h, mat)

def mur(bm, a, b, ep, h, mat=PF):
    (xa, ya), (xb, yb) = a, b
    if abs(xb - xa) > abs(yb - ya):
        boite(bm, min(xa, xb), ya - ep / 2, 0, max(xa, xb), ya + ep / 2, h, mat)
    else:
        boite(bm, xa - ep / 2, min(ya, yb), 0, xa + ep / 2, max(ya, yb), h, mat)
    creneaux(bm, a, b, ep, h, mat)

old = bpy.data.objects.get(NOM)
if old: bpy.data.objects.remove(old, do_unlink=True)
bm = bmesh.new()

EP, HM = 0.28, 1.05                     # épaisseur et hauteur des murs
XO, XE, YS, YN = -1.05, 1.31, -2.20, 2.20   # axes des murs ouest / est / sud / nord
# cour en terre
boite(bm, XO, YS, 0, XE, YN, 0.02, TERRE)
# murs d'enceinte (ouest coupé par la porte)
mur(bm, (XO, YS), (XO, -0.55), EP, HM); mur(bm, (XO, 0.55), (XO, YN), EP, HM)
mur(bm, (XE, YS - EP / 2 + 0.01), (XE, YN + EP / 2 - 0.01), EP, HM)
mur(bm, (XO, YS), (XE, YS), EP, HM); mur(bm, (XO, YN), (XE, YN), EP, HM)

# châtelet de la porte, côté -X
GX0, GX1, GY = -1.38, -0.80, 0.58
boite(bm, GX0, -GY, 0, GX1, GY, 1.45, PC)
creneaux(bm, (GX0 + 0.08, -GY + 0.08), (GX0 + 0.08, GY - 0.08), 0.16, 1.45, PC, pas=0.26)
creneaux(bm, (GX1 - 0.08, -GY + 0.08), (GX1 - 0.08, GY - 0.08), 0.16, 1.45, PC, pas=0.26)
# grande porte en bois (arc en plein cintre) en saillie sur la face -X
DX = GX0 - 0.03
boite(bm, DX, -0.30, 0.0, GX0 + 0.01, 0.30, 0.62, BOIS)
arc = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.30, radius2=0.30, depth=0.04,
        matrix=Matrix.Translation((DX + 0.02, 0, 0.62)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
for f in {f for v in arc["verts"] for f in v.link_faces}: f.material_index = BOIS
for v in arc["verts"]: v.co.z = max(v.co.z, 0.62)       # garde le demi-cercle du haut
# herse à moitié relevée : barreaux devant la porte
HX = DX - 0.035
for y in (-0.22, -0.11, 0.0, 0.11, 0.22):
    top = 0.62 + math.sqrt(max(0.0, 0.30 ** 2 - y ** 2)) - 0.03
    boite(bm, HX - 0.02, y - 0.022, 0.30, HX + 0.02, y + 0.022, top, TRONC)
for z in (0.40, 0.62):
    boite(bm, HX - 0.025, -0.27, z - 0.025, HX + 0.025, 0.27, z + 0.025, TRONC)

# donjon carré central
DX0, DX1, DY0, DY1, HD = -0.45, 0.85, -0.70, 0.70, 2.30
boite(bm, DX0, DY0, 0, DX1, DY1, HD, PC)
for a, b in (((DX0, DY0 + 0.08), (DX1, DY0 + 0.08)), ((DX0, DY1 - 0.08), (DX1, DY1 - 0.08))):
    creneaux(bm, a, b, 0.16, HD, PC, pas=0.27, larg=0.17, h=0.20)
for a, b in (((DX0 + 0.08, DY0 + 0.25), (DX0 + 0.08, DY1 - 0.25)), ((DX1 - 0.08, DY0 + 0.25), (DX1 - 0.08, DY1 - 0.25))):
    creneaux(bm, a, b, 0.16, HD, PC, pas=0.27, larg=0.17, h=0.20)
# meurtrières sur les faces -Y et -X du donjon
for x in (-0.05, 0.45):
    boite(bm, x - 0.04, DY0 - 0.02, 1.30, x + 0.04, DY0 + 0.01, 1.70, TRONC)
boite(bm, DX0 - 0.02, -0.04, 1.30, DX0 + 0.01, 0.04, 1.70, TRONC)

# deux tours rondes aux coins côté porte, toit conique rouge et drapeau or
RT, HT = 0.40, 1.85
for ty in (-2.10, 2.10):
    tx = -1.10
    cone(bm, (tx, ty, 0.0), (tx, ty, HT), RT, RT * 0.95, 12, PC)
    cone(bm, (tx, ty, HT - 0.06), (tx, ty, HT + 0.06), RT + 0.0, RT + 0.0, 12, PF)  # corniche
    cone(bm, (tx, ty, HT + 0.06), (tx, ty, 2.66), RT, 0.0, 12, TOIT)
    cone(bm, (tx, ty, 2.60), (tx, ty, 3.00), 0.018, 0.018, 4, BOIS)
    boite(bm, tx, ty - 0.012, 2.79, tx + 0.28, ty + 0.012, 2.97, OR)   # drapeau vers +X, visible de face

for v in bm.verts: v.co.z = max(v.co.z, 0.0)   # pieds posés au sol
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new(NOM); bm.to_mesh(me); bm.free()
for mt in MAT: me.materials.append(mt)
ob = bpy.data.objects.new(NOM, me)
decor.objects.link(ob)
autres = [o for o in decor.objects if o is not ob]
ob.location = ((max(o.location.x for o in autres) + 6) if autres else 0, 0, 0)   # 4 unités de vide malgré 3 de large
ob["cases_l"] = 3; ob["cases_h"] = 5; ob["bloquant"] = 1
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
cam.data.type = "ORTHO"; cam.data.ortho_scale = 7.5
cam.location = (cx, -11.5, 10.85); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 900, 800
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
# seconde vue : côté porte (-X)
import mathutils
d = mathutils.Vector((0.542, 0.542, -0.643))
cam.location = mathutils.Vector((cx, 0, 1.2)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(-45))
scene.render.filepath = RENDU.replace(".png", "_porte.png")
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
