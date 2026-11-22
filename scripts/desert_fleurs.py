# Génère desert_fleurs_1 et desert_fleurs_2 (petits cactus boules en fleur, non bloquants) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_fleurs.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("cactus_clair"), cd.materiau("cactus"), cd.materiau("roche_rouge"),
       cd.materiau("sable"), cd.materiau("sable_fonce")]
CLAIR, VERT, FLEUR, SABLE, SABLE_F = range(5)

# (x, y, rayon, matériau) pour chaque petit cactus boule
TOUFFES = {
    "desert_fleurs_1": [(-0.14, 0.04, 0.13, CLAIR), (0.12, 0.08, 0.10, VERT), (0.02, -0.16, 0.08, CLAIR)],
    "desert_fleurs_2": [(0.10, 0.02, 0.14, VERT), (-0.16, -0.08, 0.09, CLAIR), (-0.04, 0.18, 0.07, CLAIR),
                        (0.20, -0.18, 0.06, VERT)],
}


def touffe(nom, cactus):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    cd.boule(bm, (0, 0, 0), (0.36, 0.32, 0.04), SABLE, rnd)
    for k in range(3):                                   # cailloux
        a = rnd.uniform(0, 6.28)
        cd.boule(bm, (0.28 * math.cos(a), 0.24 * math.sin(a), 0.01), (0.05, 0.04, 0.03), SABLE_F, rnd, sub=1)
    for x, y, r, m in cactus:
        cd.boule(bm, (x, y, r * 0.8), (r, r, r * 1.05), m, rnd, sub=1, jit=(0.96, 1.04))
        # fleur : couronne de pétales (cône évasé) et cœur clair
        z = r * 0.8 + r * 1.0
        cd.cone(bm, (x, y, z - 0.01), (x, y, z + 0.04), 0.025, r * 0.55, 6, FLEUR)
        cd.boule(bm, (x, y, z + 0.035), (0.025, 0.025, 0.02), SABLE, sub=1, sol=False)
    return cd.finir(decor, nom, bm, MAT, (1, 1), 0)


objs = [touffe(n, c) for n, c in TOUFFES.items()]
cd.enregistrer_et_apercu(objs, "apercu_desert_fleurs.png", ortho=7.0, res=(900, 400), hauteur=0.2)
