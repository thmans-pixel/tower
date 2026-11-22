# Génère desert_forteresse (forteresse de grès 3 x 5 cases, murs crénelés, deux tours rondes à coupoles,
# porte en bois vers -X, bannières rouge et or ; hauteur max 3) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_forteresse.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math
from mathutils import Matrix, Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("gres"), cd.materiau("gres_fonce"), cd.materiau("sable"), cd.materiau("sable_fonce"),
       cd.materiau("tronc_palmier"), cd.materiau("ombre"), cd.materiau("rouge_royal"), cd.materiau("or"),
       cd.materiau("roche_rouge")]
GRES, GRES_F, SABLE, COUR, BOIS, OMBRE, ROUGE, OR, BANDE = range(9)
NOM = "desert_forteresse"
HMAX = 3.0
bm = None


def boite(*a):
    return cd.boite(bm, *a)


def coupole(c, r, mat, seg=10):
    """Dôme : demi-sphère posée en c, avec un épi doré."""
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=6, radius=r, matrix=Matrix.Translation(c))
    bmesh.ops.delete(bm, geom=[v for v in res["verts"] if v.co.z < c[2] - 1e-4], context="VERTS")
    for f in {f for v in res["verts"] if v.is_valid for f in v.link_faces}: f.material_index = mat
    cd.cone(bm, (c[0], c[1], c[2] + r * 0.95), (c[0], c[1], c[2] + r * 1.30), r * 0.10, 0.0, 6, OR)


def creneaux(a, b, ep, z, mat, pas=0.30, larg=0.16, h=0.16):
    (xa, ya), (xb, yb) = a, b
    n = max(2, int(math.hypot(xb - xa, yb - ya) / pas) + 1)
    for i in range(n):
        t = i / (n - 1)
        cx, cy = xa + (xb - xa) * t, ya + (yb - ya) * t
        if abs(xb - xa) > abs(yb - ya):
            boite(cx - larg / 2, cy - ep / 2, z, cx + larg / 2, cy + ep / 2, z + h, mat)
        else:
            boite(cx - ep / 2, cy - larg / 2, z, cx + ep / 2, cy + larg / 2, z + h, mat)


def mur(a, b, ep, h):
    """Mur de grès foncé, bande de grès rouge à mi-hauteur, créneaux clairs."""
    (xa, ya), (xb, yb) = a, b
    if abs(xb - xa) > abs(yb - ya):
        boite(min(xa, xb), ya - ep / 2, 0, max(xa, xb), ya + ep / 2, h, GRES_F)
        boite(min(xa, xb), ya - ep / 2 - 0.01, h * 0.55, max(xa, xb), ya + ep / 2 + 0.01, h * 0.63, BANDE)
    else:
        boite(xa - ep / 2, min(ya, yb), 0, xa + ep / 2, max(ya, yb), h, GRES_F)
        boite(xa - ep / 2 - 0.01, min(ya, yb), h * 0.55, xa + ep / 2 + 0.01, max(ya, yb), h * 0.63, BANDE)
    creneaux(a, b, ep, h, SABLE)


def banniere(face, pos, u0, u1, z_haut, long):
    """Bannière suspendue contre une face verticale : drap rouge à pointe en V, hampe, bande et losange dorés.
    face = "-X" (mur à x = pos, largeur le long de Y) ou "-Y" (mur à y = pos, largeur le long de X)."""
    def P(u, n, z):                     # u : le long du mur ; n : décollement vers l'extérieur (vers -X ou -Y)
        return (pos - n, u, z) if face == "-X" else (u, pos - n, z)

    def plaque(pts, mat):               # quadrilatère ou triangle épaissi : faces avant / arrière / tranches
        av = [bm.verts.new(P(u, n + 0.012, z)) for u, n, z in pts]
        ar = [bm.verts.new(P(u, n - 0.012, z)) for u, n, z in pts]
        bm.faces.new(av).material_index = mat
        bm.faces.new(list(reversed(ar))).material_index = mat
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            bm.faces.new((av[j], av[i], ar[i], ar[j])).material_index = mat

    zb = z_haut - long
    um = (u0 + u1) / 2
    plaque([(u0, 0.015, z_haut), (u0, 0.015, zb + 0.08), (um, 0.015, zb), (u1, 0.015, zb + 0.08), (u1, 0.015, z_haut)], ROUGE)
    plaque([(u0 + 0.03, 0.03, z_haut - 0.07), (u0 + 0.03, 0.03, z_haut - 0.10),
            (u1 - 0.03, 0.03, z_haut - 0.10), (u1 - 0.03, 0.03, z_haut - 0.07)], OR)
    r = (u1 - u0) * 0.24
    zc = zb + long * 0.48
    plaque([(um, 0.03, zc + r * 1.3), (um - r, 0.03, zc), (um, 0.03, zc - r * 1.3), (um + r, 0.03, zc)], OR)
    cd.cone(bm, P(u0 - 0.04, 0.04, z_haut), P(u1 + 0.04, 0.04, z_haut), 0.02, 0.02, 5, OR)     # hampe


def drapeau(x, y, z0, z1):
    """Mât doré et oriflamme rouge à bande or, flottant vers +X (lisible de face)."""
    cd.cone(bm, (x, y, z0), (x, y, z1), 0.018, 0.014, 5, OR)
    boite(x, y - 0.012, z1 - 0.20, x + 0.30, y + 0.012, z1 - 0.02, ROUGE)
    boite(x + 0.002, y - 0.014, z1 - 0.13, x + 0.302, y + 0.014, z1 - 0.09, OR)


cd.nettoie(NOM)
bm = bmesh.new()

# --- enceinte (même emprise que les châteaux : x de -1,38 à 1,31, y de -2,34 à 2,34)
EP, HM = 0.28, 1.05
XO, XE, YS, YN = -1.05, 1.31 - EP / 2, -2.20, 2.20
boite(XO, YS, 0, XE, YN, 0.02, COUR)
mur((XO, YS), (XO, -0.60), EP, HM); mur((XO, 0.60), (XO, YN), EP, HM)
mur((XE, YS - EP / 2 + 0.01), (XE, YN + EP / 2 - 0.01), EP, HM)
mur((XO, YS), (XE, YS), EP, HM); mur((XO, YN), (XE, YN), EP, HM)

# bannières sur le mur sud, face caméra (-Y)
for u in (-0.15, 0.65):
    banniere("-Y", YS - EP / 2, u - 0.09, u + 0.09, 0.95, 0.62)

# --- châtelet de la porte (-X), grande porte en bois en arc
GX0, GX1, GY = -1.38, -0.80, 0.60
boite(GX0, -GY, 0, GX1, GY, 1.50, GRES)
boite(GX0 - 0.02, -GY - 0.02, 1.38, GX1 + 0.02, GY + 0.02, 1.50, SABLE)                 # corniche
creneaux((GX0 + 0.08, -GY + 0.08), (GX0 + 0.08, GY - 0.08), 0.16, 1.50, SABLE, pas=0.26)
creneaux((GX1 - 0.08, -GY + 0.08), (GX1 - 0.08, GY - 0.08), 0.16, 1.50, SABLE, pas=0.26)
DX = GX0 - 0.03
boite(DX - 0.005, -0.36, 0.0, GX0 + 0.01, 0.36, 0.70, GRES_F)                             # encadrement
boite(DX - 0.02, -0.28, 0.0, GX0 + 0.01, 0.28, 0.60, BOIS)                               # vantaux
arc = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.28, radius2=0.28, depth=0.05,
        matrix=Matrix.Translation((DX - 0.005, 0, 0.60)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
for f in {f for v in arc["verts"] for f in v.link_faces}: f.material_index = BOIS
for v in arc["verts"]: v.co.z = max(v.co.z, 0.60)
boite(DX - 0.035, -0.012, 0.0, DX - 0.015, 0.012, 0.86, OMBRE)                            # jointure des vantaux
for z in (0.18, 0.42):                                                                    # pentures dorées
    boite(DX - 0.03, -0.26, z - 0.02, DX - 0.02, 0.26, z + 0.02, OR)
# deux bannières de part et d'autre de la porte
banniere("-X", GX0, -0.56, -0.40, 1.30, 0.80)
banniere("-X", GX0, 0.40, 0.56, 1.30, 0.80)

# --- donjon carré au centre, toit plat crénelé, bannière sur la face -X
DX0, DX1, DY0, DY1, HD = -0.40, 0.80, -0.70, 0.70, 1.95
boite(DX0, DY0, 0, DX1, DY1, HD, GRES)
boite(DX0 - 0.03, DY0 - 0.03, HD - 0.10, DX1 + 0.03, DY1 + 0.03, HD, SABLE)
for a, b in (((DX0, DY0 + 0.06), (DX1, DY0 + 0.06)), ((DX0, DY1 - 0.06), (DX1, DY1 - 0.06))):
    creneaux(a, b, 0.14, HD, SABLE, pas=0.27, larg=0.17, h=0.18)
for a, b in (((DX0 + 0.06, DY0 + 0.25), (DX0 + 0.06, DY1 - 0.25)), ((DX1 - 0.06, DY0 + 0.25), (DX1 - 0.06, DY1 - 0.25))):
    creneaux(a, b, 0.14, HD, SABLE, pas=0.27, larg=0.17, h=0.18)
for x in (-0.05, 0.45):                                                                   # fenêtres face -Y
    boite(x - 0.06, DY0 - 0.02, 1.10, x + 0.06, DY0 + 0.01, 1.45, OMBRE)
banniere("-X", DX0, -0.12, 0.12, 1.80, 0.75)
banniere("-Y", DY0, 0.12, 0.30, 1.85, 0.80)                                               # face caméra du donjon
drapeau(0.20, 0.0, HD, 2.70)

# --- deux tours rondes aux coins côté porte, coupoles dorées et oriflammes
RT, HT = 0.40, 1.95
for ty in (-2.05, 2.05):
    tx = -1.05
    cd.cone(bm, (tx, ty, 0.0), (tx, ty, HT), RT, RT * 0.92, 12, GRES)
    cd.cone(bm, (tx, ty, HT * 0.55), (tx, ty, HT * 0.62), RT * 0.97, RT * 0.95, 12, BANDE)
    cd.cone(bm, (tx, ty, HT), (tx, ty, HT + 0.10), RT + 0.04, RT + 0.04, 12, SABLE)       # chemin de ronde
    coupole((tx, ty, HT + 0.10), RT * 0.85, OR, seg=12)
    boite(tx - 0.05, ty - RT - 0.01, 1.30, tx + 0.05, ty - RT + 0.04, 1.55, OMBRE)        # archère face -Y
    boite(tx - RT - 0.01, ty - 0.05, 1.30, tx - RT + 0.04, ty + 0.05, 1.55, OMBRE)        # archère face -X
    drapeau(tx, ty, HT + 0.10 + RT * 0.85 * 1.25, HMAX)

ob = cd.finir(decor, NOM, bm, MAT, (3, 5), 1)
assert ob.dimensions.z <= HMAX + 1e-3, f"{NOM} dépasse {HMAX} de haut"
cam = cd.enregistrer_et_apercu([ob], "apercu_desert_forteresse.png", ortho=7.8, res=(900, 820), hauteur=1.3)
# seconde vue côté porte (-X)
import bpy
d = Vector((0.542, 0.542, -0.643))
cam.location = Vector((ob.location.x, ob.location.y, 1.3)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(-45))
bpy.context.scene.render.filepath = os.path.join(cd.DOSSIER, "apercu_desert_forteresse_porte.png")
bpy.ops.render.render(write_still=True)
