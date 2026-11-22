# Génère desert_oasis (petit plan d'eau de 2 x 2 cases bordé de pierres et de roseaux, palmier nain) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_oasis.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("eau"), cd.materiau("sable"), cd.materiau("sable_fonce"), cd.materiau("gres"),
       cd.materiau("gres_fonce"), cd.materiau("cactus_clair"), cd.materiau("cactus"), cd.materiau("palmes"),
       cd.materiau("tronc_palmier")]
EAU, SABLE, SABLE_F, PIERRE, PIERRE_F, ROSEAU, ROSEAU_F, PALME, TRONC = range(9)
NOM = "desert_oasis"

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()

# --- berge : anneau de sable bombé au contour irrégulier, eau plate au centre
N = 20
rayon = [rnd.uniform(0.93, 1.0) for _ in range(N)]
ext, mil, bord = [], [], []
for i in range(N):
    a = 2 * math.pi * i / N
    k, ca, sa = rayon[i], math.cos(a), math.sin(a)
    ext.append(bm.verts.new((0.98 * k * ca, 0.98 * k * sa, 0.0)))
    mil.append(bm.verts.new((0.84 * k * ca, 0.84 * k * sa, 0.08)))
    bord.append(bm.verts.new((0.64 * k * ca, 0.60 * k * sa, 0.035)))
for i in range(N):
    j = (i + 1) % N
    bm.faces.new((ext[i], ext[j], mil[j], mil[i])).material_index = SABLE_F
    bm.faces.new((mil[i], mil[j], bord[j], bord[i])).material_index = SABLE
bm.faces.new(bord).material_index = EAU
bm.faces.new(list(reversed(ext))).material_index = SABLE_F          # dessous fermé


def sur_bord(a, f=0.72):
    """Point de la berge, juste au bord de l'eau, à l'angle a."""
    i = int(round(a / (2 * math.pi) * N)) % N
    return math.cos(a) * f * rayon[i], math.sin(a) * f * 0.94 * rayon[i]


# --- pierres de grès tout autour de l'eau, plus serrées côté caméra (-Y)
for k in range(13):
    a = 2 * math.pi * k / 13 + rnd.uniform(-0.12, 0.12)
    if 1.9 < a % (2 * math.pi) < 2.9:
        continue                                   # laisse la place au palmier, au fond à gauche
    x, y = sur_bord(a, rnd.uniform(0.70, 0.78))
    r = rnd.uniform(0.10, 0.15) * (1.15 if math.sin(a) < 0 else 0.9)
    cd.boule(bm, (x, y, 0.04), (r, r * 0.85, r * 0.65), PIERRE if k % 3 else PIERRE_F, rnd, sub=1, rot=a)

# --- touffes de roseaux entre les pierres : tiges fines et un épi foncé au bout
for a in (0.35, 1.35, 3.40, 4.05, 5.35):
    cx, cy = sur_bord(a, 0.66)
    for k in range(6):
        b = 2 * math.pi * k / 6 + rnd.uniform(-0.2, 0.2)
        h = rnd.uniform(0.30, 0.46)
        pied = Vector((cx + 0.025 * math.cos(b), cy + 0.025 * math.sin(b), 0.03))
        bout = Vector((cx + 0.08 * math.cos(b), cy + 0.08 * math.sin(b), h))
        cd.cone(bm, pied, bout, 0.018, 0.004, 3, ROSEAU)
        if k % 2 == 0:                             # massette
            d = (bout - pied).normalized()
            cd.cone(bm, bout - d * 0.09, bout - d * 0.01, 0.022, 0.018, 4, ROSEAU_F)

# --- palmier nain au fond à gauche : tronc court et trapu, palmes basses qui s'étalent sur l'eau
pied = Vector((-0.58, 0.55, 0.06))
haut = pied + Vector((0.08, -0.05, 0.50))
for i in range(3):
    p0 = pied + (haut - pied) * (i / 3)
    p1 = pied + (haut - pied) * ((i + 1) / 3)
    cd.cone(bm, p0, p1, 0.11 - 0.015 * i, 0.09 - 0.015 * i, 7, TRONC)
    if i:
        cd.cone(bm, p0 - Vector((0, 0, 0.012)), p0 + Vector((0, 0, 0.012)), 0.105 - 0.015 * i, 0.105 - 0.015 * i, 7, SABLE_F)
for k in range(7):
    az = 0.2 + 2 * math.pi * k / 7 + rnd.uniform(-0.1, 0.1)
    L, W, montee, chute = rnd.uniform(0.46, 0.54), 0.12, 0.16, 0.30
    dx, dy = math.cos(az), math.sin(az)
    cote = Vector((-dy, dx, 0))
    rangs = []
    for i in range(6):
        t = i / 5
        p = haut + Vector((dx * L * t, dy * L * t, 0.02 + montee * t - (montee + chute) * t * t))
        w = W * max(0.2, math.sin(math.pi * min(t * 1.1, 1))) if i < 5 else 0
        rangs.append((bm.verts.new(p + cote * w), bm.verts.new(p + Vector((0, 0, 0.03 if i < 5 else 0))),
                      bm.verts.new(p - cote * w)))
    for (a0, b0, c0), (a1, b1, c1) in zip(rangs, rangs[1:]):
        for quad in ((a0, a1, b1, b0), (b0, b1, c1, c0), (a0, c0, c1, a1)):
            vs = list(dict.fromkeys(quad))
            if len(vs) >= 3:
                bm.faces.new(vs).material_index = PALME if k % 2 else ROSEAU
cd.cone(bm, haut, haut + Vector((0, 0, 0.10)), 0.07, 0.015, 6, PALME)

ob = cd.finir(decor, NOM, bm, MAT, (2, 2), 1)
cd.enregistrer_et_apercu([ob], "apercu_desert_oasis.png", ortho=3.6, res=(700, 550), hauteur=0.3)
