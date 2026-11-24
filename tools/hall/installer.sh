#!/usr/bin/env bash
# Installe (ou réinstalle, sans danger) le hall of fame sur thnas. À lancer une fois, en administrateur :
#
#   sudo bash /var/lib/tower/source/tools/hall/installer.sh
#
# Il faut d'abord avoir mis le jeu en ligne une fois (tools/deploiement/mettre-a-jour.sh) : c'est lui qui pose la
# copie du dépôt dans /var/lib/tower/source. Rien n'est supprimé ; la base (/var/lib/tower/hall) est gardée.
set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="${TOWER_NGINX_DIR:-/etc/nginx/conf.d/tower.izicraft.fr.d}"

if [ "$(id -u)" -ne 0 ]; then
  echo "À lancer avec sudo." >&2
  exit 1
fi
command -v python3 >/dev/null || { echo "Il manque python3." >&2; exit 1; }
if [ ! -d "$NGINX_DIR" ]; then
  echo "Dossier nginx introuvable : $NGINX_DIR (là où se trouve tower-cache.conf)." >&2
  exit 1
fi

id tower-hall >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin tower-hall
install -d -o tower-hall -g tower-hall -m 750 /var/lib/tower/hall
python3 -m unittest discover -s "$ICI" >/dev/null

install -m 644 "$ICI/tower-hall.service" /etc/systemd/system/tower-hall.service
install -m 644 "$ICI/tower-hall.conf" "$NGINX_DIR/tower-hall.conf"

# Commande de modération : sudo tower-hall liste | retirer <n> | vider <classement>
cat > /usr/local/bin/tower-hall <<SCRIPT
#!/usr/bin/env bash
exec sudo -u tower-hall env HALL_DB=/var/lib/tower/hall/hall.db python3 -I /var/lib/tower/source/tools/hall/hall.py "\$@"
SCRIPT
chmod 755 /usr/local/bin/tower-hall

systemctl daemon-reload
systemctl enable --now tower-hall
systemctl restart tower-hall
nginx -t
systemctl reload nginx

sleep 1
curl -fsS "http://127.0.0.1:8029/api/hall?classement=tour" >/dev/null
echo "Hall of fame en service (127.0.0.1:8029, base /var/lib/tower/hall/hall.db)."
echo "Modération : sudo tower-hall liste   |   sudo tower-hall retirer <n>   |   sudo tower-hall vider <classement>"
