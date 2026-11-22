# Génère tour_archers_1/2/3 dans decor.blend (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_archers.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 8.0          # ligne des tours d'archers dans le fichier

# par niveau : plateforme, base du toit, hauteur du toit, demi-côté du toit, couleur du toit
NIVEAUX = {
    1: dict(P=0.52, toit_z=1.00, toit_h=0.30, toit_d=0.35, toit="toits"),
    2: dict(P=0.62, toit_z=1.10, toit_h=0.28, toit_d=0.38, toit="toits"),
    3: dict(P=0.70, toit_z=1.18, toit_h=0.34, toit_d=0.39, toit="bleu"),
}


def archer(bm, x, y, z):
    """Archer stylisé ~0,32 de haut, tourné vers -Y : tunique verte, capuche, arc."""
    ct.cone(bm, (x, y, z), (x, y, z + 0.19), 0.10, 0.07, 6, "tunique")
    ct.boule(bm, (x, y - 0.014, z + 0.235), 0.060, "peau")
    ct.cone(bm, (x, y + 0.014, z + 0.185), (x, y + 0.024, z + 0.33), 0.076, 0.0, 6, "capuche")
    bx, by = x + 0.09, y - 0.07
    pts = [(bx, by, z + 0.05), (bx + 0.025, by - 0.035, z + 0.15), (bx + 0.025, by - 0.035, z + 0.23), (bx, by, z + 0.33)]
    for a, b in zip(pts, pts[1:]):
        ct.cone(bm, a, b, 0.016, 0.016, 4, "bois_fonce")


def prisme(bm, pts2d, y0, y1, mat):
    """Plaque verticale (plan XZ) de contour pts2d [(x, z)...], épaisse de y0 à y1."""
    av = [bm.verts.new((x, y0, z)) for x, z in pts2d]
    ar = [bm.verts.new((x, y1, z)) for x, z in pts2d]
    faces = [bm.faces.new(av), bm.faces.new(list(reversed(ar)))]
    n = len(pts2d)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((av[i], ar[i], ar[j], av[j])))
    for f in faces: f.material_index = ct.M[mat]


def tour(n):
    c = NIVEAUX[n]
    P = c["P"]
    bm = bmesh.new()
    ct.socle(bm)
    pied = 0.25
    if n >= 2:      # renforcée : premier étage en pierre
        ct.carre(bm, 0, 0, 0.25, 0.46, 0.34, 0.32, "pierre_claire")
        ct.boite(bm, -0.345, -0.345, 0.44, 0.345, 0.345, 0.47, "pierre_sombre")
        pied = 0.46
    bois_pied = "bois" if n == 1 else "bois_fonce"
    # quatre poteaux
    for sx in (-1, 1):
        for sy in (-1, 1):
            ct.boite(bm, sx * 0.28 - 0.045, sy * 0.28 - 0.045, pied, sx * 0.28 + 0.045, sy * 0.28 + 0.045, P, bois_pied)
    # croisillons sur les quatre faces (niveau 1) ou traverse simple (niveaux 2-3)
    h = P - pied
    for ang in (0, 90, 180, 270):
        a = math.radians(ang)
        ux, uy = math.cos(a), math.sin(a)        # direction le long de la face
        nx, ny = -uy, ux                           # normale de la face
        o = (nx * 0.28, ny * 0.28)
        if n == 1:
            for s in (-1, 1):
                p0 = (o[0] - ux * 0.25 * s, o[1] - uy * 0.25 * s, pied + 0.04)
                p1 = (o[0] + ux * 0.25 * s, o[1] + uy * 0.25 * s, P - 0.04)
                ct.cone(bm, p0, p1, 0.022, 0.022, 4, "bois")
        else:
            zm = pied + h * 0.5
            ct.cone(bm, (o[0] - ux * 0.26, o[1] - uy * 0.26, zm), (o[0] + ux * 0.26, o[1] + uy * 0.26, zm), 0.025, 0.025, 4, "bois_fonce")
    # bandeau or sous la plateforme
    if n >= 2:
        ct.boite(bm, -0.40, -0.40, P - 0.05, 0.40, 0.40, P, "or")
    # plateforme et créneaux de bois
    ct.boite(bm, -0.40, -0.40, P, 0.40, 0.40, P + 0.06, "bois")
    zc = P + 0.06
    for i in (-1, 0, 1):
        t = i * 0.27
        for (x0, y0, x1, y1) in ((t - 0.06, -0.40, t + 0.06, -0.36), (t - 0.06, 0.36, t + 0.06, 0.40),
                                 (-0.40, t - 0.06, -0.36, t + 0.06), (0.36, t - 0.06, 0.40, t + 0.06)):
            ct.boite(bm, x0, y0, zc, x1, y1, zc + 0.12, "bois_fonce" if n == 1 else "bois")
    for (x0, y0, x1, y1) in ((-0.40, -0.40, 0.40, -0.37), (-0.40, 0.37, 0.40, 0.40),
                             (-0.40, -0.40, -0.37, 0.40), (0.37, -0.40, 0.40, 0.40)):
        ct.boite(bm, x0, y0, zc, x1, y1, zc + 0.05, "bois_fonce" if n == 1 else "bois")
    # poteaux du toit
    for sx in (-1, 1):
        for sy in (-1, 1):
            ct.boite(bm, sx * 0.33 - 0.025, sy * 0.33 - 0.025, zc, sx * 0.33 + 0.025, sy * 0.33 + 0.025, c["toit_z"], "bois_fonce")
    # toit pointu à 4 pans
    ct.boite(bm, -c["toit_d"], -c["toit_d"], c["toit_z"] - 0.03, c["toit_d"], c["toit_d"], c["toit_z"], "bois_fonce")
    ct.carre(bm, 0, 0, c["toit_z"], c["toit_z"] + c["toit_h"], c["toit_d"], 0.0, c["toit"])
    sommet = c["toit_z"] + c["toit_h"]
    # archers
    if n < 3:
        archer(bm, 0.0, -0.27, zc)
    else:
        archer(bm, -0.16, -0.27, zc); archer(bm, 0.14, -0.25, zc)
    # niveau 2 : fanion rouge sur mât ; niveau 3 : pointe dorée et bannière dorée
    if n == 2:
        ct.cone(bm, (0, 0, sommet - 0.02), (0, 0, 1.50), 0.012, 0.012, 4, "bois_fonce")
        prisme(bm, [(0.0, 1.495), (0.0, 1.36), (0.22, 1.43)], -0.01, 0.01, "toits")   # fanion triangulaire
    if n == 3:
        ct.cone(bm, (0, 0, sommet - 0.02), (0, 0, 1.70), 0.045, 0.0, 6, "or")
        ct.boule(bm, (0, 0, sommet + 0.02), 0.04, "or")
        # bannière dorée pendue sous la plateforme, côté -Y, bout en pointe
        yb = -0.415
        prisme(bm, [(-0.11, P - 0.02), (-0.11, P - 0.30), (0.0, P - 0.38), (0.11, P - 0.30), (0.11, P - 0.02)],
               yb - 0.012, yb + 0.012, "or")
        ct.boite(bm, -0.045, yb - 0.022, P - 0.22, 0.045, yb - 0.012, P - 0.12, "bleu")
    return bm


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    bm = tour(n)
    objs.append(ct.finir(bm, f"tour_archers_{n}", col, mats, (4.0 * (n - 1), LIGNE_Y, 0.0),
                         {"type": "tour", "tour": "archers", "niveau": n}))
ct.sauver_et_apercu(scene, objs, "apercu_tours_archers.png", cible_z=0.85, largeur=9.5)
