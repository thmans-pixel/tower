# 006 — Mise en ligne sur thnas

Statut : **validé** par Thibault le 22 novembre 2026 : adresse https://tower.izicraft.fr, accès public.

## Objectif

Jouer depuis n'importe quel navigateur, sans lancer le serveur Python sur le PC.

## Hébergement (comme Élite 27)

- Une installation à part de l'application « site statique » (my_webapp) de YunoHost sur thnas, au domaine
  `tower.izicraft.fr`, ouverte au public.
- Seuls les fichiers du jeu sont copiés : `index.html`, `style.css`, `src/`, `assets/` (plus `version.json`).
  Ni `decor.blend`, ni scripts Blender, ni aperçus, ni tests, ni documents.
- Le serveur Python (`tools/serveur.py`) reste pour les essais sur le PC ; en ligne, Nginx sert les fichiers.

## Mise à jour à la main

`tools/deploiement/mettre-a-jour.sh <dossier du site>` sur thnas, après chaque fusion : récupère `main` dans
`/var/lib/tower/source`, copie le jeu dans le dossier du site, écrit `version.json`. Le dossier est obligatoire
(plusieurs sites statiques sur thnas) et le script refuse d'écraser un autre site sans `--remplacer`.

## Cache et compression

`tools/deploiement/cache.conf` (« no-cache » : le navigateur revérifie chaque fichier, pas de mélange de
versions, images inchangées non retéléchargées) et `compression.conf` (code et données compressés à l'envoi),
à ajouter au bloc `location /` de l'application dans Nginx.

## Version visible

L'écran titre affiche « Version <commit> du <date> » (lu dans `version.json` ; « Version locale » sur le PC).

## Rappel

La progression (étoiles, cartes, records) reste propre à chaque navigateur et à chaque appareil.

## Hors périmètre

Comptes, progression partagée entre appareils, mise à jour automatique.

## Critères d'acceptation

- Le jeu se charge et se joue en entier à https://tower.izicraft.fr, sur PC et tablette.
- Après une fusion, une seule commande sur thnas met le site à jour ; la nouvelle version s'affiche sans vider le
  cache.
- Aucun fichier de travail accessible en ligne.
