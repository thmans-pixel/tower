---
numero: 016
titre: Mode labyrinthe
depot: autre (thmans-pixel/tower)
statut: en cours
date: 2026-11-23
---

# 016 — Mode labyrinthe

## Le besoin, en une phrase
Thibault veut un mode « maze » où **le joueur construit lui-même le parcours** des monstres avec des murs. Le
parcours passe par des checkpoints (jusqu'à 5) et peut emprunter des téléporteurs ; des zones au sol donnent des
bonus ou des malus. Les monstres ne disparaissent pas quand on les tue : chaque mise à terre **rapporte une vie**,
chaque monstre qui atteint la sortie **en coûte**.

## Ce que ça change pour qui
- Joueurs (Léo, Arthur, les amis) : un nouveau choix « Labyrinthe » au menu, à côté des cartes et du mode infini.
  Les trois cartes à chemin fixe (Prairie, Désert, Montagne), les cartes aléatoires et le mode infini ne changent pas.
- Thibault : rien à administrer, le site statique se redéploie comme d'habitude.

## Règles du mode (décidées avec Thibault)
- **Terrain** : la grille habituelle de 24 × 16 cases, sans décor bloquant. Une **entrée** sur le bord gauche et une
  **sortie** (le château) sur le bord droit, à des hauteurs tirées au hasard.
- **Checkpoints** : de 3 à 5, numérotés, placés **au hasard à chaque partie** (à graine), n'importe où sur la carte et
  dans le désordre (le 1 peut être à l'opposé de l'entrée, le 2 à côté du 3… ; précision de Thibault, 2026-11-24). Les monstres au sol
  passent par l'entrée, puis par les checkpoints dans l'ordre 1 → 5, puis vont à la sortie.
- **Téléporteurs** : 1 ou 2 paires placées au hasard, à sens unique. Un monstre qui marche sur l'entrée d'un TP
  réapparaît aussitôt sur sa sortie. Selon l'endroit où le hasard les a mis, un TP peut **rallonger** le labyrinthe
  (le joueur construit pour y envoyer les monstres, qui doivent ensuite revenir) ou au contraire offrir un raccourci
  aux monstres (le joueur l'entoure alors de murs) : ce n'est pas toujours un avantage. **Entrées** d'une couleur
  (bleu), **sorties en rouge** ; l'entrée et la sortie d'une même paire portent la même forme (rond, losange).
- **Construction** : le joueur pose des **murs** (bon marché, ne tirent pas) et ses **tours** habituelles. Murs et
  tours bloquent le passage. Les monstres prennent toujours **le plus court chemin** (cases voisines, sans diagonale)
  qui respecte l'ordre des checkpoints. **Ils ne prennent jamais un TP d'eux-mêmes**, même s'il raccourcit : ils
  marchent dessus sans l'emprunter. Ils n'y entrent que lorsque les murs du joueur ne leur laissent aucun passage à
  pied (correction de Thibault, 2026-11-24 : c'est au joueur de les y obliger quand il le veut). Il est **interdit de boucher** : une pose qui ne laisse plus aucun chemin
  complet (TP compris) est refusée (« Le passage serait bouché »).
- **Le labyrinthe ne change qu'entre les vagues, mais on peut tout préparer pendant** : pendant une vague, un mur ou
  une tour posés apparaissent **en transparence** (« prévus »), une vente marque l'élément « à retirer ». L'or d'une
  pose prévue est débité tout de suite ; annuler la rend entièrement. Tout est **appliqué d'un coup à la fin de la
  vague**, au début de la pause. Entre les vagues, poses et ventes sont immédiates.
- **Améliorer une tour déjà construite et changer sa cible** restent immédiats, même en pleine vague (ça ne change
  pas le chemin).
- **Zones au sol**, placées au hasard (environ 8 cases) :
  - pour les monstres qui passent dessus : **Boue** (ralentit de 40 %), **Ronces** (dégâts continus),
    **Sentier** (accélère de 30 %), **Source** (soigne) ;
  - pour la tour construite dessus : **Promontoire** (portée + 25 %), **Forge** (dégâts + 25 %),
    **Marais** (cadence − 25 %).
  Un mur peut recouvrir une zone de monstres (elle n'agit plus) ; une zone de tour n'agit que sur une tour.
- **Monstres « immortels »** : quand les PV d'un monstre tombent à 0, il est **mis à terre** : le joueur gagne
  **+1 vie** et **la moitié de l'or habituel** (arrondie au-dessus), le monstre repart **de là où il est** avec ses PV pleins et continue son trajet. Il revient
  **plus fort** : + 30 % de PV à chaque mise à terre (ajout du lot 3).
- **Sortie** : un monstre qui atteint la sortie coûte ses vies habituelles (1, 2 pour l'orc, 3 pour le golem, 10 pour
  l'Ogre) et **quitte la carte** pour de bon.
- **Vagues** : générées comme le mode infini (`genererVague`). Une vague est **finie quand tous ses monstres sont
  sortis** ; alors s'ouvre la pause de construction (compte à rebours de la difficulté, ou bouton « Vague suivante »
  avec le bonus d'avance habituel). Une seule vague à la fois sur la carte.
- **Gagner / perdre** : on **gagne** en atteignant **100 vies** ; on **perd** à 0. Vies de départ selon la
  difficulté (30 / 20 / 10). Le record est le **nombre de vagues** qu'il a fallu pour gagner (moins = mieux), par
  difficulté.
- **Barres de vie** : la touche **V** (et un bouton dans le menu ☰ sur téléphone) affiche ou cache les barres de
  vie de **tous** les monstres, même pleines. Utile dans ce mode puisque les monstres reviennent à PV pleins ;
  marche aussi dans les autres modes.

## Hors périmètre
- Modèles Blender pour les murs, checkpoints, TP et zones : dessinés en code (sprites de secours) dans cette spec ;
  un avenant Blender pourra suivre.
- Carte de labyrinthe faite à la main ou choix du thème (Désert, Montagne) : le terrain a l'ambiance Prairie.
- Changement du labyrinthe appliqué en pleine vague (les poses y restent « prévues »), déplacement d'un mur,
  murs en diagonale.
- Plusieurs entrées ou plusieurs sorties.

## Critères d'acceptation
Logique (`npm test`) :
1. [x] `nouvellePartie('labyrinthe', diff, { graine })` produit toujours la même carte pour une même graine : entrée,
   sortie, 3 à 5 checkpoints, 1 ou 2 paires de TP et des zones, jamais deux sur la même case. — *Vérification :* test
   sur 50 graines (même résultat deux fois, aucune case en double, un chemin existe sur la carte vide).
2. [x] Sur une carte vide, le trajet calculé passe par les checkpoints dans l'ordre puis finit à la sortie, en pas
   d'une case sans diagonale. — *Vérification :* test qui suit le trajet case par case.
3. [x] Un mur qui fermerait le dernier passage est refusé (`raison: 'bouche'`), l'or n'est pas débité ; même chose pour
   une tour. — *Vérification :* test qui mure une colonne entière sauf une case, puis tente la dernière.
4. [x] Pendant une vague, un mur ou une tour posés sont seulement « prévus » : l'or est débité, le trajet des
   monstres en cours ne change pas, la tour prévue ne tire pas ; à la fin de la vague ils sont construits et le
   trajet est recalculé. Une vente prévue n'est faite (et payée) qu'à la fin de la vague. Annuler une pose prévue
   rend tout l'or. Entre deux vagues, poses et ventes sont immédiates et un mur vendu rend tout son prix. Le refus
   « bouché » tient compte de tout ce qui est prévu. — *Vérification :* tests.
5. [x] Ajouter des murs allonge le trajet : un serpentin de murs donne un trajet plus long que la carte vide.
   — *Vérification :* test comparant `longueur`.
6. [x] Un monstre qui atteint l'entrée d'un TP se retrouve à sa sortie au pas suivant, sans glisser entre les deux.
   Sur une carte où les murs ne laissent que le TP comme passage, le trajet passe par lui même s'il est plus long ;
   sinon ils marchent dessus sans le prendre, même s'il raccourcirait. — *Vérification :* tests sur cartes à graine fixe.
7. [x] Un monstre mis à terre donne +1 vie et la moitié de son or, garde sa position, repart PV pleins et reste dans la vague.
   — *Vérification :* test avec `blesser` sur un monstre immobile.
8. [x] Un monstre qui sort retire ses vies et disparaît ; la vague suivante n'arrive qu'une fois tous les monstres
   de la vague sortis. — *Vérification :* test.
9. [x] Atteindre 100 vies donne `fin = 'victoire'` ; 0 vie, `'defaite'`. — *Vérification :* test.
10. [x] Zones : un monstre sur Boue va 40 % moins vite, sur Sentier 30 % plus vite, Ronces le blessent, Source le
    soigne ; une tour sur Promontoire / Forge / Marais a la portée / les dégâts / la cadence modifiés.
    — *Vérification :* tests avec `combattre` et `avancer`.
11. [x] Les volants vont en ligne droite de checkpoint en checkpoint puis à la sortie, sans tenir compte des murs, TP
    et zones. — *Vérification :* test.
12. [x] Les autres modes ne bougent pas : `npm run simulate` donne les mêmes repères que dans le CLAUDE.md.
    — *Vérification :* lancer `npm run simulate`.

Affichage et interface (manipulations sur https://tower.izicraft.fr ou `python3 tools/serveur.py`) :
13. [x] Le menu propose « Labyrinthe » avec le choix de difficulté et le record ; `?jouer=labyrinthe` démarre direct.
14. [x] Checkpoints (drapeaux numérotés), TP (entrées bleues, sorties rouges, même forme par paire), zones (icône et teinte par sorte)
    et sortie sont visibles et reconnaissables ; une fiche explique chaque zone au survol (appui long sur téléphone).
15. [x] **Le trajet des monstres est tracé** à l'écran (pointillés avec flèches) et se met à jour à chaque mur posé
    ou vendu ; le fantôme d'un mur interdit est rouge avec « Le passage serait bouché ». Pendant une vague, les
    éléments prévus sont dessinés en transparence, ceux à retirer sont barrés, et le **futur trajet** est tracé en
    plus clair à côté du trajet en cours ; un clic sur un élément prévu l'annule.
16. [x] Le bouton **Mur** est dans la boutique (touche **7**), avec pose en série (Maj + clic, appui long, ×n sur
    téléphone).
17. [x] La touche **V** affiche ou cache toutes les barres de vie, dans tous les modes ; le choix est gardé.
18. [x] Une mise à terre montre « +1 ♥ » et un petit effet sur le monstre ; le compteur de vies affiche l'objectif
    (« 47 / 100 »).

Équilibre et sauvegarde :
19. [ ] Le joueur automatique a une stratégie labyrinthe (serpentin de murs, tours le long du trajet) : en Normal il
    gagne en 25 vagues environ ; sans mur il perd. Les chiffres retenus sont notés dans le CLAUDE.md.
    — *Vérification :* `npm run simulate -- labyrinthe` (ou équivalent) sur 10 graines.
20. [x] Les records du labyrinthe sont sauvegardés, passent dans le code de transfert, et un ancien code reste lisible.
    — *Vérification :* test de `transfert.js` avec un code produit avant la spec.

## Conception
- **Ce qui existe déjà et qu'on réutilise** : la grille et `construireCarte` (cases `LIBRE` / `PRIS`), les trajets
  `trajet` / `positionSur`, le déplacement par distance `e.d`, les tours, `statsTour`, `blesser`, `ralentir`, la
  brûlure, les vagues générées du mode infini, les difficultés, `hasard(graine)`, la pose en série, le mode mobile.
- **Le trajet est figé pendant une vague** : comme rien ne s'applique avant la fin de la vague, on calcule le trajet une fois
  au lancement (et à chaque pose pour l'aperçu). Le moteur de déplacement actuel reste donc valable : le trajet du
  labyrinthe est un `trajet` ordinaire, construit par un **parcours en largeur** (BFS) segment par segment
  (entrée → CP1 → … → CPn → sortie) sur les cases libres, chaque TP étant un raccourci gratuit dans le graphe.
- **Le saut de TP** : un `trajet` gagne la notion de segment `saut` (longueur 0) ; `positionSur` le franchit sans
  interpolation et sans division par zéro.
- **Nouveau fichier `src/sim/labyrinthe.js`** (pur, sans navigateur) : `genererLabyrinthe(graine, difficulte)`
  (entrée, sortie, CP, TP, zones, vérifie qu'un chemin existe), `calculerTrajet(s)` (BFS, renvoie `null` si bouché),
  `effetsZone(s, e)`, `bonusZoneTour(s, t)`.
- **`partie.js`** : `nouvellePartie('labyrinthe', diff, { graine })` crée un état avec `s.labyrinthe = { murs, cp,
  tp, zones, objectif: 100, prevus: [] }` ; nouvelles commandes `poserMur(s, c, r)`, `vendreMur(s, c, r)` et
  `annulerPrevu(s, c, r)` ; pendant une vague, `poser`, `poserMur`, `vendre` et `vendreMur` rangent l'action dans
  `prevus` (réponse `{ ok: true, prevu: true }`) au lieu de l'appliquer, et `lancer` applique toute la liste quand la
  vague est vide (événement `prevusAppliques`) ; toutes refusent de boucher, en comptant ce qui est prévu ; dans `blesser`, en mode labyrinthe, une mise à terre remet les
  PV au maximum au lieu de retirer le monstre (événement `aTerre`) ; `deplacer` applique les zones ; `bilanVagues`
  vérifie l'objectif ; `lancer` n'ouvre le compte à rebours qu'une fois la vague vide. `statsTour` reste pur : le
  bonus de zone est appliqué par `partie.js` autour de lui.
- **Monstres spéciaux** : le slime ne se divise pas en mode labyrinthe (il revient entier) ; le chaman, le spectre et
  l'Ogre gardent leurs pouvoirs. Les renforts se posent sur une case du trajet courant.
- **Affichage** : murs, CP, TP, zones et tracé du trajet dans `Vue` (sprites en code), touche V dans `main.js`,
  option sauvegardée dans la progression (`barresVie`).
- **Choix écartés** :
  - recalculer le chemin en pleine vague : Thibault veut que les changements ne s'appliquent qu'entre les vagues ;
  - bloquer toute action pendant la vague : Thibault veut pouvoir préparer la suite, en transparence ;
  - TP obligatoire comme un checkpoint : sa place au hasard doit rester une chance ou une malchance ;
  - les tours comme seuls obstacles : Thibault veut des murs séparés, moins chers, pour dessiner le labyrinthe ;
  - un monstre mis à terre qui repart du départ : Thibault veut qu'il reparte de là où il est.

## Fichiers touchés (prévision)
- `src/sim/labyrinthe.js` — nouveau : génération, BFS, zones
- `src/sim/carte.js` — segments `saut` dans `trajet` et `positionSur`
- `src/sim/partie.js` — état du mode, murs, refus pendant la vague, mise à terre, zones, objectif
- `src/data/labyrinthe.js` — nouveau : prix du mur, zones (noms, effets, descriptions), objectif, nombre de CP / TP
- `src/sim/progression.js`, `src/sim/transfert.js` — records du labyrinthe, option `barresVie`
- `src/render/vue.js` (+ éventuellement `src/render/labyrinthe.js`) — murs, CP, TP, zones, tracé, barres forcées
- `src/ui/interface.js`, `src/ui/fiches.js`, `src/ui/mobile.js`, `src/main.js`, `index.html`, `style.css` — menu,
  bouton Mur, touche 7 et V, fiches des zones, compteur « x / 100 »
- `tools/simulate*` — stratégie labyrinthe du joueur automatique
- `test/` — tests des critères 1 à 12 et 20
- `CLAUDE.md` — repères du mode

## Risques
- Enfants / vie privée / IA : rien de nouveau (pas de donnée personnelle, rien ne part à une IA) ; pas de relecture
  `gardien-enfants` nécessaire.
- Données : la progression gagne des champs ; le code de transfert doit rester lisible dans les deux sens (ancien code
  → nouveau jeu). Couvert par le critère 20.
- Équilibre : mises à terre illimitées = beaucoup d'or. À régler avec le joueur automatique (critère 19) ; leviers
  prévus : or par mise à terre réduit, prix des tours, PV par vague.
- Performance : un BFS sur 384 cases à chaque survol de case pendant la pose reste négligeable.

## Étapes
1. **Lot 1 — logique** : `labyrinthe.js`, sauts de TP, commandes et règles dans `partie.js`, tests 1 à 12. (une PR)
2. **Lot 2 — écran** : menu, rendu des éléments, tracé du trajet, bouton Mur, fiches des zones, touche V, mobile.
   (une PR)
3. **Lot 3 — équilibre et sauvegarde** : joueur automatique, réglage des chiffres, records, transfert, CLAUDE.md.
   (une PR)

## Livraison

**Lot 1 — logique (fait).** Critères 1 à 12 cochés, couverts par `tests/labyrinthe.test.js` (14 tests) ; `npm test`
passe (69 tests) et `npm run simulate` redonne exactement les mêmes repères qu'avant sur les autres modes.
- `src/sim/labyrinthe.js` : terrain tiré d'une graine, chemin le plus court par les checkpoints (téléporteurs
  compris), zones. `src/data/labyrinthe.js` : tous les chiffres du mode.
- `src/sim/carte.js` : les trajets savent sauter d'un téléporteur à sa sortie (segment de longueur nulle).
- `src/sim/partie.js` : `nouvellePartie('labyrinthe', diff, { graine })`, `poserMur`, `vendreMur`, `annulerPrevu`,
  poses et ventes « prévues » pendant une vague, mise à terre, zones, objectif de vies, `statsEffectives`.
- Rien ne s'affiche encore : le mode se joue par les tests (lot 2 : écran, lot 3 : équilibre et sauvegarde).
- Chiffres choisis faute de précision dans la spec, à régler au lot 3 : or de départ 250, Ronces 5 % des PV par
  seconde, Source 10 % des PV par seconde, 8 zones tirées au hasard parmi les 7 sortes.

**Lot 2 — écran (fait).** Critères 14 à 18 cochés ; le 13 l'est à moitié : le menu, la difficulté et
`?jouer=labyrinthe` sont là, le **record** arrive avec le lot 3. Essayé dans Chrome sans écran (ordinateur et
téléphone en paysage, au doigt), sans erreur dans la console.
- Menu : mode « Labyrinthe » toujours proposé, avec les règles en bref et l'aperçu du terrain tiré au sort ;
  « Un autre terrain » en tire un nouveau. « Recommencer » rejoue le même terrain, « Rejouer » en tire un autre.
- `src/render/labyrinthe.js` : murs, zones, drapeaux, téléporteurs, entrée, sortie et tracé du trajet, dessinés en
  code. Le futur trajet (bleu clair) s'affiche dès qu'il y a des travaux prévus ou qu'on vise une case.
- Bouton **Mur** (touche 7) : toujours en série, souris enfoncée pour tracer une ligne, reclic sur un mur pour le
  retirer. Sans outil, toucher un mur le vend et toucher un élément prévu l'annule.
- Les pouvoirs passent en 8 et 9 dans ce mode (la 7 est le Mur) ; leurs lettres M et R ne changent pas.
- Touche **V** et bouton « Barres de vie » (dans le menu ☰ sur téléphone), choix gardé dans la progression.
- Bulle d'aide : au survol d'une zone, d'un drapeau, d'un téléporteur, de l'entrée ou de la sortie ; au doigt, en
  touchant la case (elle reste 4 secondes), à la place de l'appui long prévu, que les gestes du zoom prennent déjà.
- Panneau d'une tour : effet de la zone, « Vendre à la fin de la vague » puis « Annuler la vente ».
- Ajouts à la logique pour l'aperçu : `trajetPrevu`, `caseLibre` (testés).
- À vérifier à la main par Thibault : le confort de la pose des murs à la souris et au doigt, la lisibilité des zones
  et des téléporteurs, le son des mises à terre.

**Lot 3 — équilibre et sauvegarde (fait, sauf la moitié du critère 19).** Critères 13 et 20 cochés.
- Records : `enregistrerLabyrinthe` (le moins de vagues pour gagner, par difficulté), affichés au menu et à la fin
  (« Nouveau record ! »). Code de transfert : trois nombres de plus, ajoutés seulement s'il y a un record ; un
  ancien code reste lisible et ne change pas. Réunir deux appareils garde le meilleur record.
- Joueur automatique : `jouerLabyrinthe` dans `tests/simulate.js`, lancé par `node tests/simulate.js labyrinthe`
  (10 terrains par difficulté, puis sans mur).
- Correction en passant : l'aperçu « Prochaine : … » restait celui de la partie précédente en changeant de mode.

### Ce qui bloquait, et la règle ajoutée
Avec les règles de départ, aucun réglage (une soixantaine essayés) ne donnait une partie posée : chaque mise à terre
rapporte une vie *et* de l'or, donc des tours, donc plus de mises à terre, et la partie s'emballait ou s'effondrait
en une dizaine de vagues. Thibault a choisi la correction « le monstre revient plus fort » (2026-11-24) :
- **chaque mise à terre ajoute 30 % de PV au monstre** (`renfort`), en plus de lui rendre toute sa vie ;
- vagues deux fois moins fournies que le mode infini (`tailleVagues` 0,5), pas de PV en plus par vague ;
- **mur à 2 or** au lieu de 5 : à 5 or, un labyrinthe complet (une centaine de murs) coûtait autant que sept tours.

### Résultats du joueur automatique (chiffres retenus)
- Normal : il gagne 18 terrains sur 20, en **17 vagues** environ (de 7 à 25). La spec visait 25 vagues.
- Facile : 10 sur 10, en 4 à 12 vagues. Difficile : 3 sur 10.
- **Sans mur, il gagne aussi** (18 sur 20, en 16 vagues) : la seconde moitié du critère 19 (« sans mur il perd »)
  n'est pas atteinte. Un labyrinthe complet *offert* fait pourtant gagner bien plus vite (8 à 16 vagues contre 17 à
  22) : les murs aident, mais mon joueur automatique ne sait pas en tirer parti aussi bien qu'un humain qui
  place ses tours dans les replis. C'est à juger en jouant.
- Les défaites tombent presque toutes à la vague 10 : l'Ogre coûte 10 vies à la sortie et n'en rend qu'une ou deux.
  Thibault a gardé cette valeur ; « Ogre à 3 vies » reste la première chose à essayer si le Difficile paraît injuste.

## Décisions de Thibault (2026-11-24)
- Pendant une vague on peut tout faire : poses et ventes restent en transparence et ne s'appliquent qu'entre les
  vagues ; améliorations et choix de cible sont immédiats.
- Vies perdues à la sortie : valeurs actuelles (1, 2, 3, 10 pour l'Ogre).
- Or d'une mise à terre : la moitié.
- TP : placés au hasard, parfois utiles pour rallonger, parfois non ; entrées d'une couleur, sorties rouges, une forme
  par paire. Correction du 2026-11-24 : jamais pris d'eux-mêmes, seulement quand les murs ne laissent pas d'autre passage.
- Prix du mur : 5 or pour commencer, revendu au prix plein ; à régler au lot 3 avec le joueur automatique.
- Équilibre (lot 3) : un monstre mis à terre revient plus fort (+ 30 % de PV à chaque fois) ; mur ramené à 2 or.

## Questions ouvertes
(aucune)

## Réglage du 2026-11-27 (accord de Thibault)
PV de base des monstres du labyrinthe × 1,75 au lieu de × 1,5. Joueur automatique, Normal, 10 terrains : avec murs 7 gagnés
sur 10 (10 à 23 vagues), sans mur 6 sur 10. À × 2 et plus il perd presque partout, avec ou sans mur : le critère 19
(« sans mur il perd ») reste non atteint, car le joueur automatique ne tire aucun profit mesurable de ses murs
(population par niveau comprise, spec 024). Seul un joueur humain peut juger l'utilité des murs.
