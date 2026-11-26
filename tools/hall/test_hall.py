"""Essais du serveur du hall of fame : python3 -m unittest discover -s tools/hall"""
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

import hall
from hall import Hall, Refus, REGLES


def camp(pseudo='Alice', valeur=10, **k):
    return {'pseudo': pseudo, 'enfant': False, 'classement': 'campagne', 'carte': 'prairie',
            'difficulte': 'normal', 'valeur': valeur, **k}


class Base(unittest.TestCase):
    def setUp(self):
        self.dossier = tempfile.TemporaryDirectory()
        self.hall = Hall(os.path.join(self.dossier.name, 'h.db'))

    def tearDown(self):
        self.dossier.cleanup()

    def refus(self, payload, code):
        with self.assertRaises(Refus) as r:
            self.hall.envoyer(payload)
        self.assertEqual(r.exception.code, code)


class Pseudos(unittest.TestCase):
    def test_adultes(self):
        for ok in ['Alice', 'Jean-Paul', 'Papa 42', 'Zoé', 'Léo2']:
            self.assertTrue(hall.pseudo_adulte_ok(ok), ok)
        for ko in ['ab', 'x' * 17, ' Alice', 'Alice ', 'A  B', 'a_b', 'Al<ice>', '12345678', 'a1b2c3d4e5f6', '', None, 5]:
            self.assertFalse(hall.pseudo_adulte_ok(ko), ko)

    def test_mots_interdits(self):
        for ko in ['Putain', 'm3rde', 'MERDE', 'Gros Connard', 'p.u.t.a.i.n', 'Hitler', 'enculé', 'n4zi', 'FDP']:
            self.assertFalse(hall.pseudo_adulte_ok(ko), ko)
        # un mot court n'est refusé que seul : « Constance », « Condor » restent permis
        for ok in ['Constance', 'Condor', 'Alexandre']:
            self.assertTrue(hall.pseudo_adulte_ok(ok), ok)
        self.assertFalse(hall.pseudo_adulte_ok('Pierre-Cul'))

    def test_contournements_courants(self):
        for ko in ['Nazis', 'Fuckyou', 'Shithead', 'Dickhead', 'Cunts', 'Putes', 'Pedos', 'Bites', 'c u l', 'Niques',
                   'Connards', 'Enculés', 'Salopes', 'Bitches', 'n1ques', 'Ѕhit', 'Рaul', 'Renard Bleu 27']:
            self.assertFalse(hall.pseudo_adulte_ok(ko), ko)
        for ok in ['Nazim', 'Monique', 'Violette', 'Computer', 'Dickens' if False else 'Alexandre']:
            self.assertTrue(hall.pseudo_adulte_ok(ok), ok)

    def test_enfants_forme_proposee(self):
        self.assertTrue(hall.pseudo_enfant_ok('Renard Bleu 27'))
        for ko in ['Renard Bleu 0', 'Renard Bleu 100', 'Renard Bleu 07']:
            self.assertTrue(hall.pseudo_propose_ok(ko) is False, ko)

    def test_enfants_pseudo_libre(self):
        for ok in ['LemineurMasquer', 'Abracadabra26', 'Super Dragon', 'Ninja-42', 'Zorglub']:
            self.assertTrue(hall.pseudo_enfant_ok(ok), ok)
        for ko in ['ab', 'x' * 17, '<b>', 'a_b', ' Alice', 'Ѕhit', '12345678']:
            self.assertEqual(hall.pseudo_enfant_erreur(ko), 'pseudo', ko)

    def test_enfants_prenoms_et_noms_refuses(self):
        for ko in ['Léo', 'leo', 'LÉO', 'Arthur26', 'LeoGamer', 'Thibault', 'Martin', 'Super-Lea', 'Gamer Hugo', 'thibaultlegrand',
                   'Zoé', 'ZoeLaPro']:
            self.assertEqual(hall.pseudo_enfant_erreur(ko), 'prenom', ko)

    def test_enfants_astuces_refusees(self):
        for ko in ['leogamer', 'leoplay', 'hugojoue', 'lucasgamer', 'gamerhugo', 'xXLucasXx', 'Th1bault', 'L3o', 'Leooo', 'L e o']:
            self.assertEqual(hall.pseudo_enfant_erreur(ko), 'prenom', ko)

    def test_enfants_mots_du_jeu_et_mots_courants_acceptes(self):
        for ok in ['Le Dragon', 'Renard Rouge', 'Dragon Blanc', 'Super Renard', 'Loupgarou', 'Leopard', 'Tomate', 'Galaxie', 'Minecraft']:
            self.assertIsNone(hall.pseudo_enfant_erreur(ok), ok)

    def test_enfants_pas_d_invitation_a_contacter(self):
        for ko in ['Ajoute moi Snap', 'Rejoins Discord', 'Insta Pierrot', 'Snapchat42']:
            self.assertEqual(hall.pseudo_enfant_erreur(ko), 'pseudo', ko)
        self.assertIsNone(hall.pseudo_enfant_erreur('Instantane'))

    def test_enfants_insultes_refusees(self):
        self.assertEqual(hall.pseudo_enfant_erreur('Putain'), 'pseudo')
        self.assertEqual(hall.pseudo_enfant_erreur('Merde42'), 'pseudo')

    def test_adultes_pas_concernes_par_les_prenoms(self):
        for ok in ['Daereck', 'Thibault', 'Léo', 'Arthur26']:
            self.assertTrue(hall.pseudo_adulte_ok(ok), ok)


class Envois(Base):
    def test_place_et_meilleur_resultat(self):
        self.assertEqual(self.hall.envoyer(camp('Alice', 10))['place'], 1)
        self.assertEqual(self.hall.envoyer(camp('Bob', 12))['place'], 1)
        r = self.hall.envoyer(camp('Alice', 5))   # moins bon : rien ne change
        self.assertEqual((r['place'], r['valeur'], r['ameliore']), (2, 10, False))
        r = self.hall.envoyer(camp('Alice', 15))
        self.assertEqual((r['place'], r['ameliore']), (1, True))
        lignes = self.hall.lire({'classement': 'campagne', 'carte': 'prairie', 'difficulte': 'normal'})['entrees']
        self.assertEqual([(l['pseudo'], l['valeur']) for l in lignes], [('Alice', 15), ('Bob', 12)])

    def test_une_ligne_par_pseudo_meme_en_majuscules(self):
        self.hall.envoyer(camp('Alice', 10))
        self.hall.envoyer(camp('ALICE', 11))
        self.assertEqual(len(self.hall.liste()), 1)

    def test_egalite_premier_arrive_devant(self):
        self.hall.envoyer(camp('Alice', 10))
        self.assertEqual(self.hall.envoyer(camp('Bob', 10))['place'], 2)
        # Alice améliore puis Bob égale : Bob reste derrière
        self.hall.envoyer(camp('Alice', 12))
        self.assertEqual(self.hall.envoyer(camp('Bob', 12))['place'], 2)

    def test_adultes_et_enfants_separes(self):
        self.hall.envoyer(camp('Alice', 10))
        e = camp('Renard Bleu 27', 3, enfant=True)
        self.assertEqual(self.hall.envoyer(e)['place'], 1)
        base = {'classement': 'campagne', 'carte': 'prairie', 'difficulte': 'normal'}
        self.assertEqual(len(self.hall.lire({**base, 'enfant': '0'})['entrees']), 1)
        self.assertEqual(self.hall.lire({**base, 'enfant': '1'})['entrees'][0]['pseudo'], 'Renard Bleu 27')

    def test_listes_independantes(self):
        self.hall.envoyer(camp('Alice', 10))
        self.hall.envoyer(camp('Alice', 10, carte='desert'))
        self.hall.envoyer(camp('Alice', 10, difficulte='facile'))
        self.assertEqual(len(self.hall.liste()), 3)

    def test_labyrinthe_moins_de_vagues_gagne(self):
        def laby(p, v):
            return {'pseudo': p, 'enfant': False, 'classement': 'labyrinthe', 'difficulte': 'normal', 'valeur': v}
        self.hall.envoyer(laby('Alice', 12))
        self.assertEqual(self.hall.envoyer(laby('Bob', 8))['place'], 1)
        self.assertEqual(self.hall.envoyer(laby('Alice', 15))['ameliore'], False)
        self.assertEqual(self.hall.envoyer(laby('Alice', 6))['place'], 1)
        lignes = self.hall.lire({'classement': 'labyrinthe', 'difficulte': 'normal'})['entrees']
        self.assertEqual([l['valeur'] for l in lignes], [6, 8])

    def test_infini_et_tour(self):
        self.hall.envoyer({'pseudo': 'Alice', 'enfant': False, 'classement': 'infini', 'carte': 'montagne',
                           'difficulte': 'difficile', 'valeur': 40})
        t = {'pseudo': 'Alice', 'enfant': False, 'classement': 'tour', 'carte': 'prairie', 'difficulte': 'normal',
             'mode': 'campagne', 'tour': 'mage', 'vagues': 20, 'valeur': 250000}
        self.assertEqual(self.hall.envoyer(t)['place'], 1)
        ligne = self.hall.lire({'classement': 'tour'})['entrees'][0]
        self.assertEqual(ligne['detail']['tour'], 'mage')
        self.assertEqual(ligne['detail']['mode'], 'campagne')

    def test_top_20(self):
        for i in range(25):
            self.hall.envoyer(camp(f'Joueur {i}', 1 + i % 20))
        self.assertEqual(len(self.hall.lire({'classement': 'campagne', 'carte': 'prairie',
                                             'difficulte': 'normal'})['entrees']), 20)

    def test_rien_d_autre_que_les_champs_prevus_en_base(self):
        self.hall.envoyer(camp('Alice', 10))
        colonnes = {r[1] for r in self.hall.base().execute('PRAGMA table_info(entrees)')}
        self.assertFalse(any('ip' == c or 'adresse' in c or 'heure' in c for c in colonnes))
        self.assertRegex(self.hall.liste()[0]['jour'], r'^\d{4}-\d\d-\d\d$')


class Bornes(Base):
    def test_valeurs_impossibles(self):
        for v in [0, -1, 21, 1.5, '10', None, True]:
            self.refus(camp('Alice', v), 'valeur')
        self.refus({'pseudo': 'Alice', 'enfant': False, 'classement': 'labyrinthe', 'difficulte': 'normal',
                    'valeur': 201}, 'valeur')
        self.refus({'pseudo': 'Alice', 'enfant': False, 'classement': 'infini', 'carte': 'prairie',
                    'difficulte': 'normal', 'valeur': 501}, 'valeur')

    def test_vies_selon_difficulte(self):
        self.refus(camp('Alice', 11, difficulte='difficile'), 'valeur')
        self.hall.envoyer(camp('Alice', 10, difficulte='difficile'))
        self.hall.envoyer(camp('Alice', 30, difficulte='facile'))

    def test_tour(self):
        t = {'pseudo': 'Alice', 'enfant': False, 'classement': 'tour', 'carte': 'prairie', 'difficulte': 'normal',
             'mode': 'campagne', 'tour': 'mage', 'vagues': 20, 'valeur': 20000 * 20 + 1}
        self.refus(t, 'valeur')
        self.hall.envoyer({**t, 'valeur': 20000 * 20})   # le plafond lui-même passe (le meilleur du joueur automatique : ~2 700 par vague)
        self.refus({**t, 'valeur': 10, 'tour': 'canon2'}, 'tour')
        self.refus({**t, 'valeur': 10, 'mode': 'labyrinthe'}, 'mode')
        self.refus({**t, 'valeur': 10, 'carte': 'aleatoire'}, 'carte')

    def test_prestiges(self):
        self.refus(camp('Alice', 10, difficulte='prestige10'), 'valeur')
        self.hall.envoyer(camp('Alice', 5, difficulte='prestige10'))
        self.hall.envoyer(camp('Bob', 10, difficulte='prestige1'))
        self.refus(camp('Alice', 5, difficulte='prestige11'), 'difficulte')
        self.assertEqual(len(self.hall.lire({'classement': 'campagne', 'carte': 'prairie', 'difficulte': 'prestige1', 'enfant': '0'})['entrees']), 1)
        t = {'pseudo': 'Alice', 'enfant': False, 'classement': 'tour', 'carte': 'prairie', 'difficulte': 'prestige3',
             'mode': 'campagne', 'tour': 'tempete', 'vagues': 20, 'valeur': 20000 * 20 * 5 + 1}
        self.refus(t, 'valeur')
        self.hall.envoyer({**t, 'valeur': 20000 * 20 * 5})   # plafond ×5 en prestige (ultimes)
        self.refus({**t, 'difficulte': 'difficile'}, 'valeur')   # pas pour les trois d'origine

    def test_champs_inconnus_ou_manquants(self):
        self.refus({**camp(), 'ip': '1.2.3.4'}, 'forme')
        self.refus({**camp(), 'tour': 'mage'}, 'forme')
        self.refus({k: v for k, v in camp().items() if k != 'enfant'}, 'forme')
        self.refus({**camp(), 'enfant': 1}, 'forme')
        self.refus([1, 2], 'forme')
        self.refus({**camp(), 'carte': 'aleatoire'}, 'carte')
        self.refus({**camp(), 'classement': 'autre'}, 'classement')

    def test_pseudo_refuse(self):
        self.refus(camp('Putain'), 'pseudo')
        self.refus({**camp('Léa'), 'enfant': True}, 'prenom')   # un enfant ne peut pas prendre un prénom
        self.refus({**camp('Putain'), 'enfant': True}, 'pseudo')
        self.hall.envoyer({**camp('LemineurMasquer', 4), 'enfant': True})   # un pseudo libre sans prénom passe

    def test_injection_sql(self):
        self.refus(camp("x'); DROP TABLE entrees;--"), 'pseudo')
        self.hall.envoyer(camp('Alice', 10))
        self.assertEqual(len(self.hall.liste()), 1)
        with self.assertRaises(Refus):
            self.hall.lire({'classement': "tour'; DROP", 'enfant': '0'})
        with self.assertRaises(Refus):
            self.hall.lire({'classement': 'tour', 'enfant': "1 OR 1=1"})


class Moderation(Base):
    def test_retirer_et_vider(self):
        self.hall.envoyer(camp('Alice', 10))
        self.hall.envoyer(camp('Bob', 12))
        self.hall.envoyer({'pseudo': 'Alice', 'enfant': False, 'classement': 'labyrinthe', 'difficulte': 'normal',
                           'valeur': 9})
        premiere = self.hall.liste('campagne')[0]['id']
        self.assertEqual(self.hall.retirer(premiere), 1)
        self.assertEqual(self.hall.retirer(premiere), 0)
        self.assertEqual(len(self.hall.liste('campagne')), 1)
        self.hall.envoyer(camp('Cléo', 4))
        self.assertEqual(self.hall.vider('campagne'), 2)    # Alice et Cléo (Bob déjà retiré)
        self.assertEqual(len(self.hall.liste()), 1)          # la ligne du labyrinthe reste
        self.assertEqual(self.hall.retirer_pseudo('ALICE'), 1)
        self.assertEqual(len(self.hall.liste()), 0)


class Limite(unittest.TestCase):
    def test_vingt_par_heure(self):
        L = hall.Limite(20, 3600)
        self.assertTrue(all(L.permis('a', 0) for _ in range(20)))
        self.assertFalse(L.permis('a', 1))
        self.assertTrue(L.permis('b', 1))
        self.assertTrue(L.permis('a', 3601))


class Http(Base):
    def setUp(self):
        super().setUp()
        self.s = hall.serveur(self.hall, 0)
        self.port = self.s.server_address[1]
        threading.Thread(target=self.s.serve_forever, daemon=True).start()

    def tearDown(self):
        self.s.shutdown()
        self.s.server_close()
        super().tearDown()

    def appel(self, methode, chemin, corps=None, entetes=None):
        data = corps if isinstance(corps, bytes) else (json.dumps(corps).encode() if corps is not None else None)
        req = urllib.request.Request(f'http://127.0.0.1:{self.port}{chemin}', data=data, method=methode,
                                     headers=entetes or {})
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_envoi_puis_lecture(self):
        code, rep = self.appel('POST', '/api/hall', camp('Alice', 10))
        self.assertEqual((code, rep['place']), (200, 1))
        code, rep = self.appel('GET', '/api/hall?classement=campagne&carte=prairie&difficulte=normal&enfant=0')
        self.assertEqual(rep['entrees'][0]['pseudo'], 'Alice')

    def test_refus(self):
        self.assertEqual(self.appel('POST', '/api/hall', b'pas du json')[0], 400)
        self.assertEqual(self.appel('POST', '/api/hall', b'x' * 3000)[0], 413)
        self.assertEqual(self.appel('POST', '/api/hall', camp('Putain'))[1]['raison'], 'pseudo')
        self.assertEqual(self.appel('GET', '/api/autre')[0], 404)
        self.assertEqual(self.appel('GET', '/api/hall?classement=zzz')[0], 400)

    def test_limite_par_ip_via_nginx(self):
        # sans nginx, c'est l'adresse de connexion ; depuis 127.0.0.1, X-Real-IP donne le vrai visiteur
        for _ in range(20):
            self.assertEqual(self.appel('POST', '/api/hall', camp('Alice', 10), {'X-Real-IP': '9.9.9.9'})[0], 200)
        self.assertEqual(self.appel('POST', '/api/hall', camp('Alice', 10), {'X-Real-IP': '9.9.9.9'})[0], 429)
        self.assertEqual(self.appel('POST', '/api/hall', camp('Alice', 10), {'X-Real-IP': '8.8.8.8'})[0], 200)


class Coherence(unittest.TestCase):
    def test_regles_alignees_sur_le_jeu(self):
        """Mêmes cartes, difficultés et tours que le jeu."""
        racine = os.path.join(os.path.dirname(__file__), '..', '..')
        with open(os.path.join(racine, 'src', 'data', 'difficultes.js'), encoding='utf-8') as f:
            src = f.read()
        for nom, vies in REGLES['difficultes'].items():
            if nom.startswith('prestige'):   # générés par formule : vies = max(5, 10 − ⌊k/2⌋) (le test JS compare aussi les valeurs)
                self.assertEqual(vies, max(5, 10 - int(nom[8:]) // 2), nom)
            else:
                self.assertRegex(src, rf'{nom}:\s*{{[^}}]*vies: {vies}\b')
        with open(os.path.join(racine, 'src', 'data', 'tours.js'), encoding='utf-8') as f:
            src = f.read()
        for t in REGLES['tours']:
            self.assertRegex(src, rf'\n  {t}: \{{')


if __name__ == '__main__':
    unittest.main()
