# 007 — Raccourcis, pose en série, cartes aléatoires

Statut : **validé** (« ok continue », propositions incluses) — **réalisé**.

## 1. Raccourcis des tours

- Les six tours se choisissent avec les touches de la rangée du haut : `1` à `6`, ou sur un clavier AZERTY
  `& é " ' ( -` sans Maj. Le pavé numérique marche aussi.
- La touche physique compte (`e.code` Digit1…Digit8 / Numpad1…Numpad8), pas le caractère : AZERTY et QWERTY
  marchent de la même façon.
- `7` / `è` : météores, `8` / `_` : renforts. M et R restent valables.
- Chaque bouton de la boutique et des pouvoirs affiche sa touche dans un coin (« & 1 », « è 7 M »…).
- Code : `src/ui/clavier.js` (`rangDeTouche`, `etiquetteRang`, `TOUCHES_AZERTY`).

## 2. Pose en série

- **Maj + clic** sur une case libre : la tour est bâtie et la même tour reste choisie pour la suivante.
- Un clic sans Maj bâtit la dernière tour de la série et la termine. Échap ou clic droit l'annulent.
- Si l'or manque, la série s'arrête avec le message « Pas assez d'or ».
- Tactile : un appui long sur le bouton d'une tour la verrouille en série (badge « en série ») jusqu'à
  Échap, un autre choix ou un nouvel appui long.

## 3. Cartes aléatoires

- Nouvel onglet « Carte aléatoire » sur l'écran des cartes, ouvert dès que le Désert est débloqué.
- Choix du **décor** (Prairie, Désert, Montagne), de la **longueur** (20, 25 ou 30 vagues) et du **numéro**
  (bouton « Au hasard »). Même numéro, même décor et même longueur : même carte, à partager.
- Aperçu de la carte avant de jouer.
- Tracé (`src/sim/generateur.js`, `genererTrace(graine)`) : 2 à 4 couloirs verticaux séparés d'au moins
  3 colonnes, de la grotte (côté gauche) au château (côté droit) ; longueur du chemin entre 45 et 75 cases ;
  une fois sur deux, une seconde entrée qui rejoint le premier couloir.
- Vagues générées (`genererVague(graine, n, 1.5)`) avec l'Ogre aux vagues de boss, comme la Montagne.
- PV des ennemis augmentés de 2 % par vague, plus selon la longueur du chemin (un long chemin laisse plus
  de temps de tir).
- Pas d'étoiles ni de déblocage : compteur « Cartes aléatoires gagnées » par difficulté
  (`progression.aleatoires`). L'écran de fin rappelle le numéro de la carte.

## Réglages contrôlés au joueur automatique

- Cartes aléatoires en Normal (« posé ») : victoire avec 11 vies en moyenne sur une série de graines, aucune
  défaite sur l'échantillon ; les chemins courts sont les plus durs.
- Les cartes de la campagne ne changent pas.

## Tests

`tests/aleatoire.test.js` : même graine = même carte, chemin valide et relié au château, longueurs bornées,
seconde entrée, partie jouable de bout en bout, compteur de victoires. `npm test` : 48 tests passent.
