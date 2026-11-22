# Les Tours du Royaume

Tower defense en pixel-art dans le navigateur : des créatures sortent de la grotte, on bâtit des tours le long du
chemin pour tenir le château jusqu'à la dernière vague.
Cahier des charges validé : [docs/specs/001-tower-defense.md](docs/specs/001-tower-defense.md) ;
décors Blender : [docs/specs/002-decors-blender.md](docs/specs/002-decors-blender.md).

État : **étape 1 — la Prairie** (4 tours à 3 niveaux, 5 ennemis, 20 vagues).

## Lancer le jeu

Fichiers statiques, sans étape de construction ni dépendance à installer :

```sh
python3 tools/serveur.py
```

Puis ouvrir http://localhost:8028 dans Firefox ou Chrome (ouvrir `index.html` depuis le disque ne marche pas :
les modules JavaScript demandent un serveur). `?jouer=prairie` démarre directement une partie.

## Commandes

| Action | Souris / clavier | Tactile |
| --- | --- | --- |
| Choisir une tour | bouton en bas, ou 1 à 4 | bouton en bas |
| Bâtir | clic sur une case d'herbe libre | toucher une fois (portée), une seconde fois (bâtir) |
| Améliorer, vendre, ciblage | clic sur la tour | toucher la tour |
| Annuler | Échap ou clic droit | toucher le bouton de la tour |
| Pause / vitesse | Espace / F | boutons en haut |

## Règles appliquées

- Or de départ 250, 20 vies. Or à chaque ennemi tué, bonus à chaque vague terminée (15 + 4 × n).
- Après l'arrivée complète d'une vague, la suivante part au bout de 18 s ; l'appeler plus tôt rapporte 2 or par
  seconde gagnée.
- Revente à 70 % de tout ce que la tour a coûté (construction et améliorations).
- Armure (Orc blindé) : la moitié des dégâts physiques (Archers, Canon) ; la magie (Givre, Mage) l'ignore.
- Le Canon ne touche pas les volants ; la Chauve-souris vole tout droit vers le château.
- Le Chaman soigne les ennemis proches toutes les 1,2 s.

## Tests

```sh
npm test            # logique : carte, pose, améliorations, vagues, armure, ciblage, équilibre
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

Rendre le pack que le jeu charge (PNG + `manifest.json` dans `assets/decors/prairie/`, zip à côté) :

```sh
flatpak run org.blender.Blender -b decor.blend -P tools/blender/rendu_decors.py
```

Le fichier `decor.blend` n'est pas modifié. Sans pack, le jeu dessine son décor en code.

## Organisation

- `src/sim/` : logique (carte, vagues, tirs, or), sans navigateur, déterministe.
- `src/data/` : tours, ennemis, cartes et vagues, sortes de décor.
- `src/render/` : sprites en code, chargement des décors de Blender, dessin de la partie.
- `src/ui/`, `src/audio/` : barres, panneau, écrans ; sons synthétisés.
- `tools/serveur.py` : serveur local sans cache ; `tools/blender/` : rendu des décors.
