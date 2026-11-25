---
numero: 020
titre: Mode Vivaldi — les morceaux s'enchaînent, le boss à part
depot: autre (thmans-pixel/tower)
statut: validée
date: 2026-11-25
---

# 020 — Mode Vivaldi : les morceaux s'enchaînent, le boss à part

## Le besoin, en une phrase
Thibault veut qu'avec « Musique : Vivaldi », la partie ne tourne plus en boucle sur un seul morceau : le jeu en
joue un (par exemple prairie ou désert), puis **les autres s'enchaînent**, et le morceau **boss** ne passe
**qu'avec les boss**.

## Ce que ça change pour qui
- Joueurs (Léo, Arthur, les autres) : en mode Vivaldi, on entend les trois morceaux au fil d'une partie au lieu
  d'un seul répété ; le boss garde sa musique à lui.
- Thibault : rien à administrer ; redéploiement habituel (`mettre-a-jour.sh`).
- Mode « synthé » : inchangé.

## État actuel (constaté le 2026-11-25)
- Les quatre enregistrements sont déjà dans `musiques/musiques_vivaldi/` (mp3 + ogg). Les mp3 envoyés par Thibault
  ce soir sont **identiques octet pour octet** à ceux du dépôt : aucun fichier à remplacer.
- Durées : prairie 1 min 46, désert 57 s, montagne 1 min 09, boss 49 s.
- Aujourd'hui (`majMusique`, `src/main.js`) : en mode Vivaldi, on joue **en boucle** l'enregistrement du thème de la
  carte (`themeDe(idCarte)`, labyrinthe = prairie) ; le menu joue prairie en boucle ; dès qu'un boss est en jeu,
  la piste boss remplace tout, puis la piste de la carte **repart du début**.

## Règles
- **Liste de l'enchaînement** : prairie, désert, montagne. Le boss n'en fait jamais partie.
- **Premier morceau d'une partie** : celui du thème de la carte (Prairie → prairie, Désert → désert,
  Montagne → montagne, labyrinthe → prairie, carte aléatoire → son thème).
- **Enchaînement** : quand un morceau se termine, le suivant est tiré au hasard parmi les deux autres (jamais deux
  fois le même de suite). Pas de silence ajouté entre deux morceaux.
- **Boss** : tant qu'un boss est en jeu, la piste boss joue **en boucle** à la place. Quand il n'y a plus de boss,
  on **reprend le morceau interrompu là où il s'était arrêté**.
- **Menu et écran des cartes** : l'enchaînement joue aussi (même règle, premier morceau = prairie).
- **Fin de partie** (victoire/défaite) : silence, comme aujourd'hui.
- Le volume « Musique » et le bouton « Son » s'appliquent comme aujourd'hui (voie `musique`).

## Hors périmètre
- Changer, couper ou réenregistrer les fichiers audio (ils sont déjà les bons).
- Toucher au mode « synthé » (airs tirés au hasard, `AIRS_DE_PARTIE`).
- Fondu enchaîné entre deux morceaux.
- Afficher le titre du morceau en cours.
- Ajouter d'autres morceaux.

## Critères d'acceptation
1. [ ] La fonction pure qui choisit le morceau suivant ne renvoie jamais le boss ni le morceau qui vient de finir,
   et finit par renvoyer chacun des deux autres. — *Vérification :* test (`tests/musique.test.js`, tirage simulé).
2. [ ] En mode Vivaldi, une partie sur le Désert commence par désert ; à la fin du morceau, un autre morceau
   (prairie ou montagne) démarre aussitôt. — *Vérification :* navigateur (`?jouer=desert`, attendre 57 s, ou avancer
   `currentTime` de la piste dans la console).
3. [ ] Au fil d'une longue partie, les trois morceaux passent, jamais deux fois le même de suite, et le boss jamais hors
   boss. — *Vérification :* navigateur, journal de la console pendant ~5 min (ou test du critère 1).
4. [ ] Un boss apparaît : la piste boss joue en boucle ; le boss mort ou passé, le morceau interrompu reprend où il en
   était. — *Vérification :* navigateur (vague de boss sur la Prairie, `?test=1`).
5. [ ] Menu et écran des cartes en mode Vivaldi : la musique s'enchaîne aussi, sans le boss. — *Vérification :* navigateur.
6. [ ] Passer de « Vivaldi » à « synthé » et retour : la bonne musique repart, rien ne joue en double. — *Vérification :*
   navigateur.
7. [ ] Mode synthé : comportement strictement inchangé. — *Vérification :* navigateur + `npm test`.
8. [ ] `npm test` passe. — *Vérification :* commande.

## Conception
- **Ce qui existe et qu'on réutilise** : `Musique.jouerPiste` / `creerPiste` (`src/audio/musique.js`, éléments
  `Audio` branchés sur la voie `musique`), `PISTES`, `majMusique` et `themeDe` (`src/main.js`), le bouton
  `b-vivaldi` et `progression.vivaldi` (rien à changer côté interface ni progression).
- **Ce qu'on modifie** :
  - `src/audio/musique.js` :
    - `ENCHAINEMENT = ['prairie', 'desert', 'montagne']` et une fonction pure exportée
      `pisteSuivante(derniere, tirage)` (tirage entre 0 et 1 fourni par l'appelant : `Math.random` à l'écran,
      tirage fixe dans les tests).
    - En mode Vivaldi, `jouer` reçoit soit `'boss'`, soit un nom de départ (`'prairie'`, `'desert'`, `'montagne'`)
      qui ne sert qu'à choisir le **premier** morceau d'un nouvel enchaînement. Les pistes de l'enchaînement ont
      `loop = false` ; à l'événement `ended`, on passe à `pisteSuivante`. La piste boss garde `loop = true`.
    - Boss : la piste en cours est mise en pause (sa position est conservée par l'élément `Audio`), puis relancée
      (`play()`) au retour.
    - Un nouvel enchaînement démarre quand on change de partie, ou quand on passe du menu au jeu.
  - `src/main.js` (`majMusique`) : en mode Vivaldi, passer le thème de la carte (ou `'prairie'` au menu) et signaler
    le début d'une nouvelle partie ; la règle « boss en jeu → `'boss'` » ne change pas.
- **Choix écartés** :
  - Ordre fixe prairie → désert → montagne : moins varié, et le premier morceau de la carte dicterait toujours la suite.
  - Tirage dans `src/sim/` avec `hasard(graine)` : la musique est de l'affichage, `Math.random` y est permis
    (CLAUDE.md), et la logique de jeu ne doit pas en dépendre.
  - Recommencer le morceau au début après le boss : on réentendrait toujours les mêmes premières mesures.

## Fichiers touchés (prévision)
- `src/audio/musique.js` — `ENCHAINEMENT`, `pisteSuivante`, enchaînement à `ended`, pause/reprise autour du boss
- `src/main.js` — `majMusique` : nom de départ et nouvelle partie en mode Vivaldi
- `tests/musique.test.js` — critère 1 (nouveau fichier ; `musique.js` n'importe rien du navigateur à son chargement)
- `CLAUDE.md` — une ligne sur l'enchaînement Vivaldi

## Risques
- Enfants / vie privée / IA : rien (aucune donnée, aucun appel réseau, rien ne part à une IA).
- Navigateur : `play()` peut être refusé tant que le joueur n'a rien touché ; le mécanisme actuel de relance
  (`enMarche()` dans `majMusique`) doit continuer de marcher pour la piste en cours de l'enchaînement.
- Onglet caché : aujourd'hui la musique s'arrête (`document.hidden`) ; à la reprise, on relance l'enchaînement là
  où il en était plutôt que de repartir du premier morceau.

## Étapes
1. Enchaînement, boss à part, test, essai navigateur, ligne du CLAUDE.md (une PR).

## Décisions de Thibault (2026-11-25)
- Premier morceau d'une partie : celui du thème de la carte.
- Après le boss : le morceau interrompu reprend là où il en était.
- Menu et écran des cartes : l'enchaînement aussi, en commençant par prairie.

## Questions ouvertes
(aucune)
