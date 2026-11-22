# Génère montagne_lac (lac gelé de 2 x 2 cases, glace craquelée, berge de neige, deux pierres) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_lac.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("glace"), cm.materiau("glace_fonce"), cm.materiau("neige"), cm.materiau("neige_ombre"),
       cm.materiau("roche"), cm.materiau("roche_fonce")]
GLACE, FISSURE, NEIGE, NEIGE_O, ROCHE, ROCHE_F = range(6)
NOM = "montagne_lac"
Z_GLACE = 0.03

cm.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()

# berge de neige bombée au contour irrégulier, glace plate au centre
N = 20
rayon = [rnd.uniform(0.92, 1.0) for _ in range(N)]
ext, mil, bord = [], [], []
for i in range(N):
    a = 2 * math.pi * i / N
    k, ca, sa = rayon[i], math.cos(a), math.sin(a)
    ext.append(bm.verts.new((0.98 * k * ca, 0.98 * k * sa, 0.0)))
    mil.append(bm.verts.new((0.85 * k * ca, 0.85 * k * sa, 0.10)))
    bord.append(bm.verts.new((0.68 * k * ca, 0.64 * k * sa, Z_GLACE)))
for i in range(N):
    j = (i + 1) % N
    bm.faces.new((ext[i], ext[j], mil[j], mil[i])).material_index = NEIGE_O
    bm.faces.new((mil[i], mil[j], bord[j], bord[i])).material_index = NEIGE
bm.faces.new(bord).material_index = GLACE
bm.faces.new(list(reversed(ext))).material_index = NEIGE_O


def fissure(x0, y0, a, longueur, n=3, larg=0.016):
    """Fissure : ligne brisée de fines lamelles foncées à fleur de glace ; renvoie le bout."""
    x, y = x0, y0
    for _ in range(n):
        a += rnd.uniform(-0.6, 0.6)
        l = longueur / n
        cx, cy = x + math.cos(a) * l / 2, y + math.sin(a) * l / 2
        m = (Matrix.Translation((cx, cy, Z_GLACE + 0.002)) @ Matrix.Rotation(a, 4, "Z")
             @ Matrix.Diagonal((l + larg, larg, 0.006, 1)))
        cm._colore(bmesh.ops.create_cube(bm, size=1.0, matrix=m), FISSURE)
        x, y = x + math.cos(a) * l, y + math.sin(a) * l
    return x, y, a


# étoile de fissures autour d'un point d'impact, et deux fissures isolées
cx, cy = 0.10, -0.08
for k in range(5):
    a = 2 * math.pi * k / 5 + rnd.uniform(-0.3, 0.3)
    bx, by, ba = fissure(cx, cy, a, rnd.uniform(0.28, 0.42))
    if k % 2 == 0:
        fissure(bx, by, ba + rnd.choice((-0.9, 0.9)), 0.14, n=2)
fissure(-0.42, 0.20, 0.3, 0.30)
fissure(-0.25, -0.40, -0.2, 0.22, n=2)

# deux pierres sur la berge, coiffées de neige
for a, r in ((-2.3, 0.15), (0.5, 0.11)):
    x, y = 0.84 * math.cos(a), 0.82 * math.sin(a)
    cm.boule(bm, (x, y, 0.05), (r, r * 0.85, r * 0.75), ROCHE_F if r > 0.12 else ROCHE, rnd, sub=1, jit=(0.85, 1.12))
    cm.boule(bm, (x, y, 0.05 + r * 0.62), (r * 0.70, r * 0.60, r * 0.25), NEIGE, rnd, sub=1, sol=False)

ob = cm.finir(decor, NOM, bm, MAT, (2, 2), 1)
cm.enregistrer_et_apercu([ob], "apercu_montagne_lac.png", ortho=3.6, res=(700, 550), hauteur=0.1)
