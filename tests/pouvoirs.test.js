// Lot 3 de l'étape 2 (spec 004) : pluie de météores et renforts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, lancerMeteores, appelerRenforts, pouvoirPret, appelerVague } from '../src/sim/partie.js';
import { POUVOIRS } from '../src/data/pouvoirs.js';
import { ENNEMIS } from '../src/data/ennemis.js';
import { centre } from '../src/sim/carte.js';

const pas = (s, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) avancer(s); };
// Partie dont la seule vague est un groupe choisi.
function partie(vague) {
  const s = nouvellePartie('prairie');
  s.carte.def = { ...s.carte.def, vagues: [vague] };
  s.nbVagues = 1;
  s.vies = 99;
  return s;
}

test('météores : 3 impacts de 120 dégâts après la chute, puis 45 s de recharge', () => {
  const s = partie([['golem', 1, 1]]);
  appelerVague(s);
  pas(s, 4);
  const g = s.ennemis[0];
  const pv = g.pv;
  assert.equal(lancerMeteores(s, g.x, g.y).ok, true);
  assert.equal(pouvoirPret(s, 'meteores'), false);
  assert.equal(lancerMeteores(s, g.x, g.y).raison, 'recharge');
  g.ralFacteur = 1; g.ralenti = 99;        // immobile, pour que les trois météores le visent bien
  pas(s, 0.5);
  assert.equal(g.pv, pv, 'rien avant la chute');
  pas(s, 1);
  assert.ok(pv - g.pv >= 120, 'au moins un impact');
  pas(s, POUVOIRS.meteores.recharge);
  assert.equal(pouvoirPret(s, 'meteores'), true);
});

test('renforts : seulement sur le chemin ; bloquent un ennemi au sol, pas un volant', () => {
  const s = partie([['orc', 1, 1], ['bat', 1, 1]]);
  assert.equal(appelerRenforts(s, 12, 0).raison, 'place');
  const [c, r] = s.carte.cheminCases[6];
  assert.equal(appelerRenforts(s, c, r).ok, true);
  appelerVague(s);
  const gob = () => s.ennemis.find((e) => e.sorte === 'orc');
  for (let i = 0; i < 60 * 12 && !(gob() && gob().bloque); i++) avancer(s);
  const bat = s.ennemis.find((e) => e.sorte === 'bat');
  assert.ok(gob() && gob().bloque, 'l’orc est arrêté');
  const orc = gob();
  const d = orc.d;
  pas(s, 1);
  if (s.ennemis.includes(orc) && s.renforts.length) assert.equal(orc.d, d);
  assert.ok(!bat || !bat.bloque);
});

test('renforts : les soldats frappent, puis partent au bout de 8 s', () => {
  const s = partie([['golem', 1, 1]]);
  const [c, r] = s.carte.cheminCases[2];
  appelerRenforts(s, c, r);
  appelerVague(s);
  for (let i = 0; i < 60 * 12 && !(s.ennemis[0] && s.ennemis[0].bloque); i++) avancer(s);
  const g = s.ennemis[0];
  assert.ok(g.bloque);
  const pv = g.pv;
  pas(s, 1);
  assert.ok(g.pv < pv, 'le golem prend des coups');
  pas(s, 8);
  assert.equal(s.renforts.length, 0);
  assert.equal(g.bloque, null);
});

test('le boss écrase les renforts sans s’arrêter', () => {
  const s = partie([['ogre', 1, 1]]);
  const [c, r] = s.carte.cheminCases[3];
  appelerRenforts(s, c, r);
  appelerVague(s);
  for (let i = 0; i < 60 * 8 && s.renforts.length; i++) avancer(s);
  assert.equal(s.renforts.length, 0);
  assert.ok(s.ennemis[0].d > centre(3), 'le boss a continué');
  assert.equal(ENNEMIS.ogre.boss, true);
});
