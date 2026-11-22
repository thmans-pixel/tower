# Génère ennemi_loup (maillage + armature + action de marche au galop) dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_loup.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_loup"
X = 4.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
XA, XR, YP = 0.13, -0.15, 0.058          # pattes avant / arrière, écart

OS = [
    ("corps", (-0.16, 0, 0.27), (0.16, 0, 0.27), None),
    ("tete", (0.17, 0, 0.30), (0.30, 0, 0.33), "corps"),
    ("queue", (-0.18, 0, 0.29), (-0.36, 0, 0.26), "corps"),
    ("patte_av_d", (XA, -YP, 0.24), (XA, -YP, 0.0), "corps"),
    ("patte_av_g", (XA, YP, 0.24), (XA, YP, 0.0), "corps"),
    ("patte_ar_d", (XR, -YP, 0.24), (XR, -YP, 0.0), "corps"),
    ("patte_ar_g", (XR, YP, 0.24), (XR, YP, 0.0), "corps"),
]


def corps():
    c = ce.Corps(); bm = c.bm
    with c.os_("corps"):
        ct.boule(bm, (-0.03, 0, 0.27), (0.20, 0.085, 0.082), "loup", sub=2)          # tronc
        ct.boule(bm, (0.11, 0, 0.28), (0.11, 0.095, 0.098), "loup", sub=2)           # poitrail
        ct.boule(bm, (-0.14, 0, 0.265), (0.08, 0.08, 0.08), "loup", sub=1)           # croupe
    with c.os_("tete"):
        ct.boule(bm, (0.17, 0, 0.32), (0.07, 0.065, 0.07), "loup", sub=1)            # cou
        ct.boule(bm, (0.26, 0, 0.34), (0.075, 0.062, 0.06), "loup", sub=2)
        ct.cone(bm, (0.30, 0, 0.33), (0.39, 0, 0.315), 0.04, 0.024, 6, "loup")      # museau allongé
        ct.boule(bm, (0.392, 0, 0.318), 0.02, "truffe")
        for s in (-1, 1):
            ct.cone(bm, (0.245, s * 0.035, 0.38), (0.225, s * 0.045, 0.45), 0.03, 0.0, 4, "loup_dos")  # oreilles
            ct.boule(bm, (0.315, s * 0.038, 0.352), 0.017, "yeux_gobelin")
    with c.os_("queue"):   # queue touffue, bout clair
        ct.boule(bm, (-0.25, 0, 0.30), (0.075, 0.045, 0.045), "loup", sub=1)
        ct.boule(bm, (-0.33, 0, 0.275), (0.065, 0.052, 0.052), "loup", sub=1)
        ct.boule(bm, (-0.385, 0, 0.255), (0.03, 0.035, 0.035), "loup_ventre", sub=1)
    for nom, x, y in (("patte_av_d", XA, -YP), ("patte_av_g", XA, YP), ("patte_ar_d", XR, -YP), ("patte_ar_g", XR, YP)):
        with c.os_(nom):
            ct.cylindre(bm, x, y, 0.03, 0.24, 0.022, 0.034, 6, "loup")
            ct.boite(bm, x - 0.025, y - 0.024, 0.0, x + 0.04, y + 0.024, 0.032, "loup_dos")   # patte
    ce.teinte_dos_ventre(c, "loup", "loup_dos", "loup_ventre")
    return c


def poses(arm):
    A = 42
    def p(f, t):
        s = math.sin
        return {
            "corps": (ce.q_monde(arm, "corps", Y_AXE, -7 * s(t)),
                      ce.loc_monde(arm, "corps", (0, 0, 0.035 * (0.5 + 0.5 * s(t + 0.6))))),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, 6 * s(t)), None),
            "queue": (ce.q_monde(arm, "queue", Y_AXE, -10 + 12 * s(t + 1.0)) @ ce.q_monde(arm, "queue", Z_AXE, 10 * s(t)), None),
            # galop : paires avant et arrière en opposition, léger décalage gauche / droite
            "patte_av_d": (ce.q_monde(arm, "patte_av_d", Y_AXE, -A * s(t)), None),
            "patte_av_g": (ce.q_monde(arm, "patte_av_g", Y_AXE, -A * s(t - 0.5)), None),
            "patte_ar_d": (ce.q_monde(arm, "patte_ar_d", Y_AXE, A * s(t)), None),
            "patte_ar_g": (ce.q_monde(arm, "patte_ar_g", Y_AXE, A * s(t - 0.5)), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "loup"}, X)
act = ce.action_marche(arm, NOM, poses(arm))
ce.apercus(scene, arm, NOM, cible_z=0.22, largeur=1.1)
