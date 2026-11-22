# Génère desert_dune (petite dune en croissant, crête nette, 2 x 1 cases) dans decor.blend.
# Vent venant de +Y : pente douce au dos (+Y), face d'éboulement raide et sombre côté caméra (-Y),
# cornes du croissant qui avancent vers -Y.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_dune.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("sable"), cd.materiau("sable_fonce")]
DOS, FACE = range(2)
NOM = "desert_dune"
H = 0.42                   # hauteur de la crête au centre
NX, ND, NU = 16, 3, 5      # colonnes le long de X, rangs côté face raide, rangs côté dos
X0 = 0.98                  # demi-longueur (tient dans 2 cases)


def crete_y(x):            # la crête se courbe : centre en arrière, cornes vers l'avant
    return 0.18 - 0.52 * (x / X0) ** 2


def crete_h(x):
    return H * max(0.0, 1 - (abs(x) / X0) ** 2.2) ** 0.85


cd.nettoie(NOM)
bm = bmesh.new()
grille = []
for i in range(NX + 1):
    x = -X0 + 2 * X0 * i / NX
    yc, h = crete_y(x), crete_h(x)
    w_face = max(0.03, h * 0.62)                   # face raide (~58°)
    w_dos = 0.10 + 0.32 * (h / H) ** 0.7           # dos plus court vers les cornes : bord arrière en arc aussi
    col = []
    for j in range(ND + NU + 1):
        if j <= ND:                                # pied de la face raide -> crête (droite)
            t = j / ND
            y, z = yc - w_face * (1 - t), h * t
        else:                                      # crête -> pied du dos : départ en pente franche, crête vive
            t = (j - ND) / NU
            y, z = yc + w_dos * t, h * (1 - t) ** 0.8
        col.append(bm.verts.new((x, y, z)))
    grille.append(col)
for i in range(NX):
    for j in range(ND + NU):
        f = bm.faces.new((grille[i][j], grille[i + 1][j], grille[i + 1][j + 1], grille[i][j + 1]))
        f.material_index = FACE if j < ND else DOS
# dessous fermé (un seul polygone plat) : maillage fermé, normales recalculées vers l'extérieur
L = ND + NU
bord = [c[0] for c in grille] + [grille[-1][j] for j in range(1, L + 1)] + \
       [c[L] for c in reversed(grille[:-1])] + [grille[0][j] for j in range(L - 1, 0, -1)]
bm.faces.new(list(reversed(bord))).material_index = DOS
# origine au centre de la base
ys = [v.co.y for v in bm.verts]
dy = (min(ys) + max(ys)) / 2
for v in bm.verts:
    v.co.y -= dy
ob = cd.finir(decor, NOM, bm, MAT, (2, 1), 1, normales=False)   # faces déjà orientées vers le haut
cd.enregistrer_et_apercu([ob], "apercu_desert_dune.png", ortho=4.5, res=(800, 450), hauteur=0.2)
