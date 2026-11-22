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

Matériaux émissifs : `glace` (#8FD6FF, 0,3), `fenetre` (#FFD36B, 1), `orbe` (#C77DFF, 2), `eclair` (#9FE3FF, 2).
