# Génère montagne_touffe (herbes sèches qui dépassent de la neige, petite pierre ; non bloquant) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_touffe.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("neige"), cm.materiau("neige_ombre"), cm.materiau("paille"), cm.materiau("bois"),
       cm.materiau("roche"), cm.materiau("roche_fonce")]
NEIGE, NEIGE_O, PAILLE, BOIS, ROCHE, ROCHE_F = range(6)
NOM = "montagne_touffe"

cm.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
# plaque de neige bombée d'où sortent les herbes
cm.boule(bm, (0, 0, 0), (0.38, 0.33, 0.07), NEIGE_O, rnd, sub=1)
cm.boule(bm, (-0.08, 0.06, 0), (0.24, 0.20, 0.10), NEIGE, rnd, sub=1)
# deux bouquets d'herbes sèches, brins fins inclinés
for cx, cy, n in ((-0.10, 0.08, 10), (0.10, 0.14, 7)):
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.25, 0.25)
        h = rnd.uniform(0.22, 0.36)
        pied = (cx + 0.025 * math.cos(a), cy + 0.025 * math.sin(a), 0.06)
        bout = (cx + 0.14 * math.cos(a), cy + 0.12 * math.sin(a), h)
        cm.cone(bm, pied, bout, 0.024, 0.0, 3, PAILLE if k % 3 else BOIS)
# petite pierre devant à droite, coiffée de neige
cm.boule(bm, (0.16, -0.14, 0.03), (0.10, 0.08, 0.08), ROCHE_F, rnd, sub=1, jit=(0.85, 1.12))
cm.boule(bm, (0.15, -0.14, 0.095), (0.075, 0.06, 0.03), NEIGE, rnd, sub=1, sol=False)
ob = cm.finir(decor, NOM, bm, MAT, (1, 1), 0)
cm.enregistrer_et_apercu([ob], "apercu_montagne_touffe.png", ortho=2.2, res=(600, 450), hauteur=0.1)
