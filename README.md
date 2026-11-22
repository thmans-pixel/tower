# Les Tours du Royaume

Tower defense en pixel-art dans le navigateur : des créatures sortent de la grotte, on bâtit des tours le long du
chemin pour tenir le château jusqu'à la dernière vague.
Cahier des charges validé : [docs/specs/001-tower-defense.md](docs/specs/001-tower-defense.md) ;
décors Blender : [docs/specs/002-decors-blender.md](docs/specs/002-decors-blender.md).

État : **cahier des charges terminé** — 3 cartes (Prairie, Désert, Montagne enneigée), mode infini, difficultés, étoiles, sauvegarde — la Prairie, 6 tours (2 niveaux puis une spécialisation au choix sur 2), 9 ennemis
(slime, golem, spectre compris), l'Ogre chef de guerre aux vagues 10 et 20, 20 vagues, pluie de météores et renforts. Specs des étapes 2 et 3 : [004](docs/specs/004-etape-2.md), [005](docs/specs/005-etape-3.md).

## Lancer le jeu

Fichiers statiques, sans étape de construction ni dépendance à installer :

```sh
python3 tools/serveur.py
```

Puis ouvrir http://localhost:8028 dans Firefox ou Chrome (ouvrir `index.html` depuis le disque ne marche pas :
les modules JavaScript demandent un serveur). `?jouer=prairie` démarre directement une partie.

## En ligne

https://tower.izicraft.fr — site statique YunoHost sur thnas, copie de la branche `main`, public.
Pour mettre à jour le site après avoir fusionné une demande, sur thnas :

```sh
sudo bash ~/tower-mettre-a-jour.sh /var/www/my_webapp__4/www
```

Le script (`tools/deploiement/mettre-a-jour.sh`, copié dans `~/tower-mettre-a-jour.sh`) ne copie que le jeu.
Réglage du cache : `tools/deploiement/cache.conf`. La version en ligne s'affiche sous le
bouton « Jouer » ; un simple rechargement de la page suffit à la voir. Spec : `docs/specs/006-mise-en-ligne.md`.

## Commandes

| Action | Souris / clavier | Tactile |
| --- | --- | --- |
| Choisir une tour | bouton en bas, ou 1 à 6 | bouton en bas |
| Bâtir | clic sur une case d'herbe libre | toucher une fois (portée), une seconde fois (bâtir) |
| Améliorer, spécialiser, vendre, ciblage | clic sur la tour | toucher la tour |
| Annuler | Échap ou clic droit | toucher le bouton de la tour |
| Pouvoirs | M (météores), R (renforts), puis clic sur la carte | bouton, toucher une fois (zone), une seconde fois (lancer) |
| Pause / vitesse | Espace / F | boutons en haut |

## Règles appliquées

- Trois difficultés (Facile, Normal, Difficile) : vies, or de départ, PV des ennemis et temps entre les vagues.
  Étoiles de 1 à 3 selon les vies restantes ; gagner une carte ouvre la suivante. Progression gardée dans le
  navigateur (bouton « Effacer la progression » sur l'écran des cartes).
- En Normal : or de départ 250, 20 vies. Or à chaque ennemi tué, bonus à chaque vague terminée (15 + 4 × n).
- Après l'arrivée complète d'une vague, la suivante part au bout de 18 s ; l'appeler plus tôt rapporte 2 or par
  seconde gagnée.
- Revente à 70 % de tout ce que la tour a coûté (construction et améliorations).
- Au niveau 3, chaque tour devient l'une de deux spécialisations (même prix, choix définitif).
- Armure (Orc blindé) : la moitié des dégâts physiques (Archers, Canon, Baliste) ; la magie (Givre, Mage,
  Tempête) l'ignore, les Arbalétriers en ignorent la moitié.
- Le Canon ne touche pas les volants ; la Chauve-souris vole tout droit vers le château.
- Le Chaman soigne les ennemis proches toutes les 1,2 s. Le Slime se divise en deux à sa mort. Le Spectre devient
  invisible 2 s toutes les 5 s : seuls le Mage et la Tempête le visent alors.
- L'Ogre chef de guerre (vagues 10 et 20) coûte 10 vies s'il passe ; son rugissement accélère ses voisins.
  Le gel ne fait que le ralentir.

## Tests

```sh
npm test            # logique : carte, pose, améliorations, vagues, armure, ciblage, spécialisations, équilibre
npm run simulate    # joueur automatique sur la Prairie
```

## Décor dans Blender

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


## Désert (collection « Decor », ligne Y = -16)

Outils partagés dans `scripts/commun_desert.py` (palette, place fixe de chaque objet, contrôle des faces, aperçu).
Un script par famille : `scripts/desert_<famille>.py`, aperçu `apercu_desert_<famille>.png`.
Palette : sable #E3C27A / #C9A35C, grès #C97B4A / #A85F36, rochers rouges #B5523B, cactus #5E8C3A / #7DAA4E,
palmes #4E8A3C, tronc de palmier #8A6A43, eau #3FA7C9 (et #1F1B18 pour le fond des ouvertures, #E86A92 pour la fleur du saguaro, #EFE6CF pour l'os, #C0392B / #F2C14E pour les bannières).

| Objet | Cases | Bloquant | Faces |
|---|---|---|---|
| desert_palmier_1 / 2 (hauteur 1,8, tronc annelé, 7 / 8 palmes, grappe de dattes) | 1 × 1 | 1 | 497 / 515 |
| desert_cactus_1 / 2 / 3 (saguaros 1,0 / 1,3 / 0,7, bras 1 / 2 / 0, fleur rose sur le 2) | 1 × 1 | 1 | 230 / 355 / 133 |
| desert_souche (tronc de palmier cassé) | 1 × 1 | 1 | 99 |
| desert_buisson | 1 × 1 | 1 | 364 |
| desert_fleurs_1 / 2 (cactus boules fleuris) | 1 × 1 | 0 | 224 / 272 |
| desert_herbes_hautes | 1 × 1 | 0 | 116 |
| desert_rocher_petit (grès rouge en couches, 2 dalles) | 1 × 1 | 0 | 40 |
| desert_rocher_moyen (4 dalles) | 1 × 1 | 1 | 60 |
| desert_rocher_gros (piles de 5 et 3 dalles) | 2 × 1 | 1 | 120 |
| desert_cloture | 1 × 1 | 1 | 166 |
| desert_oasis (eau bordée de pierres et de roseaux, palmier nain) | 2 × 2 | 1 | 640 |
| desert_chateau | 3 × 5 (porte vers −X) | 1 | 866 |
| desert_entree | 1 × 3 (ouverture vers +X) | 1 | 155 |
| desert_dune (croissant, crête vive, face raide côté caméra) | 2 × 1 | 1 | 129 |
| desert_touffe (herbe sèche jaune et crâne de bœuf) | 1 × 1 | 0 | 210 |
| desert_forteresse (2 tours à coupoles dorées, porte en bois vers −X, bannières rouge et or, hauteur 3) | 3 × 5 | 1 | 983 |
| desert_entree_nord (passage sous une arche de grès, `scripts/desert_entrees.py`) | 1 × 3 (ouverture vers +X) | 1 | 231 |
| desert_entree_sud (gorge ouverte entre deux falaises en gradins) | 1 × 3 (ouverture vers +X) | 1 | 276 |
| desert_sol_sable (sable ondulé, `scripts/desert_sols.py`) | plan 2 × 2 raccordable, `type=sol` | 0 | 900 |
| desert_sol_chemin (terre tassée, petits cailloux) | plan 2 × 2 raccordable, `type=sol` | 0 | 384 |

## Montagne (collection « Decor », ligne Y = -24)

Outils partagés dans `scripts/commun_montagne.py`. Un script par famille : `scripts/montagne_<famille>.py`,
aperçu `apercu_montagne_<famille>.png`. Palette : neige #F2F6FA / #DCE6EF, ombre bleutée #B8C8D8,
glace #9FD3EA / #6FB3D6, roche #7A8290 / #5E6673, sapin #2F6B4A / #3F8560, bois #7A5230, toits #9B3B2E.

| Objet | Cases | Bloquant | Faces |
|---|---|---|---|
| montagne_sapin_1 / 2 / 3 (hauteurs 1,6 / 2,0 / 1,2 ; 4 / 5 / 3 étages enneigés) | 1 × 1 | 1 | 237 / 289 / 185 |

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

Matériaux émissifs : `glace` (#8FD6FF, 0,3), `fenetre` (#FFD36B, 1), `orbe` (#C77DFF, 2), `eclair` (#9FE3FF, 2), `orbe_bleue` (#4FA3FF, 2), `orbe_feu` (#FF6A2B, 2), `yeux_gobelin` (#FFDE3B, 1), `yeux_rouges` (#FF4D6D, 1), `cristal_vert` (#5DFF9A, 2), `rune_orange` (#FF9A3A, 2), `yeux_bleus` (#7FD8FF, 2).

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
| ennemi_spectre (`scripts/ennemis_spectre.py`), flottement ondulant, matériaux opaques | 0,73 | 301 | 5 |
| boss_ogre (`scripts/boss_ogre.py`), boss : actions « marche » (pas lourds) et « rugissement », pistes NLA du même nom | 1,60 | 1 101 | 9 |

## Rendre les packs pour le jeu

Décor d'une autre carte : ajouter `-- decor carte=desert` (seuls les objets `desert_…` sont rendus).


Une seule commande rend le décor (`assets/decors/prairie/`), les tours (`assets/tours/`, pièces mobiles en
16 orientations) et les ennemis (`assets/ennemis/`, bandes de 8 images par action) — spec 003 :

```sh
flatpak run org.blender.Blender -b "$PWD/decor.blend" -P "$PWD/tools/blender/rendu_blender.py"
```

Ajouter `-- decor`, `-- tours` ou `-- ennemis` à la fin pour n'en refaire qu'une partie. Le fichier
`decor.blend` n'est pas modifié. Ce qui manque dans les packs, le jeu le dessine en code.

## Organisation

- `src/sim/` : logique (carte, vagues, tirs, or), sans navigateur, déterministe.
- `src/data/` : tours, ennemis, cartes et vagues, sortes de décor.
- `src/render/` : sprites en code, chargement des packs de Blender (décors, tours, ennemis), dessin de la partie.
- `src/ui/`, `src/audio/` : barres, panneau, écrans ; sons synthétisés.
- `tools/serveur.py` : serveur local sans cache ; `tools/blender/` : rendu des packs depuis `decor.blend`.
