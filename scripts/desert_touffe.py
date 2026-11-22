# Génère desert_touffe (touffe d'herbe sèche jaune et petit crâne de bœuf blanchi, non bloquant) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_touffe.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix, Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("sable"), cd.materiau("sable_fonce"), cd.materiau("os"), cd.materiau("ombre")]
JAUNE, SECHE, OS, TROU = range(4)
NOM = "desert_touffe"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()

# touffe d'herbe sèche, à l'arrière gauche : brins fins en éventail, jaune clair et paille
cx, cy = -0.12, 0.10
for k in range(14):
    a = 2 * math.pi * k / 14 + rnd.uniform(-0.2, 0.2)
    h = rnd.uniform(0.26, 0.40)
    pied = (cx + 0.03 * math.cos(a), cy + 0.03 * math.sin(a), 0.0)
    bout = (cx + 0.17 * math.cos(a), cy + 0.15 * math.sin(a), h)
    cd.cone(bm, pied, bout, 0.026, 0.0, 3, JAUNE if k % 3 else SECHE)
cd.boule(bm, (cx, cy, 0), (0.10, 0.09, 0.04), SECHE, rnd, sub=1)

# crâne de bœuf posé au sol devant à droite, museau tourné vers la caméra (-Y), un peu de biais
O = Vector((0.16, -0.12, 0.0))
R = Matrix.Rotation(0.35, 4, "Z")
P = lambda x, y, z: O + (R @ Vector((x, y, z)))
# boîte crânienne arrondie
m = Matrix.Translation(P(0, 0.03, 0.065)) @ R @ Matrix.Diagonal((0.085, 0.07, 0.065, 1))
cd._colore(bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=m), OS)
# museau : tronc de cône qui s'affine vers l'avant
cd.cone(bm, P(0, 0.0, 0.05), P(0, -0.13, 0.035), 0.055, 0.032, 6, OS)
# orbites et naseaux sombres, sur le dessus côté caméra
for sx in (-1, 1):
    cd.boule(bm, P(sx * 0.04, -0.035, 0.105), (0.022, 0.018, 0.012), TROU, sub=1, sol=False)
    cd.boule(bm, P(sx * 0.012, -0.135, 0.055), (0.009, 0.009, 0.008), TROU, sub=1, sol=False)
# cornes : sortent sur les côtés puis se relèvent en pointe
for sx in (-1, 1):
    a = P(sx * 0.07, 0.04, 0.10)
    b = P(sx * 0.16, 0.05, 0.12)
    c = P(sx * 0.21, 0.02, 0.20)
    cd.cone(bm, a, b, 0.022, 0.017, 5, OS)
    cd.cone(bm, b, c, 0.017, 0.0, 5, OS)

ob = cd.finir(decor, NOM, bm, MAT, (1, 1), 0)
cd.enregistrer_et_apercu([ob], "apercu_desert_touffe.png", ortho=2.0, res=(600, 450), hauteur=0.1)
