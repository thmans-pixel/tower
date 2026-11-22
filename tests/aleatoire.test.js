// Spec 007 : cartes aléatoires.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genererTrace, genererCarte, THEMES } from '../src/sim/generateur.js';
import { nouvellePartie } from '../src/sim/partie.js';
import { CHEMIN, PRIS } from '../src/sim/carte.js';
import { COLS, ROWS } from '../src/sim/const.js';
import { hasard } from '../src/sim/hasard.js';
import { jouer } from './simulate.js';

const cases = (ch) => {
  const out = [];
  for (let i = 0; i + 1 < ch.length; i++) {
    const [c0, r0] = ch[i], [c1, r1] = ch[i + 1];
    assert.ok(c0 === c1 || r0 === r1, 'tronçons droits');
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    for (let c = c0, r = r0; ; c += dc, r += dr) { if (!out.length || out[out.length - 1][0] !== c || out[out.length - 1][1] !== r) out.push([c, r]); if (c === c1 && r === r1) break; }
  }
  return out;
};

test('1 000 numéros de carte : tous valides, chemins sans croisement, couloirs espacés, longueur 45 à 75', () => {
  const rnd = hasard(2026);
  for (let k = 0; k < 1000; k++) {
    const graine = 1 + Math.floor(rnd() * 99999);
    const t = genererTrace(graine);
    assert.ok(t.longueur >= 45 && t.longueur <= 75, `longueur ${t.longueur} (n° ${graine})`);
    assert.ok(t.chemins.length === 1 || t.chemins.length === 2);
    for (const ch of t.chemins) {
      const cs = cases(ch);
      const vus = new Set();
      for (const [c, r] of cs) {
        const cle = c + ',' + r;
        assert.ok(!vus.has(cle), `le chemin repasse par ${cle} (n° ${graine})`);
        vus.add(cle);
        assert.ok(c >= -1 && c <= 20 && r >= 0 && r < ROWS, `case hors carte ${cle} (n° ${graine})`);
      }
      // Pas de contact entre deux parties éloignées du même chemin (sinon les couloirs se touchent).
      const index = new Map(cs.map(([c, r], i) => [c + ',' + r, i]));
      cs.forEach(([c, r], i) => {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = index.get((c + dc) + ',' + (r + dr));
          if (j !== undefined) assert.ok(Math.abs(j - i) === 1, `couloirs collés en ${c},${r} (n° ${graine})`);
        }
      });
      assert.deepEqual(ch[ch.length - 1], [20, 7]);
    }
    for (const en of t.entrees) assert.ok(en.r >= 0 && en.r + en.h <= ROWS);
  }
});

test('le même numéro redonne la même carte ; la carte se joue dans chaque décor', () => {
  assert.deepEqual(genererCarte(48213, 'desert', 25), genererCarte(48213, 'desert', 25));
  assert.notDeepEqual(genererTrace(48213), genererTrace(48214));
  for (const theme of Object.keys(THEMES)) {
    const s = nouvellePartie(genererCarte(777, theme, 20));
    assert.equal(s.nbVagues, 20);
    assert.equal(s.carte.def.id, theme, 'décor du thème');
    assert.equal(s.carte.etat(22, 7), PRIS, 'château');
    for (const tr of s.carte.sols) assert.equal(s.carte.etat(20, 7), CHEMIN);
    assert.ok(s.carte.decors.length > 20);
    assert.equal(s.carte.def.vagues.filter((v) => v.some(([x]) => x === 'ogre')).length, 2, 'boss aux vagues 10 et 20');
  }
});

test('équilibre : le joueur automatique prudent gagne la plupart des cartes aléatoires en Normal', () => {
  let victoires = 0;
  const graines = [101, 2024, 31337, 48213, 77777];
  for (const g of graines) if (jouer({ carte: genererCarte(g, 'prairie', 20), maxTours: 25, max: 60 * 60 * 40 }).fin === 'victoire') victoires++;
  assert.ok(victoires >= 3, `${victoires} victoires sur ${graines.length}`);
});
