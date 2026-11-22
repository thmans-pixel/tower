# Génère montagne_rocher_petit/moyen/gros (rochers gris anguleux, calotte de neige, reflets de glace) dans decor.blend.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_rochers.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix, Vector
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("roche"), cm.materiau("roche_fonce"), cm.materiau("neige"), cm.materiau("neige_ombre"),
       cm.materiau("glace")]
ROCHE, ROCHE_F, NEIGE, NEIGE_O, GLACE = range(5)

# blocs : (centre x, centre y, rayons x/y/z, rotation z) ; reflets : nombre de facettes de glace
ROCHERS = {
    "montagne_rocher_petit": dict(bloquant=0, cases=(1, 1), reflets=1,
        blocs=[((0, 0), (0.27, 0.22, 0.22), 0.5)]),
    "montagne_rocher_moyen": dict(bloquant=1, cases=(1, 1), reflets=2,
        blocs=[((0, 0), (0.46, 0.40, 0.48), 1.1)]),
    "montagne_rocher_gros": dict(bloquant=1, cases=(2, 1), reflets=3,
        blocs=[((-0.40, 0.03), (0.55, 0.45, 0.68), 0.4), ((0.46, 0.05), (0.42, 0.38, 0.48), 1.3),
               ((0.84, -0.26), (0.15, 0.14, 0.14), 2.2)]),
}


def rocher(nom, d):
    cm.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    faces_bloc = []
    for (cx, cy), (rx, ry, rz), rot in d["blocs"]:
        c = Vector((cx, cy, rz * 0.40))
        m = Matrix.Translation(c) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Diagonal((rx, ry, rz, 1))
        vs = cm._colore(bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=m), ROCHE)
        for v in vs:                                   # facettes franches : écarts forts, sommet un peu pointu
            v.co = c + (v.co - c) * rnd.uniform(0.82, 1.15)
            v.co.z = max(v.co.z, 0.0)
        faces_bloc.append({f for v in vs for f in v.link_faces})
    candidats = []
    for faces in faces_bloc:
        for f in faces:
            f.normal_update()
            nz = f.normal.z
            if nz > 0.62:
                f.material_index = NEIGE                       # calotte sur les faces tournées vers le ciel
            elif nz > 0.40:
                f.material_index = NEIGE_O                     # bord de la calotte, un peu ombré
            elif f.normal.x < 0.2 and f.normal.y < -0.1 and 0.0 < nz < 0.40:
                candidats.append(f)                            # flancs vus par la caméra : place pour la glace
                f.material_index = ROCHE if f.normal.x < -0.2 else ROCHE_F
            else:
                f.material_index = ROCHE_F if f.normal.x > 0.2 else ROCHE
    candidats.sort(key=lambda f: -f.calc_area())
    for f in candidats[:d["reflets"]]:
        f.material_index = GLACE
    # neige amassée au pied, côté caméra
    s = d["blocs"][0][1][0]
    cm.boule(bm, (d["blocs"][0][0][0] - s * 0.3, -s * 0.55, 0), (s * 0.55, s * 0.35, s * 0.15), NEIGE_O, rnd, sub=1)
    return cm.finir(decor, nom, bm, MAT, d["cases"], d["bloquant"])


objs = [rocher(n, d) for n, d in ROCHERS.items()]
cm.enregistrer_et_apercu(objs, "apercu_montagne_rochers.png", ortho=10.5, res=(1200, 450), hauteur=0.4)
