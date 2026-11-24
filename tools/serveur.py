#!/usr/bin/env python3
"""Sert le jeu en local sans laisser le navigateur garder d'anciens fichiers.

Avec `python3 -m http.server`, le navigateur peut réutiliser un ancien module après une mise à jour :
le jeu tourne alors avec un mélange de versions. Ici, chaque fichier est redemandé à chaque chargement.

Usage, depuis le dossier du jeu : python3 tools/serveur.py [port]   (8028 par défaut)
"""
import http.client
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SansCache(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".json": "application/json"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        pass

    # /api/ : renvoyé vers le hall of fame local (tools/hall/hall.py serveur, port 8029), comme le fait nginx en ligne.
    def api(self):
        taille = int(self.headers.get("Content-Length") or 0)
        corps = self.rfile.read(taille) if taille else None
        try:
            c = http.client.HTTPConnection("127.0.0.1", 8029, timeout=5)
            c.request(self.command, self.path, body=corps, headers={"Content-Type": "application/json"})
            r = c.getresponse()
            data = r.read()
            self.send_response(r.status)
            self.send_header("Content-Type", r.getheader("Content-Type", "application/json"))
        except OSError:
            data = b"{}"
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.api()
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self.api()
        self.send_error(405)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8028
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    print(f"Les Tours du Royaume : http://localhost:{port}/  (Ctrl+C pour arrêter)")
    ThreadingHTTPServer(("", port), SansCache).serve_forever()
