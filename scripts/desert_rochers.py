# Génère desert_rocher_petit/moyen/gros (grès rouge à couches horizontales, sommets plats, arêtes nettes)
# dans decor.blend (collection Decor, ligne du désert Y = -16).
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_rochers.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("roche_rouge"), cd.materiau("gres_fonce"), cd.materiau("gres"), cd.materiau("sable")]
ROUGE, FONCE, CLAIR, SABLE = range(4)
FLANCS = [ROUGE, FONCE, ROUGE, FONCE, ROUGE]     # couleur des flancs, couche par couche depuis le sol

# piles : (centre x, centre y, demi-largeur x, demi-largeur y, épaisseurs des couches de bas en haut)
ROCHERS = {
    "desert_rocher_petit": dict(bloquant=0, cases=(1, 1), piles=[
        (0.00, 0.00, 0.28, 0.23, [0.10, 0.09])]),
    "desert_rocher_moyen": dict(bloquant=1, cases=(1, 1), piles=[
        (0.00, 0.02, 0.46, 0.40, [0.16, 0.14, 0.15, 0.12])]),
    "desert_rocher_gros": dict(bloquant=1, cases=(2, 1), piles=[
        (-0.42, 0.02, 0.54, 0.44, [0.18, 0.16, 0.17, 0.15, 0.14]),
        (0.48, 0.04, 0.44, 0.40, [0.17, 0.15, 0.14]),
        (0.86, -0.28, 0.13, 0.12, [0.08, 0.07])]),
}
N = 8                                             # côtés de chaque dalle : contour anguleux


def dalle(bm, cx, cy, rx, ry, z0, z1, rayons, decal, flanc):
    """Prisme à N côtés, dessus et dessous plats ; flancs verticaux, dessus plus clair."""
    bas, haut = [], []
    for i, k in enumerate(rayons):
        a = 2 * math.pi * i / N + 0.3
        x = cx + decal[0] + rx * k * math.cos(a)
        y = cy + decal[1] + ry * k * math.sin(a)
        bas.append(bm.verts.new((x, y, z0)))
        haut.append(bm.verts.new((x, y, z1)))
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((bas[i], bas[j], haut[j], haut[i])).material_index = flanc
    bm.faces.new(haut).material_index = CLAIR
    bm.faces.new(list(reversed(bas))).material_index = flanc


def rocher(nom, d):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    for cx, cy, rx, ry, couches in d["piles"]:
        forme = [rnd.uniform(0.70, 1.0) for _ in range(N)]        # silhouette commune, bien irrégulière
        forme[rnd.randrange(N)] *= 0.75                             # une encoche franche
        z = 0.0
        for c, ep in enumerate(couches):
            retrait = 1.0 - 0.035 * c + rnd.uniform(-0.05, 0.04)     # couches en retrait ou en léger débord
            decal = (rnd.uniform(-0.07, 0.07) * rx, rnd.uniform(-0.05, 0.05) * ry)
            if c == len(couches) - 1 and len(couches) > 2:
                retrait -= 0.12                                      # dalle du sommet reculée : corniche visible
                decal = (decal[0], decal[1] + 0.12 * ry)
            rayons = [k * retrait * rnd.uniform(0.88, 1.06) for k in forme]
            dalle(bm, cx, cy, rx, ry, z, z + ep, rayons, decal, FLANCS[c % len(FLANCS)])
            z += ep
    # sable amassé au pied, côté +X
    cx, cy, rx, ry, _ = d["piles"][-1] if len(d["piles"]) > 1 else d["piles"][0]
    cd.boule(bm, (cx + rx * 0.7, cy + ry * 0.5, 0), (rx * 0.5, ry * 0.5, 0.05), SABLE, rnd, sub=1)
    return cd.finir(decor, nom, bm, MAT, d["cases"], d["bloquant"])


objs = [rocher(n, d) for n, d in ROCHERS.items()]
cd.enregistrer_et_apercu(objs, "apercu_desert_rochers.png", ortho=10.5, res=(1200, 450), hauteur=0.4)
