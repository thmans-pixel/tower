// Étape 3, lot 1 (spec 005) : difficultés, étoiles, déblocage, relecture de la sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, appelerVague, avancer } from '../src/sim/partie.js';
import { progressionVide, etoilesPartie, enregistrerVictoire, estDebloquee, meilleuresEtoiles, relire } from '../src/sim/progression.js';
import { DIFFICULTES } from '../src/data/difficultes.js';
import { jouer } from './simulate.js';

test('difficultés : vies, or de départ, PV des ennemis et compte à rebours', () => {
  const f = nouvellePartie('prairie', 'facile'), n = nouvellePartie('prairie'), d = nouvellePartie('prairie', 'difficile');
  assert.deepEqual([f.vies, n.vies, d.vies], [30, 20, 10]);
  assert.deepEqual([f.or, n.or, d.or], [325, 250, 250]);
  for (const s of [f, n, d]) { appelerVague(s); for (let i = 0; i < 90; i++) avancer(s); }
  assert.equal(f.ennemis[0].pvMax, n.ennemis[0].pvMax * 0.75);
  assert.ok(Math.abs(d.ennemis[0].pvMax - n.ennemis[0].pvMax * 1.1) < 1e-9);
  for (const s of [f, d]) while (s.lancement) avancer(s);
  assert.equal(f.compte, 24);
  assert.equal(d.compte, 15);
  assert.throws(() => nouvellePartie('prairie', 'extrême'));
  assert.equal(Object.keys(DIFFICULTES).length, 3);
});

test('étoiles : 3 à 90 % des vies, 2 à 50 %, 1 en dessous, 0 si perdue', () => {
  const s = (fin, vies) => ({ fin, vies, viesDepart: 20 });
  assert.equal(etoilesPartie(s('victoire', 20)), 3);
  assert.equal(etoilesPartie(s('victoire', 18)), 3);
  assert.equal(etoilesPartie(s('victoire', 17)), 2);
  assert.equal(etoilesPartie(s('victoire', 10)), 2);
  assert.equal(etoilesPartie(s('victoire', 9)), 1);
  assert.equal(etoilesPartie(s('defaite', 0)), 0);
});

test('déblocage : Prairie seule au départ, puis Désert, Montagne et mode infini', () => {
  let p = progressionVide();
  assert.equal(estDebloquee(p, 'prairie'), true);
  assert.equal(estDebloquee(p, 'desert'), false);
  let r = enregistrerVictoire(p, 'prairie', 'facile', 2);
  assert.deepEqual(r.nouvelles, ['desert']);
  assert.equal(estDebloquee(p, 'desert'), false, 'l’original n’est pas modifié');
  p = r.progression;
  p = enregistrerVictoire(p, 'prairie', 'facile', 1).progression;
  assert.equal(meilleuresEtoiles(p, 'prairie', 'facile'), 2, 'on garde la meilleure note');
  assert.equal(meilleuresEtoiles(p, 'prairie', 'normal'), 0, 'chaque difficulté à part');
  p = enregistrerVictoire(p, 'desert', 'normal', 3).progression;
  r = enregistrerVictoire(p, 'montagne', 'difficile', 1);
  assert.equal(r.infini, true);
  assert.equal(r.progression.infiniOuvert, true);
  assert.equal(enregistrerVictoire(r.progression, 'montagne', 'normal', 3).infini, false);
});

test('relire une sauvegarde abîmée ou d’une autre forme ne casse rien', () => {
  assert.deepEqual(relire(null), progressionVide());
  assert.deepEqual(relire('n’importe quoi'), progressionVide());
  const p = relire({ debloquees: ['desert', 'atlantide'], etoiles: { prairie: { normal: 3, facile: 9 }, mars: { normal: 3 } }, son: false, difficulte: 'cauchemar' });
  assert.deepEqual(p.debloquees, ['prairie', 'desert']);
  assert.deepEqual(p.etoiles, { prairie: { normal: 3 } });
  assert.equal(p.son, false);
  assert.equal(p.difficulte, 'normal');
});

test('équilibre : Facile plus large que Normal, Difficile plus dur', () => {
  const f = jouer({ difficulte: 'facile' }), n = jouer(), d = jouer({ difficulte: 'difficile' });
  assert.equal(f.fin, 'victoire');
  assert.equal(n.fin, 'victoire');
  assert.ok(f.vies / 30 > n.vies / 20, 'Facile garde plus de vies (en proportion)');
  assert.ok(d.fin === 'defaite' || d.vies / 10 < n.vies / 20, 'Difficile plus dur');
});
