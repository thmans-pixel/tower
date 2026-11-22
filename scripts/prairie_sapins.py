# Génère prairie_sapin_1/2 dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_sapins.png")

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

MAT = [materiau("tronc", "#6B4423"), materiau("feuillage_fonce", "#2F7D32"),
       materiau("feuillage_clair", "#4CAF50")]

# étages : (z base, hauteur, rayon, décalage x, décalage y)
SAPINS = {
    "prairie_sapin_1": [(0.45, 0.62, 0.44, 0, 0), (0.82, 0.55, 0.35, 0.04, -0.02),
                        (1.15, 0.65, 0.26, -0.03, 0.03)],
    "prairie_sapin_2": [(0.45, 0.62, 0.44, 0, 0), (0.82, 0.55, 0.37, 0.04, 0.03),
                        (1.15, 0.52, 0.29, -0.04, -0.02), (1.46, 0.74, 0.21, 0.02, 0.02)],
}

def anneau(bm, cx, cy, z, r, a0, seg):
    return [bm.verts.new((cx + r * math.cos(a0 + 2 * math.pi * i / seg),
                          cy + r * math.sin(a0 + 2 * math.pi * i / seg), z)) for i in range(seg)]

def quads(bm, a, b, mat):
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i])).material_index = mat

def sapin(nom, etages, x):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    rnd = random.Random(nom)
    bm = bmesh.new()
    # petit tronc
    t0 = anneau(bm, 0, 0, 0.0, 0.14, 0, 6); t1 = anneau(bm, 0, 0, 0.50, 0.10, 0.3, 6)
    quads(bm, t0, t1, 0)
    bm.faces.new(list(reversed(t0))).material_index = 0; bm.faces.new(t1).material_index = 0
    # étages : bas foncé, haut clair
    for z, h, r, ox, oy in etages:
        a0 = rnd.uniform(0, 6.28)
        bas = anneau(bm, ox, oy, z, r, a0, 9)
        bord = anneau(bm, ox * 0.9, oy * 0.9, z + 0.22 * h, r * 0.78, a0 + 0.05, 9)
        pointe = bm.verts.new((ox * 0.2, oy * 0.2, z + h))
        quads(bm, bas, bord, 2)          # bord de l'étage : vert clair
        for i in range(9):               # reste du cône : vert foncé
            bm.faces.new((bord[i], bord[(i + 1) % 9], pointe)).material_index = 1
        bm.faces.new(list(reversed(bas))).material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for mt in MAT: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    decor.objects.link(ob)
    ob.location = (x, 0, 0)
    ob["cases_l"] = 1; ob["cases_h"] = 1; ob["bloquant"] = 1
    d = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}")
    return ob

# placement : 4 unités d'écart, après les objets déjà présents dans Decor
noms = list(SAPINS)
autres = [o for o in decor.objects if o.name not in noms]
x0 = (max(o.location.x for o in autres) + 4) if autres else 0
objs = [sapin(n, SAPINS[n], x0 + 4 * i) for i, n in enumerate(noms)]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = sum(o.location.x for o in objs) / len(objs)
cam.data.type = "ORTHO"; cam.data.ortho_scale = 7
cam.location = (cx, -11.5, 10.8); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 900, 600
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
