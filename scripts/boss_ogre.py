# Génère boss_ogre (maillage + armature + actions « marche » et « rugissement ») dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/boss_ogre.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math, random
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "boss_ogre"
X = 37.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
YJ, YB = 0.20, 0.38
MAIN_D = (0.10, -0.42, 0.62)
rnd = random.Random(NOM)

OS = [
    ("bassin", (0, 0, 0.62), (0, 0, 1.00), None),
    ("torse", (0, 0, 1.00), (0, 0, 1.30), "bassin"),
    ("tete", (0.06, 0, 1.30), (0.10, 0, 1.58), "torse"),
    ("machoire", (0.08, 0, 1.40), (0.24, 0, 1.36), "tete"),
    ("cape", (-0.24, 0, 1.26), (-0.36, 0, 0.45), "torse"),
    ("jambe_d", (0, -YJ, 0.64), (0, -YJ, 0.0), "bassin"),
    ("jambe_g", (0, YJ, 0.64), (0, YJ, 0.0), "bassin"),
    ("bras_d", (0, -YB, 1.20), MAIN_D, "torse"),
    ("bras_g", (0, YB, 1.20), (0.10, YB + 0.05, 0.62), "torse"),
]


def plaque_yz(c, pts, x0, x1, mat, incl=0.0):
    """Plaque verticale (plan YZ) de contour pts [(y, z)], épaisse de x0 à x1 ; incl recule le bas (cape)."""
    bm = c.bm
    def X(z, x): return x - incl * (1.3 - z)
    av = [bm.verts.new((X(z, x1), y, z)) for y, z in pts]
    ar = [bm.verts.new((X(z, x0), y, z)) for y, z in pts]
    faces = [bm.faces.new(av), bm.faces.new(list(reversed(ar)))]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((av[i], ar[i], ar[j], av[j])))
    for f in faces: f.material_index = ct.M[mat]
    import bmesh
    bmesh.ops.triangulate(bm, faces=faces[:2])


def corps():
    c = ce.Corps(); bm = c.bm
    for cote, y in (("d", -YJ), ("g", YJ)):
        s = -1 if cote == "d" else 1
        with c.os_(f"jambe_{cote}"):
            ct.cylindre(bm, 0, y, 0.10, 0.64, 0.115, 0.135, 8, "peau_ogre")
            ct.boite(bm, -0.13, y - 0.14, 0.0, 0.24, y + 0.14, 0.13, "cuir")                     # botte
            if cote == "d":    # jambière de fer d'un seul côté (armure dépareillée)
                ct.boite(bm, 0.07, y - 0.10, 0.16, 0.15, y + 0.10, 0.44, "armure")
                ct.boule(bm, (0.12, y, 0.46), (0.07, 0.10, 0.07), "armure", sub=1)               # genouillère
            else:
                ct.cylindre(bm, 0, y, 0.20, 0.30, 0.14, 0.14, 8, "cuir")                         # bandes de cuir
    with c.os_("bassin"):
        ct.boule(bm, (0.10, 0, 0.86), (0.30, 0.32, 0.29), "peau_ogre", sub=2)                    # ventre rebondi
        ct.boule(bm, (0.24, 0, 0.88), (0.04, 0.05, 0.04), "pierre_sombre", sub=1)                # nombril
        ct.cylindre(bm, 0.02, 0, 0.62, 0.72, 0.30, 0.29, 12, "cuir")                              # ceinture
        ct.boite(bm, 0.27, -0.07, 0.62, 0.33, 0.07, 0.73, "or")                                   # boucle
        ct.boite(bm, 0.22, -0.13, 0.36, 0.30, 0.13, 0.64, "cuir")                                 # pagne
        ct.boite(bm, -0.04, -0.33, 0.50, 0.14, -0.15, 0.66, "armure")                             # tassette (un côté)
    with c.os_("torse"):
        ct.boule(bm, (0.0, 0, 1.12), (0.25, 0.34, 0.21), "peau_ogre", sub=2)                     # poitrine
        ct.boule(bm, (-0.04, 0, 1.26), (0.20, 0.30, 0.10), "peau_ogre", sub=1)                   # trapèzes
        # armure de plaques dépareillées
        ct.pave(bm, (0.17, -0.13, 1.12), (0.08, 0.20, 0.22), -0.25, "armure")                      # plaque droite
        ct.pave(bm, (0.17, 0.15, 1.08), (0.07, 0.17, 0.18), 0.3, "pierre_sombre")                  # plaque rouillée
        ct.cone(bm, (0.20, 0.34, 1.25), (0.20, -0.34, 0.90), 0.035, 0.035, 6, "cuir")              # sangle
        # épaulière gauche à pointes (fer), épaulière droite ronde (bronze)
        ct.boule(bm, (0.0, YB + 0.01, 1.23), (0.15, 0.11, 0.10), "armure", sub=2)
        for k in range(3):
            ct.cone(bm, (-0.06 + 0.06 * k, YB + 0.06, 1.29), (-0.07 + 0.06 * k, YB + 0.10, 1.37), 0.025, 0.0, 5, "pierre_sombre")
        ct.boule(bm, (0.0, -YB - 0.01, 1.23), (0.14, 0.11, 0.10), "bronze", sub=2)
        ct.cylindre(bm, 0.0, -YB - 0.01, 1.19, 1.215, 0.13, 0.13, 12, "pierre_sombre")
        ct.cylindre(bm, 0.05, 0, 1.28, 1.35, 0.10, 0.09, 8, "peau_ogre")                         # cou
    with c.os_("tete"):
        ct.boule(bm, (0.12, 0, 1.44), (0.13, 0.13, 0.12), "peau_ogre", sub=2)
        ct.boite(bm, 0.14, -0.10, 1.47, 0.25, 0.10, 1.50, "peau_ogre")                            # arcade
        ct.cone(bm, (0.23, 0, 1.45), (0.28, 0, 1.42), 0.04, 0.02, 5, "peau_ogre")                # nez
        for s in (-1, 1):
            ct.boule(bm, (0.235, s * 0.05, 1.465), 0.02, "truffe", sub=1)                        # yeux
            ct.cone(bm, (0.08, s * 0.12, 1.45), (0.04, s * 0.20, 1.48), 0.035, 0.0, 4, "peau_ogre")  # oreilles
        # couronne grossière dorée
        ct.cylindre(bm, 0.11, 0, 1.50, 1.545, 0.115, 0.12, 8, "or")
        for k in range(6):
            a = 2 * math.pi * k / 6 + 0.3
            h = 1.60 if k % 2 == 0 else 1.585
            ct.cone(bm, (0.11 + 0.105 * math.cos(a), 0.105 * math.sin(a), 1.56), (0.11 + 0.11 * math.cos(a), 0.11 * math.sin(a), h),
                    0.03, 0.0, 4, "or")
    with c.os_("machoire"):
        ct.boite(bm, 0.10, -0.10, 1.32, 0.25, 0.10, 1.40, "peau_ogre")                            # mâchoire en avant
        ct.boite(bm, 0.20, -0.07, 1.385, 0.245, 0.07, 1.40, "pierre_sombre")                      # bouche
        for s in (-1, 1):
            ct.cone(bm, (0.23, s * 0.07, 1.39), (0.25, s * 0.08, 1.47), 0.025, 0.0, 5, "defense")  # défenses
    with c.os_("cape"):    # cape rouge déchirée dans le dos
        pts = [(-0.30, 1.27), (0.30, 1.27), (0.36, 0.62), (0.27, 0.70), (0.21, 0.50), (0.13, 0.64), (0.05, 0.44),
               (-0.04, 0.60), (-0.12, 0.47), (-0.20, 0.66), (-0.28, 0.52), (-0.36, 0.68)]
        plaque_yz(c, pts, -0.27, -0.245, "toits", incl=0.18)
        ct.boule(bm, (-0.22, -0.28, 1.26), 0.04, "or", sub=1)                                     # fibules
        ct.boule(bm, (-0.22, 0.28, 1.26), 0.04, "or", sub=1)
    for cote, y in (("d", -YB), ("g", YB)):
        s = -1 if cote == "d" else 1
        with c.os_(f"bras_{cote}"):
            ct.cone(bm, (0.0, y, 1.20), (0.05, y + s * 0.03, 0.90), 0.10, 0.09, 8, "peau_ogre")
            ct.cone(bm, (0.05, y + s * 0.03, 0.90), (0.10, y + s * 0.05, 0.66), 0.10, 0.09, 8, "peau_ogre")
            ct.boule(bm, (0.10, y + s * 0.05, 0.62), 0.11, "peau_ogre", sub=2)                    # poing
            ct.cone(bm, (0.06, y + s * 0.035, 0.86), (0.095, y + s * 0.05, 0.70), 0.11, 0.105, 8,
                    "armure" if cote == "g" else "cuir")                                          # brassards dépareillés
            if cote == "d":    # énorme massue cloutée tenue vers l'avant
                m0 = (MAIN_D[0] - 0.03, MAIN_D[1] - 0.02, MAIN_D[2] - 0.06)
                m1 = (0.50, MAIN_D[1] - 0.04, 1.02)
                ct.cone(bm, m0, m1, 0.045, 0.125, 8, "bois_fonce")
                for k in range(10):
                    t = 0.55 + 0.42 * (k // 5) / 1
                    a = 2 * math.pi * (k % 5) / 5 + (k // 5) * 0.6
                    cx = m0[0] + (m1[0] - m0[0]) * t; cz = m0[2] + (m1[2] - m0[2]) * t
                    r = 0.045 + (0.125 - 0.045) * t
                    # perpendiculaires à l'axe de la massue
                    ux, uz = -(m1[2] - m0[2]), (m1[0] - m0[0]); L = math.hypot(ux, uz); ux, uz = ux / L, uz / L
                    p0 = (cx + ux * r * math.cos(a), m0[1] + r * math.sin(a), cz + uz * r * math.cos(a))
                    p1 = (cx + ux * (r + 0.06) * math.cos(a), m0[1] + (r + 0.06) * math.sin(a), cz + uz * (r + 0.06) * math.cos(a))
                    ct.cone(bm, p0, p1, 0.028, 0.0, 4, "fer_noir")                               # clous
                for t in (0.35, 0.95):
                    cx = m0[0] + (m1[0] - m0[0]) * t; cz = m0[2] + (m1[2] - m0[2]) * t
                    r = 0.045 + (0.125 - 0.045) * t
                    ct.cone(bm, (cx - 0.012, m0[1], cz - 0.012), (cx + 0.012, m0[1], cz + 0.012), r + 0.01, r + 0.01, 8, "fer_noir")
    return c


def poses_marche(arm):
    def p(f, t):
        s = math.sin(t)
        choc = (1 - abs(s)) ** 3                           # 1 à l'impact du pied, 0 entre deux pas
        return {
            "bassin": (ce.q_monde(arm, "bassin", X_AXE, 6 * s) @ ce.q_monde(arm, "bassin", Z_AXE, -5 * s),
                       ce.loc_monde(arm, "bassin", (0, 0, -0.05 * choc))),
            "torse": (ce.q_monde(arm, "torse", Y_AXE, 5 + 3 * choc), None),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, 7 * choc - 3), None),
            "machoire": (ce.q_monde(arm, "machoire", Y_AXE, 4 * choc), None),
            "cape": (ce.q_monde(arm, "cape", Y_AXE, 6 + 6 * math.sin(t - 1.0)) @ ce.q_monde(arm, "cape", X_AXE, 5 * math.cos(t - 1.0)), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -17 * s), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, 17 * s), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, 8 * s - 10), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -12 * s), None),
        }
    return p


# rugissement : penché en arrière (inspire), puis en avant gueule ouverte, massue levée, retour
R_TORSE = [0, -10, -16, 12, 16, 14, 6, 0]
R_TETE = [0, -12, -20, -4, -8, -6, -2, 0]
R_MACH = [0, 6, 10, 28, 32, 28, 10, 0]
R_BRAS = [0, 16, 30, 42, 46, 42, 20, 0]
R_MASSUE = [0, -35, -70, -95, -100, -95, -45, 0]
R_BASSIN = [0, 0.01, 0.02, -0.03, -0.04, -0.03, -0.01, 0]


def poses_rugissement(arm):
    def p(f, t):
        i = f - 1
        tremble = 2.5 * (1 if f % 2 else -1) if 4 <= f <= 6 else 0.0
        return {
            "bassin": (ce.q_monde(arm, "bassin", Y_AXE, R_TORSE[i] * 0.3), ce.loc_monde(arm, "bassin", (0, 0, R_BASSIN[i]))),
            "torse": (ce.q_monde(arm, "torse", Y_AXE, R_TORSE[i]) @ ce.q_monde(arm, "torse", X_AXE, tremble), None),
            "tete": (ce.q_monde(arm, "tete", Y_AXE, R_TETE[i]), None),
            "machoire": (ce.q_monde(arm, "machoire", Y_AXE, R_MACH[i]), None),
            "cape": (ce.q_monde(arm, "cape", Y_AXE, 6 - R_TORSE[i] * 0.6), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -R_TORSE[i] * 0.3), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, -R_TORSE[i] * 0.3), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, R_MASSUE[i] - 10 * (i == 0)) @ ce.q_monde(arm, "bras_d", X_AXE, -R_BRAS[i] * 0.3), None),
            "bras_g": (ce.q_monde(arm, "bras_g", X_AXE, R_BRAS[i]) @ ce.q_monde(arm, "bras_g", Y_AXE, -R_BRAS[i] * 0.6), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "boss_ogre", "boss": 1}, X)
ce.action_marche(arm, NOM, poses_marche(arm), anim="marche")
ce.action_marche(arm, NOM, poses_rugissement(arm), anim="rugissement")
print("pistes NLA :", [t.name for t in arm.animation_data.nla_tracks])
ce.apercus(scene, arm, NOM, cible_z=0.80, largeur=2.0, anim="marche")
ce.apercus(scene, arm, NOM, cible_z=0.80, largeur=2.0, anim="rugissement")
