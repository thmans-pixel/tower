"""Outils partagés des décors du Désert (« Les Tours du Royaume »).
Importé par les scripts desert_*.py : sys.path.insert(0, dossier du script) puis `import commun_desert as cd`.

Mêmes règles que la Prairie : 1 unité = 1 case, origine au centre de la base à Z = 0, face vers -Y,
un objet par élément dans la collection « Decor », Principled uni rugosité 0,8, moins de 1 500 faces,
propriétés cases_l, cases_h, bloquant. Les objets du désert sont rangés sur la ligne Y = -16
(Prairie sur Y = 0, ennemis sur Y = -8, tours sur Y > 0), à une place fixe pour qu'un script relancé ne les déplace pas.
"""
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BLEND = os.path.join(DOSSIER, "decor.blend")
LIGNE_Y = -16.0
MAX_FACES = 1500

PALETTE = {
    "sable": "#E3C27A", "sable_fonce": "#C9A35C",
    "gres": "#C97B4A", "gres_fonce": "#A85F36",
    "roche_rouge": "#B5523B",
    "cactus": "#5E8C3A", "cactus_clair": "#7DAA4E",
    "palmes": "#4E8A3C", "tronc_palmier": "#8A6A43",
    "eau": "#3FA7C9",
    "fleur_rose": "#E86A92",
    "os": "#EFE6CF",             # crâne blanchi (hors palette du désert)
    "rouge_royal": "#C0392B",    # bannières : rouge et or du royaume (palette de la Prairie)
    "or": "#F2C14E",     # fleur du saguaro (demandée en rose, hors palette du désert)
    "ombre": "#1F1B18",          # fond de porte / de grotte, comme ombre_grotte de la Prairie
}

# Place de chaque objet sur la ligne du désert (écart de 4 unités, 6 de part et d'autre du château de 3 cases)
# Ajouter les nouveaux objets à la fin pour ne pas décaler les autres.
ORDRE = ["desert_palmier_1", "desert_palmier_2", "desert_cactus_1", "desert_cactus_2",
         "desert_cactus_3",          "desert_souche", "desert_buisson", "desert_fleurs_1", "desert_fleurs_2", "desert_herbes_hautes",
         "desert_rocher_petit", "desert_rocher_moyen", "desert_rocher_gros", "desert_cloture",
         "desert_oasis", "desert_entree", "desert_chateau", "desert_dune", "desert_touffe",
         "desert_forteresse", "desert_entree_nord", "desert_entree_sud",
         "desert_sol_sable", "desert_sol_chemin"]
LARGES = ("desert_entree", "desert_chateau", "desert_forteresse")   # 6 unités avant et après


def place_x(nom):
    x = 0.0
    for i, n in enumerate(ORDRE):
        if n == nom:
            return x
        suivant = ORDRE[i + 1] if i + 1 < len(ORDRE) else None
        x += 6.0 if (n in LARGES or suivant in ("desert_chateau", "desert_forteresse")) else 4.0
    raise KeyError(nom)


def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def materiau(cle):
    """Matériau `desert_<cle>` : Principled uni, rugosité 0,8, sans émission ni texture."""
    nom = f"desert_{cle}"
    hexa = PALETTE[cle]
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


def ouvrir():
    """Rouvre decor.blend (ou un fichier vide) et renvoie la collection Decor."""
    if os.path.exists(BLEND):
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    decor = bpy.data.collections.get("Decor")
    if not decor:
        decor = bpy.data.collections.new("Decor"); scene.collection.children.link(decor)
    return decor


def nettoie(nom):
    o = bpy.data.objects.get(nom)
    if o:
        me = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if me and me.users == 0: bpy.data.meshes.remove(me)


# --- primitives bmesh (chaque fonction colore ses faces avec l'indice de matériau donné) ---
def _colore(res, mat):
    faces = {f for v in res["verts"] for f in v.link_faces}
    for f in faces: f.material_index = mat
    return res["verts"]


def cone(bm, p0, p1, r0, r1, seg, mat):
    d = Vector(p1) - Vector(p0)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((Vector(p0) + Vector(p1)) / 2) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=d.length, matrix=m)
    return _colore(res, mat)


def boite(bm, x0, y0, z0, x1, y1, z1, mat):
    m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1))
    return _colore(bmesh.ops.create_cube(bm, size=1.0, matrix=m), mat)


def boule(bm, c, r, mat, rnd=None, sub=1, jit=(0.90, 1.08), rot=0.0, sol=True):
    """Ellipsoïde facetté de rayons r=(rx, ry, rz) centré en c ; sol=True coupe tout ce qui passe sous Z = 0."""
    m = Matrix.Translation(c) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Diagonal((r[0], r[1], r[2], 1))
    vs = _colore(bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=m), mat)
    for v in vs:
        if rnd: v.co = Vector(c) + (v.co - Vector(c)) * rnd.uniform(*jit)
        if sol: v.co.z = max(v.co.z, 0.0)
    return vs


def finir(decor, nom, bm, mats, cases, bloquant, extra=None, normales=True):
    """Crée l'objet `nom` depuis bm (origine déjà au centre de la base), le range et le vérifie.
    normales=False garde l'orientation des faces telle que construite (maillage à bords dégénérés)."""
    for v in bm.verts: v.co.z = max(v.co.z, 0.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    if normales:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    for mt in mats: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    decor.objects.link(ob)
    ob.location = (place_x(nom), LIGNE_Y, 0)
    ob["cases_l"], ob["cases_h"] = cases
    ob["bloquant"] = int(bloquant)
    for k, v in (extra or {}).items(): ob[k] = v
    bpy.context.view_layer.update()
    d = ob.dimensions
    n = len(me.polygons)
    zmin = min(v.co.z for v in me.vertices)
    alerte = "" if n < MAX_FACES else "  <-- TROP DE FACES"
    print(f"{nom}: {n} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}, min z {zmin:.3f}{alerte}")
    assert n < MAX_FACES, f"{nom} dépasse {MAX_FACES} faces"
    return ob


def enregistrer_et_apercu(objs, rendu, ortho=10.5, res=(1200, 450), hauteur=1.0):
    """Sauve decor.blend puis rend un aperçu vue 3/4 (Workbench) ; la caméra n'est pas sauvegardée."""
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    scene = bpy.context.scene
    cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
    scene.collection.objects.link(cam)
    cx = sum(o.location.x for o in objs) / len(objs)
    e = math.radians(40)                            # même cadrage que les aperçus de la Prairie
    cam.data.type = "ORTHO"; cam.data.ortho_scale = ortho
    cam.location = (cx, LIGNE_Y - 15 * math.cos(e), hauteur + 15 * math.sin(e))
    cam.rotation_euler = (math.radians(50), 0, 0)
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.view_settings.view_transform = "Standard"     # couleurs de la palette telles quelles (après la sauvegarde)
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = os.path.join(DOSSIER, rendu)
    bpy.ops.render.render(write_still=True)
    print("OK", BLEND, scene.render.filepath)
    return cam
