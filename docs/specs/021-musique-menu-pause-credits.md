---
numero: 021
titre: Musique du menu et de la pause, raccords des boucles, crédits, repli sur la synthèse
depot: autre (thmans-pixel/tower)
statut: livrée
date: 2026-11-25
---

# 021 — Musique du menu et de la pause, raccords des boucles, crédits, repli sur la synthèse

## Le besoin, en une phrase
Thibault veut que le jeu joue de **vrais fichiers audio** : « gardons celle-là pour les menus et la pause »,
que les boucles ne claquent pas, que les **crédits** (musiques inspirées de Vivaldi, générées par Lyria) soient dans le jeu,
et que si un fichier manque le jeu **retombe sur la synthèse** au lieu de jouer en silence.

## État actuel (constaté le 2026-11-25) : une grande partie existe déjà
- Les quatre enregistrements Vivaldi (prairie, désert, montagne, boss ; OGG + MP3) sont dans `musiques/musiques_vivaldi/`
  et le bouton « Musique : Vivaldi » les joue ; ils s'enchaînent, le boss joue seul en boucle (spec 020, livrée).
- Niveau mesuré : -20 LUFS pour les quatre, rien à baisser.
- **Manque** : le fichier du menu (reçu ce matin sous le nom `…google-lyria-3.5.wav`, mais c'est en fait un **MP3**, 2 min 59,
  -11,7 LUFS, début à -16 dB et **fin dans le silence complet**) n'est pas dans le dépôt ; aujourd'hui le menu joue l'enchaînement
  (prairie d'abord). La pause ne change pas la musique. Aucun crédit à l'écran. Si un fichier est absent ou refusé, rien ne joue.
- Raccords mesurés (début → fin) : prairie -21 → -23 dB (bon) ; montagne -39 → -47 (creux léger) ; **boss -22 → -46 (saut)** ;
  **désert -38 → -26 (saut)**.
- Mode « synthé » : tout est synthétisé (pas de fichier). Le morceau « Sorcier » (Dukas) n'existe qu'en synthèse.

## Ce que ça change pour qui
- Léo / Arthur et les joueurs : une musique d'accueil sur le titre, le choix des cartes et la pause ; des boucles sans clic ; un jeu qui ne devient jamais muet à cause d'un fichier manquant.
- Thibault : rien à administrer ; redéploiement habituel. Les fichiers viennent de lui (ou de Lyria) ; j'en fais les raccords.

## Règles
- **Menu et pause** : en mode Vivaldi, le morceau « menu » joue à la place de l'enchaînement sur le titre et l'écran des cartes, et **pendant la pause**
  d'une partie ; à la reprise, la musique de la partie repart là où elle s'était arrêtée.
- **Fichier du menu** : converti en OGG (et MP3), nommé `musique_menu.ogg|mp3`, dans `musiques/musiques_vivaldi/` ; fin raccordée au début
  par un fondu ; niveau ramené à -20 LUFS ; il joue en boucle.
- **Raccords de boucle** : les fichiers boss et désert sont retraités (fondu enchaîné fin → début, durée ~2 s) pour que la boucle ne saute pas ;
  les originaux restent dans l'historique du dépôt. Prairie : inchangée. Montagne : fondu léger seulement si l'essai l'exige.
- **Repli** : si un fichier ne se charge pas (absent, erreur de lecture), le jeu bascule **pour ce morceau** sur l'air synthétisé correspondant
  (prairie, désert, montagne, boss, menu) ; la musique ne s'arrête pas et le choix « Vivaldi » reste affiché.
- **Crédits** : une ligne discrète sur l'écran titre : « Musiques : interprétations générées avec Google Lyria 3.5 d'après *Les Quatre Saisons*
  d'Antonio Vivaldi (domaine public). »
- Volume « Musique » et bouton « Son » : comme aujourd'hui.

## Hors périmètre
- Les **effets sonores** (tirs, morts, cloches…) : ils restent synthétisés ; leurs fichiers feront une spec à part quand ils existeront.
- Le morceau « Sorcier » en fichier (pas encore reçu) ; en mode Vivaldi il n'est pas joué, comme aujourd'hui.
- Changer l'enchaînement de la spec 020, afficher le titre du morceau, fondu enchaîné entre deux morceaux différents.
- Le mode « synthé » (inchangé : le menu y garde son air synthétisé).

## Critères d'acceptation
1. [x] Le fichier du menu est dans le dépôt en OGG et MP3, à -20 LUFS (±1), sans silence final : début et fin au même niveau (±6 dB sur 1 s : le rythme du morceau crée des silences de 0,3 s qui faussent une mesure plus courte). — *Vérification :* mesure `ffmpeg` (ebur128, volumedetect).
2. [x] Mode Vivaldi, écran titre et écran des cartes : le morceau « menu » joue en boucle ; l'enchaînement ne joue plus au menu. — *Vérification :* navigateur.
3. [x] Mode Vivaldi, une partie en pause : le morceau « menu » joue ; reprise : le morceau de la partie repart là où il s'était arrêté (position conservée). — *Vérification :* navigateur (+ test avec faux élément audio).
4. [x] Les fichiers boss et désert retraités ont un raccord fin → début sans saut (écart de niveau ≤ 6 dB sur 1 s) ; chacun est plus court de la durée du fondu (2 s), c’est ce qui rend la boucle continue. — *Vérification :* mesure `ffmpeg`.
5. [x] Un fichier absent ou illisible : le jeu joue l'air synthétisé du même thème, sans erreur bloquante. — *Vérification :* test (faux élément qui déclenche `error`) + navigateur avec un fichier renommé.
6. [x] La ligne de crédits est visible sur l'écran titre, lisible sur mobile (`?mobile=1`), police ≥ 13 px. — *Vérification :* navigateur.
7. [x] Mode synthé : comportement inchangé, y compris le menu. — *Vérification :* navigateur + `npm test`.
8. [x] `npm test` passe. — *Vérification :* commande.

## Conception
- **Réutilisé** : `Musique` (`src/audio/musique.js` : `creerPiste`, `PISTES`, `pause`, `ENCHAINEMENT`), `majMusique` (`src/main.js`, déjà
  distingue menu / partie / boss), `progression.vivaldi`.
- **Ajouté ou modifié** :
  - `PISTES.menu` pointe vers `musique_menu` (au lieu de prairie) ; en mode Vivaldi, le contexte « menu » joue cette piste en boucle (`loop = true`, comme le boss).
  - Contexte « pause » dans `majMusique` (`enPause`) : demande le morceau « menu » ; le morceau de partie est mis en pause comme pour le boss et repris ensuite.
  - Repli : écouteur `error` sur l'élément audio ; au premier échec d'un thème, on se souvient (par thème) qu'il est indisponible et on joue `AIRS[thème]`.
  - Crédits : une ligne dans `index.html` + `style.css`.
  - Fichiers audio : un script `tools/audio/raccorder.sh` (ffmpeg, fondu enchaîné fin → début, normalisation à -20 LUFS, export OGG + MP3) pour que le travail soit refaisable avec les prochains fichiers.
- **Écarté** : lecture sans trou par Web Audio (`AudioBufferSourceNode`, boucle d'échantillons) — plus précis mais oblige à tout décoder en mémoire (~12 Mo d'audio) et à réécrire le lecteur ; le raccord dans le fichier suffit.

## Fichiers touchés (prévision)
- `musiques/musiques_vivaldi/musique_menu.ogg|mp3` (nouveaux), `musique_boss.*`, `musique_desert.*` (retraités)
- `tools/audio/raccorder.sh` — nouveau
- `src/audio/musique.js`, `src/main.js` — menu, pause, repli
- `index.html`, `style.css` — crédits
- `tests/musique.test.js` — pause, repli
- `CLAUDE.md` — lignes sur le menu/pause, le repli et les crédits

## Risques
- **Droits** : les morceaux sont générés par Lyria à partir d'une œuvre du domaine public (Vivaldi, mort en 1741), mais **les conditions d'utilisation de Lyria
  pour un usage public** (jeu en ligne) sont à vérifier par Thibault ; je ne peux pas le garantir. Rien d'autre n'est repris d'une œuvre protégée.
- Enfants / vie privée / IA : rien (aucune donnée, aucun appel réseau, rien ne part à une IA).
- Poids : ~12 Mo de musique déjà dans le dépôt ; le menu ajoute environ 3 Mo en OGG.
- Je ne peux pas écouter : les raccords sont contrôlés par mesure, pas à l'oreille ; une écoute par Thibault reste nécessaire.

## Étapes
1. Script de raccord + fichiers retraités et fichier du menu (une PR).
2. Menu, pause, repli, crédits, tests (même PR si petite, sinon une seconde).

## Décisions de Thibault (2026-11-25)
- Pause d'une partie (mode Vivaldi) : le morceau du menu joue ; à la reprise, la musique de la partie repart là où elle s'était arrêtée.
- Mode « synthé » : le menu et la pause gardent leurs airs synthétisés, sans le morceau Lyria.

## Questions ouvertes
(aucune)

## Livraison
- Fichiers : `musique_menu` (OGG + MP3, -19,5 LUFS, 173,3 s, silence final coupé, fondu de 3 s fin → début), `musique_boss` (46,7 s) et `musique_desert` (55,3 s)
  retraités (fondu de 2 s) ; prairie et montagne inchangés. Refaisable avec `tools/audio/raccorder.sh entrée sortie [fondu] [fin utile]`.
- Écart de niveau fin → début sur 1 s : menu 1,4 dB, boss 1,3 dB, désert 2,2 dB. (La fenêtre de 0,3 s de la spec était trop courte : le rythme du désert
  y met des silences à -37 dB ; la spec est corrigée en 1 s.) Chaque fichier est plus court du fondu, c'est ce qui rend la boucle continue.
- Code : menu = piste `menu` en boucle ; pause (Vivaldi) = piste `menu`, le morceau de partie reprend à sa position ; `error` sur un fichier → air synthétisé du
  même thème, retenu par thème (`Musique.absentes`). Crédits sur l'écran titre (13 px, lisibles en `?mobile=1`). 116 tests verts.
- Vérifié en navigateur (Chrome) avec les vrais fichiers : menu en boucle, pause → menu puis reprise du morceau, repli sur une adresse inexistante.
- **À vérifier à la main** : écouter les raccords (je n'ai pu que les mesurer) ; relire les conditions d'utilisation de Lyria pour un jeu public.
