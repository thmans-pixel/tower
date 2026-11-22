# Génère ennemi_gobelin (maillage + armature + action de marche) dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_gobelin.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_gobelin"
X = 0.0
Y_AXE = (0, 1, 0)      # rotation autour de Y : bascule avant / arrière (le gobelin regarde vers +X)
X_AXE = (1, 0, 0)

OS = [
    ("bassin", (0, 0, 0.16), (0, 0, 0.34), None),
    ("tete", (0, 0, 0.34), (0, 0, 0.55), "bassin"),
    ("jambe_d", (0, -0.06, 0.17), (0, -0.06, 0.0), "bassin"),
    ("jambe_g", (0, 0.06, 0.17), (0, 0.06, 0.0), "bassin"),
    ("bras_d", (0, -0.12, 0.31), (0, -0.12, 0.18), "bassin"),
    ("bras_g", (0, 0.12, 0.31), (0, 0.12, 0.18), "bassin"),
]


def corps():
    c = ce.Corps(); bm = c.bm
    for cote, y in (("d", -0.06), ("g", 0.06)):
        with c.os_(f"jambe_{cote}"):
            ct.cylindre(bm, 0, y, 0.02, 0.18, 0.034, 0.038, 6, "peau_gobelin")
            ct.boite(bm, -0.035, y - 0.038, 0.0, 0.075, y + 0.038, 0.045, "cuir")      # chaussure pointue vers +X
    with c.os_("bassin"):
        ct.cylindre(bm, 0, 0, 0.13, 0.34, 0.118, 0.078, 8, "tunique_gobelin")
        ct.cylindre(bm, 0, 0, 0.20, 0.235, 0.108, 0.104, 8, "cuir")                      # ceinture
        ct.boite(bm, 0.095, -0.025, 0.198, 0.118, 0.025, 0.237, "or")                   # boucle
        ct.cylindre(bm, 0, 0, 0.32, 0.37, 0.045, 0.045, 6, "peau_gobelin")             # cou
    with c.os_("tete"):
        ct.boule(bm, (0.02, 0, 0.44), (0.12, 0.115, 0.108), "peau_gobelin", sub=2)
        ct.cone(bm, (0.12, 0, 0.435), (0.19, 0, 0.405), 0.032, 0.0, 6, "peau_gobelin")  # nez
        for s in (-1, 1):
            ct.cone(bm, (-0.01, s * 0.085, 0.465), (-0.20, s * 0.19, 0.545), 0.058, 0.0, 5, "peau_gobelin")  # oreilles vers l'arrière
            ct.boule(bm, (0.115, s * 0.05, 0.465), 0.036, "yeux_gobelin")
    for cote, y in (("d", -0.12), ("g", 0.12)):
        with c.os_(f"bras_{cote}"):
            ct.cylindre(bm, 0, y, 0.19, 0.315, 0.026, 0.03, 6, "peau_gobelin")
            ct.boule(bm, (0.0, y, 0.18), 0.036, "peau_gobelin")
            if cote == "d":    # dague dans la main droite (côté caméra), pointe vers l'avant
                ct.cone(bm, (-0.03, y, 0.18), (0.035, y, 0.18), 0.016, 0.016, 5, "bois_fonce")
                ct.boite(bm, 0.035, y - 0.04, 0.165, 0.05, y + 0.04, 0.195, "fer_noir")
                ct.cone(bm, (0.05, y, 0.18), (0.18, y, 0.185), 0.03, 0.0, 4, "pierre_claire")
    return c


def poses(arm):
    def p(f, t):
        s, co = math.sin(t), math.cos(t)
        rebond = 0.045 * abs(co)                       # deux petits sauts par cycle
        return {
            "bassin": (ce.q_monde(arm, "bassin", Y_AXE, 10) @ ce.q_monde(arm, "bassin", X_AXE, 5 * s),
                       ce.loc_monde(arm, "bassin", (0, 0, rebond))),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, -6 + 7 * math.sin(2 * t)), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -38 * s), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, 38 * s), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, 32 * s - 20), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -32 * s), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "gobelin"}, X)
act = ce.action_marche(arm, NOM, poses(arm))
print("action", act.name, "piste NLA", arm.animation_data.nla_tracks[0].name)
ce.apercus(scene, arm, NOM, cible_z=0.28, largeur=0.9)
