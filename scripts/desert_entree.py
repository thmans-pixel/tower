# Génère desert_entree (arche de grès en strates, 1 x 3 cases, ouverture vers +X) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_entree.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("gres"), cd.materiau("gres_fonce"), cd.materiau("roche_rouge"), cd.materiau("sable"),
       cd.materiau("ombre"), cd.materiau("cactus")]
GRES, GRES_F, ROUGE, SABLE, OMBRE, CACTUS = range(6)
NOM = "desert_entree"
HAUT = 1.45
OUV_Y, OUV_Z = 0.40, 0.78                    # demi-largeur et hauteur de l'ouverture

cd.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()

# strates empilées, chacune un peu en retrait : (z bas, z haut, matériau, retrait)
STRATES = [(0.00, 0.30, GRES_F, 0.00), (0.30, 0.42, ROUGE, 0.03), (0.42, 0.78, GRES, 0.02),
           (0.78, 0.92, ROUGE, 0.05), (0.92, 1.25, GRES_F, 0.06), (1.25, HAUT, GRES, 0.10)]


def bloc(y0, y1, z0, z1, mat, r):
    vs = cd.boite(bm, -0.49 + r, y0 + r, z0, 0.49 - r, y1 - r, z1, mat)
    for v in vs:                                 # arêtes un peu irrégulières
        v.co.x += rnd.uniform(-0.03, 0.03); v.co.y += rnd.uniform(-0.03, 0.03)


for z0, z1, m, r in STRATES:
    if z1 <= OUV_Z:                              # sous l'arche : deux piliers de part et d'autre
        bloc(-1.49, -OUV_Y, z0, z1, m, r)
        bloc(OUV_Y, 1.49, z0, z1, m, r)
    else:                                        # au-dessus : une seule dalle sur toute la longueur
        bloc(-1.49, 1.49, z0, z1, m, r)
# fond sombre du passage, en retrait derrière l'ouverture (vu depuis +X)
cd.boite(bm, -0.30, -OUV_Y + 0.02, 0.0, 0.20, OUV_Y - 0.02, OUV_Z - 0.01, OMBRE)
# sol de sable qui sort du passage
cd.boule(bm, (0.40, 0, 0), (0.22, 0.42, 0.04), SABLE, rnd, sub=1)
# éboulis et petit cactus au pied, face caméra (-Y)
for x, y, r in ((0.25, -1.50, 0.10), (-0.20, -1.52, 0.07), (0.38, 1.45, 0.09)):
    cd.boule(bm, (x, y, 0.03), (r, r * 0.9, r * 0.75), GRES_F, rnd, sub=1)
cd.cone(bm, (-0.30, 1.48, 0), (-0.30, 1.48, 0.28), 0.06, 0.05, 6, CACTUS)
cd.cone(bm, (-0.30, 1.48, 0.28), (-0.30, 1.48, 0.33), 0.05, 0.02, 6, CACTUS)

ob = cd.finir(decor, NOM, bm, MAT, (1, 3), 1)
cam = cd.enregistrer_et_apercu([ob], "apercu_desert_entree.png", ortho=5.0, res=(700, 600), hauteur=0.6)
# seconde vue côté ouverture (+X)
import bpy
from mathutils import Vector
d = Vector((-0.542, 0.542, -0.643))
cam.location = Vector((ob.location.x, ob.location.y, 0.6)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(45))
bpy.context.scene.render.filepath = os.path.join(cd.DOSSIER, "apercu_desert_entree_ouverture.png")
bpy.ops.render.render(write_still=True)
