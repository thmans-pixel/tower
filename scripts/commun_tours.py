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
    "neige": "#E8F6FF", "glace": "#8FD6FF", "eclat": "#5CB8F0",
    "pierre_violette": "#5B4A8A", "fenetre": "#FFD36B", "toit_mage": "#3D2E66",
    "toit_mage_fonce": "#2A1F4D", "orbe": "#C77DFF",
    "corde": "#C8A165",
    "pierre_tempete": "#4A4E5A", "cuivre": "#B87333", "eclair": "#9FE3FF", "nuage": "#7A869C",
    "orbe_bleue": "#4FA3FF", "orbe_feu": "#FF6A2B", "flamme": "#F39C12",
    # ennemis
    "peau_gobelin": "#5FAE3A", "yeux_gobelin": "#FFDE3B", "tunique_gobelin": "#8A5A2B", "cuir": "#4A2F17",
    "loup": "#8C8F99", "loup_dos": "#5C5F68", "loup_ventre": "#C9CCD4", "truffe": "#1E1F24",
    "peau_orc": "#6B8F3A", "armure": "#9AA3AD", "defense": "#F2EEDC",
    "chauve_souris": "#4B3A5C", "aile_membrane": "#6D5585", "yeux_rouges": "#FF4D6D",
    "masque_os": "#E8E2C8", "robe_chaman": "#7B3FA0", "cristal_vert": "#5DFF9A",
    "slime": "#8BE04E", "slime_reflet": "#D8FFB0", "oeil_blanc": "#FFFFFF",
    # hors palette des tours (personnages) : verts du décor + peau
    "tunique": "#4CAF50", "capuche": "#2F7D32", "peau": "#F0C8A0",
}
EMISSION = {"glace": 0.3, "fenetre": 1.0, "orbe": 2.0, "eclair": 2.0, "orbe_bleue": 2.0, "orbe_feu": 2.0, "yeux_gobelin": 1.0, "yeux_rouges": 1.0, "cristal_vert": 2.0}                   # seuls matériaux émissifs (couleur = couleur de base)
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
    force = EMISSION.get(nom, 0.0)
    b.inputs["Emission Strength"].default_value = force
    if force:
        b.inputs["Emission Color"].default_value = _lin(hexa)
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


def plaque(bm, pts2d, y0, y1, mat):
    """Plaque verticale (plan XZ) de contour pts2d [(x, z)...], épaisse de y0 à y1."""
    av = [bm.verts.new((x, y0, z)) for x, z in pts2d]
    ar = [bm.verts.new((x, y1, z)) for x, z in pts2d]
    faces = [bm.faces.new(av), bm.faces.new(list(reversed(ar)))]
    n = len(pts2d)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((av[i], ar[i], ar[j], av[j])))
    for f in faces: f.material_index = M[mat]


def anneau(bm, c, r, ep, mat, n=16, tilt=0.0, az=0.0):
    """Anneau fait de n pavés tangents, centré en c, incliné de tilt (autour de l'axe az)."""
    R = Matrix.Translation(c) @ Matrix.Rotation(az, 4, "Z") @ Matrix.Rotation(tilt, 4, "X")
    l = 2 * math.pi * r / n * 1.08
    for i in range(n):
        a = 2 * math.pi * i / n
        m = R @ Matrix.Translation((r * math.cos(a), r * math.sin(a), 0)) @ Matrix.Rotation(a, 4, "Z") \
            @ Matrix.Diagonal((ep, l, ep, 1))
        _colorie(bmesh.ops.create_cube(bm, size=1.0, matrix=m), mat)


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


def empty_pivot(nom, parent, z, col, role):
    """Empty enfant de la tour marquant où poser la pièce mobile (propriété role)."""
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    e = bpy.data.objects.new(nom, None)
    e.empty_display_type = "ARROWS"; e.empty_display_size = 0.25
    col.objects.link(e)
    e.parent = parent
    e.location = (0, 0, z)
    e["role"] = role
    return e


VERSIONS = {}      # rempli par les scripts : nom d'objet -> nom de la version (propriété « version »)


def sauver_et_apercu(scene, objs, png, cible_z=0.8, largeur=None, autres=()):
    """Enregistre decor.blend puis rend un aperçu en vue de jeu (caméra inclinée à 50°).
    autres : [(objs, png, largeur), ...] aperçus supplémentaires."""
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    _rendu(scene, objs, png, cible_z, largeur)
    for o2, p2, l2 in autres:
        _rendu(scene, o2, p2, cible_z, l2)


def _rendu(scene, objs, png, cible_z, largeur):
    cam = bpy.data.objects.get("apercu_cam") or bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
    if cam.name not in scene.collection.objects: scene.collection.objects.link(cam)
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
