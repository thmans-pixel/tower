# Génère prairie_rocher_petit/moyen/gros dans decor.blend (collection Decor).
# Lancer : flatpak run org.blender.Blender -b -P prairie_chenes.py
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

BLEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "decor.blend")
RENDU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apercu_prairie_rochers.png")

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
       materiau("feuillage_clair", "#4CAF50")]
FONCE, CLAIR, MOUSSE = range(3)

# blocs : (centre x, centre y, rayons x/y/z, hauteur du centre en fraction de rz, rotation z)
ROCHERS = {
    "prairie_rocher_petit": dict(bloquant=0, cases=(1, 1), mousse=(-0.06, -0.04, 0.10),
        blocs=[((0, 0), (0.27, 0.23, 0.20), 0.35, 0.4)]),
    "prairie_rocher_moyen": dict(bloquant=1, cases=(1, 1), mousse=(0.12, -0.08, 0.16),
        blocs=[((0, 0), (0.49, 0.42, 0.38), 0.35, 0.9)]),
    "prairie_rocher_gros": dict(bloquant=1, cases=(2, 1), mousse=(-0.50, -0.12, 0.20),
        blocs=[((-0.38, 0.02), (0.58, 0.47, 0.55), 0.35, 0.3),
               ((0.45, 0.06), (0.44, 0.40, 0.40), 0.35, 1.2),
               ((0.82, -0.24), (0.18, 0.17, 0.16), 0.40, 2.0)]),
}

def rocher(nom, d, x):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    rnd = random.Random(nom)
    bm = bmesh.new()
    for (cx, cy), (rx, ry, rz), fz, rot in d["blocs"]:
        m = (Matrix.Translation((cx, cy, rz * fz)) @ Matrix.Rotation(rot, 4, "Z")
             @ Matrix.Diagonal((rx, ry, rz, 1)))
        res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0, matrix=m)
        for v in res["verts"]:                      # facettes irrégulières
            k = rnd.uniform(0.90, 1.08)
            c = Vector((cx, cy, rz * fz))
            v.co = c + (v.co - c) * k
            v.co.z = max(v.co.z, 0.0)               # base plate posée au sol
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm.normal_update()
    mx, my, mr = d["mousse"]
    zmax = max(v.co.z for v in bm.verts)
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.z > 0.5:
            f.material_index = CLAIR
            # plaque de mousse : dessus, près du point choisi, plutôt côté caméra
            if math.hypot(c.x - mx, c.y - my) < mr and f.normal.z > 0.6:
                f.material_index = MOUSSE
        else:
            f.material_index = FONCE
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    for mt in MAT: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    decor.objects.link(ob)
    ob.location = (x, 0, 0)
    ob["cases_l"], ob["cases_h"] = d["cases"]; ob["bloquant"] = d["bloquant"]
    bpy.context.view_layer.update()
    dm = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {dm.x:.2f} x {dm.y:.2f} x {dm.z:.2f}, min z {min(v.co.z for v in me.vertices):.3f}")
    return ob

noms = list(ROCHERS)
autres = [o for o in decor.objects if o.name not in noms]
x0 = (max(o.location.x for o in autres) + 4) if autres else 0
objs = [rocher(n, ROCHERS[n], x0 + 4 * i) for i, n in enumerate(noms)]

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# aperçu vue 3/4 (Workbench, ne modifie pas le .blend sauvegardé)
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = sum(o.location.x for o in objs) / len(objs)
cam.data.type = "ORTHO"; cam.data.ortho_scale = 10.5
cam.location = (cx, -11.5, 9.75); cam.rotation_euler = (math.radians(50), 0, 0)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 450
scene.render.filepath = RENDU
bpy.ops.render.render(write_still=True)
print("OK", BLEND, RENDU)
