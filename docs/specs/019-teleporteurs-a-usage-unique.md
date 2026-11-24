---
numero: 019
titre: Téléporteurs à usage unique (labyrinthe)
depot: autre (thmans-pixel/tower)
statut: livrée
date: 2026-11-24
---

# 019 — Téléporteurs à usage unique (labyrinthe)

*(Le numéro 018 reste réservé au hall of fame.)*

## Le besoin, en une phrase
Thibault veut que, dans le labyrinthe, un téléporteur **ne serve qu'une fois** : après, il est **grisé** et ne
téléporte plus. Ainsi on ne peut plus s'appuyer sur lui toute la partie pour rallonger (ou raccourcir) le parcours.

## Ce que ça change pour qui
- Joueurs : le moment où l'on fait passer le chemin sur un téléporteur devient un choix (« je le garde pour une vague
  difficile »). Un téléporteur usé se voit d'un coup d'œil (gris, sans animation).
- Thibault : rien à administrer ; redéploiement habituel.

## Règles (décidées avec Thibault)
- **Usé par une vague** : un téléporteur est usé dès qu'**au moins un monstre** l'a
  réellement emprunté pendant une vague. Tous les monstres de cette vague continuent de l'emprunter jusqu'à la fin de
  la vague (le chemin ne change pas en pleine vague, comme pour les murs prévus). À la fin de la vague, la paire entière
  (entrée bleue et sortie rouge) devient grise pour le reste de la partie, et le trajet est recalculé sans elle.
- Si le chemin passait sur l'entrée mais qu'aucun monstre ne l'a franchie (tous arrêtés avant), le téléporteur
  **n'est pas usé**.
- Dans un même parcours, une entrée n'est empruntée qu'**une fois** : si le chemin repasse dessus plus tard (autre
  tronçon), les monstres marchent dessus sans être téléportés. Plus de boucle qui renvoie sans fin au même endroit.
- **Téléporteur grisé** : il devient une case où l'on marche sans effet ;
  on ne peut toujours pas construire dessus (elle reste un élément fixe du terrain, grisé).
- **Seul passage** : si les murs ne laissaient que le téléporteur comme passage, le griser boucherait le
  labyrinthe. Les murs ne peuvent donc plus créer cette situation — une pose est refusée (« Le passage serait
  bouché ») s'il ne reste aucun chemin **sans** les téléporteurs. Ainsi le chemin existe toujours une fois tout grisé.
- Les volants ne prennent pas les téléporteurs (inchangé).
- Pas de remise à zéro des records : la spec 017 vient de les effacer et le changement est modeste.

## Hors périmètre
- Téléporteurs qui se rechargent.
- Téléporteurs dans les autres modes.
- Changer le nombre de paires par terrain (1 ou 2).
- Modèles Blender (tout reste dessiné en code).

## Critères d'acceptation
1. [x] Un monstre franchit un téléporteur pendant une vague : les autres monstres de la vague l'empruntent aussi ; à la
   fin de la vague la paire est marquée usée (`tp.use`), un événement `tpUse` est émis une fois, et le nouveau trajet ne
   comporte plus de saut par elle. — *Vérification :* test (`partieSur` avec une paire sur la ligne droite).
2. [x] Le chemin passe sur l'entrée mais aucun monstre ne l'atteint (tous mis à terre en continu avant) : la paire n'est
   pas usée. — *Vérification :* test.
3. [x] Un chemin qui passe deux fois sur la même entrée n'est téléporté qu'à la première. — *Vérification :* test sur un
   terrain construit à la main (checkpoints de part et d'autre de l'entrée).
4. [x] Une paire usée est une case ordinaire : on marche dessus sans saut, on ne construit pas dessus. — *Vérification :* test.
5. [x] Une pose qui ne laisserait de passage que par un téléporteur est refusée (`raison: 'bouche'`), pendant ou entre les
   vagues, prévus compris. — *Vérification :* test (colonne murée sauf le téléporteur).
6. [x] L'état « usé » ne change jamais en pleine vague : le trajet affiché et celui des monstres restent ceux du début de
   la vague. — *Vérification :* test (trajet identique avant et après le premier saut, jusqu'à la fin de la vague).
7. [x] À l'écran : paire usée en gris, sans animation ; bandeau ou texte « Téléporteur usé » à la fin de la vague ; la
   bulle d'aide dit « Ne sert qu'une fois » (et « Usé » une fois grisé). — *Vérification :* essai dans le navigateur.
8. [x] Le joueur automatique (`node tests/simulate.js labyrinthe`) donne des repères proches de ceux du CLAUDE.md
   (Normal : la plupart des terrains gagnés) ; chiffres remesurés et notés. — *Vérification :* lancer la commande.

## Conception
- **Ce qui existe** : `cheminLabyrinthe` (tronçons à pied, `troncon` téléporte quand le chemin pose le pied sur une
  entrée), sauts `saut: true` dans les trajets, `deplacer` (tous les monstres suivent `s.carte.sols[0]`), fin de vague
  dans `lancer` (`appliquerPrevus` puis compte à rebours), `teleporteur(g, …)` et `aideCase` dans `src/render/labyrinthe.js`.
- **Ajouts** :
  - `lab.tp[i].use` (booléen) ; `cheminLabyrinthe` ignore les paires usées ; `troncon` garde l'ensemble des entrées déjà
    prises **sur tout le parcours** (aujourd'hui : par tronçon).
  - Dans `deplacer`, quand un monstre franchit un segment `saut`, on note la paire dans `s.labyrinthe.tpPris`.
    À la fin de la vague (là où `appliquerPrevus` est appelé), les paires notées passent à `use = true`, événement
    `tpUse`, puis `recalculerChemin`.
  - « Bouche » : `raisonPose` et `annulerPrevu` vérifient aussi qu'un chemin existe sans aucun téléporteur.
  - Écran : `teleporteur(g, p, nom, sortie, t, use)` dessine la version grise ; `Vue.evenements` et `Son.evenements`
    réagissent à `tpUse` ; `aideCase` adapte son texte.
- **Choix écartés** :
  - griser dès le premier monstre et changer le chemin en pleine vague : il faudrait un trajet par monstre et des
    monstres qui changent de route au milieu, ce que le jeu ne fait nulle part ailleurs ;
  - la case grisée qui ferme le passage comme un mur : pourrait boucher le labyrinthe à la fin d'une vague.

## Fichiers touchés (prévision)
- `src/sim/labyrinthe.js` — paires usées ignorées, entrée prise une fois par parcours, chemin sans téléporteur
- `src/sim/partie.js` — `tpPris`, usure à la fin de la vague, refus « bouche » renforcé
- `src/render/labyrinthe.js`, `src/render/vue.js`, `src/audio/son.js` — téléporteur gris, bandeau, son, bulle d'aide
- `tests/labyrinthe.test.js` — critères 1 à 6 ; `tests/simulate.js` si besoin ; `CLAUDE.md` — repères

## Risques
- Enfants / vie privée / IA : rien (aucune donnée, rien ne part à une IA).
- Équilibre : les téléporteurs servent moins, le labyrinthe peut devenir un peu plus dur ou plus facile selon le
  terrain ; contrôlé par le critère 8.
- Le refus « bouche » plus strict retire une possibilité d'aujourd'hui (forcer le passage par un téléporteur en murant
  tout le reste). C'est voulu (choix de Thibault).

## Étapes
1. Logique, tests, écran, repères (une PR).

## Décisions de Thibault (2026-11-24)
- Usure : la première vague dont un monstre franchit le téléporteur ; gris ensuite pour la partie.
- Téléporteur grisé : case où l'on marche, non constructible.
- Seul passage : interdit de murer de façon à ne laisser que le téléporteur.

## Questions ouvertes
(aucune)

## Livraison
Fait : `tp.use` (paire usée), `s.labyrinthe.tpPris` (paires franchies pendant la vague, notées dans `deplacer`), usure et
recalcul du trajet à la fin de la vague (`usureTp`, appelée par `appliquerPrevus`), événement `tpUse` ; une entrée n'est prise
qu'une fois par parcours (ensemble `pris` partagé entre les tronçons) ; `passageAPied` : toute pose (et l'annulation d'une
vente prévue) qui ne laisserait de passage que par un téléporteur est refusée (`bouche`) ; téléporteur gris sans animation,
bandeau « Téléporteur usé », son, bulle d'aide (« usage unique », « usé »). 4 tests ajoutés dans `tests/labyrinthe.test.js`
(critères 1 à 6) ; essai dans le navigateur sur le terrain 12 (une paire usée en gris après la vague, l'autre intacte).

- Équilibre (10 terrains) : Normal 9 gagnés sur 10 en 5 à 20 vagues, sans mur 8 sur 10, Facile 10 sur 10, Difficile 8 sur 10 :
  quasiment inchangé (le joueur automatique n'utilise pas les téléporteurs).
- Le test « seul passage forcé par les murs » de la spec 016 a été remplacé : on ne peut plus murer ainsi.
- À vérifier à la main : le gris du téléporteur et le bandeau en pleine partie.
