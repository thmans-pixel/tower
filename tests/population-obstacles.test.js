// Spec 017, lot 2 : population maximale et obstacles du labyrinthe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, ameliorer, poser, poserMur, vendre, vendreMur, annulerPrevu, populationLabyrinthe, caseLibre, appelerVague } from '../src/sim/partie.js';
import { genererLabyrinthe, cheminLabyrinthe, casesFixes, casesObstacles, cle } from '../src/sim/labyrinthe.js';
import { LABYRINTHE } from '../src/data/labyrinthe.js';

const partie = (g = 1) => { const s = nouvellePartie('labyrinthe', 'normal', { graine: g }); s.or = 100000; return s; };
/** Cases libres, une à une, qui ne bouchent pas le passage (celles du bas de la carte, loin du chemin). */
function libres(s, n) {
  const l = [];
  for (let r = 0; r < 16 && l.length < n; r++) for (let c = 1; c < 23 && l.length < n; c++) if (caseLibre(s, c, r)) l.push([c, r]);
  return l;
}

test('plafond de population : 40 ou 50, toujours le même pour une graine, les deux sortent sur 50 graines', () => {
  const vus = new Set();
  for (let g = 1; g <= 50; g++) {
    const a = genererLabyrinthe(g), b = genererLabyrinthe(g);
    assert.equal(a.popMax, b.popMax);
    assert.ok(LABYRINTHE.population.includes(a.popMax));
    vus.add(a.popMax);
  }
  assert.deepEqual([...vus].sort(), [40, 50]);
  assert.equal(partie(3).labyrinthe.popMax, genererLabyrinthe(3).popMax);
});

test('au plafond : poser et poserMur refusent sans débiter ; vendre libère ; améliorer ne coûte rien', () => {
  const s = partie(1);
  s.labyrinthe.popMax = 5;
  const places = libres(s, 12);
  const poses = [];
  for (const [c, r] of places.slice(0, 4)) { const m = poserMur(s, c, r); assert.ok(m.ok); poses.push([c, r]); }
  const t = poser(s, 'archers', ...places[4]);
  assert.ok(t.ok);
  assert.equal(populationLabyrinthe(s), 5);
  const or = s.or;
  assert.equal(poserMur(s, ...places[5]).raison, 'population');
  assert.equal(poser(s, 'archers', ...places[6]).raison, 'population');
  assert.equal(s.or, or, 'aucun or débité');
  vendreMur(s, ...poses[0]);
  assert.equal(populationLabyrinthe(s), 4);
  assert.ok(poserMur(s, ...places[5]).ok);
  assert.equal(populationLabyrinthe(s), 5);
  assert.ok(ameliorer(s, t.tour.id).ok, 'améliorer ne coûte pas de population');
  assert.equal(populationLabyrinthe(s), 5);
});

test('population : poses et ventes prévues pendant une vague comptent tout de suite', () => {
  const s = partie(1);
  s.labyrinthe.popMax = 4;
  const places = libres(s, 10);
  assert.ok(poserMur(s, ...places[0]).ok);
  assert.ok(poserMur(s, ...places[1]).ok);
  appelerVague(s);   // vague en cours : tout est prévu
  assert.ok(poserMur(s, ...places[2]).prevu);
  assert.ok(poserMur(s, ...places[3]).prevu);
  assert.equal(populationLabyrinthe(s), 4);
  const or = s.or;
  assert.equal(poserMur(s, ...places[4]).raison, 'population', 'les poses prévues comptent');
  assert.equal(s.or, or);
  assert.ok(vendreMur(s, ...places[0]).prevu);
  assert.equal(populationLabyrinthe(s), 3, 'une vente prévue libère sa place');
  assert.ok(poserMur(s, ...places[4]).prevu);
  assert.equal(annulerPrevu(s, ...places[0]).raison, 'population', 'garder le mur n\'a plus de place');
  assert.ok(annulerPrevu(s, ...places[4]).ok);
  assert.ok(annulerPrevu(s, ...places[0]).ok);
});

test('obstacles : 6 à 10 rochers, 1 à 3 montagnes de 3 à 8 cases d\'un seul tenant, jamais sur un élément fixe ni une zone, un chemin existe', () => {
  for (let g = 1; g <= 50; g++) {
    const lab = genererLabyrinthe(g);
    const rochers = lab.obstacles.filter((o) => o.type === 'rocher'), montagnes = lab.obstacles.filter((o) => o.type === 'montagne');
    assert.ok(rochers.length >= 6 && rochers.length <= 10, `graine ${g} : ${rochers.length} rochers`);
    assert.ok(montagnes.length >= 1 && montagnes.length <= 3, `graine ${g} : ${montagnes.length} montagnes`);
    const fixes = casesFixes(lab), zones = new Set(lab.zones.map((z) => cle(z.c, z.r)));
    const toutes = new Set();
    for (const o of lab.obstacles) for (const p of o.cases) {
      assert.ok(!fixes.has(cle(p.c, p.r)) && !zones.has(cle(p.c, p.r)), `graine ${g} : obstacle sur un élément`);
      assert.ok(!toutes.has(cle(p.c, p.r)), 'deux obstacles sur la même case');
      toutes.add(cle(p.c, p.r));
    }
    for (const m of montagnes) {
      assert.ok(m.cases.length >= 3 && m.cases.length <= 8);
      const ens = new Set(m.cases.map((p) => cle(p.c, p.r))), vu = new Set([cle(m.cases[0].c, m.cases[0].r)]), pile = [m.cases[0]];
      while (pile.length) { const p = pile.pop(); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = cle(p.c + dc, p.r + dr); if (ens.has(k) && !vu.has(k)) { vu.add(k); pile.push({ c: p.c + dc, r: p.r + dr }); } } }
      assert.equal(vu.size, m.cases.length, `graine ${g} : montagne d'un seul tenant`);
    }
    assert.ok(cheminLabyrinthe(lab, new Set()), `graine ${g} : un chemin existe`);
  }
});

test('un obstacle ferme sa case : le chemin le contourne, on n\'y construit pas, il ne compte pas, les volants l\'ignorent', () => {
  const s = partie(2);
  const obs = [...casesObstacles(s.carte.lab)];
  assert.ok(obs.length > 0);
  const [c, r] = [obs[0] % 24, Math.floor(obs[0] / 24)];
  assert.ok(!caseLibre(s, c, r));
  assert.equal(poserMur(s, c, r).raison, 'place');
  assert.equal(poser(s, 'archers', c, r).raison, 'place');
  assert.equal(vendreMur(s, c, r).ok, false, 'il ne se vend pas');
  assert.equal(populationLabyrinthe(s), 0);
  assert.ok(!s.carte.cheminCases.some(([x, y]) => casesObstacles(s.carte.lab).has(cle(x, y))), 'le chemin contourne tous les obstacles');
  const vol = s.carte.vols[0];
  assert.ok(vol.longueur > 0);
});

