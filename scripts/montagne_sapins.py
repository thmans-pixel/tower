# Génère montagne_sapin_1/2/3 (sapins coniques chargés de neige sur chaque étage, tronc court)
# dans decor.blend (collection Decor, ligne de la montagne Y = -24). Hauteurs 1,6 / 2,0 / 1,2.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_sapins.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("sapin"), cm.materiau("sapin_clair"), cm.materiau("neige"), cm.materiau("neige_ombre"),
       cm.materiau("bois")]
SAPIN, SAPIN_C, NEIGE, NEIGE_O, BOIS = range(5)
SEG = 10                                          # côtés de chaque étage

# hauteur totale, nombre d'étages, rayon de l'étage du bas
SAPINS = {
    "montagne_sapin_1": dict(h=1.6, etages=4, r=0.44),
    "montagne_sapin_2": dict(h=2.0, etages=5, r=0.47),
    "montagne_sapin_3": dict(h=1.2, etages=3, r=0.40),
}
TRONC = 0.22                                      # partie visible du tronc sous le premier étage


def calotte(bm, z_haut, z_bas, r_bas, z_bord, rot, rnd):
    """Neige posée sur un étage : cône qui épouse l'étage depuis la pointe jusqu'à z_bord,
    bord dentelé (une pointe sur deux coule plus bas), dessous fermé."""
    k = (z_haut - z_bord) / (z_haut - z_bas)      # fraction du rayon atteinte au bord
    sommet = bm.verts.new((0, 0, z_haut + 0.025))
    bord, dessous = [], []
    for i in range(2 * SEG):
        a = rot + math.pi * i / SEG
        coule = i % 2 == 0
        kk = min(1.0, k * (1.22 if coule else 1.0)) + 0.03
        z = z_bord - (0.11 + rnd.uniform(0, 0.04) if coule else 0.0)
        r = r_bas * kk + 0.035
        bord.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        dessous.append(bm.verts.new((r * 0.80 * math.cos(a), r * 0.80 * math.sin(a), z + 0.03)))
    n = len(bord)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((sommet, bord[i], bord[j])).material_index = NEIGE
        bm.faces.new((bord[j], bord[i], dessous[i], dessous[j])).material_index = NEIGE_O
    bm.faces.new(list(reversed(dessous))).material_index = NEIGE_O


def sapin(nom, d):
    cm.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    h, n, r0 = d["h"], d["etages"], d["r"]
    # monticule de neige au pied et tronc court
    cm.boule(bm, (0, 0, 0), (0.30, 0.28, 0.06), NEIGE_O, rnd, sub=1)
    cm.cone(bm, (0, 0, 0), (0, 0, TRONC + 0.12), 0.08, 0.065, 7, BOIS)
    # étages : chacun commence sous la pointe du précédent, se resserre vers le haut
    z0, haut = TRONC, h - 0.025                   # la neige de la pointe dépasse de 0,025
    pas = (haut - z0) / (n + 0.6)
    for k in range(n):
        z_bas = z0 + k * pas
        z_haut = haut if k == n - 1 else z_bas + pas * 1.55        # étages qui se chevauchent peu : jupes visibles
        r = r0 * (1 - 0.68 * k / max(1, n - 1))
        rot = rnd.uniform(0, math.pi)
        cm.cone(bm, (0, 0, z_bas), (0, 0, z_haut), r, 0.0, SEG, SAPIN if k % 2 == 0 else SAPIN_C)
        z_bord = z_haut - (z_haut - z_bas) * (0.62 if k == n - 1 else 0.64)
        calotte(bm, z_haut, z_bas, r, z_bord, rot, rnd)
    return cm.finir(decor, nom, bm, MAT, (1, 1), 1)


objs = [sapin(n, d) for n, d in SAPINS.items()]
cm.enregistrer_et_apercu(objs, "apercu_montagne_sapins.png", ortho=11.0, res=(1100, 500), hauteur=0.9)
