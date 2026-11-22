# Génère prairie_herbes_hautes dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_herbes_hautes.png")

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

MAT = [materiau("feuillage_fonce", "#2F7D32"), materiau("feuillage_clair", "#4CAF50")]
NOM = "prairie_herbes_hautes"

def lame(bm, base, ang, lean, h, larg, mat):
    """Lame effilée en losange aplati : base -> milieu -> pointe, courbée vers l'extérieur."""
    d = Vector((math.cos(ang), math.sin(ang), 0))          # direction de penchée
    t = Vector((-d.y, d.x, 0))                              # largeur de la lame
    b = Vector(base)
    pts = [(b, larg), (b + d * lean * 0.35 + Vector((0, 0, h * 0.55)), larg * 0.6)]
    tip = bm.verts.new(b + d * lean + Vector((0, 0, h)))
    rings = []
    for c, w in pts:
        rings.append([bm.verts.new(c + t * w), bm.verts.new(c + d * w * 0.35),
                      bm.verts.new(c - t * w), bm.verts.new(c - d * w * 0.35)])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((r0[i], r0[j], r1[j], r1[i])).material_index = mat
    for i in range(4):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % 4], tip)).material_index = mat
    bm.faces.new(list(reversed(rings[0]))).material_index = mat

old = bpy.data.objects.get(NOM)
if old: bpy.data.objects.remove(old, do_unlink=True)
rnd = random.Random(NOM)
bm = bmesh.new()
n = 22
for k in range(n):
    ang = k * 2.39996 + rnd.uniform(-0.25, 0.25)
    rr = 0.09 * math.sqrt((k + 0.5) / n)
    base = (rr * math.cos(ang), rr * math.sin(ang), 0.0)
    centre = rr < 0.045
    h = rnd.uniform(0.34, 0.40) if centre else rnd.uniform(0.22, 0.34)
    lean = rnd.uniform(0.05, 0.10) if centre else rnd.uniform(0.15, 0.20)
    # légère penchée commune vers +X pour l'effet de vent
    lame(bm, base, ang + 0.25, lean, h, rnd.uniform(0.026, 0.034), k % 2)

bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new(NOM); bm.to_mesh(me); bm.free()
for mt in MAT: me.materials.append(mt)
ob = bpy.data.objects.new(NOM, me)
decor.objects.link(ob)
autres = [o for o in decor.objects if o is not ob]
ob.location = ((max(o.location.x for o in autres) + 4) if autres else 0, 0, 0)
ob["cases_l"] = 1; ob["cases_h"] = 1; ob["bloquant"] = 0
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
