# Génère tour_baliste_1/2/3, leurs armes tour_baliste_N_arme et les empties pivot_arme_N (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_baliste.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bpy, bmesh, math
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 24.0
NIVEAUX = {1: dict(T=0.98), 2: dict(T=1.15), 3: dict(T=1.32)}


def tour(n):
    T = NIVEAUX[n]["T"]
    bm = bmesh.new()
    ct.socle(bm)
    haut = T - 0.07
    # corps en planches, légèrement pyramidal, et rainures sombres
    ct.carre(bm, 0, 0, 0.25, haut, 0.35, 0.31, "bois")
    for i in (-2, -1, 0, 1, 2):
        t = i * 0.12
        ct.boite(bm, t - 0.008, -0.345 + (haut - 0.25) * 0.0, 0.27, t + 0.008, -0.33, haut - 0.03, "bois_fonce")
    # poteaux d'angle et traverses
    for sx in (-1, 1):
        for sy in (-1, 1):
            ct.cone(bm, (sx * 0.36, sy * 0.36, 0.25), (sx * 0.32, sy * 0.32, haut), 0.045, 0.04, 4, "bois_fonce")
    zm = (0.25 + haut) / 2
    for (x0, y0, x1, y1) in ((-0.36, -0.36, 0.36, -0.36), (-0.36, 0.36, 0.36, 0.36), (-0.36, -0.36, -0.36, 0.36), (0.36, -0.36, 0.36, 0.36)):
        k = 0.34 / 0.36
        ct.cone(bm, (x0 * k, y0 * k, zm), (x1 * k, y1 * k, zm), 0.028, 0.028, 4, "bois_fonce")
    # plateforme
    ct.boite(bm, -0.42, -0.42, haut, 0.42, 0.42, T, "bois_fonce")
    ct.boite(bm, -0.42, -0.42, T, 0.42, -0.38, T + 0.05, "bois")
    ct.boite(bm, -0.42, 0.38, T, 0.42, 0.42, T + 0.05, "bois")
    ct.boite(bm, -0.42, -0.38, T, -0.38, 0.38, T + 0.05, "bois")
    ct.boite(bm, 0.38, -0.38, T, 0.42, 0.38, T + 0.05, "bois")
    ct.cylindre(bm, 0, 0, T, T + 0.02, 0.17, 0.17, 12, "bois_fonce")                     # couronne de rotation
    if n == 1:      # ligatures de corde aux angles
        for sx in (-1, 1):
            for sy in (-1, 1):
                ct.cylindre(bm, sx * 0.34, sy * 0.34, zm - 0.04, zm + 0.04, 0.055, 0.055, 6, "corde")
                ct.cylindre(bm, sx * 0.325, sy * 0.325, haut - 0.10, haut - 0.04, 0.052, 0.052, 6, "corde")
    else:           # renforts de fer (et dorures au niveau 3)
        for sx in (-1, 1):
            for sy in (-1, 1):
                ct.boite(bm, sx * 0.34 - 0.05, sy * 0.34 - 0.05, zm - 0.05, sx * 0.34 + 0.05, sy * 0.34 + 0.05, zm + 0.05, "fer_noir")
                ct.boite(bm, sx * 0.40 - 0.035, sy * 0.40 - 0.035, haut - 0.01, sx * 0.40 + 0.035, sy * 0.40 + 0.035, T + 0.07,
                         "or" if n == 3 else "fer_noir")
        ct.boite(bm, -0.43, -0.43, haut + 0.005, 0.43, 0.43, haut + 0.035, "or" if n == 3 else "fer_noir")
        ct.cylindre(bm, 0, 0, T + 0.02, T + 0.035, 0.17, 0.17, 12, "fer_noir")
    if n == 3:      # écusson doré sur la face -Y
        ct.plaque(bm, [(-0.09, 0.80), (0.09, 0.80), (0.09, 0.66), (0.0, 0.58), (-0.09, 0.66)], -0.36, -0.33, "or")
        ct.plaque(bm, [(-0.05, 0.76), (0.05, 0.76), (0.05, 0.67), (0.0, 0.63), (-0.05, 0.67)], -0.37, -0.355, "bleu")
    return bm


def arc(bm, z, envergure, ep, mat, embouts):
    """Arc horizontal à l'avant, branches courbées vers l'arrière, corde jusqu'à la noix."""
    pts = [(0.20, 0.0), (0.17, envergure * 0.55), (0.09, envergure)]
    for sy in (-1, 1):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            ct.cone(bm, (x0, sy * y0, z), (x1, sy * y1, z), ep, ep * 0.8, 6, mat)
        ct.boule(bm, (0.09, sy * envergure, z), ep * 1.3, embouts)
        ct.cone(bm, (0.09, sy * envergure, z), (-0.10, 0.0, z + 0.005), 0.011, 0.011, 4, "corde")


def arme(n):
    """Grande arbalète de siège pointée vers +X, origine au pivot (centre de la couronne)."""
    bm = bmesh.new()
    fer = n >= 2
    garniture = "or" if n == 3 else ("fer_noir" if fer else "bois_fonce")
    ct.cylindre(bm, 0, 0, 0.0, 0.05, 0.13, 0.12, 10, "bois_fonce")                          # pied tournant
    for sy in (-1, 1):                                                                     # fourche
        ct.boite(bm, -0.06, sy * 0.065 - 0.02, 0.05, 0.06, sy * 0.065 + 0.02, 0.19, "bois")
    zr = 0.20
    ct.boite(bm, -0.28, -0.04, zr - 0.035, 0.24, 0.04, zr + 0.035, "bois")                # fût / glissière
    ct.boite(bm, 0.14, -0.06, zr - 0.05, 0.24, 0.06, zr + 0.05, garniture)                 # tête
    if fer:
        for x in (-0.18, 0.0):
            ct.boite(bm, x - 0.015, -0.045, zr - 0.04, x + 0.015, 0.045, zr + 0.04, "fer_noir")
    # treuil à l'arrière
    ct.cone(bm, (-0.25, -0.10, zr), (-0.25, 0.10, zr), 0.035, 0.035, 8, "bois_fonce")
    for sy in (-1, 1):
        ct.boite(bm, -0.26, sy * 0.10 - 0.012, zr - 0.07, -0.24, sy * 0.10 + 0.012, zr + 0.07, garniture)
    # arc(s)
    if n < 3:
        arc(bm, zr + 0.01, 0.30, 0.042, "bois", "fer_noir" if fer else "bois_fonce")
    else:
        arc(bm, zr + 0.06, 0.32, 0.036, "bois", "or")
        arc(bm, zr - 0.04, 0.27, 0.036, "bois", "or")
        ct.boite(bm, 0.17, -0.03, zr - 0.06, 0.23, 0.03, zr + 0.08, "or")                  # montant des deux arcs
    # carreau sur la glissière
    r = 0.016 if n == 1 else 0.026
    ct.cone(bm, (-0.12, 0, zr + 0.04 + r), (0.30, 0, zr + 0.04 + r), r, r, 6, "bois")
    ct.cone(bm, (0.30, 0, zr + 0.04 + r), (0.38 if n > 1 else 0.35, 0, zr + 0.04 + r), r * 2.4, 0.0, 4, "fer_noir")
    for sy in (-1, 1):                                                                     # empennage
        ct.boite(bm, -0.12, sy * r, zr + 0.04 + r - 0.006, -0.05, sy * (r + 0.035), zr + 0.04 + r + 0.006, "toits" if n > 1 else "corde")
    return bm


def empty_pivot(nom, parent, z, col):
    old = bpy.data.objects.get(nom)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    e = bpy.data.objects.new(nom, None)
    e.empty_display_type = "ARROWS"; e.empty_display_size = 0.25
    col.objects.link(e)
    e.parent = parent
    e.location = (0, 0, z)
    e["role"] = "pivot_arme"
    return e


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    x = 4.0 * (n - 1)
    t = ct.finir(tour(n), f"tour_baliste_{n}", col, mats, (x, LIGNE_Y, 0.0),
                 {"type": "tour", "tour": "baliste", "niveau": n})
    zp = NIVEAUX[n]["T"] + (0.02 if n == 1 else 0.035)
    empty_pivot(f"pivot_arme_{n}", t, zp, col)
    a = ct.finir(arme(n), f"tour_baliste_{n}_arme", col, mats, (x, LIGNE_Y, zp),
                 {"type": "arme", "tour": "baliste", "niveau": n})
    print(f"  hauteur totale niveau {n} : {zp + a.dimensions.z:.2f}")
    objs.append(t)
ct.sauver_et_apercu(scene, objs, "apercu_tours_baliste.png", cible_z=0.85, largeur=9.5)
