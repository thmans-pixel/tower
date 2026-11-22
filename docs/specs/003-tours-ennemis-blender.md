# 003 — Avenant : tours, ennemis et boss faits dans Blender

Statut : **validé** par Thibault le 22 novembre 2026.

## Objectif

Les tours, ennemis et boss modélisés dans `decor.blend` remplacent les sprites dessinés en code ; le code reste
en secours, élément par élément.

## Visible dès l'étape 1

Archers, Canon, Givre, Mage (niveaux 1 à 3) ; Gobelin, Loup, Orc blindé, Chauve-souris, Chaman.
Le reste est rendu mais n'apparaîtra qu'avec l'étape 2 : Baliste, Tempête, versions 3a/3b, Slime, Golem,
Spectre, boss.

## Script de rendu `tools/blender/rendu_blender.py`

Remplace `rendu_decors.py` et traite les trois collections en une commande
(`flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_blender.py"`,
avec `-- decor`, `-- tours` ou `-- ennemis` pour n'en refaire qu'une) :

- **Decor** → `assets/decors/<carte>/`, comme dans la spec 002.
- **Tours** → `assets/tours/` : une image par tour et niveau (objets `tour_<nom>_<niveau>` et `_3a`/`_3b`).
  Pièces mobiles (`tour_<…>_fut`, `tour_<…>_arme`, posées sur l'empty enfant qui porte `role`) rendues à part
  en **16 orientations** autour de leur pivot, en une bande ; le manifest donne le pivot sur l'image de la tour.
- **Ennemis** → `assets/ennemis/` : une bande de 8 images par piste NLA (`marche`, `vol`, `rugissement`),
  même cadrage pour toutes les images d'une action. Pas d'ombre portée pour l'action `vol` (le jeu soulève
  les volants et dessine leur ombre).
- Même caméra (50°), soleil et style que le décor ; `decor.blend` n'est pas modifié.

## Taille à l'écran

Pixels de même taille partout (style pixel, affichage ×2). Ennemis rendus **1,5 fois plus grands** que nature
(`AGRANDISSEMENT_ENNEMIS`) pour rester lisibles ; tours à l'échelle réelle.

## Dans le jeu

- Ennemi : image choisie selon la distance parcourue (une image tous les 5 px, 8 par cycle), retournée vers la
  gauche ; volants animés au temps.
- Fût du canon : orientation la plus proche de la cible, recul de 3 px au tir.
- Les lueurs dessinées en code (orbe du mage, éclat du givre) ne s'ajoutent pas aux modèles de Blender.
- Chargement au démarrage (`src/render/modeles.js`) ; image manquante → sprite en code.

## Noms fixés

- Spécialisations du niveau 3 : Tireurs d'élite / Arbalétriers, Mortier / Lance-flammes, Blizzard / Cristal
  éternel, Arcanes / Pyromancien, Baliste lourde / Répétition, Orage / Paratonnerre.
- Boss de la Prairie : l'Ogre chef de guerre.
- Leurs effets en jeu seront définis dans la spec de l'étape 2.

## Hors périmètre

Animations de mort et d'attaque, vues de face et de dos des ennemis, règles de l'étape 2.

## Critères d'acceptation

- Une seule commande Blender produit les trois packs, sans retouche à la main.
- En jeu, les tours, leurs niveaux et les 5 ennemis de l'étape 1 viennent de Blender, animés sans tremblement ;
  le fût du canon suit sa cible.
- 60 images par seconde avec plus de 100 ennemis à l'écran.
- Sans les packs, le jeu fonctionne comme avant.
