# Génère montagne_sol_neige (neige tassée, légères ombres bleutées) et montagne_sol_chemin (sentier de neige
# piétinée et de gravier) : plans 2 x 2 raccordables, propriété type=sol, dans decor.blend.
# Raccord : relief périodique (période 2 en X et en Y) ; gravier à plus de 0,15 du bord.
# Lancer : flatpak run org.blender.Blender -b -P scripts/montagne_sols.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, bmesh, math, random
from mathutils import Matrix
import commun_montagne as cm
importlib.reload(cm)

decor = cm.ouvrir()
MAT = [cm.materiau("neige"), cm.materiau("neige_ombre"), cm.materiau("ombre_bleue"), cm.materiau("roche"),
       cm.materiau("roche_fonce")]
NEIGE, NEIGE_O, GRAVIER, CAIL1, CAIL2 = range(5)
DEMI = 1.0


def plan(bm, n, hauteur, couleur):
    """Grille n x n de -1 à 1 ; z = hauteur(x, y) périodique ; couleur(z moyen) choisit le matériau de chaque face."""
    v = [[bm.verts.new((-DEMI + 2 * DEMI * i / n, -DEMI + 2 * DEMI * j / n, 0)) for j in range(n + 1)]
         for i in range(n + 1)]
    for row in v:
        for p in row:
            p.co.z = hauteur(p.co.x, p.co.y)
    for i in range(n):
        for j in range(n):
            q = (v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1])
            f = bm.faces.new(q)
            f.material_index = couleur(sum(p.co.z for p in q) / 4)


def neige(nom):
    cm.nettoie(nom)
    bm = bmesh.new()
    def h(x, y):                               # bosses douces, périodiques de période 2 (et 1)
        return 0.012 * (1.6 + math.sin(math.pi * x) * math.cos(math.pi * y + 0.4)
                        + 0.6 * math.sin(2 * math.pi * x + 1.0) * math.sin(2 * math.pi * y))
    plan(bm, 24, h, lambda z: NEIGE_O if z < 0.011 else NEIGE)     # creux légèrement bleutés
    return cm.finir(decor, nom, bm, MAT, (2, 2), 0, extra={"type": "sol"}, normales=False)


def chemin(nom):
    cm.nettoie(nom)
    rnd = random.Random(nom)
    bm = bmesh.new()
    def h(x, y):                               # neige piétinée : petites bosses serrées
        return 0.006 * (1.5 + math.sin(3 * math.pi * x + 0.5) * math.sin(2 * math.pi * y)
                        + 0.5 * math.cos(2 * math.pi * x) * math.sin(3 * math.pi * y + 1.0))
    plan(bm, 16, h, lambda z: NEIGE_O if z > 0.012 else GRAVIER)  # plaques de neige sur fond de gravier
    for k in range(22):                        # cailloux anguleux, loin des bords
        x, y = rnd.uniform(-0.85, 0.85), rnd.uniform(-0.85, 0.85)
        r = rnd.uniform(0.025, 0.05)
        m = (Matrix.Translation((x, y, 0.006)) @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, "Z")
             @ Matrix.Diagonal((r * rnd.uniform(1.0, 1.5), r, r * 0.55, 1)))
        cm._colore(bmesh.ops.create_icosphere(bm, subdivisions=0, radius=1.0, matrix=m), CAIL1 if k % 2 else CAIL2)
    return cm.finir(decor, nom, bm, MAT, (2, 2), 0, extra={"type": "sol"}, normales=False)


objs = [neige("montagne_sol_neige"), chemin("montagne_sol_chemin")]
# aperçu de dessus, chaque plan répété 2 x 2 pour vérifier le raccord (copies non sauvegardées)
import bpy
bpy.ops.wm.save_as_mainfile(filepath=cm.BLEND)
for o in objs:
    for dx, dy in ((2, 0), (0, 2), (2, 2)):
        c = o.copy(); c.location = (o.location.x + dx, o.location.y + dy, 0)
        bpy.context.scene.collection.objects.link(c)
scene = bpy.context.scene
cam = bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
scene.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = objs[1].location.x - objs[0].location.x + 4.5
cam.location = ((objs[0].location.x + objs[1].location.x) / 2 + 1, cm.LIGNE_Y + 1, 10)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x, scene.render.resolution_y = 1100, 520
scene.render.filepath = os.path.join(cm.DOSSIER, "apercu_montagne_sols.png")
bpy.ops.render.render(write_still=True)
print("OK", cm.BLEND, scene.render.filepath)
