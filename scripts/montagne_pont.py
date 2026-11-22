# Génère montagne_pont (pont de bois à garde-corps de cordes, 1 x 1 case, posé à plat sur le chemin,
# planches dans l'axe X, non bloquant : on marche dessus) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_pont.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("bois"), cm.materiau("paille"), cm.materiau("neige"), cm.materiau("roche_fonce")]
BOIS, CORDE, NEIGE, SOMBRE = range(4)
NOM = "montagne_pont"
YB = 0.40                                   # demi-largeur du tablier (le long de Y)

cm.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
# deux traverses sous le tablier, aux bouts
for x in (-0.42, 0.42):
    cm.boite(bm, x - 0.05, -YB - 0.04, 0.0, x + 0.05, YB + 0.04, 0.035, SOMBRE)
# tablier : 5 planches dans l'axe X, légèrement décalées et de hauteurs inégales
n = 5
larg = 2 * YB / n
for k in range(n):
    y0 = -YB + k * larg + 0.008
    dx = rnd.uniform(-0.03, 0.03)
    cm.boite(bm, -0.49 + dx, y0, 0.035, 0.49 + dx, y0 + larg - 0.016, 0.065 + rnd.uniform(0, 0.008), BOIS)
# un peu de neige restée sur les planches du bord
cm.boite(bm, -0.30, YB - larg + 0.01, 0.07, 0.10, YB - 0.02, 0.085, NEIGE)
# garde-corps : quatre poteaux aux coins, cordes tendues avec un léger creux au milieu
for y in (-YB - 0.02, YB + 0.02):
    for x in (-0.44, 0.44):
        cm.cone(bm, (x, y, 0.0), (x, y, 0.40), 0.035, 0.03, 6, BOIS)
        cm.boule(bm, (x, y, 0.415), (0.04, 0.04, 0.02), NEIGE, sub=1, sol=False)
    for z in (0.36, 0.22):
        a, b, c = (-0.44, y, z), (0.0, y, z - 0.05), (0.44, y, z)
        cm.cone(bm, a, b, 0.012, 0.012, 4, CORDE)
        cm.cone(bm, b, c, 0.012, 0.012, 4, CORDE)
ob = cm.finir(decor, NOM, bm, MAT, (1, 1), 0)
cm.enregistrer_et_apercu([ob], "apercu_montagne_pont.png", ortho=2.2, res=(600, 450), hauteur=0.1)
