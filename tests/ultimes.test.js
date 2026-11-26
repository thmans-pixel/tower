// Niveaux ultimes (spec 023) : niveau 4 réservé aux prestiges, avec un effet nouveau par tour et par voie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, combattre, poser, caseLibre, ameliorer, prixAmelioration, vendre, nomTour, blesser } from '../src/sim/partie.js';
import { TOURS, ORDRE_TOURS, statsTour } from '../src/data/tours.js';

function arene(diff = 'prestige1') {
  const s = nouvellePartie('prairie', diff);
  s.or = 1e6;
  s.vague = 1; s.vivants[1] = 0; s.finies[1] = true; s.payees[1] = true; s.compte = 999;
  return s;
}
let id = 5000;
function ennemi(s, sorte, x, y, pv = 5000) {
  const e = { id: id++, sorte, vague: 1, pv, pvMax: pv, mult: 1, d: 100, x, y, dx: 1, dy: 0, vol: false,
    ralenti: 0, ralFacteur: 0, gel: 0, brule: null, soinT: 9, pas: 0 };
  s.ennemis.push(e); s.vivants[1]++;
  return e;
}
function ultime(s, sorte, variante, x = 300, y = 300) {
  const t = { id: id++, sorte, niveau: 3, variante, c: -5, r: -5, x, y, recharge: 0, ciblage: 'premier', degats: 0, abattus: 0, depense: 0, angle: 0, tir: 0 };
  s.tours.push(t);
  return t;
}
const tirs = (s, n) => { for (let i = 0; i < n; i++) combattre(s); };

test('prix des ultimes entre 3 000 et 8 000, et chacun a ses deux voies', () => {
  assert.deepEqual(ORDRE_TOURS.map((k) => TOURS[k].prixUltime), [3000, 4000, 3500, 5000, 6500, 8000]);
  for (const k of ORDRE_TOURS) for (const v of ['a', 'b']) {
    const u = TOURS[k].ultimes[v];
    assert.ok(u.nom && u.description && u.degats > TOURS[k].specialisations[v].degats * 0.8, k + v);
  }
});

test("le niveau 4 n'existe qu'en prestige, après la spécialisation, et se revend", () => {
  for (const [diff, ouvert] of [['normal', false], ['difficile', false], ['prestige1', true]]) {
    const s = arene(diff);
    s.or = 100000;
    let c = 0, r = 0;
    outer: for (r = 0; r < 16; r++) for (c = 0; c < 24; c++) if (caseLibre(s, c, r)) break outer;
    assert.ok(poser(s, 'mage', c, r).ok, diff);
    const t = s.tours[0];
    assert.ok(ameliorer(s, t.id).ok); assert.ok(ameliorer(s, t.id, 'a').ok);
    assert.equal(prixAmelioration(t, s), ouvert ? 5000 : null, diff);
    assert.equal(ameliorer(s, t.id).ok, ouvert, diff);
    if (ouvert) {
      assert.equal(t.niveau, 3);
      assert.equal(nomTour(t), 'Foudre sacrée');
      assert.equal(statsTour(t).rebond.nombre, 3);
      assert.equal(prixAmelioration(t, s), null);
      const avant = s.or; vendre(s, t.id); assert.ok(s.or - avant > 3000);
    }
  }
});

test('Œil de faucon : un tir sur trois est critique (×3)', () => {
  const s = arene(); const t = ultime(s, 'archers', 'a');
  const e = ennemi(s, 'gob', 340, 300, 1e6);
  const vus = [];
  for (let i = 0; i < 3; i++) { t.recharge = 0; combattre(s); vus.push(s.projectiles[s.projectiles.length - 1].degats); }
  assert.deepEqual(vus, [110, 110, 330]);
});

test("Pluie d'acier : ignore toute l'armure", () => {
  const s = arene(); ultime(s, 'archers', 'b');
  const e = ennemi(s, 'orc', 330, 300, 1e6);
  tirs(s, 120);
  assert.ok(e.pv < 1e6);
  const t = s.tours[0];
  assert.ok(Math.abs((1e6 - e.pv) - t.degats) < 1e-6 && t.degats > 0);
});

test('Âge glaciaire : les ralentis subissent 25 % de dégâts en plus', () => {
  const s = arene(); ultime(s, 'givre', 'a');
  const e = ennemi(s, 'gob', 320, 300, 1e6);
  tirs(s, 2);
  assert.ok(e.fragile && e.ralFacteur >= 0.6);
  const avant = e.pv;
  blesser(s, e, 100, 'magique', null);
  assert.ok(Math.abs(avant - e.pv - 125) < 1e-9);
});

test('Zéro absolu : gèle la cible 2,2 s et ses voisins', () => {
  const s = arene(); ultime(s, 'givre', 'b');
  const a = ennemi(s, 'gob', 330, 300, 1e6), b = ennemi(s, 'gob', 350, 300, 1e6), loin = ennemi(s, 'gob', 330, 380, 1e6);
  tirs(s, 120);
  assert.ok(a.gel > 0 && b.gel > 0, 'cible et voisin gelés');
  assert.equal(loin.gel, 0);
});

test('Pilonnage : un second obus tombe 0,4 s plus tard', () => {
  const s = arene(); const t = ultime(s, 'canon', 'a');
  const e = ennemi(s, 'orc', 340, 300, 1e6);
  let vus = 0;
  for (let i = 0; i < 400 && vus < 2; i++) { const pv = e.pv; combattre(s); if (e.pv < pv) vus++; if (t.recharge > 1) t.recharge = 99; }
  assert.equal(vus, 2);
});

test('Dragon : la brûlure gagne les voisins', () => {
  const s = arene(); ultime(s, 'canon', 'b', 300, 300);
  const a = ennemi(s, 'gob', 360, 300, 1e6), b = ennemi(s, 'gob', 395, 300, 1e6);
  tirs(s, 90);
  assert.ok(a.pv < 1e6 && b.pv < 1e6);
});

test('Foudre sacrée : trois rebonds sans perte', () => {
  const s = arene(); ultime(s, 'mage', 'a');
  const es = [0, 1, 2, 3].map((k) => ennemi(s, 'gob', 340 + k * 40, 300, 1e6));
  tirs(s, 120);
  const pertes = es.map((e) => 1e6 - e.pv);
  assert.ok(pertes.every((p) => p >= 300), pertes.join(','));
});

test('Météore : un ennemi qui meurt en brûlant explose sur ses voisins', () => {
  const s = arene(); ultime(s, 'mage', 'b');
  s.tours[0].recharge = 1e9;   // la tour ne tire pas : seule la brûlure agit
  const a = ennemi(s, 'gob', 340, 300, 30), voisin = ennemi(s, 'gob', 380, 330, 1e6);
  a.brule = { dps: 600, t: 4, tour: s.tours[0].id, explose: { rayon: 55, degats: 150 } };
  const pv0 = voisin.pv;
  tirs(s, 10);
  assert.ok(!s.ennemis.includes(a));
  assert.equal(voisin.pv, pv0 - 150);
});

test('Lance de titan : achève sous 8 % de PV, sauf le boss', () => {
  const s = arene(); ultime(s, 'baliste', 'a');
  const faible = ennemi(s, 'orc', 340, 300, 1000); faible.pv = 70;
  tirs(s, 200);
  assert.ok(!s.ennemis.includes(faible));
});

test('Mitrailleuse : six carreaux par salve', () => {
  const s = arene(); ultime(s, 'baliste', 'b');
  ennemi(s, 'gob', 340, 300, 1e6);
  combattre(s);
  assert.equal(s.projectiles.length, 6);
});

test('Tempête parfaite : chaîne de 14, ralentit chaque ennemi touché', () => {
  const s = arene(); ultime(s, 'tempete', 'a');
  const es = Array.from({ length: 16 }, (_, k) => ennemi(s, 'gob', 300 + (k % 8) * 12 + 20, 300 + Math.floor(k / 8) * 12, 1e6));
  combattre(s);
  assert.equal(es.filter((e) => e.pv < 1e6).length, 14);
  assert.ok(es.filter((e) => e.ralFacteur >= 0.3).length >= 14);
});

test('Colère divine : étourdit aussi le boss', () => {
  const s = arene(); ultime(s, 'tempete', 'b');
  const normal = ennemi(s, 'gob', 330, 300, 1e6), boss = ennemi(s, 'ogre', 340, 300, 1e6);
  combattre(s);
  assert.ok(normal.gel >= 1.4);
  assert.ok(boss.gel >= 0.5);
});

test("l'or des monstres est plus généreux en prestige (× 1 + 0,25 k)", () => {
  const or = (diff) => { const s = nouvellePartie('prairie', diff); return [s.multGain, s]; };
  assert.equal(or('difficile')[0], 1);
  assert.equal(or('prestige4')[0], 2);
});
