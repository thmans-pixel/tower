# Spec 023 — Niveaux ultimes des tours et classement des prestiges

Demande de Thibault (2026-11-26) : des niveaux « ultimes » à 3 000 – 8 000 pièces pour que les joueurs puissent avancer
dans les prestiges ; ouvrir un classement des prestiges au hall of fame (reste de la spec 022).
**Statut : validée le 2026-11-26 (réservé aux prestiges, un effet spécial par ultime, prix ci-dessous) ; effets à proposer avant de coder.**

## 1. Niveau ultime (niveau 4)
- Une tour de niveau 3 (spécialisation) peut passer au **niveau 4 « ultime »** pour un prix de 3 000 à 8 000 or.
  Pas de nouveau choix : l'ultime prolonge la spécialisation déjà prise (`a` ou `b`).
- Données : `TOURS[sorte].ultimes = { a: {...}, b: {...} }` et `TOURS[sorte].ameliorations` passe à 3 prix
  (le 3ᵉ = prix de l'ultime). Chaque ultime a un `nom`, une `description`, ses stats complètes et un **effet en plus**
  (pas seulement des chiffres plus gros). `statsTour(t)` lit l'ultime au niveau 4 ; `nomTour` aussi.
- Prix proposés (même prix pour `a` et `b`) :

| Tour | Prix de l'ultime |
|---|---|
| Archers | 3 000 |
| Givre | 3 500 |
| Canon | 4 000 |
| Mage | 5 000 |
| Baliste | 6 500 |
| Tempête | 8 000 |

- Ordre de grandeur des stats : dégâts ×2,5 à ×3 par rapport au niveau 3, cadence ou portée un peu meilleure.
  Les chiffres exacts sont posés par essais avec le joueur automatique (prestiges 1 à 5 jouables) et à la main au-delà.
- Revente : comme aujourd'hui (`REVENTE` × or dépensé).
- **Disponibilité** : **réservés aux prestiges** (`prestige1` à `prestige10`) ; Facile, Normal et Difficile gardent 3 niveaux.
  D'autres niveaux d'ultime pourront s'ajouter plus tard.
- Interface : le bouton « Améliorer » de la fiche affiche le prix (l'or manquant en rouge) ; la fiche (spec 008) ajoute
  l'encadré « Au niveau 4 ». Rendu : le modèle de niveau 3 avec une lueur / un liseré doré et les effets de tir existants
  agrandis (pas de nouveau modèle Blender dans cette spec). Classement (spec 017) : les couronnes comptent comme avant.
- Hall of fame : les règles du serveur (`regles.json`) connaissent le niveau 4 ; les plafonds de dégâts par vague sont relevés.

## 2. Classement des prestiges (hall of fame)
- Un classement par carte de la campagne **et par prestige**, mêmes règles que les trois difficultés d'origine
  (score = `scoreHall`, pseudo, enfants à part). Cartes aléatoires et labyrinthe toujours exclus.
- `regles.json` : ajouter `prestige1` … `prestige10` aux difficultés ; plafonds de dégâts par vague relevés pour les
  prestiges et les ultimes (valeurs réglées avec le joueur automatique).
- `scoreHall` renvoie un score pour les prestiges ; `src/ui/hall.js` montre un onglet « Prestiges » (choix du niveau).
- Le serveur doit être mis à jour avant le jeu (sinon il refuse les envois) : `mettre-a-jour.sh` le relance déjà.

## 3. Équilibre et vérification
- `tests/` : test de l'ultime (prix, passage 3 → 4, stats lues par `statsTour`, vente), test que les règles du serveur
  et du jeu concordent (comme `pseudos`).
- Joueur automatique : il achète un ultime dès qu'il a l'or ; repères à noter ici après essais (vague atteinte par prestige,
  avant et après).
- Objectif : avec ultimes, Prestige 1 à 3 gagnables par un joueur automatique ; les niveaux 8 à 10 « tout juste possibles » à la main.

## Effets des 12 ultimes (validés le 2026-11-26)
Chaque ultime ≈ ×2,5 à ×3 les dégâts de sa spécialisation, plus :
- **Archers a, Œil de faucon** : un tir sur trois est critique (×3) ; portée 200 → 260.
- **Archers b, Pluie d'acier** : ignore toute l'armure (`perce` 1) et transperce 2 ennemis.
- **Givre a, Âge glaciaire** : ralenti 60 % ; tout ennemi ralenti subit +25 % de dégâts de toutes les tours.
- **Givre b, Zéro absolu** : gel 2,2 s ; le boss est ralenti de 60 % ; les voisins de la cible gèlent aussi.
- **Canon a, Pilonnage** : second obus 0,4 s plus tard au même endroit ; zone 70 → 90.
- **Canon b, Dragon** : brûlure 14/s qui se propage aux ennemis proches ; portée 90 → 110.
- **Mage a, Foudre sacrée** : 3 rebonds sans perte de force.
- **Mage b, Météore** : zone ×1,6, brûlure 18/s sur 4 s ; un ennemi qui meurt en brûlant explose et blesse ses voisins.
- **Baliste a, Lance de titan** : transperce 240 ; tue d'un coup un ennemi sous 8 % de PV (boss exclus).
- **Baliste b, Mitrailleuse** : salve de 6 carreaux à dégâts pleins.
- **Tempête a, Tempête parfaite** : chaîne de 14 sans perte de force ; chaque touché est ralenti de 30 %.
- **Tempête b, Colère divine** : étourdissement ×3 ; étourdit aussi le boss (0,5 s par éclair).
Ajouts à `partie.js` : critique, bonus sur ralentis, second obus différé, propagation de brûlure, explosion à la mort, exécution sous seuil.
Points à régler en dernier avec le joueur automatique : Âge glaciaire et Dragon (leurs effets se cumulent avec toutes les tours).

## Livraison (2026-11-26) — lot 1 : niveau 4 jouable
Fait : données (`ULTIMES` dans `tours.js`), logique (`prixAmelioration(t, s)`, `statsTour`, `nomTour`, les 12 effets), fiche de tour,
halo doré et 4ᵉ pastille, `tests/ultimes.test.js`. Pas encore fait : classement des prestiges au hall of fame (§2), réglage fin des chiffres.
Écarts : « transperce 2 ennemis » = 60 px derrière la cible ; « aucune chance aux invisibles » (Foudre sacrée) sans objet : le Mage voit déjà les invisibles.
**Constat d'équilibre** : le joueur automatique perd avant d'avoir de quoi payer un ultime (Prairie, or gagné en tout avant la défaite :
Difficile 4 023 ; P1 2 057 ; P2 765 ; P3 565 ; P5 232), il n'en achète donc aucun et ses repères ne bougent pas (P1 12, P2-P3 7, P5 4, P10 2).
**Aide économique (choix de Thibault, 2026-11-26)** : l'or des monstres et le bonus de fin de vague sont multipliés par `gain` = 1 + 0,25 k au
prestige k (`DIFFICULTES.prestigek.gain`, `s.multGain`, lu par `orCompense`). Joueur automatique, Prairie, 30 tours au plus : P1 perd vague 17,
P2 vague 18, P3 gagne (4 vies), P4 et P5 gagnent (8 vies) ; P6 à P10 perdent aux vagues 2-3 (le joueur automatique n'a pas de quoi poser
plus de 2 tours avant la 3ᵉ vague : à juger à la main). Avec ×1,5 par niveau, P2 à P5 étaient gagnés avec 9 vies : trop généreux.

## À valider
- Rien : les effets sont validés.
