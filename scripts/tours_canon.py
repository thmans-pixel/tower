# Génère tour_canon_1/2/3, leurs fûts tour_canon_N_fut et les empties pivot_canon_N (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_canon.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bpy, bmesh, math
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 12.0
SEG = 16
ROT = math.pi / SEG          # une facette pile face à -Y (pour la porte)

# R : rayon de la tour, T : hauteur de la plateforme, cerclage, fût : longueur et nombre
NIVEAUX = {
    1: dict(R=0.36, T=0.98, cerclage=None, L=0.22, futs=1),
    2: dict(R=0.40, T=1.16, cerclage="bronze", L=0.32, futs=1),
    3: dict(R=0.425, T=1.30, cerclage="or", L=0.30, futs=2),
    "3a": dict(R=0.40, T=1.16, cerclage="bronze", L=0.0, futs=0),       # Mortier
    "3b": dict(R=0.34, T=1.36, cerclage="bronze", L=0.0, futs=0),       # Lance-flammes
}


def tour(n):
    c = NIVEAUX[n]; R, T = c["R"], c["T"]
    bm = bmesh.new()
    ct.socle(bm)
    # assise sombre, fût de tour légèrement évasé, plateforme
    ct.cylindre(bm, 0, 0, 0.25, 0.34, R * 1.06, R * 1.05, SEG, "pierre_sombre", ROT)
    ct.cylindre(bm, 0, 0, 0.34, T, R * 1.03, R, SEG, "pierre", ROT)
    ct.cylindre(bm, 0, 0, T - 0.04, T + 0.04, R * 1.04, R * 1.04, SEG, "pierre_claire", ROT)   # corniche
    # merlons
    nm = 8
    for i in range(nm):
        a = 2 * math.pi * (i + 0.5) / nm
        rr = R * 1.04 - 0.05
        ct.pave(bm, (rr * math.cos(a), rr * math.sin(a), T + 0.04 + 0.06), (0.10, 0.17 * R / 0.36, 0.12), a, "pierre_claire")
    # cerclages
    if c["cerclage"]:
        for z in (0.55, T - 0.10):
            ct.cylindre(bm, 0, 0, z - 0.025, z + 0.025, R * 1.035 + (0.34 - z) * 0.0, R * 1.035, SEG, c["cerclage"], ROT)
    # porte en bois en arc, côté -Y
    yp = -R * 1.03 * math.cos(ROT)
    yp = max(yp, -0.448 + 0.045)          # la porte reste dans l'emprise 0,9
    ct.boite(bm, -0.12, yp - 0.03, 0.25, 0.12, yp + 0.04, 0.58, "pierre_sombre")       # encadrement
    ct.boite(bm, -0.09, yp - 0.045, 0.25, 0.09, yp + 0.04, 0.50, "bois")
    arc = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.09, radius2=0.09, depth=0.085,
            matrix=ct.Matrix.Translation((0, yp - 0.0025, 0.50)) @ ct.Matrix.Rotation(math.pi / 2, 4, "X"))
    for v in arc["verts"]: v.co.z = max(v.co.z, 0.50)
    for f in {f for v in arc["verts"] for f in v.link_faces}: f.material_index = ct.M["bois"]
    ct.boite(bm, -0.012, yp - 0.05, 0.27, 0.012, yp - 0.04, 0.56, "bois_fonce")        # planche centrale
    # meurtrières
    for a in (math.radians(-90 + 50), math.radians(-90 - 50)):
        x, y = R * 1.0 * math.cos(a), R * 1.0 * math.sin(a)
        ct.pave(bm, (x, y, T - 0.30), (0.03, 0.05, 0.16), a, "pierre_sombre")
    # étendard (niveau 3) sur un merlon arrière gauche
    if n == 3:
        a = 2 * math.pi * (2 + 0.5) / nm      # merlon arrière gauche
        px, py = (R - 0.02) * math.cos(a), (R - 0.02) * math.sin(a)
        ct.cone(bm, (px, py, T + 0.16), (px, py, 1.70), 0.014, 0.014, 4, "bois_fonce")
        ct.boite(bm, px, py - 0.01, 1.52, px + 0.22, py + 0.01, 1.68, "bleu")
        ct.boite(bm, px + 0.06, py - 0.015, 1.56, px + 0.14, py + 0.015, 1.64, "or")
    return bm


def fut(n):
    """Affût + fût(s), pointés vers +X, origine au pivot (centre de l'affût, au niveau de la plateforme)."""
    c = NIVEAUX[n]; L = c["L"]
    bm = bmesh.new()
    larg = 0.20 if c["futs"] == 1 else 0.30
    ct.boite(bm, -0.13, -larg / 2, 0.0, 0.13, larg / 2, 0.08, "fer_noir")                 # semelle
    for sy in (-1, 1):                                                                     # flasques
        ct.boite(bm, -0.10, sy * larg / 2 - 0.025 * sy - 0.02, 0.08, 0.06, sy * larg / 2 - 0.025 * sy + 0.02, 0.17, "fer_noir")
    ys = [0.0] if c["futs"] == 1 else [-0.07, 0.07]
    elev = math.radians(10)
    for y in ys:
        z0 = 0.16
        arr = (-0.12, y, z0 - 0.12 * math.sin(elev) * 0)
        bout = (L * math.cos(elev), y, z0 + L * math.sin(elev))
        ct.cone(bm, arr, bout, 0.068, 0.056, 10, "fer_noir")
        ct.boule(bm, (-0.12, y, z0), 0.066, "fer_noir")                                    # culasse
        anneau = "fer_noir" if n == 1 else ("bronze" if n == 2 else "or")
        dx, dz = 0.035 * math.cos(elev), 0.035 * math.sin(elev)
        ct.cone(bm, (bout[0] - dx, y, bout[2] - dz), (bout[0] + 0.005, y, bout[2] + 0.001), 0.074, 0.074, 10, anneau)
        if n >= 2:
            ct.cone(bm, (-0.02, y, z0 + 0.0), (0.015, y, z0 + 0.006), 0.075, 0.075, 10, anneau)  # frette
    return bm


def empty_pivot(nom, parent, z, col):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    e = bpy.data.objects.new(nom, None)
    e.empty_display_type = "ARROWS"; e.empty_display_size = 0.25
    col.objects.link(e)
    e.parent = parent
    e.location = (0, 0, z)                      # coordonnées locales de la tour
    e["role"] = "pivot_canon"
    return e


def mortier():
    """Gros mortier trapu tourné vers le ciel (vers +X), origine au pivot."""
    bm = bmesh.new()
    ct.cylindre(bm, 0, 0, 0.0, 0.07, 0.17, 0.16, 12, "fer_noir")                       # plateau
    for sy in (-1, 1):
        ct.boite(bm, -0.09, sy * 0.13 - 0.025, 0.07, 0.09, sy * 0.13 + 0.025, 0.20, "fer_noir")
    e = math.radians(55)
    d = (math.cos(e), 0, math.sin(e))
    b0 = (-0.04, 0, 0.14)
    b1 = (b0[0] + d[0] * 0.26, 0, b0[2] + d[2] * 0.26)
    ct.boule(bm, b0, 0.115, "fer_noir")
    ct.cone(bm, b0, b1, 0.115, 0.135, 12, "fer_noir")
    for t, mat in ((0.10, "bronze"), (0.24, "bronze")):
        p0 = (b0[0] + d[0] * t, 0, b0[2] + d[2] * t)
        p1 = (p0[0] + d[0] * 0.03, 0, p0[2] + d[2] * 0.03)
        ct.cone(bm, p0, p1, 0.128 + t * 0.05, 0.128 + t * 0.05, 12, mat)
    # bouche sombre (disque enfoncé)
    ct.cone(bm, (b1[0] - d[0] * 0.01, 0, b1[2] - d[2] * 0.01), (b1[0] + d[0] * 0.004, 0, b1[2] + d[2] * 0.004), 0.10, 0.10, 12, "pierre_sombre")
    ct.cone(bm, b0, (0, 0.0, 0.14), 0.03, 0.03, 6, "bronze")
    ct.cone(bm, (-0.04, -0.15, 0.14), (-0.04, 0.15, 0.14), 0.03, 0.03, 8, "bronze")  # tourillons
    return bm


def buse():
    """Buse de lance-flammes pointée vers +X avec flammes stylisées, origine au pivot."""
    bm = bmesh.new()
    ct.cylindre(bm, 0, 0, 0.0, 0.06, 0.12, 0.11, 10, "fer_noir")
    ct.boite(bm, -0.06, -0.05, 0.06, 0.06, 0.05, 0.15, "fer_noir")
    ct.cone(bm, (-0.10, 0, 0.12), (0.23, 0, 0.14), 0.045, 0.032, 8, "cuivre")
    ct.cone(bm, (0.23, 0, 0.14), (0.29, 0, 0.145), 0.032, 0.055, 8, "fer_noir")
    for x in (-0.02, 0.10):
        ct.cone(bm, (x, 0, 0.13), (x + 0.025, 0, 0.13), 0.052, 0.052, 8, "bronze")
    ct.cone(bm, (-0.10, 0, 0.12), (-0.10, 0, 0.0), 0.025, 0.025, 6, "cuivre")
    # flammes : trois cônes emboîtés, de l'orange au jaune
    ct.cone(bm, (0.285, 0, 0.145), (0.45, 0, 0.17), 0.075, 0.0, 7, "flamme")
    ct.cone(bm, (0.29, 0, 0.15), (0.42, 0.02, 0.20), 0.05, 0.0, 6, "toits")
    ct.cone(bm, (0.29, 0, 0.145), (0.40, -0.01, 0.15), 0.045, 0.0, 6, "or")
    return bm


def lance_flammes_reservoirs(bm, T):
    """Deux réservoirs de cuivre adossés aux flancs de la tour, tuyaux vers la plateforme."""
    for sx in (-1, 1):
        x, y = sx * 0.315, 0.06
        ct.cylindre(bm, x, y, 0.25, 0.92, 0.11, 0.11, 10, "cuivre")
        ct.boule(bm, (x, y, 0.92), (0.11, 0.11, 0.07), "cuivre")
        for z in (0.40, 0.75):
            ct.cylindre(bm, x, y, z, z + 0.035, 0.117, 0.117, 10, "bronze")
        ct.cone(bm, (x, y, 0.97), (sx * 0.20, 0.10, T + 0.06), 0.025, 0.025, 6, "cuivre")


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    x = 4.0 * (n - 1)
    t = ct.finir(tour(n), f"tour_canon_{n}", col, mats, (x, LIGNE_Y, 0.0),
                 {"type": "tour", "tour": "canon", "niveau": n})
    T = NIVEAUX[n]["T"] + 0.04
    ct.empty_pivot(f"pivot_canon_{n}", t, T, col, "pivot_canon")
    ct.finir(fut(n), f"tour_canon_{n}_fut", col, mats, (x, LIGNE_Y, T),
             {"type": "fut", "tour": "canon", "niveau": n})
    objs.append(t)
variantes = []
for v, x, nom, piece in (("3a", 12.0, "Mortier", mortier), ("3b", 16.0, "Lance-flammes", buse)):
    bm = tour(v)
    if v == "3b": lance_flammes_reservoirs(bm, NIVEAUX[v]["T"])
    t = ct.finir(bm, f"tour_canon_{v}", col, mats, (x, LIGNE_Y, 0.0),
                 {"type": "tour", "tour": "canon", "niveau": 3, "variante": v[1], "version": nom})
    T = NIVEAUX[v]["T"] + 0.04
    ct.empty_pivot(f"pivot_canon_{v}", t, T, col, "pivot_canon")
    f = ct.finir(piece(), f"tour_canon_{v}_fut", col, mats, (x, LIGNE_Y, T),
                 {"type": "fut", "tour": "canon", "niveau": 3, "variante": v[1], "piece": "mortier" if v == "3a" else "buse"})
    print(f"  hauteur totale {v} : {T + f.dimensions.z:.2f}")
    variantes.append(t)
ct.sauver_et_apercu(scene, objs, "apercu_tours_canon.png", cible_z=0.85, largeur=9.5,
                    autres=[([objs[1]] + variantes, "apercu_tours_canon_variantes.png", 15)])
