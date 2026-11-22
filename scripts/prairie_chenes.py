# Génère prairie_chene_1/2/3 dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_chenes.png")

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

# Silhouettes : tronc (hauteur, courbure x, courbure y, torsion) + boules (x, y, z, rayon, aplatissement)
CHENES = {
    "prairie_chene_1": dict(  # ronde
        tronc=(0.75, 0.06, -0.03, 0.5),
        boules=[(0, 0, 1.17, 0.44, 0.90), (0.22, -0.08, 0.84, 0.27, 0.80),
                (-0.22, 0.06, 0.84, 0.27, 0.80), (0.00, 0.22, 0.82, 0.26, 0.80),
                (0.03, -0.22, 0.86, 0.26, 0.80)]),
    "prairie_chene_2": dict(  # large
        tronc=(0.70, -0.10, 0.02, 0.6),
        boules=[(-0.23, 0, 0.84, 0.27, 0.70), (0.23, 0.02, 0.86, 0.27, 0.70),
                (0, 0, 1.13, 0.36, 0.80), (0, 0.20, 0.82, 0.25, 0.70),
                (0, -0.20, 0.84, 0.25, 0.70)]),
    "prairie_chene_3": dict(  # haute
        tronc=(0.80, 0.05, 0.05, 0.7),
        boules=[(0, 0, 0.90, 0.33, 0.85), (0.05, 0.03, 1.22, 0.30, 0.85),
                (-0.03, -0.02, 1.55, 0.24, 0.90), (0.16, -0.12, 1.00, 0.22, 0.85),
                (-0.15, 0.10, 1.05, 0.20, 0.85)]),
}

def tronc(bm, h, bx, by, tw):
    seg = 8
    niveaux = [(0.0, 0.23), (0.12, 0.165), (0.35, 0.145), (0.6, 0.135), (1.0, 0.12)]
    anneaux = []
    for t, r in niveaux:
        cx, cy = bx * math.sin(t * math.pi), by * t * t
        a0 = tw * t
        anneaux.append([bm.verts.new((cx + r * math.cos(a0 + 2 * math.pi * i / seg),
                                      cy + r * math.sin(a0 + 2 * math.pi * i / seg), t * h))
                        for i in range(seg)])
    for a, b in zip(anneaux, anneaux[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i])).material_index = 0
    bm.faces.new(list(reversed(anneaux[0]))).material_index = 0
    bm.faces.new(anneaux[-1]).material_index = 0

def chene(nom, d, x):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    rnd = random.Random(nom)
    bm = bmesh.new()
    tronc(bm, *d["tronc"])
    for k, (bx, by, bz, r, fl) in enumerate(d["boules"]):
        m = (Matrix.Translation((bx, by, bz)) @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, "Z")
             @ Matrix.Diagonal((r, r, r * fl, 1)))
        res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0, matrix=m)
        fset = {f for v in res["verts"] for f in v.link_faces}
        for f in fset: f.material_index = 1 + (k % 2)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    for mt in MAT: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    decor.objects.link(ob)
    ob.location = (x, 0, 0)
    ob["cases_l"] = 1; ob["cases_h"] = 1; ob["bloquant"] = 1
    dim = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {dim.x:.2f} x {dim.y:.2f} x {dim.z:.2f}")
    return ob

# placement : 4 unités d'écart, après les objets déjà présents dans Decor
noms = list(CHENES)
autres = [o for o in decor.objects if o.name not in noms]
x0 = (max(o.location.x for o in autres) + 4) if autres else 0
objs = [chene(n, CHENES[n], x0 + 4 * i) for i, n in enumerate(noms)]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = sum(o.location.x for o in objs) / 3
cam.data.type = "ORTHO"; cam.data.ortho_scale = 10
cam.location = (cx, -11.5, 10.4); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 500
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
