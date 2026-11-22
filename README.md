# Tower defense — décor

Objets de décor low poly pour un tower defense en vue 3/4, faits dans Blender.

- `decor.blend` : tous les objets, dans la collection « Decor », espacés de 4 unités sur X.
- `scripts/` : un script Python par famille d'objets. Il rouvre `decor.blend`, remplace ses objets et refait l'aperçu.
- `apercu_*.png` : rendus de contrôle en vue 3/4.

Lancer un script :

```sh
flatpak run org.blender.Blender -b -P scripts/prairie_chenes.py
```

## Règles

1 unité = 1 case, origine au centre de la base à Z = 0, face vers -Y, un seul objet par élément,
Principled BSDF en couleur unie (rugosité 0,8), moins de 1 500 faces, propriétés `cases_l`, `cases_h`, `bloquant`.

## Objets

| Objet | Cases | Bloquant | Faces |
|---|---|---|---|
| prairie_chene_1 / 2 / 3 | 1 × 1 | 1 | 434 |
| prairie_sapin_1 / 2 | 1 × 1 | 1 | 65 / 84 |
| prairie_souche | 1 × 1 | 1 | 115 |
| prairie_buisson | 1 × 1 | 1 | 620 |
| prairie_fleurs_1 / 2 | 1 × 1 | 0 | 241 |
| prairie_herbes_hautes | 1 × 1 | 0 | 198 |
| prairie_rocher_petit | 1 × 1 | 0 | 80 |
| prairie_rocher_moyen | 1 × 1 | 1 | 80 |
| prairie_rocher_gros | 2 × 1 | 1 | 240 |
| prairie_cloture | 1 × 1 | 1 | 44 |
| prairie_chateau | 3 × 5 | 1 | 652 |
| prairie_entree | 1 × 3 | 1 | 521 |

## Tours (collection « Tours », une ligne par tour : archers Y = 8, canon Y = 12, givre Y = 16, mage Y = 20, baliste Y = 24, tempête Y = 28)

Socle de pierre commun (0,9 × 0,9, hauteur 0,25) dans `scripts/commun_tours.py`. Trois niveaux par tour,
hauteurs 1,3 / 1,5 / 1,7, face vers -Y, propriétés `type=tour`, `tour=<nom>`, `niveau`.

| Tour | Niveau 1 | Niveau 2 | Niveau 3 |
|---|---|---|---|
| archers (`scripts/tours_archers.py`) | 280 faces | 285 faces | 367 faces |
| canon (`scripts/tours_canon.py`) | 160 + fût 62 | 196 + fût 74 | 214 + fût 130 |
| givre (`scripts/tours_givre.py`) | 199 faces | 293 faces | 359 faces |
| mage (`scripts/tours_mage.py`) | 179 faces | 439 faces | 645 faces |
| baliste (`scripts/tours_baliste.py`) | 210 + arme 167 | 214 + arme 179 | 228 + arme 269 |
| tempête (`scripts/tours_tempete.py`) | 482 faces | 671 faces | 1107 faces |

Tour canon : le fût `tour_canon_N_fut` est un objet séparé, pointé vers +X, origine au pivot.
L'empty `pivot_canon_N` (enfant de la tour, propriété `role=pivot_canon`) marque où le poser.
Même principe pour la baliste : `tour_baliste_N_arme` et `pivot_arme_N` (`role=pivot_arme`).

Matériaux émissifs : `glace` (#8FD6FF, 0,3), `fenetre` (#FFD36B, 1), `orbe` (#C77DFF, 2), `eclair` (#9FE3FF, 2), `orbe_bleue` (#4FA3FF, 2), `orbe_feu` (#FF6A2B, 2), `yeux_gobelin` (#FFDE3B, 1), `yeux_rouges` (#FF4D6D, 1), `cristal_vert` (#5DFF9A, 2), `rune_orange` (#FF9A3A, 2).

### Niveau 3 au choix : versions a et b (x = 12 et 16 sur la ligne de chaque tour)

Propriétés en plus : `variante` (a / b) et `version` (nom affiché). Aperçus : `apercu_tours_<nom>_variantes.png`.

| Tour | 3a | 3b |
|---|---|---|
| archers | Tireurs d'élite, 264 faces | Arbalétriers, 317 faces |
| canon | Mortier, 196 + fût 120 | Lance-flammes, 324 + buse 88 (objet `tour_canon_3b_fut`) |
| givre | Blizzard, 600 faces | Cristal éternel, 273 faces |
| mage | Arcanes, 921 faces | Pyromancien, 473 faces |
| baliste | Baliste lourde, 250 + arme 197 | Répétition, 250 + arme 299 |
| tempête | Orage, 1443 faces | Paratonnerre, 824 faces |

Pivots des variantes : `pivot_canon_3a/3b`, `pivot_arme_3a/3b`.

## Ennemis (collection « Ennemis », ligne Y = -8)

Tournés vers +X, origine au sol sous les pieds. Maillage `<nom>` lié à l'armature `<nom>_armature`
(chaque morceau lié à 100 % à un os). Marche : action `<nom>_marche` (images 1 à 8, en boucle, sur place),
rangée dans une piste NLA nommée **marche** (export glTF en mode « pistes NLA » : l'animation s'appelle « marche »).
Propriétés `type=ennemi`, `ennemi=<nom>` sur le maillage et l'armature. Outils : `scripts/commun_ennemis.py`.
Aperçus : `apercu_<nom>.png` et la planche des 8 images `apercu_<nom>_marche.png`.

| Ennemi | Hauteur | Faces | Os |
|---|---|---|---|
| ennemi_gobelin (`scripts/ennemis_gobelin.py`) | 0,55 | 275 | 6 |
| ennemi_loup (`scripts/ennemis_loup.py`), galop, 0,82 de long | 0,45 | 474 | 7 |
| ennemi_orc_blinde (`scripts/ennemis_orc_blinde.py`), marche lourde | 0,80 | 825 | 6 |
| ennemi_chauve_souris (`scripts/ennemis_chauve_souris.py`), volant, action **vol** (piste NLA « vol »), envergure 0,71 | 0,34 | 355 | 6 |
| ennemi_chaman (`scripts/ennemis_chaman.py`), marche courbée sur bâton | 0,65 | 542 | 6 |
| ennemi_slime / ennemi_slime_petit (`scripts/ennemis_slime.py`), rebonds avec écrasement et étirement (os animé en échelle) | 0,50 / 0,30 | 620 | 1 |
| ennemi_golem (`scripts/ennemis_golem.py`), marche très lente | 1,06 | 656 | 6 |
