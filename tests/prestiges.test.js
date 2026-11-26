// Prestiges (spec 022) : de plus en plus de PV et de monstres, ouverts un à un, portés par le code de transfert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nouvellePartie, appelerVague, composition } from '../src/sim/partie.js';
import { progressionVide, relire, enregistrerVictoire, difficulteOuverte, prestigeOuvert } from '../src/sim/progression.js';
import { DIFFICULTES, ORDRE_PRESTIGES, NB_PRESTIGES } from '../src/data/difficultes.js';
import { codeProgression, lireCode, fusionner } from '../src/sim/transfert.js';
import { scoreHall } from '../src/sim/hall.js';

test('chaque prestige est plus dur que le précédent : PV, effectif, vies, attente', () => {
  let avant = DIFFICULTES.difficile;
  for (const k of ORDRE_PRESTIGES) {
    const d = DIFFICULTES[k];
    assert.ok(d.pv > avant.pv && (d.nombre || 1) > (avant.nombre || 1), k);
    assert.ok(d.vies <= avant.vies && d.compte <= avant.compte, k);
    avant = d;
  }
  assert.equal(ORDRE_PRESTIGES.length, NB_PRESTIGES);
});

test("un prestige multiplie les PV et l'effectif des groupes, mais pas les boss", () => {
  const n = nouvellePartie('prairie', 'difficile'), p = nouvellePartie('prairie', 'prestige3');
  const x = DIFFICULTES.prestige3;
  const comp = (s, v) => Object.fromEntries(composition(s, v).map((c) => [c.sorte, c.nombre]));
  for (const [sorte, nb] of Object.entries(comp(n, 3))) assert.equal(comp(p, 3)[sorte], Math.round(nb * x.nombre));
  appelerVague(p); appelerVague(n);
  assert.equal(p.vies, x.vies);
  assert.ok(Math.abs(p.multPV / n.multPV - x.pv / DIFFICULTES.difficile.pv) < 1e-9);
  // Un boss reste seul.
  const b = nouvellePartie('prairie', 'prestige10');
  const boss = Object.entries(composition(b, 20)).find(([, c]) => c.sorte === 'ogre');
  if (boss) assert.equal(boss[1].nombre, 1);
});

test('déblocage : Prestige 1 après Difficile, puis un par un', () => {
  let p = progressionVide();
  assert.equal(prestigeOuvert(p), 0);
  assert.ok(difficulteOuverte(p, 'difficile') && !difficulteOuverte(p, 'prestige1'));
  p = enregistrerVictoire(p, 'prairie', 'normal', 3).progression;
  assert.ok(!difficulteOuverte(p, 'prestige1'));
  p = enregistrerVictoire(p, 'prairie', 'difficile', 1).progression;
  assert.ok(difficulteOuverte(p, 'prestige1') && !difficulteOuverte(p, 'prestige2'));
  p = enregistrerVictoire(p, 'desert', 'prestige1', 1).progression;
  assert.ok(difficulteOuverte(p, 'prestige2') && !difficulteOuverte(p, 'prestige3'));
  p = enregistrerVictoire(p, 'prairie', 'prestige2', 0).progression;   // 0 étoile = défaite : rien de gagné
  assert.ok(!difficulteOuverte(p, 'prestige3'));
  assert.ok(!difficulteOuverte(p, 'prestige99'));
});

test('relecture : un prestige fermé ou inconnu retombe sur Normal', () => {
  assert.equal(relire({ difficulte: 'prestige2' }).difficulte, 'normal');
  assert.equal(relire({ difficulte: 'prestige1', etoiles: { prairie: { difficile: 2 } } }).difficulte, 'prestige1');
  assert.equal(relire({ prestige: 4, difficulte: 'prestige5' }).difficulte, 'prestige5');
});

test('le code de transfert porte le plus haut prestige gagné', () => {
  const p = relire({ etoiles: { prairie: { difficile: 3 } }, prestige: 3 });
  const code = codeProgression(p);
  assert.match(code, /^TDR3-/);
  const r = lireCode(code);
  assert.ok(r.ok);
  assert.equal(r.progression.prestige, 3);
  assert.equal(codeProgression(progressionVide()).slice(0, 4), 'TDR1');
  assert.equal(fusionner(p, relire({ prestige: 7 })).prestige, 7);
});

test('un prestige gagné est classé au hall of fame (spec 023)', () => {
  const s = nouvellePartie('prairie', 'prestige1');
  s.fin = 'victoire'; s.vague = 20;
  const r = scoreHall(s, 'prairie');
  assert.ok(r.length >= 1 && r.every((x) => x.difficulte === 'prestige1'));
  assert.equal(r.find((x) => x.classement === 'campagne').valeur, s.vies);
});

test('les règles du serveur connaissent chaque difficulté, avec ses vies', () => {
  const regles = JSON.parse(readFileSync(new URL('../tools/hall/regles.json', import.meta.url), 'utf8'));
  for (const [k, d] of Object.entries(DIFFICULTES)) assert.equal(regles.difficultes[k], d.vies, k);
  assert.deepEqual(Object.keys(regles.difficultes), Object.keys(DIFFICULTES));
});
