# Génère tour_tempete_1/2/3 dans decor.blend (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_tempete.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 28.0
SEG = 8
ROT = math.pi / SEG

# C : haut de la colonne, sphère (centre, rayon), pointes, nuage
NIVEAUX = {
    1: dict(C=0.92, sph=(1.12, 0.13), pointes=False, nuage=False),
    2: dict(C=1.06, sph=(1.27, 0.13), pointes=True, nuage=False),
    3: dict(C=0.86, sph=(1.12, 0.17), pointes=True, nuage=True),
    "3a": dict(C=0.86, sph=(1.10, 0.14), pointes=True, nuage=True, large=True),     # Orage
    "3b": dict(C=1.00, sph=(1.21, 0.13), pointes=False, nuage=False, mats=True),    # Paratonnerre
}


def eclair(bm, pts, r=0.032):
    """Éclair figé : ligne brisée de segments fins, émissif."""
    for a, b in zip(pts, pts[1:]):
        ct.cone(bm, a, b, r, r * 0.8, 4, "eclair")


def zigzag(p0, p1, n, amp, rnd):
    """Points en zigzag de p0 à p1 (décalages alternés perpendiculaires)."""
    pts = [p0]
    dx, dy, dz = (p1[i] - p0[i] for i in range(3))
    L = math.sqrt(dx * dx + dy * dy + dz * dz)
    # perpendiculaire approximative
    px, py, pz = -dy / L, dx / L, 0.0
    if abs(px) + abs(py) < 0.2: px, py, pz = 1.0, 0.0, 0.0
    for k in range(1, n):
        t = k / n
        s = amp * (1 if k % 2 else -1) * rnd.uniform(0.7, 1.0)
        pts.append((p0[0] + dx * t + px * s, p0[1] + dy * t + py * s, p0[2] + dz * t + pz * s))
    pts.append(p1)
    return pts


def tour(n):
    c = NIVEAUX[n]; C = c["C"]; zs, rs = c["sph"]
    rnd = random.Random(f"tempete{n}")
    bm = bmesh.new()
    ct.socle(bm)
    # colonne : base, fût à 8 pans, chapiteau
    ct.cylindre(bm, 0, 0, 0.25, 0.34, 0.24, 0.22, SEG, "pierre_tempete", ROT)
    ct.cylindre(bm, 0, 0, 0.34, C, 0.16, 0.13, SEG, "pierre_tempete", ROT)
    ct.cylindre(bm, 0, 0, 0.36, 0.40, 0.17, 0.17, SEG, "cuivre", ROT)
    ct.cylindre(bm, 0, 0, C - 0.02, C + 0.05, 0.20, 0.20, SEG, "pierre_tempete", ROT)
    # bobines de cuivre empilées autour du haut de la colonne
    nb = 3 if n == 1 else 4
    for k in range(nb):
        z = C - 0.30 + k * 0.075
        ct.anneau(bm, (0, 0, z), 0.165, 0.035, "cuivre", n=12)
    # support et sphère
    ct.cylindre(bm, 0, 0, C + 0.05, zs - rs * 0.6, 0.05, 0.04, 6, "cuivre")
    ct.boule(bm, (0, 0, zs), rs, "cuivre", sub=2)
    ct.anneau(bm, (0, 0, zs), rs + 0.025, 0.025, "cuivre", n=14, tilt=math.pi / 2, az=0.4)
    tops = []
    if c["pointes"]:
        for i in range(3):
            a = -math.pi / 2 + 2 * math.pi * i / 3 + 0.5
            b0 = (0.15 * math.cos(a), 0.15 * math.sin(a), C + 0.03)
            b1 = (0.34 * math.cos(a), 0.34 * math.sin(a), C + 0.30)
            ct.cone(bm, b0, b1, 0.048, 0.0, 6, "cuivre")
            ct.boule(bm, b0, 0.045, "cuivre")
            tops.append(b1)
    # éclairs figés
    if n == 1:
        eclair(bm, zigzag((0.08, -0.06, zs + 0.06), (0.22, -0.10, 1.29), 3, 0.04, rnd))
        eclair(bm, zigzag((-0.09, 0.03, zs + 0.05), (-0.24, 0.05, 1.24), 3, 0.04, rnd))
    else:
        for t in tops:   # arcs entre les pointes et la sphère
            sx, sy, sz = t[0] * rs / 0.34 * 0.9, t[1] * rs / 0.34 * 0.9, zs
            eclair(bm, zigzag(t, (sx, sy, sz), 3, 0.035, rnd))
        if n == 2:
            eclair(bm, zigzag((0.0, -0.02, zs + rs - 0.01), (0.05, -0.05, 1.50), 3, 0.035, rnd))
    if c.get("mats"):
        # trois mâts de cuivre reliés par des éclairs
        sommets = []
        for i in range(3):
            a = -math.pi / 2 + 2 * math.pi * i / 3 + math.pi / 3
            x, y = 0.33 * math.cos(a), 0.33 * math.sin(a)
            ct.cylindre(bm, x, y, 0.25, 0.32, 0.06, 0.05, 6, "pierre_tempete")
            ct.cylindre(bm, x, y, 0.32, 1.62, 0.03, 0.022, 6, "cuivre")
            for z in (0.62, 1.02, 1.38):
                ct.cylindre(bm, x, y, z, z + 0.04, 0.045, 0.045, 6, "pierre_claire")
            ct.boule(bm, (x, y, 1.655), 0.045, "cuivre")
            sommets.append((x, y, 1.65))
        for i in range(3):
            eclair(bm, zigzag(sommets[i], sommets[(i + 1) % 3], 4, 0.04, rnd))
            eclair(bm, zigzag(sommets[i], (sommets[i][0] * 0.35, sommets[i][1] * 0.35, zs + rs * 0.7), 3, 0.035, rnd))
    if c["nuage"]:
        # nuage d'orage gris-bleu au-dessus de la sphère (plus large pour Orage)
        boules = ((0, 0, 1.56, 0.17), (-0.18, 0.04, 1.52, 0.13), (0.19, -0.02, 1.53, 0.14),
                  (0.05, 0.12, 1.58, 0.12), (-0.06, -0.12, 1.53, 0.12))
        if c.get("large"):
            boules = ((0, 0, 1.55, 0.19), (-0.24, 0.05, 1.50, 0.16), (0.25, -0.03, 1.51, 0.16),
                      (0.08, 0.20, 1.55, 0.15), (-0.10, -0.20, 1.50, 0.14), (-0.20, 0.22, 1.47, 0.12),
                      (0.22, 0.20, 1.48, 0.12), (0.20, -0.22, 1.47, 0.12))
        for x, y, z, r in boules:
            ct.boule(bm, (x, y, z), (r, r, r * 0.72), "nuage", sub=2)
        departs = ((-0.14, -0.05), (0.12, -0.08), (0.02, 0.10))
        if c.get("large"):
            departs += ((-0.30, 0.0), (0.30, -0.05))
        for x0, y0 in departs:
            eclair(bm, zigzag((x0, y0, 1.45), (x0 * 0.4, y0 * 0.4, zs + rs * 0.8), 3, 0.035, rnd))
        if c.get("large"):     # éclairs qui tombent du bord du nuage jusqu'au socle
            for x0, y0 in ((-0.33, -0.12), (0.34, 0.10)):
                eclair(bm, zigzag((x0, y0, 1.40), (x0 * 1.05, y0, 0.32), 5, 0.045, rnd))
    return bm


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    objs.append(ct.finir(tour(n), f"tour_tempete_{n}", col, mats, (4.0 * (n - 1), LIGNE_Y, 0.0),
                         {"type": "tour", "tour": "tempete", "niveau": n}))
va = ct.finir(tour("3a"), "tour_tempete_3a", col, mats, (12.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "tempete", "niveau": 3, "variante": "a", "version": "Orage"})
vb = ct.finir(tour("3b"), "tour_tempete_3b", col, mats, (16.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "tempete", "niveau": 3, "variante": "b", "version": "Paratonnerre"})
ct.sauver_et_apercu(scene, objs, "apercu_tours_tempete.png", cible_z=0.85, largeur=9.5,
                    autres=[([objs[1], va, vb], "apercu_tours_tempete_variantes.png", 15)])
