# Génère desert_entree_nord et desert_entree_sud : passages entre des falaises de grès (1 x 3 cases,
# ouverture vers +X) dans decor.blend. Nord : arche rocheuse au-dessus du passage. Sud : gorge ouverte.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_entrees.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("roche_rouge"), cd.materiau("gres_fonce"), cd.materiau("gres"), cd.materiau("sable"),
       cd.materiau("ombre"), cd.materiau("cactus"), cd.materiau("cactus_clair")]
ROUGE, FONCE, CLAIR, SABLE, OMBRE, CACTUS, CACTUS_C = range(7)
FLANCS = [FONCE, ROUGE, FONCE, ROUGE, FONCE, ROUGE]
X0, X1 = -0.49, 0.49
PASSAGE = 0.36                                   # demi-largeur du passage (le long de Y)


def dalle(bm, x0, x1, y0, y1, z0, z1, rnd, flanc, ch=0.08):
    """Dalle à 8 côtés (rectangle aux coins cassés, sommets un peu irréguliers), dessus plat clair."""
    j = lambda: rnd.uniform(-0.025, 0.025)
    pts = [(x0 + ch, y0), (x1 - ch, y0), (x1, y0 + ch), (x1, y1 - ch),
           (x1 - ch, y1), (x0 + ch, y1), (x0, y1 - ch), (x0, y0 + ch)]
    pts = [(x + j(), y + j()) for x, y in pts]
    bas = [bm.verts.new((x, y, z0)) for x, y in pts]
    haut = [bm.verts.new((x, y, z1)) for x, y in pts]
    n = len(pts)
    for i in range(n):
        k = (i + 1) % n
        bm.faces.new((bas[i], bas[k], haut[k], haut[i])).material_index = flanc
    bm.faces.new(haut).material_index = CLAIR
    bm.faces.new(list(reversed(bas))).material_index = flanc


def falaise(bm, y0, y1, couches, rnd, retrait=0.03, cote_passage=None):
    """Pile de dalles entre y0 et y1 ; chaque couche rentre un peu, surtout côté passage et côté +X."""
    z = 0.0
    for c, ep in enumerate(couches):
        r = retrait * c
        a0, a1 = y0 + r * 0.6, y1 - r * 0.6
        if cote_passage == "haut": a1 = y1 - r * 1.6        # bord tourné vers le passage : marches visibles
        if cote_passage == "bas": a0 = y0 + r * 1.6
        dalle(bm, X0 + r * 0.5, X1 - r * 1.4, a0, a1, z, z + ep, rnd, FLANCS[c % len(FLANCS)])
        z += ep
    return z


def fond_et_sol(bm, rnd, h_fond, x_fond=-0.05):
    """Fond sombre en retrait (le passage continue) et langue de sable qui sort vers +X."""
    cd.boite(bm, X0, -PASSAGE + 0.03, 0.0, x_fond, PASSAGE - 0.03, h_fond, OMBRE)
    cd.boule(bm, (0.30, 0, 0), (0.30, PASSAGE * 0.95, 0.035), SABLE, rnd, sub=1)


def nord(nom):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    falaise(bm, -1.49, -PASSAGE, [0.24, 0.20, 0.22, 0.18, 0.20, 0.16], rnd, cote_passage="haut")
    falaise(bm, PASSAGE, 1.49, [0.22, 0.22, 0.20, 0.20, 0.18], rnd, cote_passage="bas")
    # arche : deux dalles posées en travers du passage, à hauteur des falaises
    dalle(bm, X0 + 0.06, X1 - 0.16, -PASSAGE - 0.18, PASSAGE + 0.18, 0.80, 0.98, rnd, ROUGE)
    dalle(bm, X0 + 0.10, X1 - 0.22, -PASSAGE - 0.10, PASSAGE + 0.10, 0.98, 1.12, rnd, FONCE)
    fond_et_sol(bm, rnd, 0.79)
    # éboulis et cactus au pied, face caméra
    for x, y, r in ((0.32, -1.52, 0.10), (-0.18, -1.55, 0.07), (0.40, PASSAGE + 0.10, 0.08)):
        cd.boule(bm, (x, y, 0.03), (r, r * 0.9, r * 0.7), FONCE, rnd, sub=1)
    cd.cone(bm, (0.30, 1.30, 1.18), (0.30, 1.30, 1.40), 0.05, 0.045, 6, CACTUS)   # petit cactus sur le plateau
    cd.cone(bm, (0.30, 1.30, 1.40), (0.30, 1.30, 1.45), 0.045, 0.02, 6, CACTUS_C)
    return cd.finir(decor, nom, bm, MAT, (1, 3), 1)


def sud(nom):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    # gorge ouverte : falaise haute en gradins côté -Y, plus basse côté +Y
    falaise(bm, -1.49, -PASSAGE, [0.26, 0.24, 0.22, 0.24, 0.22, 0.20, 0.18], rnd, retrait=0.03, cote_passage="haut")
    falaise(bm, PASSAGE, 1.49, [0.24, 0.22, 0.20, 0.18], rnd, retrait=0.03, cote_passage="bas")
    # piton isolé au bout, côté +Y, pour casser la silhouette
    falaise(bm, 0.95, 1.40, [0.18, 0.18, 0.16], rnd)
    # fond : ombre basse tout au bout, coiffée d'un muret de grès (la gorge tourne derrière)
    fond_et_sol(bm, rnd, 0.42, x_fond=-0.28)
    dalle(bm, X0, -0.22, -PASSAGE - 0.05, PASSAGE + 0.05, 0.42, 0.66, rnd, FONCE, ch=0.05)
    dalle(bm, X0, -0.26, -PASSAGE - 0.05, PASSAGE + 0.05, 0.66, 0.84, rnd, ROUGE, ch=0.05)
    # rochers tombés à l'entrée de la gorge
    for x, y, r in ((0.30, -PASSAGE + 0.06, 0.10), (0.38, PASSAGE - 0.04, 0.07), (0.20, -1.52, 0.08)):
        cd.boule(bm, (x, y, 0.03), (r, r * 0.9, r * 0.7), ROUGE, rnd, sub=1)
    # touffe de cactus au pied de la grande falaise
    for dx, h in ((0.0, 0.26), (0.08, 0.18)):
        cd.cone(bm, (0.36 + dx, -1.0, 0), (0.36 + dx, -1.0, h), 0.05, 0.045, 6, CACTUS)
        cd.cone(bm, (0.36 + dx, -1.0, h), (0.36 + dx, -1.0, h + 0.05), 0.045, 0.02, 6, CACTUS_C)
    return cd.finir(decor, nom, bm, MAT, (1, 3), 1)


objs = [nord("desert_entree_nord"), sud("desert_entree_sud")]
cam = cd.enregistrer_et_apercu(objs, "apercu_desert_entrees.png", ortho=6.5, res=(900, 600), hauteur=0.6)
# seconde vue côté ouverture (+X)
import bpy
d = Vector((-0.542, 0.542, -0.643))
cx = sum(o.location.x for o in objs) / 2
cam.location = Vector((cx, cd.LIGNE_Y, 0.6)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(45))
cam.data.ortho_scale = 7.0
bpy.context.scene.render.filepath = os.path.join(cd.DOSSIER, "apercu_desert_entrees_ouverture.png")
bpy.ops.render.render(write_still=True)
