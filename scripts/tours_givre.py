# Génère tour_givre_1/2/3 dans decor.blend (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_givre.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix, Vector
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 16.0
ZN = 0.28            # dessus de la couche de neige


def cristal(bm, base, r, h, seg, mat, tilt=0.0, az=0.0, flottant=False, alt=None, rot=0.0):
    """Cristal à facettes : prisme effilé (ou bipyramide si flottant), penché de `tilt` vers l'azimut `az`.
    alt : second matériau pour une facette sur deux."""
    M = (Matrix.Translation(base) @ Matrix.Rotation(az, 4, "Z") @ Matrix.Rotation(tilt, 4, "Y")
         @ Matrix.Rotation(rot, 4, "Z"))
    def ring(z, rr):
        return [bm.verts.new(M @ Vector((rr * math.cos(2 * math.pi * i / seg), rr * math.sin(2 * math.pi * i / seg), z)))
                for i in range(seg)]
    faces = []
    if flottant:
        bas = bm.verts.new(M @ Vector((0, 0, 0)))
        r1, r2 = ring(h * 0.30, r), ring(h * 0.62, r * 0.85)
        for i in range(seg):
            faces.append(bm.faces.new((r1[(i + 1) % seg], r1[i], bas)))
    else:
        r1, r2 = ring(0.0, r * 0.80), ring(h * 0.66, r)
        faces.append(bm.faces.new(list(reversed(r1))))
    top = bm.verts.new(M @ Vector((0, 0, h)))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append(bm.faces.new((r1[i], r1[j], r2[j], r2[i])))
        faces.append(bm.faces.new((r2[i], r2[j], top)))
    for k, f in enumerate(faces):
        f.material_index = ct.M[alt if (alt and (k // 2) % 2) else mat]


def neige(bm, rnd, givre=False):
    ct.boite(bm, -0.435, -0.435, 0.25, 0.435, 0.435, ZN, "neige")
    for x, y, r in ((-0.22, -0.20, 0.17), (0.24, -0.18, 0.15), (0.20, 0.24, 0.17), (-0.24, 0.22, 0.15), (0.0, -0.30, 0.12)):
        ct.boule(bm, (x, y, ZN - 0.01), (r, r * 0.9, r * 0.28), "neige")
    # coulures de neige sur les flancs du socle
    for k in range(10 if givre else 6):
        cote = k % 4
        t = rnd.uniform(-0.32, 0.32); w = rnd.uniform(0.07, 0.14); z0 = rnd.uniform(0.14, 0.19)
        if cote == 0: ct.boite(bm, t - w / 2, -0.448, z0, t + w / 2, -0.425, 0.26, "neige")
        if cote == 1: ct.boite(bm, 0.425, t - w / 2, z0, 0.448, t + w / 2, 0.26, "neige")
        if cote == 2: ct.boite(bm, t - w / 2, 0.425, z0, t + w / 2, 0.448, 0.26, "neige")
        if cote == 3: ct.boite(bm, -0.448, t - w / 2, z0, -0.425, t + w / 2, 0.26, "neige")
    if givre:   # pointes de givre aux quatre coins du socle
        for sx in (-1, 1):
            for sy in (-1, 1):
                az = math.atan2(sy, sx)
                for d, hh in ((0.0, 0.16), (0.5, 0.11)):
                    cristal(bm, (sx * 0.36, sy * 0.36, ZN - 0.02), 0.035, hh, 4, "eclat", tilt=0.45, az=az + d, rot=0.3)


def tour(n):
    rnd = random.Random(f"givre{n}")
    bm = bmesh.new()
    ct.socle(bm)
    neige(bm, rnd, givre=(n == 3))
    if n == 1:
        cristal(bm, (0, 0, ZN - 0.02), 0.13, 1.30 - ZN + 0.02, 6, "glace", tilt=0.05, az=0.4)
        for x, az in ((-0.17, math.pi), (0.17, 0.0)):
            cristal(bm, (x, -0.04, ZN - 0.02), 0.065, 0.36, 6, "eclat", tilt=0.42, az=az + 0.2, rot=0.4)
    elif n == 2:
        # anneau de pierre gravé (runes bleu glace)
        ct.cylindre(bm, 0, 0, ZN - 0.02, 0.40, 0.29, 0.27, 8, "pierre", math.pi / 8)
        ct.cylindre(bm, 0, 0, 0.38, 0.42, 0.28, 0.28, 8, "pierre_claire", math.pi / 8)
        for i in range(8):
            a = 2 * math.pi * i / 8
            ct.pave(bm, (0.275 * math.cos(a), 0.275 * math.sin(a), 0.33), (0.02, 0.07 if i % 2 else 0.04, 0.06 if i % 2 else 0.09), a, "eclat")
        cristal(bm, (0, 0, 0.40), 0.14, 1.10, 6, "glace", tilt=0.04, az=-0.6)
        for i in range(4):
            az = math.pi / 4 + i * math.pi / 2
            cristal(bm, (0.17 * math.cos(az), 0.17 * math.sin(az), 0.40), 0.065, 0.38, 6, "eclat", tilt=0.45, az=az, rot=0.3 * i)
    else:
        # grand cristal à facettes blanc-bleu
        cristal(bm, (0, 0, ZN - 0.02), 0.21, 1.70 - ZN + 0.02, 8, "glace", tilt=0.0, alt="neige", rot=0.2)
        cristal(bm, (0.10, -0.10, ZN - 0.02), 0.09, 0.62, 6, "eclat", tilt=0.30, az=-0.7, rot=0.5)
        cristal(bm, (-0.12, 0.08, ZN - 0.02), 0.08, 0.50, 6, "eclat", tilt=0.35, az=2.4, rot=0.1)
        # éclats qui flottent autour (même objet, sans contact)
        for i in range(5):
            az = 2 * math.pi * i / 5 + 0.3
            rr = 0.31
            z = 0.55 + 0.35 * ((i * 3) % 5) / 4
            cristal(bm, (rr * math.cos(az), rr * math.sin(az), z), 0.07, 0.30, 4, "eclat", tilt=0.35, az=az, flottant=True, rot=0.4 * i)
    return bm


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    objs.append(ct.finir(tour(n), f"tour_givre_{n}", col, mats, (4.0 * (n - 1), LIGNE_Y, 0.0),
                         {"type": "tour", "tour": "givre", "niveau": n}))
ct.sauver_et_apercu(scene, objs, "apercu_tours_givre.png", cible_z=0.85, largeur=9.5)
