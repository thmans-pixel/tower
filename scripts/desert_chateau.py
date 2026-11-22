# Génère desert_chateau (forteresse de grès à coupoles, 3 x 5 cases, porte vers -X) dans decor.blend.
# Même emprise et même porte que prairie_chateau.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_chateau.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix, Vector
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("gres"), cd.materiau("gres_fonce"), cd.materiau("sable"), cd.materiau("eau"),
       cd.materiau("tronc_palmier"), cd.materiau("ombre"), cd.materiau("sable_fonce"), cd.materiau("roche_rouge"),
       cd.materiau("palmes")]
GRES, GRES_F, SABLE, COUPOLE, BOIS, OMBRE, COUR, ROUGE, PALME = range(9)
NOM = "desert_chateau"
boite = lambda *a: cd.boite(bm, *a)


def coupole(c, r, mat, seg=10):
    """Demi-sphère (dôme) posée en c, terminée par une petite pointe."""
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=6, radius=r, matrix=Matrix.Translation(c))
    bas = [v for v in res["verts"] if v.co.z < c[2] - 1e-4]
    bmesh.ops.delete(bm, geom=bas, context="VERTS")
    for f in {f for v in res["verts"] if v.is_valid for f in v.link_faces}: f.material_index = mat
    cd.cone(bm, (c[0], c[1], c[2] + r * 0.95), (c[0], c[1], c[2] + r * 1.35), r * 0.12, 0.0, 6, SABLE)


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
    (xa, ya), (xb, yb) = a, b
    if abs(xb - xa) > abs(yb - ya):
        boite(min(xa, xb), ya - ep / 2, 0, max(xa, xb), ya + ep / 2, h, GRES_F)
        boite(min(xa, xb), ya - ep / 2 - 0.01, h * 0.55, max(xa, xb), ya + ep / 2 + 0.01, h * 0.65, ROUGE)
    else:
        boite(xa - ep / 2, min(ya, yb), 0, xa + ep / 2, max(ya, yb), h, GRES_F)
        boite(xa - ep / 2 - 0.01, min(ya, yb), h * 0.55, xa + ep / 2 + 0.01, max(ya, yb), h * 0.65, ROUGE)
    creneaux(a, b, ep, h, SABLE)


cd.nettoie(NOM)
bm = bmesh.new()
EP, HM = 0.28, 1.05
XO, XE, YS, YN = -1.05, 1.31, -2.20, 2.20
boite(XO, YS, 0, XE, YN, 0.02, COUR)
mur((XO, YS), (XO, -0.55), EP, HM); mur((XO, 0.55), (XO, YN), EP, HM)
mur((XE, YS - EP / 2 + 0.01), (XE, YN + EP / 2 - 0.01), EP, HM)
mur((XO, YS), (XE, YS), EP, HM); mur((XO, YN), (XE, YN), EP, HM)

# porche côté -X : massif de grès, arc outrepassé sombre et vantaux en bois de palmier
GX0, GX1, GY = -1.38, -0.80, 0.58
boite(GX0, -GY, 0, GX1, GY, 1.45, GRES)
creneaux((GX0 + 0.08, -GY + 0.08), (GX0 + 0.08, GY - 0.08), 0.16, 1.45, SABLE, pas=0.26)
creneaux((GX1 - 0.08, -GY + 0.08), (GX1 - 0.08, GY - 0.08), 0.16, 1.45, SABLE, pas=0.26)
DX = GX0 - 0.03
boite(DX - 0.01, -0.36, 0.0, GX0 + 0.01, 0.36, 0.72, GRES_F)            # encadrement
boite(DX - 0.02, -0.28, 0.0, GX0 + 0.01, 0.28, 0.62, BOIS)             # vantaux
arc = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.28, radius2=0.28, depth=0.05,
        matrix=Matrix.Translation((DX - 0.005, 0, 0.62)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
for f in {f for v in arc["verts"] for f in v.link_faces}: f.material_index = OMBRE
for v in arc["verts"]: v.co.z = max(v.co.z, 0.62)
boite(DX - 0.035, -0.012, 0.0, DX - 0.015, 0.012, 0.62, OMBRE)         # jointure des vantaux

# palais central carré et sa grande coupole bleue
DX0, DX1, DY0, DY1, HD = -0.45, 0.85, -0.70, 0.70, 1.75
boite(DX0, DY0, 0, DX1, DY1, HD, GRES)
boite(DX0 - 0.03, DY0 - 0.03, HD - 0.10, DX1 + 0.03, DY1 + 0.03, HD, SABLE)          # corniche
cx, cy = (DX0 + DX1) / 2, 0.0
cd.cone(bm, (cx, cy, HD), (cx, cy, HD + 0.20), 0.52, 0.52, 10, GRES_F)                # tambour
coupole((cx, cy, HD + 0.20), 0.52, COUPOLE)
# fenêtres en arc (sombres) sur les faces -Y et -X
for x in (-0.10, 0.20, 0.50):
    boite(x - 0.06, DY0 - 0.02, 0.95, x + 0.06, DY0 + 0.01, 1.30, OMBRE)
boite(DX0 - 0.02, -0.06, 0.95, DX0 + 0.01, 0.06, 1.30, OMBRE)

# quatre tours rondes aux coins, coiffées de petites coupoles bleues
RT, HT = 0.36, 1.65
for tx, ty in ((-1.10, -2.10), (-1.10, 2.10), (1.31, -2.10), (1.31, 2.10)):
    h = HT if tx < 0 else HT - 0.20
    cd.cone(bm, (tx, ty, 0.0), (tx, ty, h), RT, RT * 0.92, 10, GRES)
    cd.cone(bm, (tx, ty, h * 0.55), (tx, ty, h * 0.62), RT * 0.97, RT * 0.97, 10, ROUGE)
    cd.cone(bm, (tx, ty, h), (tx, ty, h + 0.08), RT + 0.04, RT + 0.04, 10, SABLE)
    coupole((tx, ty, h + 0.08), RT * 0.85, COUPOLE, seg=8)
    boite(tx - 0.05, ty - RT - 0.01, h * 0.70, tx + 0.05, ty - RT + 0.04, h * 0.88, OMBRE)

# un palmier dans la cour, entre palais et mur nord
p0, p1 = Vector((0.30, 1.45, 0.02)), Vector((0.36, 1.40, 1.35))
cd.cone(bm, p0, p1, 0.08, 0.06, 7, BOIS)
for k in range(6):
    az = 2 * math.pi * k / 6
    tip = p1 + Vector((0.45 * math.cos(az), 0.45 * math.sin(az), -0.22))
    mid = p1 + Vector((0.22 * math.cos(az), 0.22 * math.sin(az), 0.08))
    cd.cone(bm, p1, mid, 0.09, 0.07, 4, PALME)
    cd.cone(bm, mid, tip, 0.07, 0.0, 4, PALME)

ob = cd.finir(decor, NOM, bm, MAT, (3, 5), 1)
cam = cd.enregistrer_et_apercu([ob], "apercu_desert_chateau.png", ortho=7.5, res=(900, 800), hauteur=1.2)
# seconde vue côté porte (-X)
import bpy
d = Vector((0.542, 0.542, -0.643))
cam.location = Vector((ob.location.x, ob.location.y, 1.2)) - d * 15
cam.rotation_euler = (math.radians(50), 0, math.radians(-45))
bpy.context.scene.render.filepath = os.path.join(cd.DOSSIER, "apercu_desert_chateau_porte.png")
bpy.ops.render.render(write_still=True)
