// Lot 2 de l'étape 2 (spec 004) : slime, golem, spectre, Ogre chef de guerre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, blesser, choisirCible, geler, composition, appelerVague } from '../src/sim/partie.js';
import { ENNEMIS } from '../src/data/ennemis.js';

function arene() {
  const s = nouvellePartie('prairie');
  s.vague = 1; s.vivants[1] = 0; s.finies[1] = true; s.payees[1] = true; s.compte = 999;
  return s;
}
let id = 5000;
function ennemi(s, sorte, x, y, extra = {}) {
  const d = ENNEMIS[sorte];
  const e = { id: id++, sorte, vague: 1, pv: d.pv, pvMax: d.pv, mult: 1, d: 300, x, y, dx: 1, dy: 0, vol: false,
    ralenti: 0, ralFacteur: 0, gel: 0, brule: null, soinT: 9, pas: 0, invisible: false, invisT: 3, rage: 0, rageBonus: 0,
    rugitT: 10, rugit: 0, ...extra };
  s.ennemis.push(e); s.vivants[1]++;
  return e;
}
const tour = (s, sorte, x, y) => { const t = { id: id++, sorte, niveau: 0, variante: null, c: -5, r: -5, x, y, recharge: 0, ciblage: 'premier', degats: 0, abattus: 0, depense: 0, angle: 0, tir: 0 }; s.tours.push(t); return t; };

test('le slime se divise en deux petits slimes à sa mort, comptés dans sa vague', () => {
  const s = arene();
  const sl = ennemi(s, 'slime', 100, 100);
  blesser(s, sl, 1000, 'magique', null);
  const petits = s.ennemis.filter((e) => e.sorte === 'slime_petit');
  assert.equal(petits.length, 2);
  assert.equal(s.vivants[1], 2);
  assert.equal(petits[0].pv, 25);
  blesser(s, petits[0], 1000, 'magique', null);
  assert.equal(s.ennemis.filter((e) => e.sorte === 'slime_petit').length, 1, 'un petit slime ne se divise pas');
});

test('le golem a 30 % d’armure et coûte 3 vies', () => {
  const s = arene();
  const g = ennemi(s, 'golem', 100, 100);
  blesser(s, g, 100, 'physique', null);
  assert.equal(g.pv, 320 - 70);
  assert.equal(ENNEMIS.golem.vies, 3);
});

test('le spectre devient invisible 2 s toutes les 5 s ; seuls Mage et Tempête le visent alors', () => {
  const s = nouvellePartie('prairie');
  s.carte.def = { ...s.carte.def, vagues: [[['spectre', 1, 1]]] };
  s.nbVagues = 1;
  appelerVague(s);
  avancer(s);
  const sp = s.ennemis[0];
  assert.equal(sp.invisible, false);
  for (let i = 0; i < 60 * 3.1; i++) avancer(s);
  assert.equal(sp.invisible, true);
  const archers = tour(s, 'archers', sp.x + 30, sp.y), mage = tour(s, 'mage', sp.x + 30, sp.y);
  assert.equal(choisirCible(s, archers), null);
  assert.equal(choisirCible(s, mage), sp);
  for (let i = 0; i < 60 * 2; i++) { sp.pv = sp.pvMax; avancer(s); }
  assert.equal(sp.invisible, false);
});

test('le boss : rugissement qui accélère ses voisins, gel réduit à un ralentissement, 10 vies', () => {
  const s = arene();
  // Positions recalculées sur le chemin à partir de `d` : voisin à une case, l'autre loin derrière.
  const ogre = ennemi(s, 'ogre', 0, 0, { d: 300, rugitT: 0.01 });
  const voisin = ennemi(s, 'gob', 0, 0, { d: 340 }), loin = ennemi(s, 'gob', 0, 0, { d: 900 });
  avancer(s);
  assert.ok(s.evenements.some((e) => e.type === 'rugissement'));
  assert.ok(voisin.rage > 0);
  assert.equal(loin.rage, 0);
  assert.equal(voisin.rageBonus, 0.3);
  geler(ogre, 1.2);
  assert.equal(ogre.gel, 0);
  assert.equal(ogre.ralFacteur, 0.5);
  assert.equal(ENNEMIS.ogre.vies, 10);
});

test('vagues de la Prairie : slime dès la 6, golem dès la 12, spectre dès la 13, boss aux vagues 10 et 20 seulement', () => {
  const s = nouvellePartie('prairie');
  const premiere = (sorte) => s.carte.def.vagues.findIndex((v) => v.some(([x]) => x === sorte)) + 1;
  assert.equal(s.nbVagues, 20);
  assert.equal(premiere('slime'), 6);
  assert.equal(premiere('golem'), 12);
  assert.equal(premiere('spectre'), 13);
  const boss = s.carte.def.vagues.map((v, i) => (v.some(([x]) => x === 'ogre') ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(boss, [10, 20]);
  assert.ok(composition(s, 10).some((c) => c.sorte === 'ogre' && c.nombre === 1));
});
