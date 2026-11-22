# Génère tour_mage_1/2/3 dans decor.blend (collection Tours).
# Lancer : flatpak run org.blender.Blender -b -P scripts/tours_mage.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math
import commun_tours as ct
importlib.reload(ct)

LIGNE_Y = 20.0
SEG = 12
ROT = math.pi / SEG          # une facette face à -Y

# R : rayon du corps, H : haut du corps, toit (base, sommet, rayon), orbe (centre, rayon), fenêtres (z bas)
NIVEAUX = {
    1: dict(R=0.19, H=0.92, toit=(0.90, 1.17, 0.255), orbe=(1.225, 0.075), fen=[0.52], balcon=None, toit_mat="toit_mage"),
    2: dict(R=0.20, H=1.06, toit=(1.04, 1.32, 0.27), orbe=(1.41, 0.090), fen=[0.42, 0.86], balcon=0.72, toit_mat="toit_mage"),
    3: dict(R=0.21, H=1.18, toit=(1.16, 1.45, 0.28), orbe=(1.595, 0.095), fen=[0.40, 0.84, 1.02], balcon=0.70, toit_mat="toit_mage_fonce",
            garn="or", pointe=True),
    "3a": dict(R=0.20, H=1.20, toit=(1.18, 1.46, 0.27), orbe=(1.58, 0.095), fen=[0.42, 0.88, 1.05], balcon=0.74, toit_mat="toit_mage",
               garn="bronze", pointe=True, orbe_mat="orbe_bleue"),
    "3b": dict(R=0.20, H=1.20, toit=(1.18, 1.46, 0.27), orbe=(1.58, 0.11), fen=[0.42, 0.88, 1.05], balcon=0.74, toit_mat="toit_mage",
               garn="bronze", pointe=False, orbe_mat="orbe_feu", braseros=True),
}


def fenetre(bm, R, z, larg=0.085, haut=0.13):
    yf = -R * math.cos(ROT)
    pts = [(-larg / 2, z), (larg / 2, z)]
    for k in range(5):
        a = math.pi * k / 4
        pts.append((larg / 2 * math.cos(a), z + haut + larg / 2 * math.sin(a)))
    pts.append((-larg / 2, z))
    pts = pts[:-1]
    # encadrement sombre puis vitre jaune
    cadre = [(x * 1.45, z - 0.02 + (zz - z) * 1.18) for x, zz in pts]
    ct.plaque(bm, cadre, yf - 0.012, yf + 0.03, "toit_mage")
    ct.plaque(bm, pts, yf - 0.022, yf + 0.03, "fenetre")


def tour(n):
    c = NIVEAUX[n]; R, H = c["R"], c["H"]
    bm = bmesh.new()
    ct.socle(bm)
    ct.cylindre(bm, 0, 0, 0.25, 0.33, R * 1.35, R * 1.25, SEG, "pierre_violette", ROT)     # pied évasé
    ct.cylindre(bm, 0, 0, 0.33, H, R * 1.08, R, SEG, "pierre_violette", ROT)
    for z in c["fen"]:
        fenetre(bm, R * (1.08 - 0.08 * (z - 0.33) / (H - 0.33)), z)
    if c["balcon"]:
        zb = c["balcon"]
        ct.cylindre(bm, 0, 0, zb - 0.05, zb, R * 1.06, R * 1.50, SEG, "pierre_violette", ROT)  # encorbellement
        ct.cylindre(bm, 0, 0, zb, zb + 0.035, R * 1.55, R * 1.55, SEG, "toit_mage", ROT)        # plancher
        for i in range(SEG):
            a = 2 * math.pi * (i + 0.5) / SEG
            ct.pave(bm, (R * 1.47 * math.cos(a), R * 1.47 * math.sin(a), zb + 0.08), (0.025, 0.025, 0.09), a, "toit_mage")
        ct.anneau(bm, (0, 0, zb + 0.13), R * 1.47, 0.03, c.get("garn", "bronze"), n=SEG)
        ct.cylindre(bm, 0, 0, zb - 0.16, zb - 0.11, R * 1.07, R * 1.07, SEG, "bronze", ROT)  # bandeau bronze
        # deux petites orbes sur la balustrade avant
        for sx in (-1, 1):
            a = -math.pi / 2 + sx * 0.75
            x, y = R * 1.47 * math.cos(a), R * 1.47 * math.sin(a)
            if c.get("braseros"):      # brasero : coupe de bronze et flammes
                ct.cylindre(bm, x, y, zb + 0.035, zb + 0.12, 0.022, 0.018, 6, "bronze")
                ct.cylindre(bm, x, y, zb + 0.12, zb + 0.17, 0.04, 0.065, 8, "bronze")
                ct.cone(bm, (x, y, zb + 0.16), (x, y, zb + 0.30), 0.05, 0.0, 6, "flamme")
                ct.cone(bm, (x, y - 0.01, zb + 0.16), (x + 0.01, y - 0.015, zb + 0.25), 0.032, 0.0, 5, "or")
            else:
                ct.cylindre(bm, x, y, zb + 0.035, zb + 0.16, 0.022, 0.018, 6, "bronze")
                ct.boule(bm, (x, y, zb + 0.20), 0.045, c.get("orbe_mat", "orbe"))
    # toit conique (débord) et orbe
    t0, t1, tr = c["toit"]
    ct.cylindre(bm, 0, 0, t0 - 0.03, t0, tr, tr, SEG, "pierre_violette", ROT)
    ct.cylindre(bm, 0, 0, t0, t1, tr, 0.0, SEG, c["toit_mat"], ROT)
    zo, ro = c["orbe"]
    if c.get("pointe"):
        ct.cylindre(bm, 0, 0, t1 - 0.04, zo - ro + 0.01, 0.05, 0.012, 6, "or")             # pointe dorée
        ct.cylindre(bm, 0, 0, zo - ro - 0.02, zo - ro + 0.015, 0.05, 0.035, 6, "or")         # coupelle
        ct.anneau(bm, (0, 0, zo), ro + 0.065, 0.022, "or", n=14, tilt=0.45, az=0.3)
        ct.anneau(bm, (0, 0, zo), ro + 0.095, 0.022, "or", n=16, tilt=-0.5, az=-0.5)
    elif c.get("braseros"):    # coupe de bronze sous l'orbe de feu
        ct.cylindre(bm, 0, 0, t1 - 0.04, zo - ro + 0.02, 0.035, 0.025, 6, "bronze")
        ct.cylindre(bm, 0, 0, zo - ro - 0.01, zo - ro + 0.04, 0.05, 0.09, 8, "bronze")
    else:
        ct.cylindre(bm, 0, 0, t1 - 0.03, zo - ro + 0.015, 0.03, 0.02, 6, c["toit_mat"])
    if n == "3a":              # cercle runique flottant autour de la base du toit
        ct.anneau(bm, (0, 0, t0 - 0.06), 0.37, 0.022, "or", n=20)
        for i in range(8):
            a = 2 * math.pi * i / 8 + 0.2
            ct.pave(bm, (0.37 * math.cos(a), 0.37 * math.sin(a), t0 - 0.035), (0.06, 0.03, 0.014), a + math.pi / 2, "orbe_bleue")
        ct.anneau(bm, (0, 0, zo), ro + 0.10, 0.02, "orbe_bleue", n=18, tilt=0.55, az=1.1)
    ct.boule(bm, (0, 0, zo), ro, c.get("orbe_mat", "orbe"), sub=2)
    return bm


scene, col, mats = ct.ouvrir("Tours")
objs = []
for n in (1, 2, 3):
    objs.append(ct.finir(tour(n), f"tour_mage_{n}", col, mats, (4.0 * (n - 1), LIGNE_Y, 0.0),
                         {"type": "tour", "tour": "mage", "niveau": n}))
va = ct.finir(tour("3a"), "tour_mage_3a", col, mats, (12.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "mage", "niveau": 3, "variante": "a", "version": "Arcanes"})
vb = ct.finir(tour("3b"), "tour_mage_3b", col, mats, (16.0, LIGNE_Y, 0.0),
              {"type": "tour", "tour": "mage", "niveau": 3, "variante": "b", "version": "Pyromancien"})
ct.sauver_et_apercu(scene, objs, "apercu_tours_mage.png", cible_z=0.85, largeur=9.5,
                    autres=[([objs[1], va, vb], "apercu_tours_mage_variantes.png", 15)])
