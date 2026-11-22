#!/usr/bin/env bash
# Met en ligne la branche main des Tours du Royaume (https://tower.izicraft.fr) : à lancer sur thnas, après avoir
# fusionné une demande sur GitHub.
#
#   sudo bash mettre-a-jour.sh /var/www/my_webapp__N/www
#
# Le dossier est celui que sert l'installation « site statique » (my_webapp) de YunoHost réservée au jeu.
# Il est obligatoire : plusieurs sites statiques tournent sur thnas (Élite 27…), on ne devine pas lequel.
# Seuls les fichiers du jeu y sont copiés : ni decor.blend, ni scripts Blender, ni aperçus, ni tests, ni documents.
set -euo pipefail

# Tout est dans une fonction : le script se met lui-même à jour en cours de route, il doit donc être lu en entier
# avant de commencer.
principal() {
  DEPOT="${TOWER_DEPOT:-https://github.com/thmans-pixel/tower.git}"
  BRANCHE="${TOWER_BRANCHE:-main}"
  SOURCE="${TOWER_SOURCE:-/var/lib/tower/source}"
  SITE="${1:-}"

  if [ -z "$SITE" ]; then
    echo "Indique le dossier du site, par exemple : sudo bash $0 /var/www/my_webapp__4/www" >&2
    exit 1
  fi
  for outil in git rsync; do
    command -v "$outil" >/dev/null || { echo "Il manque la commande $outil sur ce serveur (sudo apt install $outil)." >&2; exit 1; }
  done
  if [ ! -d "$SITE" ]; then
    echo "Le dossier du site n'existe pas : $SITE" >&2
    exit 1
  fi
  # Garde-fou : ne jamais écraser un autre site (Élite 27…). Un dossier neuf de my_webapp ne contient qu'une page
  # d'accueil de YunoHost ; un dossier déjà à nous contient notre index.html.
  if [ -f "$SITE/index.html" ] && ! grep -q "Les Tours du Royaume" "$SITE/index.html" \
     && grep -q "<script" "$SITE/index.html" && [ "${2:-}" != "--remplacer" ]; then
    echo "Ce dossier contient déjà un autre site : $SITE" >&2
    echo "Vérifie que c'est bien celui de tower.izicraft.fr. Si oui, relance avec --remplacer à la fin." >&2
    exit 1
  fi

  # Copie de travail du dépôt, gardée d'une fois sur l'autre pour ne télécharger que les nouveautés.
  if [ ! -d "$SOURCE/.git" ]; then
    mkdir -p "$(dirname "$SOURCE")"
    git clone --quiet --branch "$BRANCHE" --depth 1 "$DEPOT" "$SOURCE"
  else
    git -C "$SOURCE" fetch --quiet --depth 1 origin "$BRANCHE"
    git -C "$SOURCE" reset --quiet --hard "origin/$BRANCHE"
  fi

  VERSION="$(git -C "$SOURCE" rev-parse --short HEAD)"
  JOUR="$(git -C "$SOURCE" log -1 --format=%cs)"

  # Le jeu et rien d'autre. --checksum : un fichier inchangé n'est pas réécrit, le navigateur garde donc sa copie.
  rsync --recursive --checksum --delete --delete-excluded \
    --include='/index.html' --include='/style.css' \
    --include='/src/***' --include='/assets/***' \
    --exclude='*' \
    "$SOURCE/" "$SITE/"

  printf '{ "version": "%s", "date": "%s" }\n' "$VERSION" "$JOUR" > "$SITE/version.json"

  # Les fichiers appartiennent au même compte que le dossier du site.
  chown -R --reference="$SITE" "$SITE"

  echo "En ligne : version $VERSION du $JOUR, dans $SITE"
}
principal "$@"
