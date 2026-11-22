// Étape 3, lot 3 (spec 005) : la Montagne et le mode infini.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, appelerVague, composition, scoreInfini, blesser } from '../src/sim/partie.js';
import { genererVague } from '../src/data/vagues.js';
import { ENNEMIS } from '../src/data/ennemis.js';
import { progressionVide, enregistrerVictoire, enregistrerInfini, infiniJouable } from '../src/sim/progression.js';
import { jouer } from './simulate.js';

test('la Montagne : 30 vagues, boss aux vagues 10, 20 et 30, la neige ralentit de 10 %', () => {
  const s = nouvellePartie('montagne');
  assert.equal(s.nbVagues, 30);
  const boss = s.carte.def.vagues.map((v, i) => (v.some(([x]) => x === 'ogre') ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(boss, [10, 20, 30]);
  assert.ok(s.carte.sol.longueur > nouvellePartie('prairie').carte.sol.longueur, 'le plus long chemin');
  appelerVague(s);
  for (let i = 0; i < 60 * 2; i++) avancer(s);
  const gob = s.ennemis[0];
  const d0 = gob.d;
  avancer(s);
  assert.ok(Math.abs((gob.d - d0) - ENNEMIS.gob.vitesse * 0.9 / 60) < 1e-6);
});

test('vagues générées : même suite pour une graine, de plus en plus fournies, boss toutes les 10 vagues', () => {
  assert.deepEqual(genererVague(7, 12), genererVague(7, 12));
  const total = (v) => v.reduce((t, [, n]) => t + n, 0);
  assert.ok(total(genererVague(7, 40)) > total(genererVague(7, 5)));
  for (let n = 1; n <= 80; n++) {
    const v = genererVague(7, n);
    assert.equal(v.some(([s]) => s === 'ogre'), n % 10 === 0, 'vague ' + n);
    for (const [sorte, nombre, ecart] of v) { assert.ok(ENNEMIS[sorte], sorte); assert.ok(nombre >= 1 && ecart >= 0.25); }
  }
  assert.deepEqual(genererVague(7, 1).map(([s]) => s), ['gob'], 'au début, seulement des gobelins');
});

test('mode infini : pas de fin, aperçu toujours disponible, score = vagues repoussées, tient au-delà de la vague 50', () => {
  const s = nouvellePartie('prairie', 'normal', { infini: true });
  assert.equal(s.nbVagues, Infinity);
  s.vies = 1e9;
  for (let n = 1; n <= 55; n++) {
    assert.ok(composition(s, n).length > 0);
    appelerVague(s);
    while (s.lancement) avancer(s);
    for (const e of [...s.ennemis]) blesser(s, e, 1e12, 'magique', null);    // vague repoussée d'un coup
    while (s.ennemis.length) { for (const e of [...s.ennemis]) blesser(s, e, 1e12, 'magique', null); avancer(s); }
    avancer(s);
  }
  assert.equal(s.fin, null, 'jamais de victoire');
  assert.equal(scoreInfini(s), 55);
});

test('records et ouverture du mode infini', () => {
  let p = progressionVide();
  assert.equal(infiniJouable(p, 'prairie'), false);
  p = enregistrerVictoire(p, 'prairie', 'normal', 2).progression;
  p = enregistrerVictoire(p, 'desert', 'normal', 1).progression;
  assert.equal(infiniJouable(p, 'prairie'), false, 'pas avant la Montagne');
  p = enregistrerVictoire(p, 'montagne', 'facile', 1).progression;
  assert.equal(infiniJouable(p, 'prairie'), true);
  let r = enregistrerInfini(p, 'prairie', 23);
  assert.equal(r.record, true);
  r = enregistrerInfini(r.progression, 'prairie', 12);
  assert.equal(r.record, false);
  assert.equal(r.progression.infini.prairie, 23);
});

test('équilibre : le joueur automatique prudent gagne la Montagne en Normal (30 tours au plus)', () => {
  const r = jouer({ carte: 'montagne', maxTours: 30, max: 60 * 60 * 50 });
  assert.equal(r.fin, 'victoire');
});
