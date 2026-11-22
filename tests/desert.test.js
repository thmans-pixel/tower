// Étape 3, lot 2 (spec 005) : le Désert, deux entrées dont les chemins se rejoignent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, appelerVague, appelerRenforts } from '../src/sim/partie.js';
import { CHEMIN } from '../src/sim/carte.js';
import { jouer } from './simulate.js';

test('le Désert : deux routes, 25 vagues, boss aux vagues 10, 20 et 25', () => {
  const s = nouvellePartie('desert');
  assert.equal(s.carte.sols.length, 2);
  assert.equal(s.carte.vols.length, 2);
  assert.equal(s.nbVagues, 25);
  const boss = s.carte.def.vagues.map((v, i) => (v.some(([x]) => x === 'ogre') ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(boss, [10, 20, 25]);
  for (const en of s.carte.entrees) assert.equal(s.carte.etat(en.c, en.r), 2);
  // Les deux routes finissent au même endroit, devant la forteresse.
  const fin = (tr) => tr.points[tr.points.length - 1];
  assert.deepEqual(fin(s.carte.sols[0]), fin(s.carte.sols[1]));
});

test('les ennemis partent de chaque entrée à tour de rôle', () => {
  const s = nouvellePartie('desert');
  appelerVague(s);
  for (let i = 0; i < 60 * 3; i++) avancer(s);
  const routes = s.ennemis.map((e) => e.route);
  assert.ok(routes.includes(0) && routes.includes(1));
  assert.ok(s.ennemis.some((e) => e.y < 200) && s.ennemis.some((e) => e.y > 400), 'en haut et en bas de la carte');
});

test('des renforts sur le tronçon commun bloquent les ennemis des deux routes', () => {
  const s = nouvellePartie('desert');
  s.vies = 99;
  s.carte.def = { ...s.carte.def, vagues: [[['orc', 4, 0.5]]] };
  s.nbVagues = 1;
  assert.equal(s.carte.etat(14, 4), CHEMIN);
  appelerVague(s);
  // Les soldats ne restent que 8 s : on les appelle quand les orcs approchent (la case est à ~920 px).
  while (!s.ennemis.length || Math.max(...s.ennemis.map((e) => e.d)) < 800) avancer(s);
  const r = appelerRenforts(s, 14, 4);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.groupe.ds).sort(), ['0', '1']);
  const bloques = new Set();
  for (let i = 0; i < 60 * 30 && s.renforts.length; i++) { avancer(s); for (const e of s.ennemis) if (e.bloque) bloques.add(e.route); }
  assert.deepEqual([...bloques].sort(), [0, 1]);
});

test('équilibre : le joueur automatique prudent gagne le Désert en Normal', () => {
  const r = jouer({ carte: 'desert', max: 60 * 60 * 40 });
  assert.equal(r.fin, 'victoire');
});
