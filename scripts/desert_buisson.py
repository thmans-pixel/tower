# Génère desert_buisson (touffe épineuse arrondie) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_buisson.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("cactus"), cd.materiau("cactus_clair"), cd.materiau("sable_fonce"), cd.materiau("tronc_palmier")]
VERT, CLAIR, SABLE, BOIS = range(4)
NOM = "desert_buisson"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
cd.boule(bm, (0, 0, 0), (0.40, 0.36, 0.06), SABLE, rnd)
# brindilles sèches qui dépassent
for a in (0.4, 1.9, 3.3, 4.9):
    cd.cone(bm, (0, 0, 0.10), (0.42 * math.cos(a), 0.40 * math.sin(a), 0.48), 0.025, 0.008, 4, BOIS)
# boules de feuillage, plus claires sur le dessus et côté caméra
for c, r, m in (((0.00, 0.06, 0.24), (0.32, 0.30, 0.26), VERT),
                ((-0.20, -0.08, 0.20), (0.22, 0.20, 0.20), CLAIR),
                ((0.21, -0.10, 0.19), (0.21, 0.20, 0.19), VERT),
                ((0.02, -0.14, 0.36), (0.19, 0.18, 0.17), CLAIR)):
    cd.boule(bm, c, r, m, rnd, sub=2)
ob = cd.finir(decor, NOM, bm, MAT, (1, 1), 1)
cd.enregistrer_et_apercu([ob], "apercu_desert_buisson.png", ortho=4.0, res=(600, 450), hauteur=0.3)
