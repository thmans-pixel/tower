# Génère desert_sol_sable (sable ondulé) et desert_sol_chemin (piste de terre tassée et petits cailloux) :
# plans 2 x 2 raccordables, propriété type=sol, dans decor.blend.
# Raccord : le relief est périodique (période 2 en X et en Y), les bords se prolongent donc d'un plan à l'autre ;
# les cailloux restent à plus de 0,15 du bord.
# Lancer : flatpak run org.blender.Blender -b -P scripts/desert_sols.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix
import commun_desert as cd
importlib.reload(cd)

decor = cd.ouvrir()
MAT = [cd.materiau("sable"), cd.materiau("sable_fonce"), cd.materiau("gres"), cd.materiau("gres_fonce"),
       cd.materiau("roche_rouge")]
SABLE, TERRE, CAIL1, CAIL2, CAIL3 = range(5)
DEMI = 1.0                                       # plan de 2 x 2, centré sur l'origine


def plan(bm, n, hauteur, mat):
    """Grille n x n de -1 à 1, relief z = hauteur(x, y) (doit être périodique de période 2)."""
    v = [[bm.verts.new((-DEMI + 2 * DEMI * i / n, -DEMI + 2 * DEMI * j / n, 0)) for j in range(n + 1)]
         for i in range(n + 1)]
    for row in v:
        for p in row:
            p.co.z = hauteur(p.co.x, p.co.y)
    for i in range(n):
        for j in range(n):
            bm.faces.new((v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1])).material_index = mat


def sable(nom):
    cd.nettoie(nom)
    bm = bmesh.new()
    # rides parallèles à Y, longueur d'onde 0,4 (5 rides par plan), crêtes légèrement sinueuses
    def h(x, y):
        ondule = x + 0.06 * math.sin(math.pi * y) + 0.03 * math.sin(2 * math.pi * y + 1.0)
        return 0.018 * (1 + math.sin(2 * math.pi * ondule / 0.4))
    plan(bm, 30, h, SABLE)
    return cd.finir(decor, nom, bm, MAT, (2, 2), 0, extra={"type": "sol"}, normales=False)


def chemin(nom):
    cd.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    # terre tassée : presque plate, très légères bosses périodiques
    h = lambda x, y: 0.004 * (1 + math.sin(math.pi * x) * math.sin(math.pi * y + 0.7))
    plan(bm, 8, h, TERRE)
    # petits cailloux anguleux (icosaèdres aplatis), loin des bords pour le raccord
    for k in range(16):
        x, y = rnd.uniform(-0.85, 0.85), rnd.uniform(-0.85, 0.85)
        r = rnd.uniform(0.03, 0.06)
        m = (Matrix.Translation((x, y, 0.004)) @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, "Z")
             @ Matrix.Diagonal((r * rnd.uniform(1.0, 1.5), r, r * 0.55, 1)))
        res = bmesh.ops.create_icosphere(bm, subdivisions=0, radius=1.0, matrix=m)
        cd._colore(res, (CAIL1, CAIL2, CAIL3)[k % 3])
    ob = cd.finir(decor, nom, bm, MAT, (2, 2), 0, extra={"type": "sol"}, normales=False)
    return ob


objs = [sable("desert_sol_sable"), chemin("desert_sol_chemin")]
# aperçu : chaque plan répété 2 x 2 de dessus pour vérifier le raccord (copies temporaires, non sauvegardées)
import bpy
bpy.ops.wm.save_as_mainfile(filepath=cd.BLEND)
for o in objs:
    for dx, dy in ((2, 0), (0, 2), (2, 2)):
        c = o.copy(); c.location = (o.location.x + dx, o.location.y + dy, 0)
        bpy.context.scene.collection.objects.link(c)
scene = bpy.context.scene
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cx = (objs[0].location.x + objs[1].location.x) / 2 + 1
cam.data.type = "ORTHO"; cam.data.ortho_scale = objs[1].location.x - objs[0].location.x + 4.5
cam.location = (cx, cd.LIGNE_Y + 1, 10)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x, scene.render.resolution_y = 1100, 520
scene.render.filepath = os.path.join(cd.DOSSIER, "apercu_desert_sols.png")
bpy.ops.render.render(write_still=True)
print("OK", cd.BLEND, scene.render.filepath)
