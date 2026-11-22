// Lot 1 de l'étape 2 (spec 004) : Baliste, Tempête et spécialisations du niveau 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvellePartie, avancer, combattre, poser, ameliorer, blesser, choisirCible } from '../src/sim/partie.js';
import { TOURS, ORDRE_TOURS, statsTour } from '../src/data/tours.js';

// Partie de test : une vague lancée puis vidée, et des ennemis posés à la main.
function arene() {
  const s = nouvellePartie('prairie');
  s.or = 1e6;
  s.vague = 1; s.vivants[1] = 0; s.finies[1] = true; s.payees[1] = true; s.compte = 999;
  return s;
}
let id = 1000;
function ennemi(s, sorte, x, y, pv = 500) {
  const e = { id: id++, sorte, vague: 1, pv, pvMax: pv, mult: 1, d: 100, x, y, dx: 1, dy: 0, vol: sorte === 'bat',
    ralenti: 0, ralFacteur: 0, gel: 0, brule: null, soinT: 9, pas: 0 };
  s.ennemis.push(e); s.vivants[1]++;
  return e;
}
// Tour posée hors carte (la logique ne vérifie la place qu'à la pose), au niveau voulu.
function tour(s, sorte, x, y, variante) {
  const t = { id: id++, sorte, niveau: variante ? 2 : 0, variante: variante || null, c: -5, r: -5, x, y, recharge: 0,
    ciblage: 'premier', degats: 0, abattus: 0, depense: 0, angle: 0, tir: 0 };
  s.tours.push(t);
  return t;
}
// Fait tirer les tours sans faire bouger les ennemis (on mesure les effets des tours).
function tirs(s, secondes) {
  for (let i = 0; i < Math.round(secondes * 60); i++) combattre(s);
}

test('six tours, chacune avec deux niveaux et deux spécialisations nommées, touches 1 à 6', () => {
  assert.deepEqual(ORDRE_TOURS, ['archers', 'canon', 'givre', 'mage', 'baliste', 'tempete']);
  ORDRE_TOURS.forEach((s, i) => {
    const d = TOURS[s];
    assert.equal(d.touche, String(i + 1));
    assert.equal(d.niveaux.length, 2);
    assert.ok(d.specialisations.a.nom && d.specialisations.b.nom);
    assert.equal(d.ameliorations.length, 2);
  });
  assert.equal(statsTour({ sorte: 'canon', niveau: 2, variante: 'a' }).porteeMin, 40);
  assert.equal(statsTour({ sorte: 'canon', niveau: 2, variante: 'b' }).volants, false);
});

test('Baliste : longue portée, une cible, touche les volants', () => {
  const s = arene();
  const t = tour(s, 'baliste', 100, 100);
  const bat = ennemi(s, 'bat', 280, 100, 1000);
  tirs(s, 1);
  assert.equal(bat.pv, 1000 - 60);
  assert.equal(t.degats, 60);
});

test('Tempête : la chaîne touche 5 ennemis au plus, de moins en moins fort', () => {
  const s = arene();
  tour(s, 'tempete', 100, 100);
  const es = [0, 1, 2, 3, 4, 5, 6].map((i) => ennemi(s, 'gob', 150 + i * 50, 100, 1000));
  tirs(s, 0.1);
  const pertes = es.map((e) => 1000 - e.pv);
  assert.equal(pertes.filter((p) => p > 0).length, 5);
  assert.equal(pertes[0], 18);
  assert.ok(pertes[1] < pertes[0] && pertes[4] < pertes[3]);
});

test('Tireurs d’élite : 5 cases de portée ; Arbalétriers : percent la moitié de l’armure', () => {
  const s = arene();
  tour(s, 'archers', 100, 100, 'a');
  const loin = ennemi(s, 'gob', 290, 100, 1000);
  tirs(s, 0.6);
  assert.equal(loin.pv, 960);  // 40 dégâts à 5 cases
  const s2 = arene();
  const orc = ennemi(s2, 'orc', 0, 0, 100);
  blesser(s2, orc, 12, 'physique', null, 0.5);
  assert.equal(orc.pv, 100 - 9);
});

test('Mortier : ne vise rien à moins d’une case ; Lance-flammes : brûlure qui continue', () => {
  const s = arene();
  const t = tour(s, 'canon', 100, 100, 'a');
  ennemi(s, 'gob', 120, 100);
  assert.equal(choisirCible(s, t), null);
  const s2 = arene();
  tour(s2, 'canon', 100, 100, 'b');
  const g = ennemi(s2, 'gob', 160, 100, 1000);
  tirs(s2, 0.25);
  assert.ok(g.brule, 'brûlé');
  s2.tours.length = 0;
  const avant = g.pv;
  tirs(s2, 1);
  assert.ok(Math.abs(avant - g.pv - 4) < 0.5, 'environ 4 dégâts de brûlure par seconde');
});

test('Blizzard ralentit tout ce qui est à portée ; Cristal éternel gèle sa cible', () => {
  const s = arene();
  tour(s, 'givre', 100, 100, 'a');
  const es = [ennemi(s, 'gob', 150, 100), ennemi(s, 'loup', 100, 180), ennemi(s, 'gob', 400, 100)];
  tirs(s, 0.1);
  assert.equal(es[0].ralFacteur, 0.4);
  assert.equal(es[1].ralFacteur, 0.4);
  assert.equal(es[2].ralFacteur, 0);
  const s2 = arene();
  tour(s2, 'givre', 100, 100, 'b');
  const g = ennemi(s2, 'gob', 160, 100);
  tirs(s2, 0.3);
  assert.ok(g.gel > 0);
  // Un ennemi gelé n'avance pas.
  s2.tours.length = 0;
  const d0 = g.d;
  avancer(s2);
  assert.equal(g.d, d0);
});

test('Arcanes : l’éclair rebondit à 60 % ; Pyromancien : zone et brûlure', () => {
  const s = arene();
  tour(s, 'mage', 100, 100, 'a');
  const a = ennemi(s, 'gob', 200, 100, 1000), b = ennemi(s, 'gob', 260, 100, 1000);
  tirs(s, 0.5);
  assert.equal(a.pv, 890);
  assert.equal(b.pv, 1000 - 66);
  const s2 = arene();
  tour(s2, 'mage', 100, 100, 'b');
  const c = ennemi(s2, 'gob', 200, 100, 1000), d = ennemi(s2, 'gob', 220, 110, 1000);
  tirs(s2, 0.5);
  assert.ok(c.brule && d.brule);
  assert.ok(c.pv <= 940 && d.pv <= 940);
});

test('Baliste lourde transperce les rangs ; Répétition tire trois carreaux', () => {
  const s = arene();
  tour(s, 'baliste', 100, 100, 'a');
  const rang = [ennemi(s, 'gob', 300, 100, 1000), ennemi(s, 'gob', 360, 100, 1000), ennemi(s, 'gob', 300, 160, 1000)];
  tirs(s, 0.6);
  assert.equal(rang[0].pv, 720);
  assert.equal(rang[1].pv, 720, 'derrière la cible, dans l’axe');
  assert.equal(rang[2].pv, 1000, 'hors de l’axe');
  const s2 = arene();
  tour(s2, 'baliste', 100, 100, 'b');
  const g = ennemi(s2, 'gob', 250, 100, 1000);
  tirs(s2, 0.5);
  assert.equal(g.pv, 1000 - 3 * 70);
});

test('Orage : chaîne de 8 ; Paratonnerre : étourdit', () => {
  const s = arene();
  tour(s, 'tempete', 100, 100, 'a');
  const es = Array.from({ length: 10 }, (_, i) => ennemi(s, 'gob', 150 + i * 60, 100, 1000));
  tirs(s, 0.1);
  assert.equal(es.filter((e) => e.pv < 1000).length, 8);
  const s2 = arene();
  tour(s2, 'tempete', 100, 100, 'b');
  const g = ennemi(s2, 'gob', 150, 100, 1000);
  tirs(s2, 0.05);
  assert.ok(g.gel > 0.4);
});

test('améliorer : la spécialisation coûte le prix du niveau 3', () => {
  const s = nouvellePartie('prairie');
  s.or = 1000;
  let place;
  for (let r = 0; r < 16 && !place; r++) for (let c = 0; c < 24 && !place; c++) if (poser(s, 'tempete', c, r).ok) place = [c, r];
  const t = s.tours[0];
  ameliorer(s, t.id);
  const or = s.or;
  assert.equal(ameliorer(s, t.id, 'b').ok, true);
  assert.equal(s.or, or - TOURS.tempete.ameliorations[1]);
  assert.equal(statsTour(t).etourdit, 0.5);
});
