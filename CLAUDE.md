# Les Tours du Royaume — repères pour Claude

Tower defense en pixel-art dans le navigateur. Cahier des charges validé : `docs/specs/001-tower-defense.md`,
avenants Blender : `docs/specs/002-decors-blender.md` (décor) et `docs/specs/003-tours-ennemis-blender.md`
(tours, ennemis, boss) ; étape 2 : `docs/specs/004-etape-2.md` (lots 1 à 3) ;
étape 3 : `docs/specs/005-etape-3.md` (lots 1 à 3 faits : progression, Désert, Montagne et mode infini). Mise en ligne : `docs/specs/006-mise-en-ligne.md` (https://tower.izicraft.fr,
`tools/deploiement/`). Raccourcis, pose en série, cartes aléatoires : `docs/specs/007-raccourcis-serie-cartes-aleatoires.md` ; fiches des tours : `docs/specs/008-fiches-des-tours.md` ; police lisible : `docs/specs/009-police-lisible.md` ; transfert et Difficile : `docs/specs/010-transfert-et-difficile.md` ; monstres orientés : `docs/specs/011-monstres-orientes.md` ;
effets et animations : `docs/specs/012-effets-et-animations.md` (lots A, B et C faits) ; lisibilité : `docs/specs/013-lisibilite-et-finition.md` ; musique et sons : `docs/specs/014-musique-et-sons.md` ; mode mobile : `docs/specs/015-mode-mobile.md`. Mode labyrinthe : `docs/specs/016-mode-labyrinthe.md` (les trois lots faits ; il reste la moitié du critère 19 : le joueur automatique gagne aussi sans mur, voir « Livraison »). Classement des tours, population et obstacles du labyrinthe : `docs/specs/017-classement-population-obstacles.md` (livrée). Hall of fame en ligne (classements communs, classement enfants à part) : `docs/specs/018-hall-of-fame.md`. Téléporteurs à usage unique : `docs/specs/019-teleporteurs-a-usage-unique.md` (livrée). Ne rien coder qui n'y figure pas sans le faire valider d'abord.

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
  `journal` donne les vies au lancement de chaque vague. Désert (`jouer({ carte: 'desert' })`) : « posé »
  gagne en Normal avec 8 vies environ. Montagne : `jouer({ carte: 'montagne', maxTours: 30 })` gagne avec
  2 vies environ (le plafond par défaut de 20 tours ne suffit pas sur ce chemin). Difficile (PV × 1,1, 15 s, 10 vies) : il perd
  vers la vague 18 sur la Prairie, 8 sur le Désert, 17 sur la Montagne (spec 010). Toute retouche des chiffres de `src/data/` se
  contrôle avec lui.
- Rendu : `python3 tools/serveur.py` (port 8028, sans cache navigateur). `?jouer=prairie` démarre directement,
  `?test=1` expose `window.td` (partie, poser, appelerVague, avancer) pour les essais automatisés.

## Repères du code

- Grille de 24 × 16 cases de 40 px (`src/sim/const.js`) ; la toile fait 960 × 640 et est agrandie en CSS.
- `construireCarte` (carte.js) : une carte a un ou plusieurs chemins (`chemins`, ou `chemin`) et autant
  d'`entrees` ; cases du chemin (`CHEMIN`), cases prises (`PRIS`) par le château, les entrées et le décor
  bloquant ; trajets au sol `sols[k]` et des volants `vols[k]` (ligne droite). Chaque ennemi a une `route`
  (entrées à tour de rôle, `trajetDe(s, e)`). Les renforts gardent une distance par route (`ds`). Noms des
  éléments fixes dans `def.noms`, couleurs du sol de secours dans `def.sol`. Le décor bloquant reste à plus
  d'une case du chemin.
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
- Pouvoirs (`src/data/pouvoirs.js`) : `lancerMeteores(s, x, y)`, `appelerRenforts(s, c, r)` (case de chemin),
  recharges dans `s.pouvoirs`, météores en chute dans `s.meteores`, soldats dans `s.renforts` (bloquent dans
  `deplacer` via `e.bloque`, combattent dans `pouvoirsJoueur`, le boss les écrase). Visée : `ui.pouvoir`/`ui.visee`.
- Difficulté : `nouvellePartie(carte, difficulte)` (`src/data/difficultes.js`) règle `vies`, `or`, `s.multPV`,
  `s.compteVague`. Progression pure dans `src/sim/progression.js` (`enregistrerVictoire`, `etoilesPartie`,
  `relire`) ; transfert par code dans `src/sim/transfert.js` (`codeProgression`, `lireCode`, `fusionner`) ; lecture/écriture navigateur dans `src/ui/sauvegarde.js` (seul endroit qui touche `localStorage`).
- Vagues générées (`src/data/vagues.js`, `genererVague(graine, n, taille)`) : Montagne et mode infini
  (`nouvellePartie(carte, diff, { infini: true })`, `nbVagues = Infinity`, `scoreInfini`). Particularités de
  carte : `vitesse` (neige), `pvParVague`, `ponts`. Records : `enregistrerInfini`, ouverture : `infiniJouable`.
- Cartes aléatoires : `src/sim/generateur.js` (`genererTrace(graine)`, `genererCarte(graine, theme, nbVagues)`,
  `THEMES`, `LONGUEURS`) ; `nouvellePartie` accepte la description produite. Compteur `progression.aleatoires`
  (`enregistrerAleatoire`, ouvert par `aleatoireOuvert` dès le Désert débloqué). Joueur automatique :
  `jouer({ carte: genererCarte(g, 'prairie', 20) })` gagne avec 11 vies environ en moyenne.
- Clavier : `src/ui/clavier.js` (`rangDeTouche` lit `e.code` Digit/Numpad 1-8, donc AZERTY sans Maj ;
  `etiquetteRang`). Pose en série dans `main.js` : Maj + clic ou `ui.verrou` (appui long sur le bouton).
- Fiches (spec 008) : `src/ui/fiches.js` construit le HTML (fiche de boutique, pouvoirs, encadré « Au niveau 2 »,
  spécialisations comparées) à partir des `description` de `src/data/` ; `Interface.majFiche` affiche `#fiche`.
- Polices (spec 009) : `--police` commence par « Chiffres » (chiffres 0-9 pris dans une police de l'appareil, car le
  2 de Pixelify Sans ressemble à un 8), `--texte-police` (system-ui) pour les phrases ; pas de texte sous 13 px.
- `combattre(s, dt)` : tirs et projectiles sans déplacement, pour tester une tour sur des ennemis immobiles.
- Décors : `src/render/decors.js` charge le pack de Blender et complète avec `decorsDeSecours` (sprites.js),
  par nom `<carte>_<nom>`. Les sortes et leurs noms sont dans `src/data/decors.js`.
- Tours et ennemis de Blender : `src/render/modeles.js` (`nomTour`, `nomEnnemi`), dessinés par
  `Vue.tourModele` (fût : orientation `round(-angle / pas)`, l'angle de Blender tourne vers le haut de l'écran)
  et `Vue.ennemi` (bande d'images, ancre aux pieds ; une ligne par direction si `directions`, spec 011). Packs produits
  par `tools/blender/rendu_blender.py` (ennemis en 8 directions).
- Monstres à l'écran (`src/render/monstres.js`) : `suivre` (direction lissée, `Vue.suivi`), `silhouette` (clignotement),
  `poseMort` (corps dans `Vue.morts`) ; pièces d'or vers `#or` (`vue.cibleOr`, `vue.surPiece` dans main.js).
  Événements `blesse` et `mort` (avec `id`) émis par `blesser`.
- Effets des tours (`src/render/tours-effets.js`) : `poseTour` (pose, amélioration, vente ; `Vue.animTours`, `Vue.vendues`),
  `boutArme` ; `Vue.tirer` (lueurs additives `Vue.lueurs`, cône du Lance-flammes), `Vue.crateres`, `Vue.colonnes`.
- Spec 013 : `TAILLE_MONSTRES` (vue.js), liseré par `silhouette(..., couleur)`, chemin teinté et bords en dégradé dans
  `Vue.preparer`, ombres du décor allégées dans `decors.js` (`alleger`), mise en page `etroit` dans main.js.
- Mode labyrinthe (spec 016) : `nouvellePartie('labyrinthe', diff, { graine })` ; `src/sim/labyrinthe.js` (`genererLabyrinthe`,
  `cheminLabyrinthe` = plus court chemin entrée → checkpoints → sortie, à pied d'abord ; la recherche ne cherche jamais un téléporteur,
  mais un monstre dont le chemin pose le pied sur une entrée est téléporté (`troncon`, saut gratuit), et une paire de téléporteurs ne sert
  qu'une fois (spec 019 : `tp.use`, `s.labyrinthe.tpPris`, `usureTp` à la fin de la vague ; `passageAPied` refuse les poses qui ne
  laisseraient que le téléporteur) ;
  `majChemin`, zones ; l'aller et le retour entre deux mêmes points suivent le même chemin à pied), chiffres dans `src/data/labyrinthe.js`. `s.labyrinthe` = { murs, prevus, objectif } ; `poserMur`,
  `vendreMur`, `annulerPrevu` ; pendant une vague (`enVague`) poses et ventes sont « prévues » et appliquées d'un coup
  par `appliquerPrevus` à la fin ; mise à terre dans `metAterre` (événement `aTerre`, pas `mort`) ; tours lues par
  `statsEffectives(s, t)` (effet de zone). Dans les trajets, un point `saut: true` est l'arrivée d'un téléporteur.
  Écran (lot 2) : `src/render/labyrinthe.js` (tout en code : `mur`, `zone`, `teleporteur`, `tracer`, `aideCase`), appelé
  par `Vue.solLabyrinthe` (à plat) et `Vue.objetsLabyrinthe` (triés par profondeur) ; l'outil `ui.construction === 'mur'`
  passe par `batir` / `retirer` (main.js) ; aperçu du futur trajet par `trajetPrevu` ; `ui.caseLibre` sert au
  surlignage des cases (pas de recherche de chemin par case) ; bulle `#aide-case` (`Interface.majAide`) ; touche V =
  `vue.barres` (`progression.barresVie`) ; `?jouer=labyrinthe&graine=5` rejoue un terrain précis.
  Records : `enregistrerLabyrinthe` (`progression.labyrinthe[difficulte]` = moins de vagues pour gagner), portés par le
  code de transfert seulement s'il y en a. Joueur automatique : `node tests/simulate.js labyrinthe` (`jouerLabyrinthe`,
  serpentin de murs). Un monstre mis à terre revient plus fort (`renfort` : + 30 % de PV), ce qui empêche la partie de
  s'emballer. Population maximale (spec 017) : `s.labyrinthe.popMax` (40 ou 50 selon la graine), `populationLabyrinthe(s)`, refus
  `raison: 'population'` ; obstacles `lab.obstacles` ({ type: 'rocher' | 'montagne', cases }), `casesObstacles`, fermés comme des
  murs mais non vendables ni comptés ; dessinés par `Laby.obstacle`. Records : `progression.reglesLaby = 2` (sinon les records
  de labyrinthe sont ignorés), codes `TDR2` quand ils portent des records. PV des monstres × 1,5. Repères actuels (2026-11-24, 10
  terrains) : Normal 9 gagnés sur 10 en 5 à 22 vagues, sans mur 8 sur 10 ; Facile 10 sur 10 en 3 à 11 ; Difficile 8 sur 10.
  Joueur automatique : murs gloutons (celui qui rallonge le plus le trajet) dans ce que la population permet.
- Classement des tours (spec 017, lot 1) : `tour.degatsVague[v]` (dans `blesser`), `s.orVague[v]`, `s.vendues` ; à la fin de
  chaque vague (`bilanVagues`) la tour qui a le plus frappé ses monstres reçoit `ceil(¼ × (or des monstres + bonus de fin))`
  (`tourDeLaVague`, couronnes). Or des monstres et bonus de fin × `COMPENSATION_OR` (0,78, `const.js`, restes reportés par
  `orCompense`). `classement(s)` alimente `#classement` (touche C) et le podium de fin. Repères Normal : Prairie posé 3 vies,
  pressé perd vague 10, Désert 7 vies, Montagne 7 vies (maxTours 30) ; Difficile inchangé.
- Hall of fame (spec 018) : serveur Python sans dépendance dans `tools/hall/` (`hall.py` : `serveur`, `liste`, `retirer <n>`, `vider <classement>` ;
  `regles.json` = cartes, difficultés, tours, bornes, mots interdits, pseudos d'enfants ; `python3 -m unittest discover -s tools/hall`).
  Il écoute 127.0.0.1:8029, nginx renvoie `/api/` (`tower-hall.conf`), base `/var/lib/tower/hall/hall.db`, installé une fois par
  `sudo bash /var/lib/tower/source/tools/hall/installer.sh` (crée la commande `sudo tower-hall …`) ; `mettre-a-jour.sh` le relance.
  Il ne garde que pseudo, enfant/adulte, liste, valeur, détail, jour, version des règles (jamais d'IP : la limite de 20 envois par
  heure est en mémoire). Côté jeu : `src/sim/hall.js` (`scoreHall(s, idCarte)`, `pseudoEnfant`, `pseudoValide`),
  `src/data/pseudos.js` (mêmes listes que `regles.json`, un test le vérifie), `progression.enfant` / `pseudo` / `pseudoEnfant`
  (la case « enfant » est portée par le code de transfert, bit 8 des drapeaux ; le pseudo reste sur l'appareil).
  **Seul `src/ui/hall.js` fait des appels réseau** (`/api/hall`) et ce qui vient du serveur n'entre dans la page que par `textContent`.
  Les enfants n'ont pas de texte libre : pseudo « Animal Couleur nombre » proposé par le jeu. Cartes aléatoires jamais classées.
  `tools/serveur.py` renvoie `/api/` vers le port 8029 pour essayer en local (`HALL_DB=/tmp/h.db python3 tools/hall/hall.py serveur`).
  Plafonds de dégâts par vague dans `regles.json` (le joueur automatique fait ~2 700 par vague au mieux, plafond 20 000).
- Ambiance (`src/render/ambiance.js`, `Vue.ambiance`) par thème de carte ; `vue.reduits` = option « Effets »
  (`progression.effetsReduits`).
- Mode mobile (`src/ui/mobile.js`, spec 015) : classes `mobile` / `paysage` / `portrait` sur `<body>` (`?mobile=1` pour
  essayer), gestes et zoom sur la toile, ✔ / ✖ (`majConfirmation`), `toucher(e)` et `batir()` dans main.js ; styles
  `body.mobile …` à la fin de style.css.
- Sprites en code : `dessiner(l, h, trace)` (sprites.js) trace en basse résolution puis ajoute le contour ;
  affichés ×2 (`ECHELLE`).
- Effets visuels (éclats, chiffres, bandeaux) : `Vue.evenements` ; sons : `Son.evenements` (tout synthétisé, voies `effets`
  et `musique`, `son.appliquer()` après un changement de réglage ; `volMusique`, `volEffets` dans la progression).
  Musique : `src/audio/musique.js` (`AIRS` : prairie et désert originaux, montagne = Korobeiniki du domaine public,
  boss, menu, sorcier = L'Apprenti sorcier de Dukas, domaine public), pilotée par `majMusique` (main.js) ; l'air d'une
  partie est tiré au hasard dans `AIRS_DE_PARTIE`. Ne pas reprendre de musique protégée (Arkanoid et Game of Thrones refusés : airs originaux « dans l'esprit »).
