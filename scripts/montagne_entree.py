# Génère montagne_entree (col entre deux falaises enneigées, 1 x 3 cases, passage vers +X) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_entree.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("roche"), cm.materiau("roche_fonce"), cm.materiau("neige"), cm.materiau("neige_ombre"),
       cm.materiau("ombre"), cm.materiau("glace"), cm.materiau("ombre_bleue")]
ROCHE, ROCHE_F, NEIGE, NEIGE_O, OMBRE, GLACE, OMBRE_B = range(7)
NOM = "montagne_entree"
X0, X1 = -0.49, 0.49
PASSAGE = 0.36


def bloc(bm, x0, x1, y0, y1, z0, z1, rnd, flanc, dessus=NEIGE, ch=0.09, jit=0.05):
    """Bloc de roche à 8 côtés aux arêtes cassées ; dessus plat (neige par défaut)."""
    j = lambda: rnd.uniform(-jit, jit)
    pts = [(x0 + ch, y0), (x1 - ch, y0), (x1, y0 + ch), (x1, y1 - ch),
           (x1 - ch, y1), (x0 + ch, y1), (x0, y1 - ch), (x0, y0 + ch)]
    pts = [(x + j(), y + j()) for x, y in pts]
    bas = [bm.verts.new((x, y, z0)) for x, y in pts]
    haut = [bm.verts.new((x * 0.97 + rnd.uniform(-0.02, 0.02), y, z1 + rnd.uniform(-0.04, 0.04))) for x, y in pts]
    n = len(pts)
    for i in range(n):
        k = (i + 1) % n
        bm.faces.new((bas[i], bas[k], haut[k], haut[i])).material_index = flanc
    bm.faces.new(haut).material_index = dessus
    bm.faces.new(list(reversed(bas))).material_index = flanc
    return haut


def falaise(bm, y0, y1, etages, rnd, cote):
    """Falaise : blocs empilés qui rentrent vers le passage, corniche de neige au sommet."""
    z = 0.0
    for c, ep in enumerate(etages):
        r = 0.05 * c
        a0 = y0 + (r * 1.8 if cote == "bas" else r * 0.5)
        a1 = y1 - (r * 1.8 if cote == "haut" else r * 0.5)
        dessus = NEIGE if c == len(etages) - 1 else NEIGE_O       # replats enneigés à chaque ressaut
        bloc(bm, X0 + r * 0.4, X1 - r * 1.2, a0, a1, z, z + ep, rnd, ROCHE if c % 2 else ROCHE_F, dessus)
        z += ep
    # coussin de neige qui déborde du sommet
    bloc(bm, X0 + 0.02, X1 - 0.12, a0 - 0.03, a1 + 0.03, z, z + 0.07, rnd, NEIGE, NEIGE, ch=0.12, jit=0.03)
    return z, a0, a1


cm.nettoie(NOM)
rnd = random.Random(NOM)
bm = bmesh.new()
zs, _, bord_s = falaise(bm, -1.49, -PASSAGE, [0.42, 0.40, 0.36, 0.30], rnd, "haut")
zn, bord_n, _ = falaise(bm, PASSAGE, 1.49, [0.40, 0.36, 0.32], rnd, "bas")
# fond du col : ombre basse au bout, surmontée d'un ressaut de roche enneigé (le col tourne derrière)
cm.boite(bm, X0, -PASSAGE + 0.03, 0.0, -0.28, PASSAGE - 0.03, 0.40, OMBRE)
bloc(bm, X0, -0.22, -PASSAGE - 0.06, PASSAGE + 0.06, 0.40, 0.70, rnd, ROCHE_F, NEIGE, ch=0.05, jit=0.02)
# neige piétinée qui sort du col vers +X
cm.boule(bm, (0.30, 0, 0), (0.30, PASSAGE * 0.95, 0.04), NEIGE_O, rnd, sub=1)
# stalactites de glace sous la corniche, côté passage et côté +X
for y, z in ((bord_s - 0.02, zs), (bord_n + 0.02, zn)):
    for x in (0.10, 0.25):
        cm.cone(bm, (x, y, z + 0.01), (x, y, z - 0.18 - rnd.uniform(0, 0.08)), 0.03, 0.0, 4, GLACE)
# blocs tombés et neige au pied, face caméra
for x, y, r in ((0.28, -1.52, 0.10), (-0.15, -1.55, 0.08)):
    cm.boule(bm, (x, y, 0.03), (r, r * 0.9, r * 0.7), ROCHE_F, rnd, sub=1, jit=(0.85, 1.12))
cm.boule(bm, (0.05, -1.50, 0), (0.40, 0.12, 0.10), NEIGE, rnd, sub=1)

ob = cm.finir(decor, NOM, bm, MAT, (1, 3), 1)
cam = cm.enregistrer_et_apercu([ob], "apercu_montagne_entree.png", ortho=5.0, res=(700, 600), hauteur=0.7)
import bpy
d = Vector((-0.542, 0.542, -0.643))
cam.location = Vector((ob.location.x, ob.location.y, 0.7)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(45))
bpy.context.scene.render.filepath = os.path.join(cm.DOSSIER, "apercu_montagne_entree_ouverture.png")
bpy.ops.render.render(write_still=True)
