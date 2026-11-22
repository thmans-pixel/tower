# Génère ennemi_orc_blinde (maillage + armature + marche lourde) dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_orc_blinde.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_orc_blinde"
X = 8.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
YJ, YB = 0.095, 0.235          # écart des jambes, des bras

OS = [
    ("bassin", (0, 0, 0.30), (0, 0, 0.56), None),
    ("tete", (0, 0, 0.56), (0, 0, 0.80), "bassin"),
    ("jambe_d", (0, -YJ, 0.31), (0, -YJ, 0.0), "bassin"),
    ("jambe_g", (0, YJ, 0.31), (0, YJ, 0.0), "bassin"),
    ("bras_d", (0, -YB, 0.56), (0, -YB, 0.30), "bassin"),
    ("bras_g", (0, YB, 0.56), (0, YB, 0.30), "bassin"),
]


def corps():
    c = ce.Corps(); bm = c.bm
    for cote, y in (("d", -YJ), ("g", YJ)):
        with c.os_(f"jambe_{cote}"):
            ct.cylindre(bm, 0, y, 0.05, 0.31, 0.062, 0.072, 8, "peau_orc")
            ct.boite(bm, 0.03, y - 0.055, 0.09, 0.085, y + 0.055, 0.25, "armure")          # jambière avant
            ct.boite(bm, -0.065, y - 0.068, 0.0, 0.12, y + 0.068, 0.08, "pierre_sombre")   # botte ferrée
    with c.os_("bassin"):
        ct.boule(bm, (0, 0, 0.44), (0.16, 0.175, 0.17), "peau_orc", sub=2)                # torse massif
        ct.boule(bm, (0.015, 0, 0.475), (0.172, 0.19, 0.135), "armure", sub=2)            # cuirasse bombée
        ct.boite(bm, 0.135, -0.085, 0.40, 0.19, 0.085, 0.55, "pierre_sombre")            # plastron central
        for z in (0.43, 0.49):
            ct.boite(bm, 0.12, -0.15, z, 0.175, 0.15, z + 0.02, "armure")                # lames de la cuirasse
        ct.cylindre(bm, 0, 0, 0.29, 0.35, 0.17, 0.165, 10, "cuir")                         # ceinture
        ct.boite(bm, 0.15, -0.04, 0.295, 0.185, 0.04, 0.345, "or")                         # boucle
        for y in (-0.11, 0.0, 0.11):                                                       # tassettes
            ct.boite(bm, 0.11, y - 0.05, 0.19, 0.175, y + 0.05, 0.30, "armure")
        ct.cylindre(bm, 0.03, 0, 0.56, 0.62, 0.08, 0.08, 8, "peau_orc")                   # cou épais
    with c.os_("tete"):
        ct.boule(bm, (0.065, 0, 0.665), (0.105, 0.105, 0.10), "peau_orc", sub=2)
        ct.boite(bm, 0.075, -0.075, 0.585, 0.19, 0.075, 0.645, "peau_orc")                # mâchoire en avant
        for s in (-1, 1):
            ct.cone(bm, (0.170, s * 0.05, 0.63), (0.200, s * 0.062, 0.71), 0.022, 0.0, 5, "defense")  # défenses
            ct.boule(bm, (0.155, s * 0.04, 0.685), 0.016, "truffe")                                   # yeux
        # casque à cornes
        ct.boule(bm, (0.055, 0, 0.705), (0.12, 0.118, 0.085), "armure", sub=2)
        ct.cylindre(bm, 0.055, 0, 0.695, 0.715, 0.124, 0.124, 12, "pierre_sombre")
        ct.boite(bm, 0.145, -0.015, 0.62, 0.17, 0.015, 0.72, "armure")                    # nasal
        for s in (-1, 1):
            ct.cone(bm, (0.035, s * 0.10, 0.72), (0.005, s * 0.19, 0.75), 0.035, 0.025, 6, "defense")
            ct.cone(bm, (0.005, s * 0.19, 0.75), (0.055, s * 0.23, 0.80), 0.025, 0.0, 6, "defense")
    for cote, y in (("d", -YB), ("g", YB)):
        s = -1 if cote == "d" else 1
        with c.os_(f"bras_{cote}"):
            ct.cylindre(bm, 0, y, 0.33, 0.56, 0.045, 0.055, 8, "peau_orc")
            ct.cylindre(bm, 0, y, 0.33, 0.43, 0.055, 0.058, 8, "armure")                   # brassard
            ct.boule(bm, (0.0, y, 0.30), 0.058, "peau_orc")
            ct.boule(bm, (0.0, y + s * 0.005, 0.585), (0.10, 0.085, 0.07), "armure", sub=2)  # épaulière
            ct.cylindre(bm, 0.0, y + s * 0.005, 0.555, 0.575, 0.095, 0.095, 10, "pierre_sombre")
            if cote == "d":    # hache tenue droite, fer vers l'avant
                ya = y - 0.025
                ct.cylindre(bm, 0.0, ya, 0.14, 0.68, 0.02, 0.02, 6, "bois_fonce")
                ct.plaque(bm, [(0.01, 0.50), (0.10, 0.45), (0.18, 0.52), (0.19, 0.61), (0.17, 0.70), (0.10, 0.73), (0.01, 0.66)],
                          ya - 0.012, ya + 0.012, "pierre_claire")
                ct.cylindre(bm, 0.0, ya, 0.50, 0.68, 0.03, 0.03, 6, "pierre_sombre")
    return c


def poses(arm):
    def p(f, t):
        s, co = math.sin(t), math.cos(t)
        return {
            # lourd : le corps tangue de gauche à droite et s'enfonce à chaque pas
            "bassin": (ce.q_monde(arm, "bassin", X_AXE, 6 * s) @ ce.q_monde(arm, "bassin", Z_AXE, -5 * s)
                       @ ce.q_monde(arm, "bassin", Y_AXE, 6),
                       ce.loc_monde(arm, "bassin", (0, 0, -0.02 * abs(s)))),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, -4 + 3 * abs(s)), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -22 * s), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, 22 * s), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, 10 * s - 12), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -16 * s), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "orc_blinde"}, X)
act = ce.action_marche(arm, NOM, poses(arm))
ce.apercus(scene, arm, NOM, cible_z=0.40, largeur=1.15)
