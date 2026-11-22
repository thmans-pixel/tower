# rendu_decors.py — Les Tours du Royaume
# Rend chaque objet de la collection « Decor » en PNG transparent + manifest.json,
# prêt à être chargé par le jeu (dossier decors/<carte>/ et zip à côté).
#
# Utilisation, depuis la racine du dépôt (le fichier .blend n'est pas modifié). Chemins complets obligatoires
# avec Flatpak, qui lance Blender dans son propre dossier :
#   flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_decors.py"
# Les images et manifest.json vont dans assets/decors/<carte>/, là où le jeu les lit.

import bpy, json, math, os, shutil
from mathutils import Vector

# ------------------------------------------------------------------ réglages
CARTE = "prairie"          # nom de la carte (préfixe attendu des objets)
STYLE = "pixel"            # "pixel" (accordé aux tours/ennemis) ou "lisse"
COLLECTION = "Decor"
ELEVATION = 50             # inclinaison de la caméra au-dessus de l'horizon, en degrés
ECHANTILLONS = 48          # qualité Cycles
CONTOUR = True             # contour sombre d'un pixel (style pixel uniquement)
# ---------------------------------------------------------------------------

PPC = 20 if STYLE == "pixel" else 80      # pixels par case (1 unité Blender = 1 case)
MARGE = 2                                  # pixels de marge autour de chaque image
DIR_SOLEIL = Vector((1.0, -1.0, -1.6)).normalized()   # lumière venant du haut-gauche de l'écran
COULEUR_CONTOUR = (26 / 255, 20 / 255, 32 / 255, 1.0)


def dossier_sortie():
    if not bpy.data.filepath:
        raise RuntimeError("Ouvre decor.blend : les images sont écrites dans assets/decors/ à côté de lui.")
    d = os.path.join(bpy.path.abspath("//"), "assets", "decors", CARTE)
    os.makedirs(d, exist_ok=True)
    return d


def creer_scene():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = ECHANTILLONS
    sc.cycles.use_denoising = STYLE == "lisse"
    sc.render.film_transparent = True
    sc.render.filter_size = 0.01 if STYLE == "pixel" else 1.5
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"   # couleurs fidèles à la palette
    sc.view_settings.look = "None"

    monde = bpy.data.worlds.new("TD_Monde")
    if hasattr(monde, "use_nodes") and not getattr(monde, "node_tree", None):
        monde.use_nodes = True          # Blender 4 ; en 5.x l'arbre de nœuds existe déjà
    nt = monde.node_tree
    fond = next((n for n in nt.nodes if n.type == "BACKGROUND"), None)
    if fond is None:                    # Blender 5 : monde neuf sans nœud « Background »
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

    sol_data = bpy.data.lights.new("TD_Soleil", "SUN")
    sol_data.energy = 3.2
    sol_data.angle = math.radians(4)
    soleil = bpy.data.objects.new("TD_Soleil", sol_data)
    soleil.rotation_euler = DIR_SOLEIL.to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(soleil)

    me = bpy.data.meshes.new("TD_Ombre")
    me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    plan = bpy.data.objects.new("TD_Ombre", me)
    sc.collection.objects.link(plan)
    plan.is_shadow_catcher = True
    return sc, cam, plan


def placer_camera(cam, dessus):
    if dessus:
        cam.rotation_euler = (0, 0, 0)
        cam.location = (0, 0, 50)
    else:
        e = math.radians(ELEVATION)
        cam.rotation_euler = (math.radians(90) - e, 0, 0)
        cam.location = (0, -50 * math.cos(e), 50 * math.sin(e))
    bpy.context.view_layer.update()


def points_utiles(obj, avec_ombre):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    if avec_ombre:   # où tombe l'ombre de chaque coin sur le sol
        for p in list(pts):
            if p.z > 0 and DIR_SOLEIL.z < 0:
                t = -p.z / DIR_SOLEIL.z
                pts.append(p + DIR_SOLEIL * t)
    return pts


def cadrer(sc, cam, obj, dessus):
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in points_utiles(obj, not dessus)]
    xmin, xmax = min(p.x for p in loc), max(p.x for p in loc)
    ymin, ymax = min(p.y for p in loc), max(p.y for p in loc)
    rx = math.ceil((xmax - xmin) * PPC) + 2 * MARGE
    ry = math.ceil((ymax - ymin) * PPC) + 2 * MARGE
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    o = max(rx, ry) / PPC
    cam.data.ortho_scale = o
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    cam.data.shift_x, cam.data.shift_y = cx / o, cy / o
    o0 = inv @ Vector((0, 0, 0))                      # origine de l'objet = point d'ancrage
    ax = rx / 2 + (o0.x - cx) * PPC
    ay = ry / 2 - (o0.y - cy) * PPC
    return [round(ax, 1), round(ay, 1)]


def post_pixel(chemin):
    im = bpy.data.images.load(chemin)
    w, h = im.size
    px = list(im.pixels)
    def a(i, j):
        return 0 if i < 0 or j < 0 or i >= w or j >= h else px[(j * w + i) * 4 + 3]
    sortie = px[:]
    for j in range(h):
        for i in range(w):
            k = (j * w + i) * 4
            al = px[k + 3]
            if al >= 0.85:
                sortie[k + 3] = 1.0
            elif al > 0.06:            # ombre portée : noir uni et léger
                sortie[k:k + 4] = [0.0, 0.0, 0.0, 0.35]
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


def main():
    if COLLECTION not in bpy.data.collections:
        raise RuntimeError(f"Collection « {COLLECTION} » introuvable.")
    objets = [o for o in bpy.data.collections[COLLECTION].all_objects if o.type in {"MESH", "CURVE", "META", "FONT", "SURFACE"}]
    if not objets:
        raise RuntimeError("La collection Decor est vide.")
    d = dossier_sortie()
    sc, cam, plan = creer_scene()
    soleil = bpy.data.objects["TD_Soleil"]
    outils = {cam, plan, soleil}
    cache_avant = {o.name: o.hide_render for o in sc.objects}
    elements, avertissements = [], []
    try:
        for obj in objets:
            if not obj.name.startswith(CARTE + "_"):
                avertissements.append(f"{obj.name} : le nom devrait commencer par « {CARTE}_ »")
            typ = str(obj.get("type", "decor"))
            dessus = typ == "sol"
            loc_avant = obj.location.copy()
            obj.location = (0, 0, 0)
            for o in sc.objects:      # seul l'objet rendu reste visible (avec caméra, soleil, attrape-ombre)
                o.hide_render = o not in outils and o != obj
            plan.hide_render = dessus
            placer_camera(cam, dessus)
            ancre = cadrer(sc, cam, obj, dessus)
            fichier = obj.name + ".png"
            chemin = os.path.join(d, fichier)
            sc.render.filepath = chemin
            bpy.ops.render.render(write_still=True, scene=sc.name)
            if STYLE == "pixel":
                post_pixel(chemin)
            obj.location = loc_avant
            elements.append({
                "nom": obj.name, "fichier": fichier, "type": typ,
                "cases_l": int(obj.get("cases_l", 1)), "cases_h": int(obj.get("cases_h", 1)),
                "bloquant": int(obj.get("bloquant", 1)), "ancre": ancre,
            })
            print("rendu :", fichier)
    finally:
        for o in (cam, plan, soleil):
            bpy.data.objects.remove(o, do_unlink=True)
        for o in sc.objects:
            o.hide_render = cache_avant.get(o.name, o.hide_render)
    manifest = {"version": 1, "carte": CARTE, "style": STYLE, "pixels_par_case": PPC,
                "elevation": ELEVATION, "elements": elements}
    with open(os.path.join(d, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    zip_base = os.path.join(bpy.path.abspath("//"), f"decors_{CARTE}")   # pour l'envoyer par la discussion
    shutil.make_archive(zip_base, "zip", os.path.dirname(d), CARTE)
    print(f"\n{len(elements)} éléments rendus dans {d}")
    print(f"Zip prêt : {zip_base}.zip")
    for a in avertissements:
        print("ATTENTION :", a)


main()
