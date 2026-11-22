# Génère ennemi_chauve_souris (maillage + armature + action « vol ») dans decor.blend (collection Ennemis).
# Volant : origine au sol sous les pattes, le jeu le soulève lui-même.
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_chauve_souris.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_chauve_souris"
X = 12.0
Y_AXE, X_AXE = (0, 1, 0), (1, 0, 0)
ZA = 0.16                      # hauteur des ailes

OS = [
    ("corps", (-0.06, 0, 0.14), (0.06, 0, 0.14), None),
    ("tete", (0.06, 0, 0.17), (0.14, 0, 0.21), "corps"),
    ("aile_d1", (0.0, -0.05, ZA), (0.0, -0.19, ZA), "corps"),
    ("aile_d2", (0.0, -0.19, ZA), (0.0, -0.35, ZA), "aile_d1"),
    ("aile_g1", (0.0, 0.05, ZA), (0.0, 0.19, ZA), "corps"),
    ("aile_g2", (0.0, 0.19, ZA), (0.0, 0.35, ZA), "aile_g1"),
]

# demi-ailes (côté +Y), contour festonné : bord d'attaque puis bord de fuite
INTERIEUR = [(0.03, 0.04), (0.065, 0.12), (0.075, 0.20), (-0.03, 0.20), (-0.12, 0.155), (-0.07, 0.11), (-0.11, 0.045)]
EXTERIEUR = [(0.075, 0.19), (0.05, 0.27), (0.01, 0.352), (-0.07, 0.29), (-0.045, 0.245), (-0.10, 0.205), (-0.03, 0.19)]


def corps():
    c = ce.Corps(); bm = c.bm
    with c.os_("corps"):
        ct.boule(bm, (0.0, 0, 0.14), (0.085, 0.065, 0.08), "chauve_souris", sub=2)
        for s in (-1, 1):   # petites pattes repliées sous le corps
            ct.cone(bm, (-0.03, s * 0.03, 0.08), (-0.06, s * 0.035, 0.0), 0.014, 0.008, 4, "chauve_souris")
    with c.os_("tete"):
        ct.boule(bm, (0.085, 0, 0.20), 0.062, "chauve_souris", sub=2)
        ct.cone(bm, (0.13, 0, 0.19), (0.165, 0, 0.185), 0.025, 0.008, 5, "chauve_souris")    # museau
        for s in (-1, 1):
            ct.cone(bm, (0.075, s * 0.035, 0.245), (0.055, s * 0.06, 0.34), 0.032, 0.0, 4, "aile_membrane")  # oreilles
            ct.boule(bm, (0.135, s * 0.03, 0.21), 0.018, "yeux_rouges")
            ct.cone(bm, (0.15, s * 0.012, 0.172), (0.152, s * 0.012, 0.145), 0.008, 0.0, 4, "defense")     # crocs
    for cote, s in (("d", -1), ("g", 1)):
        with c.os_(f"aile_{cote}1"):
            ce.plaque_xy(c, [(x, s * y) for x, y in (INTERIEUR if s > 0 else list(reversed(INTERIEUR)))], ZA, 0.012, "aile_membrane")
            ct.cone(bm, (0.03, s * 0.04, ZA), (0.075, s * 0.20, ZA + 0.005), 0.014, 0.011, 4, "chauve_souris")   # bras
        with c.os_(f"aile_{cote}2"):
            ce.plaque_xy(c, [(x, s * y) for x, y in (EXTERIEUR if s > 0 else list(reversed(EXTERIEUR)))], ZA, 0.012, "aile_membrane")
            for fx, fy in ((0.01, 0.352), (-0.045, 0.245), (-0.07, 0.29)):                                     # doigts
                ct.cone(bm, (0.075, s * 0.20, ZA + 0.005), (fx, s * fy, ZA + 0.005), 0.009, 0.005, 4, "chauve_souris")
    return c


def poses(arm):
    def p(f, t):
        bat = 48 * math.cos(t)              # ailes en haut à l'image 1, en bas à l'image 5
        bout = 22 * math.cos(t - 0.9)       # le bout de l'aile suit avec un temps de retard
        return {
            "corps": (ce.q_monde(arm, "corps", Y_AXE, -8 + 4 * math.cos(t)),
                      ce.loc_monde(arm, "corps", (0, 0, -0.03 * math.cos(t)))),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, 6 * math.cos(t)), None),
            "aile_d1": (ce.q_monde(arm, "aile_d1", X_AXE, -bat), None),
            "aile_d2": (ce.q_monde(arm, "aile_d2", X_AXE, -bout), None),
            "aile_g1": (ce.q_monde(arm, "aile_g1", X_AXE, bat), None),
            "aile_g2": (ce.q_monde(arm, "aile_g2", X_AXE, bout), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "chauve_souris", "volant": 1}, X)
act = ce.action_marche(arm, NOM, poses(arm), anim="vol")
print("action", act.name, "piste", arm.animation_data.nla_tracks[0].name)
ce.apercus(scene, arm, NOM, cible_z=0.15, largeur=1.0, anim="vol")
