import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressionVide, relire } from '../src/sim/progression.js';
import { codeProgression, lireCode, fusionner } from '../src/sim/transfert.js';

const riche = () => relire({
  debloquees: ['prairie', 'desert', 'montagne'], infiniOuvert: true,
  etoiles: { prairie: { normal: 3, difficile: 1 }, desert: { facile: 2 }, montagne: { normal: 1 } },
  infini: { prairie: 37, montagne: 112 }, aleatoires: { normal: 4, difficile: 18 },
});

test('un code relu redonne la même progression', () => {
  for (const p of [progressionVide(), riche()]) {
    const code = codeProgression(p);
    assert.match(code, /^TDR1(-[0-9A-Z]{1,4})+$/);
    const r = lireCode(code);
    assert.ok(r.ok);
    assert.deepEqual({ ...r.progression, difficulte: p.difficulte, son: p.son }, p);
  }
});

test('code tolérant : minuscules, espaces, O pour 0', () => {
  const code = codeProgression(riche());
  assert.ok(lireCode(' ' + code.toLowerCase().replace(/-/g, ' ') + ' ').ok);
  assert.ok(lireCode(code.replace(/0/g, 'O')).ok);
});

test('code mal recopié ou étranger : illisible', () => {
  const code = codeProgression(riche());
  const i = code.length - 4;
  const faute = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
  assert.equal(lireCode(faute).ok, false);
  assert.equal(lireCode(code.slice(0, -1)).ok, false);
  assert.equal(lireCode('bonjour').ok, false);
  assert.equal(lireCode('').ok, false);
});

test('la fusion garde le meilleur des deux', () => {
  const p = relire({ debloquees: ['prairie', 'desert'], etoiles: { prairie: { normal: 1, facile: 3 } }, infini: { prairie: 50 }, difficulte: 'facile' });
  const r = fusionner(p, riche());
  assert.deepEqual(r.debloquees, ['prairie', 'desert', 'montagne']);
  assert.equal(r.etoiles.prairie.normal, 3);
  assert.equal(r.etoiles.prairie.facile, 3);
  assert.equal(r.infini.prairie, 50);
  assert.equal(r.infini.montagne, 112);
  assert.equal(r.aleatoires.difficile, 18);
  assert.equal(r.infiniOuvert, true);
  assert.equal(r.difficulte, 'facile');
  assert.deepEqual(fusionner(riche(), progressionVide()), riche());
});
