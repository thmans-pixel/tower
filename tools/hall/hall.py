#!/usr/bin/env python3
"""Hall of fame des Tours du Royaume (spec 018).

Petit service HTTP en bibliothèque standard seulement (http.server, sqlite3), derrière nginx (`/api/`).
Il ne garde que : pseudo, enfant ou adulte, classement, carte, difficulté, valeur, détail, jour (sans l'heure),
version des règles. Jamais d'adresse IP sur le disque (la limite d'envois se fait en mémoire).

    python3 hall.py serveur            écoute 127.0.0.1:8029
    python3 hall.py liste [classement] numérote les entrées (pour retirer)
    python3 hall.py retirer <n>        retire l'entrée n
    python3 hall.py retirer-pseudo <p> retire toutes les lignes d'un pseudo
    python3 hall.py vider <classement> --oui  vide tout un classement (tour, labyrinthe, infini, campagne)

Variables : HALL_DB (défaut /var/lib/tower/hall/hall.db), HALL_PORT (défaut 8029).
"""
import json
import os
import re
import sqlite3
import sys
import threading
import time
import unicodedata
from collections import deque
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ICI = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ICI, 'regles.json'), encoding='utf-8') as f:
    REGLES = json.load(f)

CLASSEMENTS = ('tour', 'labyrinthe', 'infini', 'campagne')
TAILLE_MAX = 2048
TOP = 20
LEET = str.maketrans({'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'})


class Refus(Exception):
    """Une demande refusée : code HTTP, mot-clé pour le jeu, phrase en français."""

    def __init__(self, http, code, message):
        super().__init__(message)
        self.http, self.code, self.message = http, code, message


# ---------- pseudos ----------

def normaliser(texte):
    """Minuscules, sans accents, chiffres et symboles « leet » ramenés à des lettres."""
    t = unicodedata.normalize('NFKD', texte.casefold())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return t.translate(LEET)


def contient_interdit(pseudo):
    n = normaliser(pseudo)
    jetons = [j for j in re.split(r'[^a-z]+', n) if j]
    colle = ''.join(jetons)
    if any(normaliser(m) in colle for m in REGLES['sousChaines']):
        return True
    for mot in REGLES['motsInterdits']:
        m = normaliser(mot)
        if len(m) >= 6:
            if m in colle:
                return True
        elif m in jetons or m == colle:   # « c u l » : lettres écartées
            return True
    return False


def forme_ok(p):
    """Forme d'un pseudo libre (adulte ou enfant) : 3 à 16 caractères, lettres latines, chiffres, espaces, tirets."""
    r = REGLES['pseudo']
    if not isinstance(p, str) or not (r['min'] <= len(p) <= r['max']):
        return False
    # lettres latines seulement (pas de cyrillique qui imite le latin), chiffres, espaces, tirets
    lettre = r'[A-Za-z0-9À-ÖØ-öø-ÿ]'
    if not re.fullmatch(rf'{lettre}(?:{lettre}|[ \-])*{lettre}', p):
        return False
    if '  ' in p or '--' in p or ' -' in p or '- ' in p:
        return False
    return sum(c.isdigit() for c in p) <= r['chiffresMax']


def pseudo_propose_ok(p):
    """La forme proposée par le jeu : « Animal Couleur nombre »."""
    if not isinstance(p, str):
        return False
    morceaux = p.split(' ')
    if len(morceaux) != 3:
        return False
    animal, couleur, nombre = morceaux
    if animal not in REGLES['animaux'] or couleur not in REGLES['couleurs']:
        return False
    return bool(re.fullmatch(r'[1-9][0-9]?', nombre)) and 1 <= int(nombre) <= REGLES['nombreMax']


def pseudo_adulte_ok(p):
    if not forme_ok(p) or pseudo_propose_ok(p):   # la forme « Animal Couleur nombre » est réservée aux enfants
        return False
    return not contient_interdit(p)


def sans_accent(texte):
    t = unicodedata.normalize('NFKD', texte.casefold())
    return ''.join(c for c in t if not unicodedata.combining(c))


NOMS_PROPRES = None


def reduire(t):
    """Lettres répétées ramenées à une seule (« Leooo » = « Leo »)."""
    return re.sub(r'(.)\1+', r'\1', t)


def noms_propres():
    global NOMS_PROPRES
    if NOMS_PROPRES is None:
        NOMS_PROPRES = {sans_accent(n).replace(' ', '') for n in REGLES['prenoms'] + REGLES['noms']}
    return NOMS_PROPRES


def contient_nom(p):
    """Un prénom ou un nom de la liste se cache-t-il dans le pseudo ?
    1. mot à mot : séparés par espaces, tirets, chiffres ou majuscules internes (« LeoGamer » = Leo + Gamer, « Arthur26 ») ;
    2. tout collé, en minuscules, au début (dès 3 lettres), à la fin (dès 4) ou n'importe où (dès 5) : « leogamer », « gamerhugo », « xXLucasXx » ;
       des mots courants (leopard, tomate…) font exception ;
    3. mêmes contrôles avec les chiffres lus comme des lettres (« Th1bault », « L3o ») et les lettres répétées réduites (« Leooo »)."""
    liste = noms_propres()
    exceptions = REGLES['exceptionsNoms']
    decoupe = re.sub(r'(?<=[a-zß-ÿ])(?=[A-ZÀ-ß])', ' ', p)
    mots = [sans_accent(m) for m in re.split(r'[^A-Za-zÀ-ÿ]+', decoupe) if m]
    if any(m in liste or reduire(m) in {reduire(n) for n in liste} for m in mots):
        return True
    colles = {''.join(mots), re.sub(r'[^a-z]', '', normaliser(p))}
    for colle in list(colles):
        colles.add(reduire(colle))
    for colle in colles:
        for n in liste:
            if colle == n or colle == reduire(n):
                return True
            for nom in (n,):
                if any(colle.startswith(e) for e in exceptions if e.startswith(nom)):
                    continue
                if len(nom) >= 3 and colle.startswith(nom):
                    return True
                if len(nom) >= 4 and colle.endswith(nom):
                    return True
                if len(nom) >= 5 and nom in colle:   # « xXLucasXx »
                    return True
    return False


def invite_contact(p):
    """Un enfant ne publie pas d'invitation à le contacter ailleurs (Snap, Discord…)."""
    n = normaliser(p)
    jetons = [j for j in re.split(r'[^a-z]+', n) if j]
    colle = ''.join(jetons)
    return any(m in jetons or (len(m) >= 6 and colle.startswith(m)) for m in REGLES['motsContact'])


def pseudo_enfant_erreur(p):
    """None si un enfant peut prendre ce pseudo, sinon 'prenom' (vrai prénom ou nom) ou 'pseudo' (autre refus)."""
    if pseudo_propose_ok(p):
        return None
    if not forme_ok(p) or contient_interdit(p) or invite_contact(p):
        return 'pseudo'
    return 'prenom' if contient_nom(p) else None


def pseudo_enfant_ok(p):
    return pseudo_enfant_erreur(p) is None


# ---------- validation ----------

def entier(v, mini, maxi):
    if isinstance(v, bool) or not isinstance(v, int) or not (mini <= v <= maxi):
        raise Refus(400, 'valeur', 'Ce résultat n’est pas possible.')
    return v


def dans(v, liste, code):
    if not isinstance(v, str) or v not in liste:
        raise Refus(400, code, 'Demande incorrecte.')
    return v


def liste_de(classement, p):
    """Valide (carte, difficulté) d'une liste et renvoie la clé de la liste."""
    classement = dans(classement, CLASSEMENTS, 'classement')
    cartes, diffs = REGLES['cartes'], list(REGLES['difficultes'])
    if classement == 'tour':
        return classement, '', ''
    if classement == 'labyrinthe':
        return classement, '', dans(p.get('difficulte'), diffs, 'difficulte')
    return classement, dans(p.get('carte'), cartes, 'carte'), dans(p.get('difficulte'), diffs, 'difficulte')


def verifier_envoi(p):
    """Contrôle strict d'un envoi ; renvoie un dictionnaire prêt à ranger."""
    if not isinstance(p, dict):
        raise Refus(400, 'forme', 'Demande incorrecte.')
    permis = {'pseudo', 'enfant', 'classement', 'carte', 'difficulte', 'valeur', 'tour', 'mode', 'vagues'}
    if set(p) - permis:
        raise Refus(400, 'forme', 'Demande incorrecte.')
    enfant = p.get('enfant')
    if not isinstance(enfant, bool):
        raise Refus(400, 'forme', 'Demande incorrecte.')
    pseudo = p.get('pseudo')
    if enfant:
        erreur = pseudo_enfant_erreur(pseudo)
        if erreur == 'prenom':
            raise Refus(400, 'prenom', 'Pas de vrai prénom ni de nom.')
        if erreur:
            raise Refus(400, 'pseudo', 'Ce pseudo n’est pas accepté.')
    elif not pseudo_adulte_ok(pseudo):
        raise Refus(400, 'pseudo', 'Ce pseudo n’est pas accepté.')
    classement = dans(p.get('classement'), CLASSEMENTS, 'classement')
    diffs = REGLES['difficultes']
    b = REGLES['bornes']
    detail = {}
    if classement == 'tour':
        carte = dans(p.get('carte'), REGLES['cartes'] + ['labyrinthe'], 'carte')
        difficulte = dans(p.get('difficulte'), list(diffs), 'difficulte')
        mode = dans(p.get('mode'), REGLES['modes'], 'mode')
        if (mode == 'labyrinthe') != (carte == 'labyrinthe'):
            raise Refus(400, 'mode', 'Demande incorrecte.')
        tour = dans(p.get('tour'), REGLES['tours'], 'tour')
        vagues = entier(p.get('vagues'), 1, b['tour']['vaguesMax'])
        # Prestiges (spec 023) : les ultimes frappent bien plus fort, le plafond par vague est multiplié.
        mult = b['tour'].get('multPrestige', 1) if difficulte.startswith('prestige') else 1
        valeur = entier(p.get('valeur'), 1, vagues * b['tour']['degatsParVagueMax'][mode] * mult)
        detail = {'tour': tour, 'carte': carte, 'difficulte': difficulte, 'mode': mode, 'vagues': vagues}
        cle_carte, cle_diff, score = '', '', valeur
    else:
        if set(p) & {'tour', 'mode', 'vagues'}:
            raise Refus(400, 'forme', 'Demande incorrecte.')
        _, cle_carte, cle_diff = liste_de(classement, p)
        if classement == 'labyrinthe':
            if p.get('carte') not in (None, ''):
                raise Refus(400, 'forme', 'Demande incorrecte.')
            valeur = entier(p.get('valeur'), b['labyrinthe']['vaguesMin'], b['labyrinthe']['vaguesMax'])
            score = -valeur
        elif classement == 'infini':
            valeur = entier(p.get('valeur'), b['infini']['vaguesMin'], b['infini']['vaguesMax'])
            score = valeur
        else:
            valeur = entier(p.get('valeur'), b['campagne']['viesMin'], diffs[cle_diff])
            score = valeur
    return {'pseudo': pseudo, 'enfant': 1 if enfant else 0, 'classement': classement, 'carte': cle_carte,
            'difficulte': cle_diff, 'valeur': valeur, 'score': score, 'detail': detail}


# ---------- limite d'envois (mémoire seulement) ----------

class Limite:
    def __init__(self, envois, secondes):
        self.envois, self.secondes = envois, secondes
        self.vus = {}
        self.verrou = threading.Lock()

    def permis(self, cle, maintenant=None):
        maintenant = time.monotonic() if maintenant is None else maintenant
        with self.verrou:
            file = self.vus.setdefault(cle, deque())
            while file and maintenant - file[0] > self.secondes:
                file.popleft()
            if len(file) >= self.envois:
                return False
            file.append(maintenant)
            if len(self.vus) > 5000:
                for k in [k for k, f in self.vus.items() if not f or maintenant - f[-1] > self.secondes]:
                    del self.vus[k]
            return True


# ---------- base ----------

SCHEMA = """
CREATE TABLE IF NOT EXISTS entrees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  cle TEXT NOT NULL,
  enfant INTEGER NOT NULL,
  classement TEXT NOT NULL,
  carte TEXT NOT NULL,
  difficulte TEXT NOT NULL,
  valeur INTEGER NOT NULL,
  score INTEGER NOT NULL,
  detail TEXT NOT NULL,
  jour TEXT NOT NULL,
  regles INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS une_ligne_par_liste ON entrees (cle, enfant, classement, carte, difficulte);
CREATE INDEX IF NOT EXISTS par_liste ON entrees (enfant, classement, carte, difficulte, score DESC, id);
"""


class Hall:
    def __init__(self, chemin):
        self.chemin = chemin
        dossier = os.path.dirname(chemin)
        if dossier:
            os.makedirs(dossier, exist_ok=True)
        with self.base() as c:
            c.executescript(SCHEMA)
        self.limite = Limite(REGLES['limiteParIp']['envois'], REGLES['limiteParIp']['secondes'])

    def base(self):
        c = sqlite3.connect(self.chemin, timeout=5, isolation_level=None)
        c.row_factory = sqlite3.Row
        return c

    def place(self, c, e, id_):
        n = c.execute(
            'SELECT COUNT(*) FROM entrees WHERE enfant=? AND classement=? AND carte=? AND difficulte=? '
            'AND (score > ? OR (score = ? AND id < ?))',
            (e['enfant'], e['classement'], e['carte'], e['difficulte'], e['score'], e['score'], id_)).fetchone()[0]
        return n + 1

    def envoyer(self, payload, jour=None):
        e = verifier_envoi(payload)
        cle = e['pseudo'].casefold()
        jour = jour or date.today().isoformat()
        c = self.base()
        try:
            c.execute('BEGIN IMMEDIATE')
            liste = (cle, e['enfant'], e['classement'], e['carte'], e['difficulte'])
            ancien = c.execute('SELECT id, score, valeur FROM entrees WHERE cle=? AND enfant=? AND classement=? '
                               'AND carte=? AND difficulte=?', liste).fetchone()
            ameliore = False
            if ancien is None or e['score'] > ancien['score']:
                if ancien is not None:
                    c.execute('DELETE FROM entrees WHERE id=?', (ancien['id'],))
                cur = c.execute(
                    'INSERT INTO entrees (pseudo, cle, enfant, classement, carte, difficulte, valeur, score, detail, '
                    'jour, regles) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                    (e['pseudo'], cle, e['enfant'], e['classement'], e['carte'], e['difficulte'], e['valeur'],
                     e['score'], json.dumps(e['detail'], ensure_ascii=False), jour, REGLES['version']))
                id_, ameliore = cur.lastrowid, True
                valeur = e['valeur']
                e = dict(e)
            else:
                id_, valeur = ancien['id'], ancien['valeur']
                e = dict(e, score=ancien['score'])
            place = self.place(c, e, id_)
            c.execute('COMMIT')
        except Exception:
            if c.in_transaction:
                c.execute('ROLLBACK')
            raise
        finally:
            c.close()
        return {'place': place, 'valeur': valeur, 'ameliore': ameliore}

    def lire(self, params):
        """params : dictionnaire de textes (classement, carte, difficulte, enfant)."""
        classement, carte, diff = liste_de(params.get('classement'), params)
        enfant = params.get('enfant', '0')
        if enfant not in ('0', '1'):
            raise Refus(400, 'forme', 'Demande incorrecte.')
        c = self.base()
        try:
            lignes = c.execute(
                'SELECT pseudo, valeur, detail, jour FROM entrees WHERE enfant=? AND classement=? AND carte=? '
                'AND difficulte=? ORDER BY score DESC, id ASC LIMIT ?',
                (int(enfant), classement, carte, diff, TOP)).fetchall()
        finally:
            c.close()
        return {'entrees': [{'place': i + 1, 'pseudo': r['pseudo'], 'valeur': r['valeur'],
                             'detail': json.loads(r['detail']), 'jour': r['jour']} for i, r in enumerate(lignes)]}

    # modération
    def liste(self, classement=None):
        c = self.base()
        try:
            q, a = 'SELECT * FROM entrees', ()
            if classement:
                q, a = q + ' WHERE classement=?', (classement,)
            return c.execute(q + ' ORDER BY classement, enfant, carte, difficulte, score DESC, id', a).fetchall()
        finally:
            c.close()

    def retirer(self, id_):
        c = self.base()
        try:
            return c.execute('DELETE FROM entrees WHERE id=?', (id_,)).rowcount
        finally:
            c.close()

    def retirer_pseudo(self, texte):
        c = self.base()
        try:
            return c.execute('DELETE FROM entrees WHERE cle=?', (texte.casefold(),)).rowcount
        finally:
            c.close()

    def vider(self, classement):
        c = self.base()
        try:
            return c.execute('DELETE FROM entrees WHERE classement=?', (classement,)).rowcount
        finally:
            c.close()


# ---------- HTTP ----------

def fabriquer_gestionnaire(hall):
    class Gestionnaire(BaseHTTPRequestHandler):
        timeout = 10
        server_version = 'tower-hall'
        sys_version = ''

        def log_message(self, *a):  # rien : ni adresse, ni requête
            pass

        def repondre(self, http, corps):
            data = json.dumps(corps, ensure_ascii=False).encode('utf-8')
            self.send_response(http)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(data)

        def ip(self):
            ip = self.client_address[0]
            if ip == '127.0.0.1':  # nginx : c'est lui qui connaît le vrai visiteur
                ip = self.headers.get('X-Real-IP', ip)[:64]
            if ':' in ip:   # IPv6 : tout un foyer partage un préfixe /64
                ip = ':'.join(ip.split(':')[:4])
            return ip

        def traiter(self, f):
            try:
                self.repondre(200, f())
            except Refus as r:
                self.repondre(r.http, {'erreur': r.message, 'raison': r.code})
            except Exception:
                self.repondre(500, {'erreur': 'Le hall of fame ne répond pas.', 'raison': 'serveur'})

        def do_GET(self):
            u = urlparse(self.path)
            if u.path != '/api/hall':
                return self.repondre(404, {'erreur': 'Introuvable.', 'raison': 'introuvable'})
            params = {k: v[0] for k, v in parse_qs(u.query, max_num_fields=10).items()}
            self.traiter(lambda: hall.lire(params))

        def do_POST(self):
            if urlparse(self.path).path != '/api/hall':
                return self.repondre(404, {'erreur': 'Introuvable.', 'raison': 'introuvable'})
            try:
                taille = int(self.headers.get('Content-Length', ''))
            except ValueError:
                return self.repondre(411, {'erreur': 'Demande incorrecte.', 'raison': 'forme'})
            if taille < 0 or taille > TAILLE_MAX:
                return self.repondre(413, {'erreur': 'Demande trop grande.', 'raison': 'taille'})
            brut = self.rfile.read(taille)
            if not hall.limite.permis(self.ip()):
                return self.repondre(429, {'erreur': 'Trop d’envois : réessaie plus tard.', 'raison': 'limite'})

            def faire():
                try:
                    payload = json.loads(brut.decode('utf-8'))
                except (ValueError, UnicodeDecodeError):
                    raise Refus(400, 'forme', 'Demande incorrecte.')
                return hall.envoyer(payload)
            self.traiter(faire)

    return Gestionnaire


def serveur(hall, port, hote='127.0.0.1'):
    s = ThreadingHTTPServer((hote, port), fabriquer_gestionnaire(hall))
    s.daemon_threads = True
    return s


def principal(argv):
    base = os.environ.get('HALL_DB', '/var/lib/tower/hall/hall.db')
    cmd = argv[1] if len(argv) > 1 else ''
    if cmd == 'serveur':
        hall = Hall(base)
        port = int(os.environ.get('HALL_PORT', '8029'))
        print(f'Hall of fame : 127.0.0.1:{port}, base {base}', flush=True)
        serveur(hall, port).serve_forever()
    elif cmd == 'liste':
        for r in Hall(base).liste(argv[2] if len(argv) > 2 else None):
            qui = 'enfant' if r['enfant'] else 'adulte'
            print(f"{r['id']:>5}  {r['classement']:<10} {r['carte'] or '-':<9} {r['difficulte'] or '-':<9} "
                  f"{qui:<6} {r['pseudo']:<16} {r['valeur']:>10}  {r['jour']}")
    elif cmd == 'retirer' and len(argv) == 3 and argv[2].isdigit():
        n = Hall(base).retirer(int(argv[2]))
        print('Entrée retirée.' if n else 'Aucune entrée avec ce numéro.')
    elif cmd == 'retirer-pseudo' and len(argv) == 3:
        print(f'{Hall(base).retirer_pseudo(argv[2])} entrée(s) retirée(s).')
    elif cmd == 'vider' and len(argv) == 4 and argv[2] in CLASSEMENTS and argv[3] == '--oui':
        print(f'{Hall(base).vider(argv[2])} entrée(s) retirée(s).')
    elif cmd == 'vider' and len(argv) == 3 and argv[2] in CLASSEMENTS:
        print(f'Cela efface tout le classement « {argv[2]} » (adultes et enfants), sans retour possible.')
        print(f'Pour confirmer : vider {argv[2]} --oui')
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(principal(sys.argv))
