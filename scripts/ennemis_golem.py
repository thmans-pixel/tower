# Génère ennemi_golem (maillage + armature + marche très lente) dans decor.blend (collection Ennemis).
# Lancer : flatpak run org.blender.Blender -b -P scripts/ennemis_golem.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, math, random
import bmesh
from mathutils import Matrix
import commun_tours as ct
import commun_ennemis as ce
importlib.reload(ct); importlib.reload(ce)

NOM = "ennemi_golem"
X = 28.0
Y_AXE, X_AXE, Z_AXE = (0, 1, 0), (1, 0, 0), (0, 0, 1)
YJ, YB = 0.14, 0.36

OS = [
    ("bassin", (0, 0, 0.42), (0, 0, 0.86), None),
    ("tete", (0.08, 0, 0.88), (0.10, 0, 1.08), "bassin"),
    ("jambe_d", (0, -YJ, 0.43), (0, -YJ, 0.0), "bassin"),
    ("jambe_g", (0, YJ, 0.43), (0, YJ, 0.0), "bassin"),
    ("bras_d", (-0.08, -YB, 0.90), (-0.04, -YB - 0.03, 0.15), "bassin"),
    ("bras_g", (-0.08, YB, 0.90), (-0.04, YB + 0.03, 0.15), "bassin"),
]
rnd = random.Random(NOM)


def bloc(bm, c, taille, mat="pierre_golem", rx=0.0, ry=0.0, rz=0.0):
    """Bloc de pierre légèrement de travers."""
    m = (Matrix.Translation(c) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")
         @ Matrix.Diagonal((taille[0], taille[1], taille[2], 1)))
    res = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = ct.M[mat]
    if mat == "pierre_golem" and min(taille) > 0.06:      # arêtes biseautées : pierre taillée
        aretes = list({e for v in res["verts"] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=list(res["verts"]) + aretes, offset=min(taille) * 0.16, segments=1,
                        profile=0.5, affect="EDGES", clamp_overlap=True)


def j(a=0.08): return rnd.uniform(-a, a)


def corps():
    c = ce.Corps(); bm = c.bm
    for cote, y in (("d", -YJ), ("g", YJ)):
        s = -1 if cote == "d" else 1
        with c.os_(f"jambe_{cote}"):
            bloc(bm, (0.0, y, 0.34), (0.17, 0.18, 0.18), rz=j(), rx=j(0.05))
            bloc(bm, (0.01, y + s * 0.01, 0.17), (0.19, 0.20, 0.19), rz=j(), ry=j(0.05))
            bloc(bm, (0.05, y, 0.045), (0.28, 0.23, 0.09), rz=j(0.05))                     # pied
    with c.os_("bassin"):
        bloc(bm, (0.0, 0, 0.46), (0.30, 0.42, 0.14), rz=j(0.04))
        bloc(bm, (0.02, 0, 0.70), (0.42, 0.56, 0.36), rz=j(0.04), ry=0.06)                   # torse
        bloc(bm, (-0.10, 0, 0.86), (0.28, 0.42, 0.16), ry=0.1, rz=j(0.05))                    # bosse du dos
        bloc(bm, (0.04, 0.05, 0.545), (0.26, 0.24, 0.07), rz=0.15)                            # bloc de ventre
        # runes orange gravées sur le torse (face +X)
        xf = 0.02 + 0.21 * math.cos(0.06) + 0.012
        def rune(y, z, ly, lz, rx=0.0):
            bloc(bm, (xf, y, z), (0.02, ly, lz), "rune_orange", rx=rx)
        rune(0.0, 0.70, 0.032, 0.22)
        rune(-0.09, 0.74, 0.03, 0.12, rx=0.6); rune(0.09, 0.74, 0.03, 0.12, rx=-0.6)
        rune(-0.11, 0.62, 0.10, 0.028); rune(0.11, 0.62, 0.10, 0.028)
        for i in range(6):                                                                     # cercle
            a = 2 * math.pi * i / 6
            rune(0.075 * math.cos(a), 0.70 + 0.075 * math.sin(a), 0.02, 0.05, rx=a)
        # runes sur le flanc visible du torse (-Y, côté caméra ; le jeu retourne l'ennemi selon X)
        yf = -0.28 - 0.012
        def rune_cote(x, z, lx, lz, ry=0.0):
            bloc(bm, (x, yf, z), (lx, 0.02, lz), "rune_orange", ry=ry)
        rune_cote(0.165, 0.70, 0.032, 0.24)
        rune_cote(0.115, 0.76, 0.03, 0.11, ry=0.6); rune_cote(0.205, 0.64, 0.03, 0.11, ry=0.6)
        rune_cote(0.165, 0.565, 0.10, 0.028)
        # bandes de rune sur le dessus du torse (vu de haut par la caméra)
        bloc(bm, (0.17, -0.10, 0.885), (0.09, 0.028, 0.012), "rune_orange")
        bloc(bm, (0.17, 0.0, 0.885), (0.028, 0.16, 0.012), "rune_orange")
        bloc(bm, (0.17, 0.10, 0.885), (0.09, 0.028, 0.012), "rune_orange")
    with c.os_("tete"):
        bloc(bm, (0.11, 0, 0.965), (0.16, 0.17, 0.14), rz=j(0.06))                             # petite tête
        bloc(bm, (0.105, 0, 1.045), (0.12, 0.13, 0.03), "mousse", rz=0.3)                      # touffe de mousse
        for s in (-1, 1):
            bloc(bm, (0.193, s * 0.04, 0.975), (0.012, 0.035, 0.022), "rune_orange")           # yeux
    for cote, y in (("d", -YB), ("g", YB)):
        s = -1 if cote == "d" else 1
        with c.os_(f"bras_{cote}"):
            bloc(bm, (-0.080, y, 0.90), (0.26, 0.24, 0.22), rz=j(), rx=s * 0.1)                   # épaule
            bloc(bm, (-0.085, y + s * 0.005, 0.99), (0.20, 0.18, 0.04), "mousse", rz=j())      # mousse sur l'épaule
            bloc(bm, (-0.070, y + s * 0.01, 0.70), (0.17, 0.17, 0.22), rz=j())                   # bras
            bloc(bm, (-0.050, y + s * 0.02, 0.45), (0.25, 0.25, 0.28), rz=j(), ry=j(0.06))       # avant-bras énorme
            bloc(bm, (-0.035, y + s * 0.03, 0.21), (0.29, 0.27, 0.21), rz=j())                  # poing
            bloc(bm, (0.080, y + s * 0.02, 0.47), (0.012, 0.05, 0.10), "rune_orange")            # rune de l'avant-bras
            bloc(bm, (-0.050, y + s * 0.15, 0.46), (0.05, 0.012, 0.12), "rune_orange")            # rune sur la face externe
    # mousse sur une partie des faces du dessus
    bm.normal_update()
    for f in bm.faces:
        if f.material_index == ct.M["pierre_golem"] and f.normal.z > 0.85 and f.calc_area() > 0.01 and rnd.random() < 0.18:
            f.material_index = ct.M["mousse"]
    return c


def poses(arm):
    def p(f, t):
        s = math.sin(t)
        return {
            "bassin": (ce.q_monde(arm, "bassin", X_AXE, 5 * s) @ ce.q_monde(arm, "bassin", Z_AXE, -4 * s)
                       @ ce.q_monde(arm, "bassin", Y_AXE, 4),
                       ce.loc_monde(arm, "bassin", (0, 0, -0.03 * abs(s)))),
            "tete": (ce.q_monde(arm, "tete", X_AXE, -3 * s), None),
            "jambe_d": (ce.q_monde(arm, "jambe_d", Y_AXE, -15 * s), None),
            "jambe_g": (ce.q_monde(arm, "jambe_g", Y_AXE, 15 * s), None),
            "bras_d": (ce.q_monde(arm, "bras_d", Y_AXE, 10 * s), None),
            "bras_g": (ce.q_monde(arm, "bras_g", Y_AXE, -10 * s), None),
        }
    return p


scene, col, mats = ct.ouvrir("Ennemis")
arm, ob = ce.creer(NOM, corps(), OS, col, mats, {"type": "ennemi", "ennemi": "golem"}, X)
ce.action_marche(arm, NOM, poses(arm))
ce.apercus(scene, arm, NOM, cible_z=0.55, largeur=1.5)
