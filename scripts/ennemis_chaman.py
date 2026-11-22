# Génère ennemi_chaman (maillage + armature + marche courbée sur bâton) dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_chaman.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_chaman"
X = 16.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
YB = 0.13
XS, YS = 0.19, -0.17           # bâton (main droite, côté caméra)

OS = [
    ("bassin", (0, 0, 0.20), (0.04, 0, 0.42), None),
    ("tete", (0.06, 0, 0.43), (0.14, 0, 0.58), "bassin"),
    ("jambe_d", (0, -0.06, 0.20), (0, -0.06, 0.0), "bassin"),
    ("jambe_g", (0, 0.06, 0.20), (0, 0.06, 0.0), "bassin"),
    ("bras_d", (0.04, -YB, 0.43), (XS, YS, 0.30), "bassin"),
    ("bras_g", (0.04, YB, 0.43), (0.12, 0.15, 0.27), "bassin"),
]


def baton(bm):
    """Bâton noueux en zigzag, nœuds, cristal vert au sommet."""
    pts = [(XS - 0.01, YS, 0.0), (XS + 0.015, YS, 0.14), (XS - 0.01, YS + 0.005, 0.29), (XS + 0.012, YS, 0.43), (XS, YS, 0.53)]
    for a, b in zip(pts, pts[1:]):
        ct.cone(bm, a, b, 0.018, 0.016, 5, "bois_fonce")
    for p in pts[1:-1]:
        ct.boule(bm, p, 0.024, "bois_fonce")
    for s in (-1, 1):                                   # griffes qui tiennent le cristal
        ct.cone(bm, (XS, YS, 0.52), (XS + s * 0.035, YS, 0.58), 0.012, 0.004, 4, "bois_fonce")
    # cristal (bipyramide à 6 pans)
    c0, h, r = (XS, YS, 0.535), 0.115, 0.035
    ct.cone(bm, c0, (XS, YS, c0[2] + h * 0.35), 0.0, r, 6, "cristal_vert")
    ct.cone(bm, (XS, YS, c0[2] + h * 0.35), (XS, YS, c0[2] + h), r, 0.0, 6, "cristal_vert")


def corps():
    c = ce.Corps(); bm = c.bm
    for cote, y in (("d", -0.06), ("g", 0.06)):
        with c.os_(f"jambe_{cote}"):
            ct.cylindre(bm, 0, y, 0.03, 0.20, 0.03, 0.035, 6, "peau_orc")
            ct.boite(bm, -0.02, y - 0.035, 0.0, 0.175, y + 0.035, 0.035, "peau_orc")     # pieds nus
    with c.os_("bassin"):
        ct.cylindre(bm, 0.0, 0, 0.03, 0.42, 0.145, 0.095, 10, "robe_chaman")               # robe longue
        ct.cylindre(bm, 0.0, 0, 0.03, 0.065, 0.152, 0.149, 10, "or")                         # bordure d'or
        ct.boite(bm, 0.115, -0.022, 0.06, 0.14, 0.022, 0.40, "or")                           # galon devant
        ct.boule(bm, (0.035, 0, 0.42), (0.11, 0.12, 0.095), "robe_chaman", sub=2)            # épaules voûtées
        ct.boule(bm, (-0.045, 0, 0.45), (0.085, 0.10, 0.075), "robe_chaman", sub=1)          # bosse du dos
        ct.cylindre(bm, 0.035, 0, 0.385, 0.405, 0.115, 0.115, 10, "or")                      # col doré
    with c.os_("tete"):
        ct.boule(bm, (0.12, 0, 0.50), (0.075, 0.075, 0.072), "peau_orc", sub=2)
        ct.boule(bm, (0.17, 0, 0.50), (0.035, 0.07, 0.08), "masque_os", sub=2)            # masque en os
        for s in (-1, 1):
            ct.boite(bm, 0.195, s * 0.03 - 0.013, 0.512, 0.207, s * 0.03 + 0.013, 0.532, "truffe")   # orbites
            ct.cone(bm, (0.16, s * 0.055, 0.53), (0.15, s * 0.10, 0.575), 0.016, 0.0, 4, "masque_os")  # cornes du masque
            ct.cone(bm, (0.185, s * 0.035, 0.445), (0.195, s * 0.045, 0.485), 0.012, 0.0, 4, "defense")  # défenses
        ct.cone(bm, (0.09, -0.03, 0.55), (0.03, -0.06, 0.65), 0.026, 0.0, 4, "toits")        # plume rouge
        ct.cone(bm, (0.09, 0.03, 0.55), (0.04, 0.075, 0.64), 0.026, 0.0, 4, "bleu")          # plume bleue
    with c.os_("bras_d"):
        ct.cone(bm, (0.04, -YB, 0.43), (XS - 0.01, YS + 0.01, 0.31), 0.035, 0.03, 6, "robe_chaman")  # manche
        ct.boule(bm, (XS, YS, 0.30), 0.033, "peau_orc")
        baton(bm)
    with c.os_("bras_g"):
        ct.cone(bm, (0.04, YB, 0.43), (0.12, 0.15, 0.28), 0.035, 0.03, 6, "robe_chaman")
        ct.boule(bm, (0.125, 0.15, 0.27), 0.03, "peau_orc")
    return c


def poses(arm):
    def p(f, t):
        s, co = math.sin(t), math.cos(t)
        return {
            # courbé en avant, s'affaisse quand il prend appui sur le bâton
            "bassin": (ce.q_monde(arm, "bassin", Y_AXE, 4 + 3 * co) @ ce.q_monde(arm, "bassin", X_AXE, 4 * s),
                       ce.loc_monde(arm, "bassin", (0, 0, -0.015 * abs(co)))),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, -5 + 4 * math.sin(2 * t)), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -20 * s), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, 20 * s), None),
            # le bâton avance avec la jambe gauche puis se plante
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, 14 * s), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -10 * s), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "chaman"}, X)
act = ce.action_marche(arm, NOM, poses(arm))
ce.apercus(scene, arm, NOM, cible_z=0.32, largeur=0.95)
