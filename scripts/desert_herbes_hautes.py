# Génère desert_herbes_hautes (touffes d'herbe sèche, non bloquant) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_herbes_hautes.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("sable_fonce"), cd.materiau("cactus_clair"), cd.materiau("sable")]
SECHE, VERTE, SABLE = range(3)
NOM = "desert_herbes_hautes"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
cd.boule(bm, (0, 0, 0), (0.34, 0.30, 0.04), SABLE, rnd)
for cx, cy, n in ((-0.15, 0.06, 9), (0.16, 0.10, 8), (0.02, -0.15, 7)):
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.2, 0.2)
        h = rnd.uniform(0.28, 0.45)
        pied = (cx + 0.03 * math.cos(a), cy + 0.03 * math.sin(a), 0.0)
        bout = (cx + 0.16 * math.cos(a), cy + 0.16 * math.sin(a), h)
        cd.cone(bm, pied, bout, 0.028, 0.0, 3, VERTE if k % 3 == 0 else SECHE)
ob = cd.finir(decor, NOM, bm, MAT, (1, 1), 0)
cd.enregistrer_et_apercu([ob], "apercu_desert_herbes_hautes.png", ortho=4.0, res=(600, 450), hauteur=0.2)
