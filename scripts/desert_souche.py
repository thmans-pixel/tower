# Génère desert_souche (tronc de palmier cassé, à demi ensablé) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_souche.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("tronc_palmier"), cd.materiau("sable_fonce"), cd.materiau("sable"), cd.materiau("palmes")]
TRONC, SABLE_F, SABLE, PALME = range(4)
NOM = "desert_souche"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
# dune basse autour du pied
cd.boule(bm, (0, 0, 0), (0.42, 0.36, 0.10), SABLE, rnd)
cd.boule(bm, (0.15, 0.10, 0), (0.25, 0.20, 0.13), SABLE_F, rnd)
# tronc : deux bagues puis une cassure en dents de scie
cd.cone(bm, (0, 0, 0), (0, 0, 0.18), 0.20, 0.18, 8, TRONC)
cd.cone(bm, (0, 0, 0.18), (0, 0, 0.36), 0.19, 0.17, 8, TRONC)
haut = cd.cone(bm, (0, 0, 0.36), (0, 0, 0.50), 0.18, 0.16, 8, TRONC)
for v in haut:
    if v.co.z > 0.45:
        a = math.atan2(v.co.y, v.co.x)
        v.co.z += 0.10 * (0.5 + 0.5 * math.sin(3 * a)) - 0.04 * rnd.random()
# morceau tombé, couché vers +X
cd.cone(bm, (0.16, -0.10, 0.08), (0.46, -0.24, 0.07), 0.08, 0.07, 7, TRONC)
# vieille palme sèche posée au sol
cd.boule(bm, (-0.26, -0.18, 0.02), (0.18, 0.05, 0.03), PALME, rnd, rot=0.5)
ob = cd.finir(decor, NOM, bm, MAT, (1, 1), 1)
cd.enregistrer_et_apercu([ob], "apercu_desert_souche.png", ortho=4.0, res=(600, 450), hauteur=0.3)
