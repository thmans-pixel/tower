"""Outils partagés des tours et ennemis (« Les Tours du Royaume »).
Importé par les scripts de famille : sys.path.insert(0, dossier du script) puis `import commun_tours as ct`."""
import bpy, bmesh, math, os
from mathutils import Matrix, Vector

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BLEND = os.path.join(DOSSIER, "decor.blend")

PALETTE = {
    "pierre": "#8D9099", "pierre_claire": "#A9ACB4", "pierre_sombre": "#6E717A",
    "bois": "#9B6B3D", "bois_fonce": "#7A5230", "toits": "#C0392B", "or": "#F2C14E",
    "bleu": "#3A6FC4", "fer_noir": "#2A2D33", "bronze": "#B08D57",
    # hors palette des tours (personnages) : verts du décor + peau
    "tunique": "#4CAF50", "capuche": "#2F7D32", "peau": "#F0C8A0",
}
NOMS = list(PALETTE)
M = {n: i for i, n in enumerate(NOMS)}      # nom -> index de matériau


def _lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
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
    b.inputs["Base Color"].default_value = _lin(hexa)
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Emission Strength"].default_value = 0.0
    m.diffuse_color = _lin(hexa)
    return m


def ouvrir(collection):
    """Ouvre decor.blend (ou un fichier vide) et renvoie (scène, collection, matériaux)."""
    if os.path.exists(BLEND):
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    col = bpy.data.collections.get(collection)
    if not col:
        col = bpy.data.collections.new(collection); scene.collection.children.link(col)
    mats = [materiau(n, PALETTE[n]) for n in NOMS]
    return scene, col, mats


def _colorie(res, mat):
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = M[mat]


def boite(bm, x0, y0, z0, x1, y1, z1, mat):
    m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ \
        Matrix.Diagonal((abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), 1))
    _colorie(bmesh.ops.create_cube(bm, size=1.0, matrix=m), mat)


def pave(bm, c, taille, rz, mat):
    """Pavé centré en c, tourné de rz autour de Z."""
    m = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Diagonal((taille[0], taille[1], taille[2], 1))
    _colorie(bmesh.ops.create_cube(bm, size=1.0, matrix=m), mat)


def cylindre(bm, cx, cy, z0, z1, r0, r1, seg, mat, rot=0.0):
    """Cylindre (ou tronc de cône) vertical ; rot tourne les facettes autour de Z."""
    m = Matrix.Translation((cx, cy, (z0 + z1) / 2)) @ Matrix.Rotation(rot, 4, "Z")
    _colorie(bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
             depth=z1 - z0, matrix=m), mat)


def carre(bm, cx, cy, z0, z1, demi0, demi1, mat):
    """Tronc de pyramide à base carrée alignée sur les axes (demi1=0 : pyramide 4 pans)."""
    m = Matrix.Translation((cx, cy, (z0 + z1) / 2)) @ Matrix.Rotation(math.pi / 4, 4, "Z")
    _colorie(bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=demi0 * math.sqrt(2),
             radius2=demi1 * math.sqrt(2), depth=z1 - z0, matrix=m), mat)


def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    _colorie(bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1,
             depth=d.length, matrix=m), mat)


def boule(bm, c, r, mat, sub=1):
    rr = r if isinstance(r, (tuple, list)) else (r, r, r)
    m = Matrix.Translation(c) @ Matrix.Diagonal((rr[0], rr[1], rr[2], 1))
    _colorie(bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=m), mat)


def socle(bm):
    """Socle de pierre commun à toutes les tours : 0,9 x 0,9, hauteur 0,25."""
    boite(bm, -0.45, -0.45, 0.0, 0.45, 0.45, 0.06, "pierre_sombre")
    carre(bm, 0, 0, 0.06, 0.22, 0.43, 0.41, "pierre")
    boite(bm, -0.43, -0.43, 0.22, 0.43, 0.43, 0.25, "pierre_claire")


def finir(bm, nom, col, mats, loc, props):
    """Crée (ou remplace) l'objet `nom` à partir du bmesh, avec ses propriétés."""
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    for v in bm.verts: v.co.z = max(v.co.z, 0.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    for mt in mats: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    col.objects.link(ob)
    ob.location = loc
    for k, v in props.items(): ob[k] = v
    bpy.context.view_layer.update()
    d = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}")
    return ob


def sauver_et_apercu(scene, objs, png, cible_z=0.8, largeur=None):
    """Enregistre decor.blend puis rend un aperçu en vue de jeu (caméra inclinée à 50°)."""
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
    scene.collection.objects.link(cam)
    xs = [o.location.x for o in objs]
    cx, cy = (min(xs) + max(xs)) / 2, objs[0].location.y
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = largeur or (max(xs) - min(xs) + 3)
    d = Vector((0, math.cos(math.radians(50)), -math.sin(math.radians(50))))
    cam.location = Vector((cx, cy, cible_z)) - d * 15
    cam.rotation_euler = (math.radians(40), 0, 0)
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.render.resolution_x, scene.render.resolution_y = 1200, 600
    scene.render.filepath = os.path.join(DOSSIER, png)
    bpy.ops.render.render(write_still=True)
    print("OK", BLEND, png)
