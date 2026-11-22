"""Outils des ennemis : maillage par morceaux liés à un os, armature, action de marche, aperçus.
Chaque morceau est lié à 100 % à un seul os (liaison rigide, idéale en low poly)."""
import bpy, bmesh, math, os
from mathutils import Matrix, Vector, Quaternion
import commun_tours as ct

LIGNE_Y = -8.0
NB_IMAGES = 8


class Corps:
    """bmesh + groupes de sommets : `with c.os_("tete"): ct.boule(c.bm, ...)`."""
    def __init__(self):
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.groupes = []
        self._os = None

    def os_(self, nom):
        if nom not in self.groupes: self.groupes.append(nom)
        self._os = nom
        self._n0 = len(self.bm.verts)
        return self

    def __enter__(self): return self

    def __exit__(self, *a):
        self.bm.verts.ensure_lookup_table()
        gi = self.groupes.index(self._os)
        for v in list(self.bm.verts)[self._n0:]:
            v[self.dl][gi] = 1.0


def _supprime(nom):
    o = bpy.data.objects.get(nom)
    if o: bpy.data.objects.remove(o, do_unlink=True)


def creer(nom, corps, os_liste, col, mats, props, x):
    """os_liste : [(nom, tête, queue, parent)]. Crée l'armature <nom>_armature et le maillage <nom> lié."""
    _supprime(nom); _supprime(nom + "_armature")
    for a in [a for a in bpy.data.armatures if a.users == 0]: bpy.data.armatures.remove(a)
    ad = bpy.data.armatures.new(nom + "_armature")
    arm = bpy.data.objects.new(nom + "_armature", ad)
    col.objects.link(arm)
    arm.location = (x, LIGNE_Y, 0)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for n, t, q, par in os_liste:
        eb = ad.edit_bones.new(n)
        eb.head, eb.tail, eb.roll = Vector(t), Vector(q), 0.0
        if par: eb.parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode="OBJECT")
    # maillage
    bm = corps.bm
    for v in bm.verts: v.co.z = max(v.co.z, 0.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    for mt in mats: me.materials.append(mt)
    ob = bpy.data.objects.new(nom, me)
    col.objects.link(ob)
    for g in corps.groupes: ob.vertex_groups.new(name=g)
    ob.parent = arm
    mod = ob.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    for o in (ob, arm):
        for k, v in props.items(): o[k] = v
    bpy.context.view_layer.update()
    d = ob.dimensions
    print(f"{nom}: {len(me.polygons)} faces, {d.x:.2f} x {d.y:.2f} x {d.z:.2f}, os : {len(os_liste)}")
    return arm, ob


def q_monde(arm, os_nom, axe, angle_deg):
    """Rotation exprimée dans le repère de l'armature, convertie dans le repère local de l'os."""
    mr = arm.data.bones[os_nom].matrix_local.to_quaternion()
    qw = Quaternion(Vector(axe), math.radians(angle_deg))
    return mr.inverted() @ qw @ mr


def loc_monde(arm, os_nom, dv):
    return arm.data.bones[os_nom].matrix_local.to_3x3().inverted() @ Vector(dv)


def action_marche(arm, nom, poses):
    """poses(f, t) -> {os: (quaternion local, translation locale ou None)} pour f = 1..8, t = phase 0..2pi.
    Crée l'action <nom>_marche et la range dans une piste NLA nommée « marche »."""
    old = bpy.data.actions.get(nom + "_marche")
    if old: bpy.data.actions.remove(old)
    arm.animation_data_create()
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"
    for f in range(1, NB_IMAGES + 1):
        t = 2 * math.pi * (f - 1) / NB_IMAGES
        for os_nom, (q, loc) in poses(f, t).items():
            pb = arm.pose.bones[os_nom]
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f)
            if loc is not None:
                pb.location = loc
                pb.keyframe_insert("location", frame=f)
    act = arm.animation_data.action
    act.name = nom + "_marche"
    act.use_fake_user = True
    act.use_frame_range = True
    act.frame_start, act.frame_end = 1, NB_IMAGES
    act.use_cyclic = True
    act["anim"] = "marche"
    for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
    tr = arm.animation_data.nla_tracks.new(); tr.name = "marche"
    st = tr.strips.new("marche", 1, act)
    if hasattr(st, "action_slot") and act.slots: st.action_slot = act.slots[0]
    arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    return act


def apercus(scene, arm, nom, cible_z=0.3, largeur=1.0):
    """Enregistre le fichier, puis rend une vue de jeu et la planche des 8 images de la marche."""
    import numpy as np
    bpy.ops.wm.save_as_mainfile(filepath=ct.BLEND)
    cam = bpy.data.objects.get("apercu_cam") or bpy.data.objects.new("apercu_cam", bpy.data.cameras.new("apercu_cam"))
    if cam.name not in scene.collection.objects: scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = largeur
    d = Vector((0, math.cos(math.radians(50)), -math.sin(math.radians(50))))
    cam.location = Vector((arm.location.x, arm.location.y, cible_z)) - d * 15
    cam.rotation_euler = (math.radians(40), 0, 0)
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.render.film_transparent = False
    taille = 320
    scene.render.resolution_x = scene.render.resolution_y = taille
    tmp = os.path.join(ct.DOSSIER, ".rendu_tmp"); os.makedirs(tmp, exist_ok=True)
    chemins = []
    for f in range(1, NB_IMAGES + 1):
        scene.frame_set(f)
        scene.render.filepath = os.path.join(tmp, f"f{f}.png")
        bpy.ops.render.render(write_still=True)
        chemins.append(scene.render.filepath)
    imgs = [bpy.data.images.load(p) for p in chemins]
    w, h = imgs[0].size
    planche = np.zeros((h, w * NB_IMAGES, 4), dtype=np.float32)
    for i, im in enumerate(imgs):
        planche[:, i * w:(i + 1) * w] = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
    out = bpy.data.images.new("planche", w * NB_IMAGES, h, alpha=True)
    out.pixels = planche.ravel()
    out.filepath_raw = os.path.join(ct.DOSSIER, f"apercu_{nom}_marche.png"); out.file_format = "PNG"; out.save()
    # vue seule (image 1) en plus grand
    scene.frame_set(1)
    scene.render.resolution_x = scene.render.resolution_y = 600
    scene.render.filepath = os.path.join(ct.DOSSIER, f"apercu_{nom}.png")
    bpy.ops.render.render(write_still=True)
    for p in chemins: os.remove(p)
    os.rmdir(tmp)
    print("OK", nom)
