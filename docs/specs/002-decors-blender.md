# 002 — Avenant : décors faits dans Blender

Statut : **validé** par Thibault le 22 novembre 2026.

## Objectif

Thibault modélise les éléments de décor dans Blender ; un script les rend en images et le jeu les affiche à la
place des décors dessinés en code.

## Dans le jeu

- Un pack par carte : `assets/decors/<carte>/manifest.json` et ses PNG.
- Le manifest décrit chaque élément : image, point d'ancrage, taille en cases, bloquant ou non, décor ou sol.
- **Secours** : si le pack ou une image manque, le jeu garde le décor dessiné en code (élément par élément).
- Décors triés par profondeur avec les tours et les ennemis.
- Château et entrée à place fixe ; arbres, rochers, fleurs répartis automatiquement (toujours pareil), sans
  gêner le chemin.
- Les cases prises par le décor sont décidées par la logique (`src/data/decors.js`), pas par le manifest :
  la partie est la même avec ou sans pack.

## Conventions dans Blender

- 1 unité = 1 case ; origine au centre de la base, à Z = 0 ; face principale vers −Y.
- Un objet par élément, dans la collection `Decor`, nommé `<carte>_<nom>` (liste ci-dessous).
- Propriétés personnalisées : `cases_l`, `cases_h`, `bloquant` (1 ou 0), et `type=sol` pour les textures de sol.
- Caméra, lumière et ombres posées par le script.

## Script `tools/blender/rendu_decors.py`

Lancé une fois dans Blender (fichier enregistré) : caméra orthographique inclinée à 50°, soleil venant du haut
à gauche, rendu Cycles sur fond transparent avec ombre portée (attrape-ombre), cadrage au plus juste, PNG et
`manifest.json` écrits dans `assets/decors/<carte>/` (le `.blend` est à la racine du dépôt), plus un zip `decors_<carte>.zip`. Lancement : `flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_decors.py"`.

Style *pixel* (par défaut, accordé aux tours et ennemis) : 20 pixels par case affichés ×2, sans anticrénelage,
ombre unie, contour sombre d'un pixel. Style *lisse* : 80 pixels par case.

## Transmission

Thibault envoie le zip ; il est décompressé dans `assets/decors/<carte>/`.

## Éléments de la Prairie

| Nom | Cases | Bloquant |
| --- | --- | --- |
| prairie_chene_1, _2, _3 | 1 × 1 | oui |
| prairie_sapin_1, _2 | 1 × 1 | oui |
| prairie_souche | 1 × 1 | oui |
| prairie_buisson | 1 × 1 | oui |
| prairie_fleurs_1, _2 | 1 × 1 | non |
| prairie_herbes_hautes | 1 × 1 | non |
| prairie_rocher_petit | 1 × 1 | non |
| prairie_rocher_moyen | 1 × 1 | oui |
| prairie_rocher_gros | 2 × 1 | oui |
| prairie_cloture | 1 × 1 | oui |
| prairie_chateau | 3 × 5 (porte vers −X) | oui |
| prairie_entree | 1 × 3 (ouverture vers +X) | oui |
| prairie_sol_herbe, prairie_sol_chemin | plan 2 × 2, `type=sol` | — |

## Hors périmètre

Tours et ennemis restent dessinés en code ; pas d'animation des décors.

## Critères d'acceptation

- Un pack Prairie rendu par le script s'affiche sans retouche à la main.
- Sans pack, le jeu fonctionne comme avant.
- Ombres et lumière identiques sur tous les éléments.
