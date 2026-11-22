# Génère prairie_fleurs_1/2 dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_fleurs.png")

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

MAT = [materiau("herbe", "#5C9E3F"), materiau("feuillage_fonce", "#2F7D32"),
       materiau("toits", "#C0392B"), materiau("or", "#F2C14E"), materiau("tronc", "#6B4423"),
       materiau("fleur_blanche", "#F4F1E8"), materiau("fleur_violette", "#8E44AD")]
H, FO, ROUGE, JAUNE, BRUN, BLANC, VIOLET = range(7)
# (couleur pétales, couleur coeur) alternées
TOUFFES = {"prairie_fleurs_1": [(ROUGE, JAUNE), (JAUNE, BRUN)],
           "prairie_fleurs_2": [(BLANC, JAUNE), (VIOLET, JAUNE)]}

def anneau(bm, r, z, cx=0.0, cy=0.0, seg=10):
    return [bm.verts.new((cx + r * math.cos(2 * math.pi * i / seg), cy + r * math.sin(2 * math.pi * i / seg), z))
            for i in range(seg)]

def disque(bm, c, r, ep, mat, tilt, seg=6):
    m = Matrix.Translation(c) @ Matrix.Rotation(tilt, 4, "X")
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=ep, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat

def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
                                depth=d.length, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = mat


def touffe(nom, couleurs, x):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    rnd = random.Random(nom)
    bm = bmesh.new()
    # tapis d'herbe : petit dôme bas
    a = anneau(bm, 0.20, 0.0); b = anneau(bm, 0.17, 0.035); c = anneau(bm, 0.09, 0.05)
    for r0, r1 in ((a, b), (b, c)):
        for i in range(10):
            j = (i + 1) % 10
            bm.faces.new((r0[i], r0[j], r1[j], r1[i])).material_index = H
    top = bm.verts.new((0, 0, 0.055))
    for i in range(10): bm.faces.new((c[i], c[(i + 1) % 10], top)).material_index = H
    bm.faces.new(list(reversed(a))).material_index = H
    # une dizaine de tiges avec fleur en disque, penchées vers la caméra (-Y)
    n = 10
    for k in range(n):
        ang = k * 2.39996 + rnd.uniform(-0.2, 0.2)          # répartition en tournesol
        rr = 0.03 + 0.10 * math.sqrt((k + 0.5) / n)
        bx, by = rr * math.cos(ang), rr * math.sin(ang)
        h = rnd.uniform(0.12, 0.22)
        tx, ty = bx * 1.15, by * 1.15 - 0.01
        cone(bm, (bx, by, 0.02), (tx, ty, h), 0.012, 0.009, 4, FO)
        pet, coeur = couleurs[k % 2]
        tilt = 0.35
        disque(bm, (tx, ty, h + 0.008), rnd.uniform(0.042, 0.052), 0.014, pet, tilt)
        disque(bm, (tx, ty - 0.004, h + 0.017), 0.018, 0.010, coeur, tilt, seg=5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for mt in MAT: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    decor.objects.link(ob)
    ob.location = (x, 0, 0)
    ob["cases_l"] = 1; ob["cases_h"] = 1; ob["bloquant"] = 0
    bpy.context.view_layer.update()
    d = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}, min z {min(v.co.z for v in me.vertices):.3f}")
    return ob

noms = list(TOUFFES)
autres = [o for o in decor.objects if o.name not in noms]
x0 = (max(o.location.x for o in autres) + 4) if autres else 0
objs = [touffe(n, TOUFFES[n], x0 + 4 * i) for i, n in enumerate(noms)]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = sum(o.location.x for o in objs) / len(objs)
cam.data.type = "ORTHO"; cam.data.ortho_scale = 5.5
cam.location = (cx, -11.5, 9.75); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 1000, 400
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
