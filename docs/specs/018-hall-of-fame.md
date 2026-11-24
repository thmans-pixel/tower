---
numero: 018
titre: Hall of fame en ligne, avec un classement enfants à part
depot: autre (thmans-pixel/tower)
statut: validée
date: 2026-11-24
---

# 018 — Hall of fame en ligne, avec un classement enfants à part

## Le besoin, en une phrase
Thibault veut un **hall of fame** commun à tous les joueurs de tower.izicraft.fr, avec les meilleurs résultats de
quatre classements (meilleure tour, labyrinthe, mode infini, campagne), et une **case « enfant »** au choix des cartes
pour que les enfants aient leur propre classement, séparé de celui des adultes.

## Ce que ça change pour qui
- Léo, Arthur et les autres enfants : ils cochent « Je suis un enfant » une fois ; leurs résultats vont dans le
  classement des enfants. Ils n'entrent **aucun nom réel** (voir pseudo).
- Les joueurs adultes (famille, amis) : à la fin d'une partie, ils peuvent envoyer leur résultat avec un pseudo et voir
  leur place.
- Thibault : un petit service à installer une fois sur thnas (puis mis à jour avec la commande habituelle) ; il peut
  retirer une entrée par une commande.

## Règles
### Les quatre classements
| Classement | Ce qui compte | Listes |
|---|---|---|
| **Meilleure tour** | dégâts totaux de la tour n° 1 du classement des tours (spec 017) à la fin d'une partie, quel que soit le mode | une seule liste ; on affiche la tour, la carte et le mode |
| **Labyrinthe** | le moins de vagues pour gagner (comme les records actuels) | une par difficulté |
| **Mode infini** | le plus de vagues terminées (`scoreInfini`) | une par carte (Prairie, Désert, Montagne) et par difficulté |
| **Campagne** | victoire sur une carte, le plus de vies restantes | une par carte et par difficulté |

- Égalité : le premier arrivé reste devant.
- Les cartes aléatoires ne comptent pas (chacune est différente) ; le labyrinthe compte malgré ses terrains tirés au
  sort (c'est le jeu).
- Un pseudo n'a qu'**une ligne par liste** : son meilleur résultat (un moins bon envoi ne change rien).
- On affiche les **20 premiers** de chaque liste.

### Enfant ou adulte
- Une case **« Je suis un enfant (moins de 15 ans) »** sur l'écran du choix des cartes, retenue d'une partie à l'autre
  (dans la progression du navigateur, comme les autres réglages).
- Chaque liste existe en deux exemplaires : **Adultes** et **Enfants**. L'écran du hall of fame a deux onglets.
- C'est déclaratif : personne ne vérifie l'âge.

### Envoyer un résultat
- **Jamais automatique.** À la fin d'une partie qui donne un résultat classable, l'écran de fin propose
  « Envoyer au hall of fame ». Le joueur choisit son pseudo (retenu pour la fois suivante) et envoie ; la réponse
  donne sa place (« 4e chez les enfants »).
- Pseudo des **adultes** : texte libre de 3 à 16 caractères (lettres, chiffres, espaces, tirets), filtré par une liste
  de mots interdits.
- Pseudo des **enfants** : **choisi dans des pseudos proposés** par le jeu, formés d'un animal,
  d'une couleur et d'un nombre (« Renard Bleu 27 »), avec un bouton « Un autre ». Pas de texte libre : pas de vrai
  prénom, pas de nom d'école, pas de gros mot.
- Si le serveur ne répond pas, le jeu le dit (« Hall of fame indisponible pour le moment ») et la partie n'est pas
  perdue pour autant ; rien n'est réessayé en cachette.

### Ce que le serveur garde
- Par entrée : pseudo, catégorie (enfant / adulte), liste (classement, carte, difficulté), valeur, détail affiché (nom
  de la tour, mode), **jour** (pas l'heure), version des règles.
- **Rien d'autre** : pas d'adresse IP, pas d'identifiant d'appareil, pas de compte, pas de courriel. La limite d'envois
  (20 par heure et par adresse) est tenue en mémoire seulement et oubliée au redémarrage.
- Les journaux standards de nginx de YunoHost notent les adresses IP de toutes les visites du site, comme aujourd'hui ;
  le service n'y ajoute rien.

### Triche
- Le résultat est déclaré par le navigateur : le serveur refuse ce qui est impossible
  (valeurs hors bornes, carte ou difficulté inconnue, plus de vagues que la carte n'en a, dégâts au-delà d'un plafond
  par vague) et Thibault peut retirer une entrée. Pas de vérification par rejeu de la partie.

### Modération
- Par une **commande sur thnas** : `sudo python3 /var/lib/tower/source/tools/hall/hall.py
  liste` (dernières entrées), `… retirer <numéro>`, `… vider <classement>` (après un changement de règles). Pas de page
  d'administration sur Internet.

## Hors périmètre
- Comptes, mots de passe, courriels, connexion YunoHost pour les joueurs.
- Vérification des parties par rejeu, détection automatique de la triche.
- Classements entre amis, saisons, remise à zéro périodique, récompenses.
- Cartes aléatoires dans le hall of fame.
- Messagerie, commentaires, photos.
- Envoi de résultats déjà faits avant cette spec (seules les parties jouées après comptent).
- Sauvegarde de la base sur un autre disque (à ajouter au plan de sauvegarde de thnas, hors de ce dépôt).

## Critères d'acceptation
1. [ ] `scoreHall(s)` (pur, `src/sim/hall.js`) donne, pour une partie finie, les résultats classables : meilleure tour
   (dégâts, nom), labyrinthe (vagues, si victoire), infini (vagues), campagne (vies, si victoire sur Prairie, Désert ou
   Montagne) ; rien pour une carte aléatoire. — *Vérification :* tests Node, une partie par cas.
2. [ ] La case « Je suis un enfant » est sur l'écran du choix des cartes, retenue après rechargement de la page, et
   portée par le code de transfert. — *Vérification :* test de `relire` / `codeProgression` + essai navigateur.
3. [ ] Envoi : `POST /api/hall` enregistre une entrée valide et renvoie sa place ; un pseudo n'a qu'une ligne par liste
   (son meilleur) ; égalité → premier arrivé devant. — *Vérification :* tests du serveur (`python3 -m unittest`).
4. [ ] Le serveur refuse (code 400, rien d'enregistré) : pseudo adulte hors règles ou contenant un mot interdit, pseudo
   enfant qui n'est pas de la forme proposée, liste inconnue, valeur impossible, champ en trop. — *Vérification :* tests.
5. [ ] Au-delà de 20 envois par heure depuis une même adresse : refus 429 ; aucune adresse n'est écrite sur le disque.
   — *Vérification :* test + lecture du schéma de la base.
6. [ ] `GET /api/hall?…` renvoie les 20 premiers d'une liste, adultes et enfants séparés ; un enfant n'apparaît jamais
   chez les adultes, et l'inverse. — *Vérification :* tests.
7. [ ] Écran « Hall of fame » (bouton dans le menu) : onglets Adultes / Enfants, choix du classement, de la carte et de
   la difficulté, sa propre ligne surlignée ; lisible sur téléphone. — *Vérification :* essai navigateur (bureau et
   `?mobile=1`).
8. [ ] Écran de fin : bouton « Envoyer au hall of fame » seulement si la partie donne un résultat classable ; pseudo
   enfant choisi dans les propositions (« Un autre »), pseudo adulte saisi ; la place s'affiche après l'envoi ; serveur
   absent → message, sans blocage. — *Vérification :* essai navigateur, serveur arrêté puis lancé.
9. [ ] Commandes de modération `liste`, `retirer`, `vider` sur thnas. — *Vérification :* tests du script.
10. [ ] Installation : un script `tools/hall/installer.sh` met en place le service (systemd, écoute locale seulement) et
    le renvoi `/api/` dans nginx au niveau du domaine (comme `tower-cache.conf`) ; `mettre-a-jour.sh` redémarre le service
    s'il est installé. — *Vérification :* relecture + installation guidée pas à pas sur thnas.
11. [ ] Relecture par l'agent `gardien-enfants` de la spec puis de la PR, sans point bloquant. — *Vérification :* son
    rapport dans la PR.

## Conception
- **Ce qui existe** : site statique servi par l'appli my_webapp de YunoHost (`/var/www/my_webapp__4/www`), copie du dépôt
  dans `/var/lib/tower/source`, réglage nginx au niveau du domaine dans `/etc/nginx/conf.d/tower.izicraft.fr.d/` ;
  `classement(s)` (spec 017), `scoreInfini`, `s.vies`, records du labyrinthe ; progression dans `localStorage` par
  `src/ui/sauvegarde.js` ; écran de fin `#fin`.
- **Ajouts côté serveur** (`tools/hall/`) : `hall.py`, **Python 3 sans dépendance** (bibliothèque standard :
  `http.server`, `sqlite3`), écoute `127.0.0.1:8029`. Base SQLite dans `/var/lib/tower/hall/hall.db` (une table
  `entrees`). Règles de validation et bornes dans `tools/hall/regles.json` (cartes, difficultés, nombres de vagues,
  plafonds). Commandes de modération dans le même fichier. Tests `tools/hall/test_hall.py`.
  `installer.sh` (une fois) : compte système `tower-hall`, service systemd durci (`NoNewPrivileges`, `ProtectSystem`,
  écriture limitée à `/var/lib/tower/hall`), fichier `tower-hall.conf` à côté de `tower-cache.conf`
  (`location /api/ { proxy_pass http://127.0.0.1:8029; }`).
- **Ajouts côté jeu** :
  - `src/sim/hall.js` (pur) : `scoreHall(s)`, `pseudoEnfant(graine)` (animal + couleur + nombre, mêmes listes que le
    serveur, lues dans `src/data/pseudos.js`), `pseudoValide(texte)` ;
  - `src/data/pseudos.js` : animaux, couleurs, mots interdits (aussi copiés dans `regles.json` par un test qui vérifie
    qu'ils sont identiques) ;
  - `progression.enfant`, `progression.pseudo` (+ code de transfert) ;
  - `src/ui/hall.js` : seul endroit qui fait des appels réseau (`fetch('/api/hall')`) ; écran du hall of fame et envoi
    depuis l'écran de fin ; `index.html`, `style.css`.
- **Choix écartés** :
  - un service tiers (Firebase, etc.) : les données des enfants partiraient chez quelqu'un d'autre ;
  - Node.js sur le serveur : pas sûr qu'il soit installé sur thnas, Python l'est ;
  - pseudo libre pour les enfants : risque de vrai prénom ou de nom d'école visible par tous.

## Fichiers touchés (prévision)
- `tools/hall/hall.py`, `tools/hall/regles.json`, `tools/hall/test_hall.py`, `tools/hall/installer.sh`,
  `tools/hall/tower-hall.service`, `tools/hall/tower-hall.conf` — nouveaux
- `tools/deploiement/mettre-a-jour.sh` — redémarrer le service s'il existe ; ne pas copier `tools/` sur le site (déjà le cas)
- `src/sim/hall.js`, `src/data/pseudos.js` — nouveaux ; `src/sim/progression.js`, `src/sim/transfert.js` — `enfant`, `pseudo`
- `src/ui/hall.js` — nouveau ; `src/ui/interface.js`, `src/main.js`, `index.html`, `style.css` — case enfant, écran, envoi
- `tests/hall.test.js` — nouveau ; `CLAUDE.md` — repères, et la règle « seul `src/ui/hall.js` touche le réseau »

## Risques
- **Enfants / vie privée** : oui. Des enfants publient un pseudo visible de tous sur Internet. Mesures : pseudo choisi
  dans une liste pour les enfants, rien d'identifiant stocké, envoi toujours volontaire, modération par Thibault.
  → **relecture `gardien-enfants`** de cette spec avant validation et de la PR avant fusion (critère 11).
- **Sécurité** : premier service qui reçoit des données d'Internet sur ce site. Mesures : écoute locale derrière nginx,
  compte système dédié, taille des requêtes limitée (2 Ko), requêtes SQL paramétrées, tout ce qui est affiché échappé.
- **thnas instable** (disques en RAID 0) : la base peut être perdue ; ce n'est qu'un classement. Sauvegarde à ajouter
  au plan de thnas (hors de ce dépôt).
- **Triche** : un joueur adroit peut envoyer un faux résultat plausible ; accepté vu le public (famille, amis) et la
  modération.
- Rien ne part à une IA.

## Étapes
1. **Lot 1 — serveur** : `hall.py`, règles, tests, modération, `installer.sh`, renvoi nginx, `mettre-a-jour.sh`
   (critères 3 à 6, 9, 10). Installation guidée sur thnas, une commande à la fois.
2. **Lot 2 — jeu** : `scoreHall`, pseudos, case enfant, écran du hall of fame, envoi depuis l'écran de fin
   (critères 1, 2, 7, 8) ; relecture `gardien-enfants` (critère 11).

## Décisions de Thibault (2026-11-24)
- Pseudo des enfants : choisi parmi des pseudos proposés (animal + couleur + nombre, bouton « Un autre »).
- Triche : bornes de vraisemblance côté serveur et retrait par Thibault ; pas de rejeu.
- Modération : commande sur thnas, pas de page d'administration en ligne.

## Questions ouvertes
(aucune)
