# rendu_blender.py — Les Tours du Royaume
# Rend les collections de decor.blend en images pour le jeu (docs/specs/002 et 003) :
#   Decor   -> assets/decors/<carte>/  une image par élément
#   Tours   -> assets/tours/           une image par tour et niveau ; pièce mobile (fût, arme) en 16 orientations
#   Ennemis -> assets/ennemis/         une bande de 8 images par action (marche, vol, rugissement)
# Chaque dossier reçoit son manifest.json. Le fichier .blend n'est pas modifié.
#
# Depuis la racine du dépôt (chemins complets obligatoires avec Flatpak) :
#   flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_blender.py"
# Pour ne refaire qu'une partie, ajouter après « -- » : decor, tours et/ou ennemis.
#   ... -P "$PWD/tools/blender/rendu_blender.py" -- tours

import bpy, json, math, os, shutil, sys, tempfile
from mathutils import Vector

# ------------------------------------------------------------------ réglages
CARTE = "prairie"          # carte du décor (préfixe des objets de la collection Decor)
STYLE = "pixel"            # "pixel" (accordé au jeu) ou "lisse"
ELEVATION = 50             # inclinaison de la caméra au-dessus de l'horizon, en degrés
ECHANTILLONS = 48          # qualité Cycles
CONTOUR = True             # contour sombre d'un pixel (style pixel)
AGRANDISSEMENT_ENNEMIS = 1.5   # ennemis rendus plus grands que nature pour rester lisibles (spec 003)
ORIENTATIONS = 16          # orientations des pièces mobiles des tours
# ---------------------------------------------------------------------------

PPC = 20 if STYLE == "pixel" else 80
MARGE = 2
DIR_SOLEIL = Vector((1.0, -1.0, -1.6)).normalized()
COULEUR_CONTOUR = (26 / 255, 20 / 255, 32 / 255, 1.0)
TMP = tempfile.mkdtemp(prefix="td_rendu_")


# ------------------------------------------------------------------ scène de rendu

def preparer_scene():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = ECHANTILLONS
    sc.cycles.use_denoising = STYLE == "lisse"
    sc.render.film_transparent = True
    sc.render.filter_size = 0.01 if STYLE == "pixel" else 1.5
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"

    monde = bpy.data.worlds.new("TD_Monde")
    if hasattr(monde, "use_nodes") and not getattr(monde, "node_tree", None):
        monde.use_nodes = True
    nt = monde.node_tree
    fond = next((n for n in nt.nodes if n.type == "BACKGROUND"), None)
    if fond is None:
        fond = nt.nodes.new("ShaderNodeBackground")
        sortie = next((n for n in nt.nodes if n.type == "OUTPUT_WORLD"), None) or nt.nodes.new("ShaderNodeOutputWorld")
        nt.links.new(fond.outputs["Background"], sortie.inputs["Surface"])
    fond.inputs["Color"].default_value = (0.75, 0.8, 0.9, 1)
    fond.inputs["Strength"].default_value = 0.55
    sc.world = monde

    cam_data = bpy.data.cameras.new("TD_Camera")
    cam_data.type = "ORTHO"
    cam_data.clip_end = 200
    cam = bpy.data.objects.new("TD_Camera", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam

    sol = bpy.data.lights.new("TD_Soleil", "SUN")
    sol.energy = 3.2
    sol.angle = math.radians(4)
    soleil = bpy.data.objects.new("TD_Soleil", sol)
    soleil.rotation_euler = DIR_SOLEIL.to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(soleil)

    me = bpy.data.meshes.new("TD_Ombre")
    me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    plan = bpy.data.objects.new("TD_Ombre", me)
    sc.collection.objects.link(plan)
    plan.is_shadow_catcher = True
    return sc, cam, soleil, plan


def placer_camera(cam, dessus):
    if dessus:
        cam.rotation_euler = (0, 0, 0)
        cam.location = (0, 0, 50)
    else:
        e = math.radians(ELEVATION)
        cam.rotation_euler = (math.radians(90) - e, 0, 0)
        cam.location = (0, -50 * math.cos(e), 50 * math.sin(e))
    bpy.context.view_layer.update()


def montrer_seulement(sc, visibles, outils):
    for o in sc.objects:
        o.hide_render = o not in visibles and o not in outils


def points_monde(objs, avec_ombre):
    """Sommets réels (déformés par l'armature, s'il y en a) des objets, et leurs ombres sur le sol."""
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        if o.type != "MESH":
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
            continue
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        pts += [mw @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    if avec_ombre:
        pts += [p + DIR_SOLEIL * (-p.z / DIR_SOLEIL.z) for p in list(pts) if p.z > 0]
    return pts


def cadrer(sc, cam, pts, ppc, ancres):
    """Règle résolution et décalage de la caméra pour contenir `pts` ; renvoie les ancres (pixels) des points donnés."""
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in pts]
    xmin, xmax = min(p.x for p in loc), max(p.x for p in loc)
    ymin, ymax = min(p.y for p in loc), max(p.y for p in loc)
    rx = math.ceil((xmax - xmin) * ppc) + 2 * MARGE
    ry = math.ceil((ymax - ymin) * ppc) + 2 * MARGE
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    o = max(rx, ry) / ppc
    cam.data.ortho_scale = o
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    cam.data.shift_x, cam.data.shift_y = cx / o, cy / o
    res = []
    for a in ancres:
        q = inv @ a
        res.append([round(rx / 2 + (q.x - cx) * ppc, 1), round(ry / 2 - (q.y - cy) * ppc, 1)])
    return rx, ry, res


# ------------------------------------------------------------------ images

def post_pixel(chemin):
    im = bpy.data.images.load(chemin)
    w, h = im.size
    px = list(im.pixels)
    sortie = px[:]
    for k in range(0, len(px), 4):
        al = px[k + 3]
        if al >= 0.85:
            sortie[k + 3] = 1.0
        elif al > 0.06:
            sortie[k:k + 4] = [0.0, 0.0, 0.0, 0.35]      # ombre portée : noir uni et léger
        else:
            sortie[k:k + 4] = [0.0, 0.0, 0.0, 0.0]
    if CONTOUR:
        base = sortie[:]
        def opaque(i, j):
            return 0 <= i < w and 0 <= j < h and base[(j * w + i) * 4 + 3] == 1.0
        for j in range(h):
            for i in range(w):
                k = (j * w + i) * 4
                if base[k + 3] < 1.0 and (opaque(i - 1, j) or opaque(i + 1, j) or opaque(i, j - 1) or opaque(i, j + 1)):
                    sortie[k:k + 4] = list(COULEUR_CONTOUR)
    im.pixels = sortie
    im.filepath_raw = chemin
    im.file_format = "PNG"
    im.save()
    bpy.data.images.remove(im)


def assembler(chemins, sortie):
    """Met les images côte à côte, de gauche à droite."""
    ims = [bpy.data.images.load(c) for c in chemins]
    w, h = ims[0].size
    n = len(ims)
    buf = [0.0] * (n * w * h * 4)
    for k, im in enumerate(ims):
        px = im.pixels[:]
        for y in range(h):
            d = (y * n * w + k * w) * 4
            buf[d:d + w * 4] = px[y * w * 4:(y + 1) * w * 4]
    out = bpy.data.images.new("td_bande", n * w, h, alpha=True)
    out.pixels = buf
    out.filepath_raw = sortie
    out.file_format = "PNG"
    out.save()
    for im in ims + [out]:
        bpy.data.images.remove(im)


def rendre_serie(ctx, visibles, etats, dossier, nom, ppc, ombre, ancres, dessus=False):
    """Rend `visibles` dans chaque état (fonction sans argument), avec un cadrage commun à tous les états.
    Renvoie { fichier, images, largeur, hauteur, ancres }."""
    sc, cam, outils, plan = ctx
    montrer_seulement(sc, visibles, outils)
    plan.hide_render = not ombre
    placer_camera(cam, dessus)
    pts = []
    for e in etats:
        e()
        bpy.context.view_layer.update()
        pts += points_monde(visibles, ombre)
    rx, ry, px_ancres = cadrer(sc, cam, pts, ppc, ancres)
    chemins = []
    for k, e in enumerate(etats):
        e()
        c = os.path.join(TMP, f"{nom}_{k}.png")
        sc.render.filepath = c
        bpy.ops.render.render(write_still=True)
        if STYLE == "pixel":
            post_pixel(c)
        chemins.append(c)
    fichier = nom + ".png"
    if len(chemins) == 1:
        shutil.copyfile(chemins[0], os.path.join(dossier, fichier))
    else:
        assembler(chemins, os.path.join(dossier, fichier))
    print("rendu :", fichier, f"({len(chemins)} image{'s' if len(chemins) > 1 else ''})")
    return {"fichier": fichier, "images": len(chemins), "largeur": rx, "hauteur": ry, "ancres": px_ancres}


def a_l_origine(obj):
    """Place un objet à l'origine le temps du rendu ; renvoie la fonction qui le remet en place."""
    loc = obj.location.copy()
    obj.location = (0, 0, 0)
    bpy.context.view_layer.update()
    return lambda: setattr(obj, "location", loc)


def ecrire_manifest(dossier, donnees):
    with open(os.path.join(dossier, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "style": STYLE, **donnees}, f, ensure_ascii=False, indent=1)


def collection(nom):
    c = bpy.data.collections.get(nom)
    return list(c.all_objects) if c else []


# ------------------------------------------------------------------ les trois collections

def rendre_decor(ctx, racine):
    d = os.path.join(racine, "assets", "decors", CARTE)
    os.makedirs(d, exist_ok=True)
    elements = []
    for obj in [o for o in collection("Decor") if o.type in {"MESH", "CURVE", "META", "FONT", "SURFACE"}]:
        typ = str(obj.get("type", "decor"))
        remettre = a_l_origine(obj)
        r = rendre_serie(ctx, [obj], [lambda: None], d, obj.name, PPC, typ != "sol", [Vector((0, 0, 0))], dessus=typ == "sol")
        remettre()
        elements.append({"nom": obj.name, "fichier": r["fichier"], "type": typ,
                         "cases_l": int(obj.get("cases_l", 1)), "cases_h": int(obj.get("cases_h", 1)),
                         "bloquant": int(obj.get("bloquant", 1)), "ancre": r["ancres"][0]})
    ecrire_manifest(d, {"carte": CARTE, "pixels_par_case": PPC, "elevation": ELEVATION, "elements": elements})
    return len(elements)


def rendre_tours(ctx, racine):
    d = os.path.join(racine, "assets", "tours")
    os.makedirs(d, exist_ok=True)
    tours = []
    objets = collection("Tours")
    corps = [o for o in objets if o.type == "MESH" and o.get("type") == "tour"
             and not o.name.endswith(("_fut", "_arme"))]
    for t in corps:
        pivot = next((c for c in t.children if c.get("role")), None)
        piece = None
        if pivot:
            piece = bpy.data.objects.get(t.name + "_fut") or bpy.data.objects.get(t.name + "_arme")
        remettre = a_l_origine(t)
        p_monde = pivot.matrix_world.translation.copy() if pivot else Vector((0, 0, 0))
        r = rendre_serie(ctx, [t], [lambda: None], d, t.name, PPC, True, [Vector((0, 0, 0)), p_monde])
        entree = {"nom": t.name, "tour": t.get("tour"), "niveau": t.get("niveau"), "variante": t.get("variante"),
                  "version": t.get("version"), "fichier": r["fichier"], "ancre": r["ancres"][0]}
        if piece:
            loc, rot = piece.location.copy(), piece.rotation_euler.copy()
            piece.location = p_monde
            def tourner(k, rot=rot):
                return lambda: setattr(piece.rotation_euler, "z", rot.z + 2 * math.pi * k / ORIENTATIONS)
            rp = rendre_serie(ctx, [piece], [tourner(k) for k in range(ORIENTATIONS)], d, piece.name, PPC, False, [p_monde])
            piece.location, piece.rotation_euler = loc, rot
            entree["pivot"] = r["ancres"][1]
            entree["piece"] = {"role": pivot.get("role"), "fichier": rp["fichier"], "images": rp["images"],
                               "largeur": rp["largeur"], "hauteur": rp["hauteur"], "ancre": rp["ancres"][0]}
        remettre()
        tours.append(entree)
    ecrire_manifest(d, {"pixels_par_case": PPC, "elevation": ELEVATION, "orientations": ORIENTATIONS, "tours": tours})
    return len(tours)


def rendre_ennemis(ctx, racine):
    d = os.path.join(racine, "assets", "ennemis")
    os.makedirs(d, exist_ok=True)
    ppc = PPC * AGRANDISSEMENT_ENNEMIS
    ennemis = []
    for arm in [o for o in collection("Ennemis") if o.type == "ARMATURE"]:
        maillages = [c for c in arm.children if c.type == "MESH"]
        ad = arm.animation_data
        if not maillages or not ad or not ad.nla_tracks:
            print("ATTENTION :", arm.name, "sans maillage ou sans piste d'animation, ignoré")
            continue
        nom = str(arm.get("ennemi") or arm.name.replace("_armature", ""))
        remettre = a_l_origine(arm)
        etat_pistes = {tr.name: tr.mute for tr in ad.nla_tracks}
        action_avant = ad.action
        ad.action = None
        actions = {}
        for tr in ad.nla_tracks:
            for autre in ad.nla_tracks:
                autre.mute = autre is not tr
            debut, fin = 1, 8
            if tr.strips and tr.strips[0].action:
                a = tr.strips[0].action
                debut, fin = int(a.frame_range[0]), int(a.frame_range[1])
            images = list(range(debut, fin + 1))
            etats = [(lambda f=f: bpy.context.scene.frame_set(f)) for f in images]
            r = rendre_serie(ctx, maillages, etats, d, f"{nom}_{tr.name}", ppc, tr.name != "vol", [Vector((0, 0, 0))])
            actions[tr.name] = {"fichier": r["fichier"], "images": r["images"], "largeur": r["largeur"],
                                "hauteur": r["hauteur"], "ancre": r["ancres"][0]}
        for tr in ad.nla_tracks:
            tr.mute = etat_pistes.get(tr.name, False)
        ad.action = action_avant
        bpy.context.scene.frame_set(1)
        remettre()
        ennemis.append({"nom": nom, "actions": actions})
    ecrire_manifest(d, {"pixels_par_case": ppc, "agrandissement": AGRANDISSEMENT_ENNEMIS, "elevation": ELEVATION,
                        "ennemis": ennemis})
    return len(ennemis)


def main():
    if not bpy.data.filepath:
        raise RuntimeError("Ouvre decor.blend : les images sont écrites dans assets/ à côté de lui.")
    racine = bpy.path.abspath("//")
    demandes = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["decor", "tours", "ennemis"]
    sc, cam, soleil, plan = preparer_scene()
    outils = {cam, soleil, plan}
    cache = {o.name: o.hide_render for o in sc.objects}
    bilan = []
    try:
        if "decor" in demandes:
            bilan.append(f"{rendre_decor((sc, cam, outils, plan), racine)} éléments de décor")
        if "tours" in demandes:
            bilan.append(f"{rendre_tours((sc, cam, outils, plan), racine)} tours")
        if "ennemis" in demandes:
            bilan.append(f"{rendre_ennemis((sc, cam, outils, plan), racine)} ennemis")
    finally:
        for o in (cam, soleil, plan):
            bpy.data.objects.remove(o, do_unlink=True)
        for o in sc.objects:
            o.hide_render = cache.get(o.name, o.hide_render)
        shutil.rmtree(TMP, ignore_errors=True)
    print("\nRendu terminé : " + ", ".join(bilan) + ", dans " + os.path.join(racine, "assets"))


main()
