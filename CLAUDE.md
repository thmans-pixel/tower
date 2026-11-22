# Les Tours du Royaume — repères pour Claude

Tower defense en pixel-art dans le navigateur. Cahier des charges validé : `docs/specs/001-tower-defense.md`,
avenants Blender : `docs/specs/002-decors-blender.md` (décor) et `docs/specs/003-tours-ennemis-blender.md`
(tours, ennemis, boss) ; étape 2 : `docs/specs/004-etape-2.md` (lots 1 à 3). Ne rien coder qui n'y figure
pas sans le faire valider d'abord.

## Règles du dépôt

- **La logique ne dépend jamais de l'affichage.** `src/sim/` n'importe rien de `src/render/`, `src/ui/`,
  `src/input/`, `src/audio/`, ni `window`/`document`. Elle tourne sous Node (tests, joueur automatique).
- **La logique est déterministe** : tout hasard passe par `hasard(graine)` (`src/sim/hasard.js`), jamais
  `Math.random`. Le temps avance par pas fixes de 1/60 s (`avancer`). L'affichage peut utiliser Math.random
  pour ses effets.
- **L'affichage ne modifie jamais l'état** : il le lit et réagit aux événements (`etat.evenements`, vidés par
  `main.js` à chaque image). Les actions du joueur passent par les commandes de `src/sim/partie.js`
  (`poser`, `ameliorer`, `vendre`, `cibler`, `appelerVague`).
- Données (tours, ennemis, vagues, cartes, sortes de décor) dans `src/data/`, textes à l'écran en français.
- Pas d'étape de construction ni de dépendance npm : modules ES servis tels quels.

## Vérifier

- `npm test` doit passer avant toute PR.
- `npm run simulate` : joueur automatique sur la Prairie. Repères actuels (étape 2, lot 2) : « posé » (laisse
  le compte à rebours lancer les vagues, une tour sur deux en « Plus fort » dès la vague 8) gagne avec 3 vies
  environ ; « pressé » (appelle chaque vague dès que possible) perd vers la vague 10 ; sans tour, défaite.
  `journal` donne les vies au lancement de chaque vague. Toute retouche des chiffres de `src/data/` se
  contrôle avec lui.
- Rendu : `python3 tools/serveur.py` (port 8028, sans cache navigateur). `?jouer=prairie` démarre directement,
  `?test=1` expose `window.td` (partie, poser, appelerVague, avancer) pour les essais automatisés.

## Repères du code

- Grille de 24 × 16 cases de 40 px (`src/sim/const.js`) ; la toile fait 960 × 640 et est agrandie en CSS.
- `construireCarte` (carte.js) : cases du chemin (`CHEMIN`), cases prises (`PRIS`) par le château, l'entrée et
  le décor bloquant, trajet au sol (`sol`) et trajet des volants (`vol`, ligne droite). Le décor bloquant reste
  à plus d'une case du chemin.
- Vagues : `appelerVague` construit la file d'apparition ; après la dernière apparition, `compte` démarre
  (`COMPTE_VAGUE`) ; appeler plus tôt rapporte `BONUS_AVANCE` or par seconde restante. Bonus de fin de vague
  quand tous ses ennemis sont tués ou passés (`bilanVagues`).
- Dégâts : `blesser` applique l'armure aux dégâts physiques seulement (moins la part `perce`) ; la magie l'ignore.
- Tours : niveaux 1 et 2 dans `niveaux`, niveau 3 = `specialisations.a|b` (`t.variante`). Toujours lire les
  caractéristiques par `statsTour(t)`. `ameliorer(s, id, variante)` exige la variante au passage au niveau 3.
  Effets gérés dans `partie.js` : zone, porteeMin, ralenti, gel (`geler`, boss seulement ralenti), brulure,
  perce, rebond, transperce, salve, chaine (`eclair`, instantané), etourdit, aura (`auraTour`).
- Ennemis de l'étape 2 : `division` (slime → 2 petits slimes, `apparaitre` avec une distance), `invisible`
  (spectre ; seules les tours de `VOIENT_INVISIBLE` le visent), `boss` + `rugissement` (`pouvoirsEnnemis` :
  `rage` accélère les voisins ; `geler` ne fait que ralentir un boss). Événement `boss` à son apparition ;
  barre de vie dans `#barre-boss`.
- `combattre(s, dt)` : tirs et projectiles sans déplacement, pour tester une tour sur des ennemis immobiles.
- Décors : `src/render/decors.js` charge le pack de Blender et complète avec `decorsDeSecours` (sprites.js),
  par nom `<carte>_<nom>`. Les sortes et leurs noms sont dans `src/data/decors.js`.
- Tours et ennemis de Blender : `src/render/modeles.js` (`nomTour`, `nomEnnemi`), dessinés par
  `Vue.tourModele` (fût : orientation `round(-angle / pas)`, l'angle de Blender tourne vers le haut de l'écran)
  et `Vue.ennemi` (bande d'images, ancre aux pieds). Packs produits par `tools/blender/rendu_blender.py`.
- Sprites en code : `dessiner(l, h, trace)` (sprites.js) trace en basse résolution puis ajoute le contour ;
  affichés ×2 (`ECHELLE`).
- Effets visuels (éclats, chiffres, bandeaux) : `Vue.evenements` ; sons : `Son.evenements` (tout synthétisé).
