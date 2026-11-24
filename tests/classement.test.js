// Spec 017, lot 1 : classement des tours par dégâts, tour de la vague, compensation de l'or.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, blesser, poser, vendre, classement } from '../src/sim/partie.js';
import { ENNEMIS } from '../src/data/ennemis.js';
import { COMPENSATION_OR } from '../src/sim/const.js';

let id = 9000;
function ennemi(s, sorte, vague, extra = {}) {
  const d = ENNEMIS[sorte];
  const e = { id: id++, sorte, vague, pv: d.pv, pvMax: d.pv, mult: 1, d: 300, x: 100, y: 100, dx: 1, dy: 0, vol: false,
    ralenti: 0, ralFacteur: 0, gel: 0, brule: null, soinT: 9, pas: 0, invisible: false, invisT: 3, rage: 0, rageBonus: 0,
    rugitT: 10, rugit: 0, ...extra };
  s.ennemis.push(e); s.vivants[vague] = (s.vivants[vague] || 0) + 1;
  return e;
}
/** Partie sur la Prairie, deux tours posées, la vague 1 lancée en entier (plus rien à apparaître). */
function arene(nbVagues = 1) {
  const s = nouvellePartie('prairie');
  s.or = 10000;
  const a = poser(s, 'archers', 2, 6), b = poser(s, 'archers', 8, 10);
  assert.ok(a.ok && b.ok);
  s.vague = nbVagues; s.compte = 999;
  for (let v = 1; v <= nbVagues; v++) { s.finies[v] = true; s.vivants[v] = 0; }
  return { s, a: s.tours[0], b: s.tours[1] };
}
const tuer = (s, e, tour) => blesser(s, e, 1e6, 'magique', tour);
const prime = (s) => s.evenements.find((v) => v.type === 'tourDeLaVague');

test('les dégâts sont comptés par vague du monstre touché ; leur somme égale les dégâts totaux', () => {
  const { s, a, b } = arene(2);
  const e1 = ennemi(s, 'gob', 1), e2 = ennemi(s, 'gob', 2);
  blesser(s, e1, 5, 'magique', a);
  blesser(s, e2, 7, 'magique', a);
  blesser(s, e2, 3, 'magique', b);
  blesser(s, e1, 4, 'magique', b);
  assert.deepEqual(a.degatsVague, { 1: 5, 2: 7 });
  assert.deepEqual(b.degatsVague, { 1: 4, 2: 3 });
  for (const t of [a, b]) assert.equal(Object.values(t.degatsVague).reduce((x, y) => x + y, 0), t.degats);
});

test('fin de vague : la tour qui a le plus frappé reçoit ceil(1/4 × (or des monstres + bonus de fin)), une fois', () => {
  const { s, a, b } = arene();
  const e1 = ennemi(s, 'gob', 1), e2 = ennemi(s, 'gob', 1);
  blesser(s, e1, 10, 'magique', b);
  tuer(s, e1, b);
  blesser(s, e2, 1, 'magique', a);
  tuer(s, e2, null);
  const orMonstres = s.orVague[1];
  assert.ok(orMonstres > 0);
  const or = s.or;
  avancer(s);
  const fin = s.evenements.find((v) => v.type === 'finVague');
  const p = prime(s);
  assert.ok(fin && p);
  assert.equal(p.tour, b.id, 'b a frappé deux fois, a une fois : b a fait le plus de dégâts');
  assert.equal(p.or, Math.ceil((orMonstres + fin.or) / 4));
  assert.equal(s.or, or + fin.or + p.or);
  assert.equal(p.vague, 1);
  const gagnante = s.tours.find((t) => t.id === p.tour);
  assert.equal(gagnante.couronnes, 1);
  avancer(s); avancer(s);
  assert.equal(s.evenements.filter((v) => v.type === 'tourDeLaVague').length, 1, 'une seule fois');
  assert.equal(s.orVague[1], undefined, 'compteurs de la vague effacés');
});

test('égalité : la tour la plus ancienne gagne', () => {
  const { s, a, b } = arene();
  const e1 = ennemi(s, 'gob', 1), e2 = ennemi(s, 'gob', 1);
  blesser(s, e1, 8, 'magique', b);
  blesser(s, e2, 8, 'magique', a);
  tuer(s, e1, null); tuer(s, e2, null);
  avancer(s);
  assert.equal(prime(s).tour, a.id);
  assert.ok(a.id < b.id);
});

test('tour vendue avant la fin de la vague : le prime lui est versée quand même', () => {
  const { s, a, b } = arene();
  const e1 = ennemi(s, 'gob', 1), e2 = ennemi(s, 'gob', 1);
  blesser(s, e1, 20, 'magique', a);
  blesser(s, e2, 5, 'magique', b);
  assert.ok(vendre(s, a.id).ok);
  assert.ok(!s.tours.includes(a));
  tuer(s, e1, null); tuer(s, e2, null);
  avancer(s);
  assert.equal(prime(s).tour, a.id);
  assert.equal(s.vendues.length, 0, 'la tour vendue est oubliée une fois la vague payée');
});

test('aucune tour n\'a touché la vague : pas de prime', () => {
  const { s } = arene();
  const e = ennemi(s, 'gob', 1);
  tuer(s, e, null);
  avancer(s);
  assert.ok(s.evenements.some((v) => v.type === 'finVague'));
  assert.equal(prime(s), undefined);
});

test('deux vagues qui se chevauchent : chaque vague a sa propre tour', () => {
  const { s, a, b } = arene(2);
  const e1 = ennemi(s, 'gob', 1), e2 = ennemi(s, 'gob', 2);
  blesser(s, e1, 9, 'magique', a);
  blesser(s, e2, 9, 'magique', b);
  tuer(s, e1, null);
  avancer(s);
  assert.equal(prime(s).tour, a.id);
  assert.equal(prime(s).vague, 1);
  s.evenements.length = 0;
  tuer(s, e2, null);
  avancer(s);
  assert.equal(prime(s).tour, b.id);
  assert.equal(prime(s).vague, 2);
});

test('compensation : l\'or des monstres est multiplié par 0,8, sans perte d\'arrondi sur la durée', () => {
  const { s } = arene();
  let attendu = 0;
  for (let i = 0; i < 100; i++) { tuer(s, ennemi(s, 'gob', 1), null); attendu += ENNEMIS.gob.or * COMPENSATION_OR; }
  assert.ok(Math.abs(s.orVague[1] - attendu) < 1, `${s.orVague[1]} ≈ ${attendu}`);
});

test('classement(s) : par dégâts décroissants, plus ancienne devant à égalité', () => {
  const { s, a, b } = arene();
  b.degats = 50; a.degats = 10;
  assert.deepEqual(classement(s).map((l) => [l.rang, l.id]), [[1, b.id], [2, a.id]]);
  a.degats = 50;
  assert.equal(classement(s)[0].id, a.id);
});

test('labyrinthe : l\'or des mises à terre compte comme l\'or de la vague', () => {
  const s = nouvellePartie('labyrinthe', 'normal', { graine: 3 });
  s.or = 10000;
  let pose = null;
  for (let c = 1; c < 23 && !pose; c++) for (let r = 1; r < 15 && !pose; r++) { const q = poser(s, 'archers', c, r); if (q.ok) pose = q.tour; }
  assert.ok(pose);
  s.vague = 1; s.compte = 999;
  const e = ennemi(s, 'gob', 1);
  for (let k = 0; k < 10; k++) { e.pv = 1; blesser(s, e, 1e6, 'magique', pose); }
  const gains = s.evenements.filter((v) => v.type === 'aTerre').map((v) => v.or);
  assert.equal(gains.length, 10);
  assert.ok(gains.reduce((x, y) => x + y, 0) > 0);
  assert.equal(s.orVague[1], gains.reduce((x, y) => x + y, 0), 'l\'or des mises à terre est celui de la vague');
});
