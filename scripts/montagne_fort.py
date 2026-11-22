# Génère montagne_fort (fort de pierre grise 3 x 5 cases, murs épais enneigés, tour carrée à toit pentu,
# porte en bois vers -X, bannière bleue ; hauteur max 3) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_fort.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix, Vector
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("roche"), cm.materiau("roche_fonce"), cm.materiau("neige"), cm.materiau("neige_ombre"),
       cm.materiau("bois"), cm.materiau("ombre"), cm.materiau("toits"), cm.materiau("bleu"),
       cm.materiau("ombre_bleue")]
PIERRE, PIERRE_F, NEIGE, NEIGE_O, BOIS, OMBRE, TOIT, BLEU, OMBRE_B = range(9)
NOM = "montagne_fort"
HMAX = 3.0
bm = None
rnd = random.Random(NOM)


def boite(*a):
    return cm.boite(bm, *a)


def creneaux(a, b, ep, z, pas=0.32, larg=0.18, h=0.16):
    """Merlons de pierre, chacun coiffé d'un coussin de neige."""
    (xa, ya), (xb, yb) = a, b
    n = max(2, int(math.hypot(xb - xa, yb - ya) / pas) + 1)
    for i in range(n):
        t = i / (n - 1)
        cx, cy = xa + (xb - xa) * t, ya + (yb - ya) * t
        if abs(xb - xa) > abs(yb - ya):
            boite(cx - larg / 2, cy - ep / 2, z, cx + larg / 2, cy + ep / 2, z + h, PIERRE)
            boite(cx - larg / 2 - 0.01, cy - ep / 2 - 0.01, z + h, cx + larg / 2 + 0.01, cy + ep / 2 + 0.01, z + h + 0.04, NEIGE)
        else:
            boite(cx - ep / 2, cy - larg / 2, z, cx + ep / 2, cy + larg / 2, z + h, PIERRE)
            boite(cx - ep / 2 - 0.01, cy - larg / 2 - 0.01, z + h, cx + ep / 2 + 0.01, cy + larg / 2 + 0.01, z + h + 0.04, NEIGE)


def mur(a, b, ep, h):
    """Mur épais : pierre foncée, assise claire en bas, chemin de ronde enneigé, créneaux du côté extérieur."""
    (xa, ya), (xb, yb) = a, b
    if abs(xb - xa) > abs(yb - ya):
        x0, x1 = min(xa, xb), max(xa, xb)
        boite(x0, ya - ep / 2, 0, x1, ya + ep / 2, h, PIERRE_F)
        boite(x0, ya - ep / 2 - 0.02, 0, x1, ya + ep / 2 + 0.02, 0.22, PIERRE)           # soubassement
        boite(x0, ya - ep / 2, h, x1, ya + ep / 2, h + 0.05, NEIGE)
        cote = -1 if ya < 0 else 1
        creneaux((x0, ya + cote * (ep / 2 - 0.06)), (x1, ya + cote * (ep / 2 - 0.06)), 0.12, h + 0.05)
    else:
        y0, y1 = min(ya, yb), max(ya, yb)
        boite(xa - ep / 2, y0, 0, xa + ep / 2, y1, h, PIERRE_F)
        boite(xa - ep / 2 - 0.02, y0, 0, xa + ep / 2 + 0.02, y1, 0.22, PIERRE)
        boite(xa - ep / 2, y0, h, xa + ep / 2, y1, h + 0.05, NEIGE)
        cote = -1 if xa < 0 else 1
        creneaux((xa + cote * (ep / 2 - 0.06), y0), (xa + cote * (ep / 2 - 0.06), y1), 0.12, h + 0.05)


def banniere(face, pos, u0, u1, z_haut, long):
    """Bannière bleue à pointe en V contre une face verticale ("-X" : mur x = pos ; "-Y" : mur y = pos),
    hampe de bois, bande et motif de flocon en neige."""
    def P(u, n, z):
        return (pos - n, u, z) if face == "-X" else (u, pos - n, z)

    def plaque(pts, mat):
        av = [bm.verts.new(P(u, n + 0.012, z)) for u, n, z in pts]
        ar = [bm.verts.new(P(u, n - 0.012, z)) for u, n, z in pts]
        bm.faces.new(av).material_index = mat
        bm.faces.new(list(reversed(ar))).material_index = mat
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            bm.faces.new((av[j], av[i], ar[i], ar[j])).material_index = mat

    zb, um = z_haut - long, (u0 + u1) / 2
    plaque([(u0, 0.015, z_haut), (u0, 0.015, zb + 0.09), (um, 0.015, zb), (u1, 0.015, zb + 0.09), (u1, 0.015, z_haut)], BLEU)
    plaque([(u0 + 0.03, 0.03, z_haut - 0.07), (u0 + 0.03, 0.03, z_haut - 0.10),
            (u1 - 0.03, 0.03, z_haut - 0.10), (u1 - 0.03, 0.03, z_haut - 0.07)], NEIGE)
    zc, r = zb + long * 0.50, (u1 - u0) * 0.26
    for a in (0, math.pi / 3, 2 * math.pi / 3):                  # flocon : trois barres croisées
        ca, sa, e = math.cos(a), math.sin(a), 0.018
        plaque([(um + ca * r - sa * e, 0.03, zc + sa * r + ca * e), (um - ca * r - sa * e, 0.03, zc - sa * r + ca * e),
                (um - ca * r + sa * e, 0.03, zc - sa * r - ca * e), (um + ca * r + sa * e, 0.03, zc + sa * r - ca * e)], NEIGE)
    cm.cone(bm, P(u0 - 0.04, 0.04, z_haut), P(u1 + 0.04, 0.04, z_haut), 0.02, 0.02, 5, BOIS)


cm.nettoie(NOM)
bm = bmesh.new()

# --- enceinte : murs épais (0,36), même emprise que les châteaux (x de -1,38 à 1,31 ; y de -2,38 à 2,38)
EP, HM = 0.36, 1.00
XO, XE, YS, YN = -1.05, 1.31 - EP / 2, -2.20, 2.20
boite(XO, YS, 0, XE, YN, 0.02, NEIGE_O)                                                  # cour enneigée
mur((XO, YS), (XO, -0.62), EP, HM); mur((XO, 0.62), (XO, YN), EP, HM)
mur((XE, YS - EP / 2), (XE, YN + EP / 2), EP, HM)
mur((XO - EP / 2, YS), (XE, YS), EP, HM); mur((XO - EP / 2, YN), (XE, YN), EP, HM)
# congères contre le pied des murs, côté caméra et côté porte
for x, y, rx, ry in ((-0.2, YS - 0.20, 0.55, 0.14), (0.75, YS - 0.18, 0.35, 0.12), (XO - 0.22, 1.5, 0.12, 0.45)):
    cm.boule(bm, (x, y, 0), (rx, ry, 0.12), NEIGE, rnd, sub=1)

# --- châtelet de la porte (-X)
GX0, GX1, GY = -1.38, -0.78, 0.62
boite(GX0, -GY, 0, GX1, GY, 1.40, PIERRE)
boite(GX0 - 0.02, -GY - 0.02, 1.40, GX1 + 0.02, GY + 0.02, 1.45, NEIGE)
creneaux((GX0 + 0.08, -GY + 0.06), (GX0 + 0.08, GY - 0.06), 0.14, 1.45, pas=0.28)
DX = GX0 - 0.03
boite(DX - 0.005, -0.36, 0.0, GX0 + 0.01, 0.36, 0.72, PIERRE_F)                          # encadrement
boite(DX - 0.02, -0.27, 0.0, GX0 + 0.01, 0.27, 0.60, BOIS)                               # vantaux
arc = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.27, radius2=0.27, depth=0.05,
        matrix=Matrix.Translation((DX - 0.005, 0, 0.60)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
for f in {f for v in arc["verts"] for f in v.link_faces}: f.material_index = BOIS
for v in arc["verts"]: v.co.z = max(v.co.z, 0.60)
boite(DX - 0.035, -0.012, 0.0, DX - 0.015, 0.012, 0.85, OMBRE)                            # jointure des vantaux
for z in (0.18, 0.44):                                                                    # ferrures sombres
    boite(DX - 0.03, -0.25, z - 0.02, DX - 0.02, 0.25, z + 0.02, PIERRE_F)

# --- tour carrée au centre-arrière, toit pentu à quatre pans, bannière bleue face caméra
TX0, TX1, TY0, TY1, HT = -0.30, 0.70, -0.25, 0.75, 1.85
boite(TX0, TY0, 0, TX1, TY1, HT, PIERRE)
boite(TX0 - 0.03, TY0 - 0.03, 0.0, TX1 + 0.03, TY1 + 0.03, 0.30, PIERRE_F)               # base talutée
boite(TX0 - 0.04, TY0 - 0.04, HT - 0.10, TX1 + 0.04, TY1 + 0.04, HT, PIERRE_F)           # corniche
for x in (0.0, 0.40):                                                                     # fenêtres face -Y
    boite(x - 0.05, TY0 - 0.02, 1.20, x + 0.05, TY0 + 0.01, 1.48, OMBRE)
boite(TX0 - 0.02, 0.20, 1.20, TX0 + 0.01, 0.30, 1.48, OMBRE)                              # fenêtre face -X
# toit en pyramide débordante, neige sur le bas des pans
cx, cy, d = (TX0 + TX1) / 2, (TY0 + TY1) / 2, 0.66
sommet_z = HMAX - 0.30
base = [bm.verts.new((cx + sx * d, cy + sy * d, HT)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
mi = [bm.verts.new((cx + sx * d * 0.62, cy + sy * d * 0.62, HT + (sommet_z - HT) * 0.38))
      for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
pic = bm.verts.new((cx, cy, sommet_z))
for i in range(4):
    j = (i + 1) % 4
    bm.faces.new((base[i], base[j], mi[j], mi[i])).material_index = NEIGE
    bm.faces.new((mi[i], mi[j], pic)).material_index = TOIT
bm.faces.new(list(reversed(base))).material_index = PIERRE_F
# mât et petite flamme bleue au sommet (sous 3)
cm.cone(bm, (cx, cy, sommet_z - 0.02), (cx, cy, HMAX), 0.018, 0.014, 5, BOIS)
boite(cx, cy - 0.012, HMAX - 0.18, cx + 0.24, cy + 0.012, HMAX - 0.03, BLEU)
# bannière bleue sur la face caméra de la tour
banniere("-Y", TY0, cx - 0.12, cx + 0.12, 1.08, 0.70)

ob = cm.finir(decor, NOM, bm, MAT, (3, 5), 1)
assert ob.dimensions.z <= HMAX + 1e-3, f"{NOM} dépasse {HMAX} de haut"
cam = cm.enregistrer_et_apercu([ob], "apercu_montagne_fort.png", ortho=7.8, res=(900, 820), hauteur=1.3)
import bpy
d = Vector((0.542, 0.542, -0.643))
cam.location = Vector((ob.location.x, ob.location.y, 1.3)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(-45))
bpy.context.scene.render.filepath = os.path.join(cm.DOSSIER, "apercu_montagne_fort_porte.png")
bpy.ops.render.render(write_still=True)
