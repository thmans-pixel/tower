# Génère montagne_congere (congère arrondie, 2 x 1 cases, crête soufflée en corniche vers la caméra) dans decor.blend.
# Vent venant de +Y : dos en pente douce, crête qui déborde en petite corniche au-dessus de la face -Y.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_congere.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("neige"), cm.materiau("neige_ombre"), cm.materiau("ombre_bleue")]
NEIGE, NEIGE_O, OMBRE_B = range(3)
NOM = "montagne_congere"
H, X0, NX = 0.50, 0.97, 16

# profil (y, z/H) du pied avant (-Y) au pied arrière (+Y), en passant sous la corniche puis sur le dessus
PROFIL = [(-0.40, 0.00), (-0.37, 0.22), (-0.33, 0.48), (-0.30, 0.70), (-0.29, 0.84),
          (-0.34, 0.90), (-0.36, 0.95), (-0.30, 1.00),                     # corniche qui déborde vers -Y
          (-0.15, 0.97), (0.02, 0.86), (0.18, 0.64), (0.32, 0.36), (0.42, 0.12), (0.46, 0.00)]
MATS = [OMBRE_B, NEIGE_O, NEIGE_O, NEIGE_O, OMBRE_B, OMBRE_B, NEIGE, NEIGE, NEIGE, NEIGE, NEIGE, NEIGE, NEIGE]

cm.nettoie(NOM)
bm = bmesh.new()
grille = []
for i in range(NX + 1):
    x = -X0 + 2 * X0 * i / NX
    t = abs(x) / X0
    h = H * max(0.0, 1 - t ** 2.4) ** 0.7                        # bouts arrondis
    sy = 0.30 + 0.70 * max(0.0, 1 - t ** 2) ** 0.5
    ondule = 0.03 * math.sin(3.1 * x + 0.6)                      # crête pas tout à fait droite
    grille.append([bm.verts.new((x, y * sy + ondule * (1 if z > 0 else 0), z * h)) for y, z in PROFIL])
for i in range(NX):
    for j in range(len(PROFIL) - 1):
        f = bm.faces.new((grille[i][j], grille[i + 1][j], grille[i + 1][j + 1], grille[i][j + 1]))
        f.material_index = MATS[j]
L = len(PROFIL) - 1
bord = [c[0] for c in grille] + [grille[-1][j] for j in range(1, L + 1)] + \
       [c[L] for c in reversed(grille[:-1])] + [grille[0][j] for j in range(L - 1, 0, -1)]
bm.faces.new(list(reversed(bord))).material_index = NEIGE_O
ys = [v.co.y for v in bm.verts]
for v in bm.verts:
    v.co.y -= (min(ys) + max(ys)) / 2
ob = cm.finir(decor, NOM, bm, MAT, (2, 1), 1, normales=False)    # faces orientées à la construction
cm.enregistrer_et_apercu([ob], "apercu_montagne_congere.png", ortho=4.5, res=(800, 450), hauteur=0.2)
