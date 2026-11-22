# Génère desert_cloture (palissade en troncs de palmier liés, le long de X) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_cloture.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("tronc_palmier"), cd.materiau("sable_fonce"), cd.materiau("gres_fonce")]
BOIS, SABLE, LIEN = range(3)
NOM = "desert_cloture"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
# deux poteaux pointus aux extrémités, un plus petit au milieu
for x, h in ((-0.42, 0.62), (0.0, 0.52), (0.42, 0.62)):
    cd.cone(bm, (x, 0, 0), (x, 0, h), 0.065, 0.06, 6, BOIS)
    cd.cone(bm, (x, 0, h), (x, 0, h + 0.10), 0.06, 0.0, 6, BOIS)
    cd.boule(bm, (x, 0, 0), (0.12, 0.10, 0.04), SABLE, rnd, sub=1)
# deux traverses rondes, légèrement de travers
for z, dz in ((0.20, 0.02), (0.44, -0.03)):
    cd.cone(bm, (-0.48, -0.06, z - dz), (0.48, -0.06, z + dz), 0.04, 0.04, 6, BOIS)
    for x in (-0.42, 0.0, 0.42):                       # ligatures foncées
        cd.cone(bm, (x - 0.035, -0.06, z), (x + 0.035, -0.06, z), 0.052, 0.052, 6, LIEN)
ob = cd.finir(decor, NOM, bm, MAT, (1, 1), 1)
cd.enregistrer_et_apercu([ob], "apercu_desert_cloture.png", ortho=4.0, res=(600, 450), hauteur=0.3)
