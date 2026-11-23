# 011 — Monstres tournés dans le sens du chemin

Statut : **validé** (« ok vas y ») — **réalisé côté jeu et script** ; images à rendre par Thibault.

## Ce qu'on voit

- Chaque monstre regarde où il marche : dos en montant, face en descendant, profil à droite et à gauche, en
  biais dans les virages. La chauve-souris suit sa vraie direction de vol ; le boss rugit dans son sens de marche.
- Un monstre arrêté garde sa dernière direction. Pas de clignotement : la direction est lissée sur une dizaine
  de pixels de marche et ne change que franchement au-delà de la moitié du secteur.

## Blender (`tools/blender/rendu_blender.py`)

- Chaque action (marche, vol, rugissement, mort) est rendue en **8 directions** : l'armature tourne autour de Z
  de k × 45° depuis +X (k = 2 : vers +Y, le haut de l'écran). Pas de miroir (ombre et lumière justes).
- Un PNG par action : 8 images en colonnes, 8 directions en lignes (ligne 0 en haut), cadrage commun, même
  ancre. Manifest : `"directions": 8` sur chaque action.
- Le monstre doit regarder vers +X dans Blender ; l'objet armature n'est pas tourné à la main.
- Commande : `flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_blender.py" -- ennemis`.

## Jeu

- `src/render/monstres.js` (`suivre`) : direction lissée par monstre, gardée dans la vue (`Vue.suivi`).
- Un pack sans `directions` reste lu comme avant (une ligne, miroir vers la gauche).
