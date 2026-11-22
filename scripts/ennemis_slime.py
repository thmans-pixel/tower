# Génère ennemi_slime (0,5) et ennemi_slime_petit (0,3) : maillage + armature + marche en rebonds.
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_slime.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
from mathutils import Quaternion
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

SLIMES = [("ennemi_slime", 0.50, 20.0), ("ennemi_slime_petit", 0.30, 24.0)]

# rebond sur 8 images : hauteur du saut (en part de la taille) et étirement vertical
SAUT = [0.00, 0.03, 0.20, 0.30, 0.24, 0.10, 0.00, 0.00]
ETIRE = [0.68, 1.22, 1.10, 0.98, 1.04, 1.16, 0.84, 0.74]


def corps(k):
    """Goutte unique (icosphère déformée : large en bas, resserrée en haut), modélisée pour 0,5 puis k = taille / 0,5."""
    import bmesh
    c = ce.Corps(); bm = c.bm
    with c.os_("corps"):
        res = bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        for v in res["verts"]:
            x, y, z = v.co
            t = (z + 1) / 2
            h = 1.0 - 0.42 * t ** 2
            v.co = (x * h * 0.28 * k, y * h * 0.27 * k, max(0.0, (0.27 * z + 0.23)) * k)
        for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = ct.M["slime"]
        ct.boule(bm, (0.0, -0.07 * k, 0.43 * k), (0.11 * k, 0.075 * k, 0.035 * k), "slime_reflet", sub=2)   # reflet
        ct.boule(bm, (0.10 * k, -0.17 * k, 0.33 * k), (0.035 * k, 0.03 * k, 0.025 * k), "slime_reflet", sub=1)
        for az in (-12, -50):   # yeux tournés vers l'avant et un peu vers la caméra
            a = math.radians(az)
            ct.boule(bm, (0.20 * k * math.cos(a), 0.195 * k * math.sin(a), 0.30 * k), 0.06 * k, "oeil_blanc", sub=2)
            ct.boule(bm, (0.248 * k * math.cos(a), 0.242 * k * math.sin(a), 0.305 * k), 0.03 * k, "truffe", sub=1)
    return c


def poses(arm, taille):
    def p(f, t):
        h = ETIRE[f - 1]
        w = 1 / math.sqrt(h)                      # volume conservé
        return {"corps": (Quaternion(), ce.loc_monde(arm, "corps", (0, 0, SAUT[f - 1] * taille)), (w, h, w))}
    return p


scene, col, mats = ct.ouvrir("Ennemis")
derniers = []
for nom, taille, x in SLIMES:
    k = taille / 0.5
    os_liste = [("corps", (0, 0, 0), (0, 0, taille), None)]
    arm, ob = ce.creer(nom, corps(k), os_liste, col, mats, {"type": "ennemi", "ennemi": nom.replace("ennemi_", "")}, x)
    ce.action_marche(arm, nom, poses(arm, taille))
    derniers.append((arm, nom, taille))
for arm, nom, taille in derniers:
    ce.apercus(scene, arm, nom, cible_z=taille * 0.55, largeur=taille * 2.2)
