# Génère desert_cactus_1/2/3 (saguaros stylisés : tronc côtelé, 0 à 2 bras recourbés vers le haut) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_cactus.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("cactus"), cd.materiau("cactus_clair"), cd.materiau("sable"), cd.materiau("fleur_rose"),
       cd.materiau("sable_fonce")]
VERT, CLAIR, EPINE, ROSE, SABLE = range(5)
COTES = 6                                   # côtes du tronc (profil en étoile à 12 sommets)

# hauteur, bras : (côté -1/+1, hauteur de départ, écart horizontal, montée), fleur
CACTUS = {
    "desert_cactus_1": dict(h=1.00, r=0.15, bras=[(1, 0.42, 0.24, 0.30)], fleur=False),
    "desert_cactus_2": dict(h=1.30, r=0.17, bras=[(-1, 0.50, 0.28, 0.40), (1, 0.70, 0.25, 0.34)], fleur=True),
    "desert_cactus_3": dict(h=0.70, r=0.14, bras=[], fleur=False),
}


def profil(r):
    """Étoile : sommet de côte (r) puis creux (0,8 r)."""
    return [(r if i % 2 == 0 else r * 0.80, math.pi * i / COTES) for i in range(2 * COTES)]


def tube(bm, pts, rayons, mat, dome=True):
    """Balaye le profil côtelé le long d'une polyligne ; bout arrondi par deux anneaux qui se resserrent."""
    pts = [Vector(p) for p in pts]
    anneaux = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(d).to_matrix()
        anneaux.append([bm.verts.new(p + rot @ Vector((rr * math.cos(a), rr * math.sin(a), 0)))
                        for rr, a in profil(rayons[i])])
    if dome:
        d = (pts[-1] - pts[-2]).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(d).to_matrix()
        r = rayons[-1]
        for k, s in ((0.45, 0.75), (0.8, 0.40)):
            c = pts[-1] + d * r * k
            anneaux.append([bm.verts.new(c + rot @ Vector((rr * s * math.cos(a), rr * s * math.sin(a), 0)))
                            for rr, a in profil(r)])
        sommet = bm.verts.new(pts[-1] + d * r * 0.95)
    n = 2 * COTES
    for a0, a1 in zip(anneaux, anneaux[1:]):
        for j in range(n):
            bm.faces.new((a0[j], a0[(j + 1) % n], a1[(j + 1) % n], a1[j])).material_index = mat
    if dome:
        for j in range(n):
            bm.faces.new((anneaux[-1][j], anneaux[-1][(j + 1) % n], sommet)).material_index = CLAIR
    else:
        bm.faces.new(list(reversed(anneaux[-1]))).material_index = mat
    bm.faces.new(list(reversed(anneaux[0]))).material_index = mat
    return pts


def epines(bm, centre, r, z, n, rnd, dz=0.0):
    """Petites épines claires sur les sommets des côtes, autour d'un point."""
    for k in range(n):
        a = math.pi * 2 * rnd.randrange(COTES) / COTES + rnd.uniform(-0.1, 0.1)
        if math.sin(a) > 0.6:                       # surtout côté caméra et sur les flancs
            a = -a
        p = Vector((centre.x + r * math.cos(a), centre.y + r * math.sin(a), z + rnd.uniform(-dz, dz)))
        d = Vector((math.cos(a), math.sin(a), 0.35)).normalized()
        cd.cone(bm, p - d * 0.01, p + d * 0.07, 0.014, 0.0, 3, EPINE)


def saguaro(nom, d):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    h, r = d["h"], d["r"]
    cd.boule(bm, (0, 0, 0), (0.30, 0.27, 0.06), SABLE, rnd)
    # tronc : légèrement plus large au pied, dôme au sommet (le dôme fait ~r de haut)
    zs = [0, h * 0.35, h * 0.70, h - r * 0.95]
    tube(bm, [(0, 0, z) for z in zs], [r * 1.08, r, r * 0.97, r * 0.94], VERT)
    epines(bm, Vector((0, 0, 0)), r * 1.02, h * 0.5, 10, rnd, dz=h * 0.35)
    # bras : sortie horizontale, coude arrondi, montée verticale
    for cote, zb, ecart, montee in d["bras"]:
        rb = r * 0.62
        x = cote * ecart
        chemin = [(cote * r * 0.6, 0, zb), (cote * ecart * 0.60, 0, zb + 0.01),
                  (cote * ecart * 0.92, 0, zb + 0.06), (x, 0, zb + 0.16), (x, 0, zb + montee)]
        tube(bm, chemin, [rb * 1.05, rb, rb, rb * 0.97, rb * 0.93], VERT)
        epines(bm, Vector((x, 0, 0)), rb, zb + montee * 0.6, 3, rnd, dz=montee * 0.25)
    # fleur rose au sommet : pétales évasés et cœur clair
    if d["fleur"]:
        z = h - 0.02
        cd.cone(bm, (0.02, -0.03, z), (0.02, -0.03, z + 0.07), 0.03, 0.10, 6, ROSE)
        cd.boule(bm, (0.02, -0.03, z + 0.065), (0.03, 0.03, 0.025), EPINE, sub=1, sol=False)
    return cd.finir(decor, nom, bm, MAT, (1, 1), 1)


objs = [saguaro(n, d) for n, d in CACTUS.items()]
cd.enregistrer_et_apercu(objs, "apercu_desert_cactus.png", ortho=10.0, res=(1200, 450), hauteur=0.6)
