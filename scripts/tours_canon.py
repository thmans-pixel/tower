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


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    x = 4.0 * (n - 1)
    t = ct.finir(tour(n), f"tour_canon_{n}", col, mats, (x, LIGNE_Y, 0.0),
                 {"type": "tour", "tour": "canon", "niveau": n})
    T = NIVEAUX[n]["T"] + 0.04
    empty_pivot(f"pivot_canon_{n}", t, T, col)
    ct.finir(fut(n), f"tour_canon_{n}_fut", col, mats, (x, LIGNE_Y, T),
             {"type": "fut", "tour": "canon", "niveau": n})
    objs.append(t)
ct.sauver_et_apercu(scene, objs, "apercu_tours_canon.png", cible_z=0.85, largeur=9.5)
