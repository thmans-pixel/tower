# Génère ennemi_spectre (maillage + armature + flottement ondulant) dans decor.blend (collection Ennemis).
# Matériaux opaques : le jeu gère la transparence et l'invisibilité.
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_spectre.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_spectre"
X = 32.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
N = 10                       # pans de la robe (5 lambeaux)

OS = [
    ("corps", (0, 0, 0.18), (0, 0, 0.46), None),
    ("bas", (0, 0, 0.20), (0, 0, 0.02), "corps"),
    ("tete", (0.0, 0, 0.47), (0.04, 0, 0.72), "corps"),
    ("bras_d", (0.0, -0.12, 0.48), (0.14, -0.15, 0.33), "corps"),
    ("bras_g", (0.0, 0.12, 0.48), (0.14, 0.15, 0.33), "corps"),
]


def robe(c):
    """Drap en tronc de cône, bas effiloché en dents ; les sommets du bas suivent l'os « bas »."""
    bm = c.bm
    def ring(z, r, dx=0.0, zig=0.0):
        return [bm.verts.new((dx + r * math.cos(2 * math.pi * i / N), r * math.sin(2 * math.pi * i / N) * 0.92,
                              z + (zig if i % 2 else 0.0))) for i in range(N)]
    rings = [ring(0.02, 0.20, -0.02, 0.17), ring(0.25, 0.155, -0.01), ring(0.39, 0.13), ring(0.50, 0.105, 0.01)]
    faces = []
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(N):
            j = (i + 1) % N
            faces.append(bm.faces.new((r0[i], r0[j], r1[j], r1[i])))
    faces.append(bm.faces.new(rings[-1]))
    faces.append(bm.faces.new(list(reversed(rings[0]))))
    for f in faces: f.material_index = ct.M["drap_spectre"]
    return rings


def corps():
    c = ce.Corps(); bm = c.bm
    with c.os_("corps"):
        rings = robe(c)
    gi_corps = c.groupes.index("corps")
    c.groupes.append("bas"); gi_bas = c.groupes.index("bas")
    for v in rings[0] + rings[1]:          # bas de la robe -> os « bas »
        del v[c.dl][gi_corps]
        v[c.dl][gi_bas] = 1.0 if v in rings[0] else 0.5
        if v in rings[1]: v[c.dl][gi_corps] = 0.5
    with c.os_("tete"):
        ct.boule(bm, (0.02, 0, 0.59), (0.125, 0.115, 0.125), "drap_spectre", sub=2)             # capuche
        ct.cone(bm, (-0.03, 0, 0.67), (-0.11, 0, 0.75), 0.07, 0.0, 6, "drap_spectre")            # pointe de la capuche
        ct.boule(bm, (0.10, 0, 0.585), (0.05, 0.08, 0.09), "ombre_capuche", sub=2)               # visage dans l'ombre
        for s in (-1, 1):
            ct.boule(bm, (0.142, s * 0.033, 0.60), 0.02, "yeux_bleus", sub=1)
    for cote, s in (("d", -1), ("g", 1)):
        with c.os_(f"bras_{cote}"):     # manches flottantes, ouvertes, bout effiloché
            ct.cone(bm, (0.0, s * 0.11, 0.49), (0.15, s * 0.15, 0.33), 0.04, 0.062, 6, "drap_spectre")
            ct.cylindre(bm, 0.152, s * 0.152, 0.322, 0.332, 0.05, 0.05, 6, "ombre_capuche")
            for k in range(3):
                a = k * 2.1
                ct.cone(bm, (0.15 + 0.04 * math.cos(a), s * 0.15 + 0.04 * math.sin(a), 0.33),
                        (0.16 + 0.05 * math.cos(a), s * 0.15 + 0.05 * math.sin(a), 0.26), 0.022, 0.0, 4, "drap_spectre")
    return c


def poses(arm):
    def p(f, t):
        s, co = math.sin(t), math.cos(t)
        return {
            "corps": (ce.q_monde(arm, "corps", Y_AXE, 9 + 3 * s) @ ce.q_monde(arm, "corps", X_AXE, 4 * co),
                      ce.loc_monde(arm, "corps", (0, 0, 0.035 * s))),
            "bas": (ce.q_monde(arm, "bas", Y_AXE, -8 * math.sin(t - 1.2)) @ ce.q_monde(arm, "bas", X_AXE, 5 * math.cos(t - 1.2)), None),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, 5 * math.sin(t + 0.6)), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, -12 * math.sin(t - 0.8)), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -12 * math.sin(t - 1.6)), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "spectre"}, X)
ce.action_marche(arm, NOM, poses(arm))
ce.apercus(scene, arm, NOM, cible_z=0.38, largeur=1.0)
