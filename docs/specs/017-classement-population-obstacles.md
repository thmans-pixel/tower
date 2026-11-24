---
numero: 017
titre: Classement des tours, population maximale et obstacles du labyrinthe
depot: autre (thmans-pixel/tower)
statut: validée
date: 2026-11-24
---

# 017 — Classement des tours, population maximale et obstacles du labyrinthe

## Le besoin, en une phrase
Thibault veut trois ajouts. Un **classement des tours par dégâts**, dans tous les modes : la meilleure tour de
chaque vague rapporte un bonus d'or. Dans le labyrinthe, une **population maximale** (chaque mur et chaque tour
compte pour 1) et des **obstacles** (rochers, montagnes) pour que le joueur ne puisse plus construire un labyrinthe
sans fin.

## Ce que ça change pour qui
- Joueurs : un classement des tours à consulter en partie et à la fin. Dans le labyrinthe, un compteur de
  population, des obstacles sur le terrain, et des parcours à construire plus réfléchis.
- Thibault : rien à administrer ; redéploiement habituel du site.

## Règles (décidées avec Thibault)

### A. Classement des tours (tous les modes)
- Les tours sont classées par **dégâts totaux** depuis leur construction (le compteur « Dégâts totaux » qui existe
  déjà dans leur panneau ; brûlure comprise ; les pouvoirs, les renforts et les zones ne comptent pour aucune tour).
- **Tour de la vague** : à la fin de chaque vague, la tour qui a fait **le plus de dégâts aux monstres de cette
  vague** rapporte un bonus de **1/4 de l'or rapporté par la vague** : l'or des monstres de cette vague (abattus,
  ou mis à terre dans le labyrinthe) plus le bonus de fin de vague. Le bonus d'appel anticipé ne compte pas. Arrondi
  au-dessus. En cas d'égalité, la tour la plus ancienne l'emporte.
- La vague « se termine » au même moment qu'aujourd'hui (versement du bonus de fin de vague). Comme on peut appeler
  la vague suivante en avance, les dégâts sont comptés **par vague du monstre touché**, et non par tranche de temps.
- Si la tour de la vague a été vendue avant la fin de la vague, le bonus est versé quand même, à son nom.
- Chaque tour garde son nombre de **couronnes** : le nombre de vagues qu'elle a remportées.
- **Compensation** (choix de Thibault) : pour que la difficulté ne bouge pas, l'or des monstres et le bonus de fin de
  vague sont multipliés par **0,8** dans tous les modes ; avec le bonus de 1/4, l'or total d'une vague reste le même
  (0,8 × 1,25 = 1). Le bonus d'appel anticipé et l'or de départ ne changent pas.

### D. Records du labyrinthe
- Les records du labyrinthe faits avant cette spec sont **effacés** (choix de Thibault) : les règles changent et ils
  ne seraient plus comparables. Un code de transfert produit avant cette spec ne les fait pas revenir.

### B. Population maximale (labyrinthe)
- Chaque mur et chaque tour, construits **ou prévus** (pendant une vague), comptent pour **1**.
- Le plafond est de **40 ou 50**, tiré au hasard avec le terrain (même graine, même plafond).
- Au plafond, toute pose est refusée (« Population maximale atteinte ») ; vendre un mur ou une tour libère sa place.
  Améliorer une tour ne coûte pas de population. Les obstacles ne comptent pas.

### C. Obstacles (labyrinthe)
- Tirés au hasard avec le terrain : **6 à 10 rochers** d'une case et **1 à 3 montagnes** de plusieurs cases
  (3 à 8 cases d'un seul tenant).
- Ils ferment leur case comme un mur, mais ne coûtent rien, ne se vendent pas et ne comptent pas dans la population.
  On ne construit pas dessus. Les volants passent au-dessus.
- Jamais sur l'entrée, la sortie, un checkpoint, un téléporteur ou une zone ; et le terrain vide doit toujours
  laisser un chemin à pied de l'entrée à la sortie par tous les checkpoints (sinon on retire les obstacles).

## Hors périmètre
- Multijoueur, classement entre joueurs ou en ligne.
- Modèles Blender des obstacles (dessinés en code, comme les murs).
- Obstacles et population dans les autres modes.
- Bonus de classement autre que l'or (dégâts, portée…).

## Critères d'acceptation
Classement (logique, `npm test`) :
1. [ ] Chaque tour compte ses dégâts par vague de monstre touché ; la somme sur les vagues égale ses dégâts totaux.
   — *Vérification :* test avec deux tours et deux vagues qui se chevauchent.
2. [ ] À la fin d'une vague, la tour qui a fait le plus de dégâts à ses monstres rapporte `ceil(1/4 × (or des
   monstres de la vague + bonus de fin de vague))`, une seule fois ; événement `tourDeLaVague` (tour, vague, or) ;
   sa couronne est comptée. — *Vérification :* test avec `combattre` sur des monstres immobiles.
3. [ ] Égalité : la plus ancienne gagne. Tour vendue avant la fin : le bonus est versé quand même. Aucune tour n'a
   touché la vague : pas de bonus. — *Vérification :* tests.
4. [ ] Dans le labyrinthe, l'or des mises à terre compte comme l'or de la vague. — *Vérification :* test.

Classement (écran) :
5. [ ] Bouton « Classement » (touche **C**, et dans le menu ☰ sur téléphone) : liste des tours de la plus forte à la
   plus faible (rang, image, nom et niveau, dégâts totaux, couronnes) ; cliquer une ligne sélectionne la tour.
6. [ ] Le panneau d'une tour affiche son rang (« 2e sur 9 ») et ses couronnes.
7. [ ] À chaque fin de vague : bandeau « Tour de la vague : Mage (+18 or) », couronne au-dessus de la tour pendant
   quelques secondes, son de récompense.
8. [ ] L'écran de fin montre le podium (3 premières tours).

Population (labyrinthe) :
9. [ ] Plafond 40 ou 50 selon la graine, toujours le même pour une graine ; les deux valeurs sortent sur 50 graines.
   — *Vérification :* test.
10. [ ] Au plafond, `poser` et `poserMur` refusent (`raison: 'population'`), sans débiter l'or, prévus compris ;
    vendre ou annuler libère la place ; améliorer ne coûte rien. — *Vérification :* tests.
11. [ ] Compteur « Pop 23 / 40 » dans la barre du haut, rouge au plafond ; message « Population maximale atteinte ».

Obstacles (labyrinthe) :
12. [ ] Pour 50 graines : 6 à 10 rochers, 1 à 3 montagnes de 3 à 8 cases d'un seul tenant, jamais sur un élément
    fixe ni une zone, et un chemin existe sur le terrain vide. — *Vérification :* test.
13. [ ] Un obstacle ferme sa case : le chemin le contourne, on ne peut pas y construire, il ne se vend pas et ne
    compte pas dans la population ; les volants l'ignorent. — *Vérification :* tests.
14. [ ] Rochers et montagnes dessinés et reconnaissables ; bulle d'aide au survol.

Équilibre :
15. [ ] Le joueur automatique du labyrinthe respecte la population ; repères remesurés et notés dans le CLAUDE.md ;
    en Normal il gagne la plupart des terrains en 12 à 25 vagues. — *Vérification :* `node tests/simulate.js labyrinthe`.
16. [ ] Avec la compensation (or × 0,8), `npm run simulate` redonne à peu près les repères actuels du CLAUDE.md
    (vies restantes à ± 3, vague de défaite à ± 2) ; les chiffres mesurés y sont notés.

Records :
17. [ ] Une progression ou un code de transfert d'avant cette spec arrive sans record de labyrinthe ; le reste
    (cartes, étoiles, records du mode infini, réglages) est intact ; les nouveaux records passent dans le code.
    — *Vérification :* tests de `progression.js` et `transfert.js`.

## Conception
- **Ce qui existe déjà** : `tour.degats` (dégâts totaux, dans `blesser`), `e.vague`, `bilanVagues` (bonus de fin de
  vague), `metAterre`, le terrain du labyrinthe (`genererLabyrinthe`, `casesFixes`, `cheminLabyrinthe`), les
  commandes `poser` / `poserMur` / `annulerPrevu`, la bulle d'aide, le bandeau et les sons d'événements.
- **Classement** (`partie.js`) : `tour.degatsVague[v]` incrémenté dans `blesser` ; `s.orVague[v]` incrémenté par l'or
  des monstres de la vague `v` ; dans `bilanVagues`, au versement du bonus de fin de vague, on cherche la meilleure
  tour (y compris celles vendues pendant la vague : on garde leur nom et leurs dégâts dans `s.vendues`) et on verse
  le bonus. Les compteurs d'une vague payée sont effacés. Fonction pure `classement(s)` pour l'écran.
- **Population** : `populationLabyrinthe(s)` = murs + tours + poses prévues − ventes prévues ; plafond
  `s.labyrinthe.popMax` tiré dans `genererLabyrinthe` ; vérifié dans `raisonPose` (nouvelle raison `'population'`).
- **Obstacles** : générés dans `genererLabyrinthe` après les éléments fixes et les zones (montagnes par croissance
  aléatoire d'une case de départ) ; ajoutés aux cases fermées de `carteLabyrinthe` (`etat` → `PRIS`) et aux
  `bloques` de la recherche de chemin ; vérification du chemin sur le terrain vide, sinon on enlève des obstacles.
- **Écran** : panneau `#classement` (HTML, comme la fiche), couronne et bandeau dans `Vue.evenements`, compteur de
  population dans la barre du haut, obstacles dans `src/render/labyrinthe.js`.
- **Choix écartés** : dégâts comptés par tranche de temps (faux quand les vagues se chevauchent) ; obstacles comptés
  dans la population (Thibault veut qu'ils limitent le terrain, pas le joueur).

## Fichiers touchés (prévision)
- `src/sim/partie.js` — dégâts et or par vague, tour de la vague, compensation, population, `classement`
- `src/sim/progression.js`, `src/sim/transfert.js` — effacement des anciens records du labyrinthe
- `src/sim/labyrinthe.js`, `src/data/labyrinthe.js` — obstacles, plafond de population
- `src/render/labyrinthe.js`, `src/render/vue.js` — obstacles, couronne, bandeau
- `src/ui/interface.js`, `src/main.js`, `index.html`, `style.css`, `src/audio/son.js` — classement, touche C,
  compteur de population, podium
- `tests/` — tests des critères 1 à 4, 9, 10, 12, 13 ; `tests/simulate.js` — population du joueur automatique
- `CLAUDE.md` — repères

## Risques
- Enfants / vie privée / IA : rien de nouveau (aucune donnée personnelle, rien ne part à une IA).
- **Équilibre de tous les modes** : il y a toujours une tour en tête, donc le bonus revient à +25 % d'or à chaque
  vague ; compensé par l'or × 0,8. Le rythme change un peu (l'or arrive plus en fin de vague) : contrôlé par le
  critère 16.
- Labyrinthe : avec 40 à 50 de population, le serpentin actuel du joueur automatique (une centaine de murs) n'est
  plus possible ; il faut lui apprendre à construire avec peu. Les chiffres du mode seront à régler de nouveau.

## Étapes
1. **Lot 1 — classement** (tous les modes) : logique, tests, écran, repères de `npm run simulate`. (une PR)
2. **Lot 2 — labyrinthe** : obstacles, population, écran, joueur automatique, réglages. (une PR)

## Décisions de Thibault (2026-11-24)
- Bonus : or en plus pour la 1re tour de chaque vague, 1/4 de l'or de la vague ; classement dans tous les modes.
- Obstacles : mélange de rochers et de montagnes.
- +25 % d'or : compenser (or des monstres et bonus de fin de vague × 0,8).
- Records du labyrinthe remis à zéro.

## Questions ouvertes
(aucune)
