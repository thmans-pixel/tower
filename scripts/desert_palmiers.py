# Génère desert_palmier_1 et desert_palmier_2 (tronc annelé courbé, palmes retombantes, grappe de dattes)
# dans decor.blend (collection Decor, ligne du désert Y = -16). Hauteur totale 1,8.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_palmiers.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("tronc_palmier"), cd.materiau("sable_fonce"), cd.materiau("palmes"), cd.materiau("cactus_clair"),
       cd.materiau("gres_fonce"), cd.materiau("roche_rouge"), cd.materiau("sable")]
TRONC, BAGUE, PALME, PALME_CLAIRE, DATTE, DATTE_ROUGE, SABLE = range(7)
HAUTEUR = 1.8

# courbure du sommet (x, y), nombre de palmes, rotation de départ, direction voulue pour la grappe (angle)
PALMIERS = {
    "desert_palmier_1": dict(pente=(0.24, 0.04), n=7, rot=0.25, grappe=-1.3),
    "desert_palmier_2": dict(pente=(-0.20, 0.12), n=8, rot=0.80, grappe=-2.0),
}
# desert_palmier_3 n'existe plus : retiré du fichier s'il y traîne encore
cd.nettoie("desert_palmier_3")


def fronde(bm, base, az, L, W, montee, chute, mat, n=6):
    """Palme : nervure relevée, deux pans, dessous plat ; monte puis retombe nettement."""
    dx, dy = math.cos(az), math.sin(az)
    cote = Vector((-dy, dx, 0))
    rangs = []
    for i in range(n + 1):
        t = i / n
        p = Vector((base.x + dx * L * t, base.y + dy * L * t, base.z + montee * t - (montee + chute) * t * t))
        w = W * max(0.18, math.sin(math.pi * min(t * 1.1, 1.0)) ** 0.7) if i < n else 0.0
        rangs.append((bm.verts.new(p + cote * w), bm.verts.new(p + Vector((0, 0, 0.035 if i < n else 0))),
                      bm.verts.new(p - cote * w)))
    for (a0, b0, c0), (a1, b1, c1) in zip(rangs, rangs[1:]):
        for quad in ((a0, a1, b1, b0), (b0, b1, c1, c0), (a0, c0, c1, a1)):
            vs = list(dict.fromkeys(quad))
            if len(vs) >= 3:
                bm.faces.new(vs).material_index = mat


def palmier(nom, d):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    cd.boule(bm, (0, 0, 0), (0.30, 0.28, 0.07), SABLE, rnd)
    # tronc : 7 tronçons, chacun évasé à la base, séparés par une bague claire (anneaux lisibles de loin)
    HT, N = 1.58, 7
    px, py = d["pente"]
    pts = [Vector((px * (i / N) ** 2, py * (i / N) ** 2, HT * i / N)) for i in range(N + 1)]
    for i in range(N):
        r = 0.13 - 0.009 * i
        cd.cone(bm, pts[i], pts[i + 1], r + 0.018, r - 0.012, 7, TRONC)
        if i:
            dirn = (pts[i + 1] - pts[i]).normalized()
            cd.cone(bm, pts[i] - dirn * 0.015, pts[i] + dirn * 0.015, r + 0.024, r + 0.024, 7, BAGUE)
    haut = pts[-1]
    # grappe de dattes pendante sous la couronne, côté caméra
    # dans le creux entre les deux palmes les plus proches de la caméra (-Y), pour qu'elle se voie
    pas = 2 * math.pi / d["n"]
    creux = [d["rot"] + pas * (k + 0.5) for k in range(d["n"])]
    a = min(creux, key=lambda c: abs(math.atan2(math.sin(c - d["grappe"]), math.cos(c - d["grappe"]))))
    acc = haut + Vector((0.08 * math.cos(a), 0.08 * math.sin(a), 0.0))
    bas = haut + Vector((0.26 * math.cos(a), 0.26 * math.sin(a), -0.34))
    cd.cone(bm, acc, bas, 0.022, 0.014, 4, DATTE)
    for k in range(11):
        t = 0.40 + 0.60 * (k / 10)
        b = k * 2.3
        p = acc + (bas - acc) * t + Vector((0.07 * math.cos(b), 0.07 * math.sin(b), 0)) * (1.25 - t)
        cd.boule(bm, p, (0.045, 0.045, 0.055), DATTE_ROUGE if k % 3 else DATTE, sub=1, sol=False)
    # couronne : palmes en étoile, une sur deux plus claire, bout bien retombant
    for k in range(d["n"]):
        az = d["rot"] + 2 * math.pi * k / d["n"] + rnd.uniform(-0.06, 0.06)
        ecart = math.atan2(math.sin(az - a), math.cos(az - a))
        if abs(ecart) < pas:                      # les deux palmes qui encadrent la grappe s'écartent
            az += math.copysign(0.30, ecart)
        fronde(bm, haut + Vector((0, 0, 0.03)), az, rnd.uniform(0.70, 0.80), 0.14,
               rnd.uniform(0.14, 0.20), rnd.uniform(0.48, 0.60), PALME if k % 2 else PALME_CLAIRE)
    cd.cone(bm, haut, haut + Vector((0, 0, 0.14)), 0.08, 0.015, 6, PALME)      # cœur de la couronne
    # hauteur totale exacte : 1,8
    zmax = max(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z *= HAUTEUR / zmax
    return cd.finir(decor, nom, bm, MAT, (1, 1), 1)


objs = [palmier(n, d) for n, d in PALMIERS.items()]
cd.enregistrer_et_apercu(objs, "apercu_desert_palmiers.png", ortho=7.0, res=(900, 500), hauteur=0.9)
