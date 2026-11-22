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


def archer_cape(bm, x, y, z):
    """Tireur d'élite : archer avec cape verte et longue-vue."""
    archer(bm, x, y, z)
    prisme(bm, [(x - 0.11, z + 0.01), (x + 0.11, z + 0.01), (x + 0.07, z + 0.21), (x - 0.07, z + 0.21)],
           y + 0.055, y + 0.075, "capuche")
    ct.cone(bm, (x - 0.035, y - 0.04, z + 0.235), (x - 0.035, y - 0.19, z + 0.25), 0.020, 0.028, 6, "or")


def arbaletrier(bm, x, y, z):
    """Arbalétrier : tunique, casque de fer, arbalète pointée vers -Y."""
    ct.cone(bm, (x, y, z), (x, y, z + 0.19), 0.10, 0.07, 6, "tunique")
    ct.boule(bm, (x, y - 0.014, z + 0.235), 0.060, "peau")
    ct.boule(bm, (x, y + 0.005, z + 0.262), (0.068, 0.068, 0.05), "pierre_claire")
    ct.boite(bm, x - 0.016, y - 0.17, z + 0.125, x + 0.016, y - 0.02, z + 0.155, "bois_fonce")
    ct.cone(bm, (x - 0.09, y - 0.15, z + 0.14), (x + 0.09, y - 0.15, z + 0.14), 0.014, 0.014, 4, "fer_noir")


def tour_3a():
    """Tireurs d'élite : tour haute et fine."""
    bm = bmesh.new()
    ct.socle(bm)
    ct.carre(bm, 0, 0, 0.25, 0.46, 0.30, 0.27, "pierre_claire")
    ct.boite(bm, -0.275, -0.275, 0.44, 0.275, 0.275, 0.47, "pierre_sombre")
    P, d = 1.00, 0.30
    for sx in (-1, 1):
        for sy in (-1, 1):
            ct.boite(bm, sx * 0.20 - 0.04, sy * 0.20 - 0.04, 0.46, sx * 0.20 + 0.04, sy * 0.20 + 0.04, P, "bois_fonce")
    for zm in (0.64, 0.84):
        for ang in (0, 90, 180, 270):
            a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); nx, ny = -uy, ux
            ct.cone(bm, (nx * 0.2 - ux * 0.19, ny * 0.2 - uy * 0.19, zm), (nx * 0.2 + ux * 0.19, ny * 0.2 + uy * 0.19, zm), 0.022, 0.022, 4, "bois_fonce")
    ct.boite(bm, -d, -d, P - 0.05, d, d, P, "or")
    ct.boite(bm, -d, -d, P, d, d, P + 0.06, "bois")
    zc = P + 0.06
    for t in (-0.15, 0.15):
        for (x0, y0, x1, y1) in ((t - 0.05, -d, t + 0.05, -d + 0.04), (t - 0.05, d - 0.04, t + 0.05, d),
                                 (-d, t - 0.05, -d + 0.04, t + 0.05), (d - 0.04, t - 0.05, d, t + 0.05)):
            ct.boite(bm, x0, y0, zc, x1, y1, zc + 0.12, "bois")
    for sx in (-1, 1):
        for sy in (-1, 1):
            ct.boite(bm, sx * 0.26 - 0.022, sy * 0.26 - 0.022, zc, sx * 0.26 + 0.022, sy * 0.26 + 0.022, 1.48, "bois_fonce")
    ct.boite(bm, -0.29, -0.29, 1.45, 0.29, 0.29, 1.48, "bois_fonce")
    ct.carre(bm, 0, 0, 1.48, 1.70, 0.29, 0.0, "toits")
    archer_cape(bm, 0.0, -0.17, zc)
    return bm


def tour_3b():
    """Arbalétriers : tour carrée en pierre, meurtrières, arbalètes."""
    bm = bmesh.new()
    ct.socle(bm)
    H = 1.22
    ct.boite(bm, -0.37, -0.37, 0.25, 0.37, 0.37, 0.33, "pierre_sombre")
    ct.carre(bm, 0, 0, 0.33, H, 0.355, 0.33, "pierre")
    ct.boite(bm, -0.345, -0.345, H - 0.06, 0.345, 0.345, H - 0.02, "or")
    ct.boite(bm, -0.38, -0.38, H - 0.02, 0.38, 0.38, H + 0.05, "pierre_claire")      # mâchicoulis
    def demi(z): return 0.355 - 0.025 * (z - 0.33) / (H - 0.33)
    for z in (0.50, 0.86):        # meurtrières en croix sur -Y, -X, +X
        h = demi(z + 0.08)
        ct.boite(bm, -0.018, -h - 0.012, z, 0.018, -h + 0.01, z + 0.18, "pierre_sombre")
        ct.boite(bm, -0.05, -h - 0.012, z + 0.10, 0.05, -h + 0.01, z + 0.13, "pierre_sombre")
        for sx in (-1, 1):
            ct.boite(bm, sx * h - 0.01, -0.018, z, sx * h + 0.012 * sx, 0.018, z + 0.18, "pierre_sombre")
    zc = H + 0.05
    for i in (-1, 0, 1):
        t = i * 0.26
        for (x0, y0, x1, y1) in ((t - 0.065, -0.38, t + 0.065, -0.33), (t - 0.065, 0.33, t + 0.065, 0.38),
                                 (-0.38, t - 0.065, -0.33, t + 0.065), (0.33, t - 0.065, 0.38, t + 0.065)):
            ct.boite(bm, x0, y0, zc, x1, y1, zc + 0.14, "pierre_claire")
    for (x0, y0, x1, y1) in ((-0.38, -0.38, 0.38, -0.34), (-0.38, 0.34, 0.38, 0.38), (-0.38, -0.38, -0.34, 0.38), (0.34, -0.38, 0.38, 0.38)):
        ct.boite(bm, x0, y0, zc, x1, y1, zc + 0.06, "pierre_claire")
    arbaletrier(bm, -0.14, -0.22, zc); arbaletrier(bm, 0.14, -0.22, zc)
    ct.cone(bm, (-0.30, 0.30, zc), (-0.30, 0.30, 1.70), 0.014, 0.014, 4, "bois_fonce")
    prisme(bm, [(-0.30, 1.695), (-0.30, 1.55), (-0.08, 1.62)], 0.29, 0.31, "toits")
    return bm


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    bm = tour(n)
    objs.append(ct.finir(bm, f"tour_archers_{n}", col, mats, (4.0 * (n - 1), LIGNE_Y, 0.0),
                         {"type": "tour", "tour": "archers", "niveau": n}))
va = ct.finir(tour_3a(), "tour_archers_3a", col, mats, (12.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "archers", "niveau": 3, "variante": "a", "version": "Tireurs d'élite"})
vb = ct.finir(tour_3b(), "tour_archers_3b", col, mats, (16.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "archers", "niveau": 3, "variante": "b", "version": "Arbalétriers"})
ct.sauver_et_apercu(scene, objs, "apercu_tours_archers.png", cible_z=0.85, largeur=9.5,
                    autres=[([objs[1], va, vb], "apercu_tours_archers_variantes.png", 15)])
