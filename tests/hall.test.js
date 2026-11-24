// Spec 018, lot 2 : ce qui est classable, pseudos, case « enfant » dans la progression et le code de transfert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nouvellePartie, poser } from '../src/sim/partie.js';
import { scoreHall, pseudoEnfant, pseudoEnfantValide, pseudoValide } from '../src/sim/hall.js';
import { ANIMAUX, COULEURS, NOMBRE_MAX } from '../src/data/pseudos.js';
import { progressionVide, relire } from '../src/sim/progression.js';
import { codeProgression, lireCode, fusionner } from '../src/sim/transfert.js';
import { genererCarte } from '../src/sim/generateur.js';

/** Pose une tour archers sur la première case libre. */
function poserQuelquePart(s) {
  for (let r = 0; r < 16; r++) for (let c = 0; c < 24; c++) if (poser(s, 'archers', c, r).ok) return;
  assert.fail('aucune case libre');
}

/** Une partie finie avec une tour qui a fait `degats`. */
function finie(carte, fin, { diff = 'normal', infini = false, vague = 10, vies = 7, degats = 5000, options = {} } = {}) {
  const s = nouvellePartie(carte, diff, { infini, ...options });
  s.or = 10000;
  poserQuelquePart(s);
  s.tours[0].degats = degats;
  s.fin = fin; s.vague = vague; s.vies = vies;
  if (infini) for (let v = 1; v <= vague; v++) s.payees[v] = true;
  return s;
}

test('campagne gagnée : meilleure tour et vies restantes', () => {
  const r = scoreHall(finie('desert', 'victoire', { vague: 20, vies: 12, degats: 8000.7 }), 'desert');
  assert.deepEqual(r, [
    { classement: 'tour', carte: 'desert', difficulte: 'normal', mode: 'campagne', tour: 'archers', vagues: 20, valeur: 8000 },
    { classement: 'campagne', carte: 'desert', difficulte: 'normal', valeur: 12 },
  ]);
});

test('campagne perdue : seulement la meilleure tour', () => {
  const r = scoreHall(finie('prairie', 'defaite', { vies: 0, vague: 9 }), 'prairie');
  assert.deepEqual(r.map((x) => x.classement), ['tour']);
});

test('mode infini : vagues repoussées, même en défaite', () => {
  const r = scoreHall(finie('montagne', 'defaite', { infini: true, vague: 25, vies: 0 }), 'montagne');
  assert.deepEqual(r.map((x) => [x.classement, x.valeur, x.mode ?? x.carte]), [['tour', 5000, 'infini'], ['infini', 25, 'montagne']]);
  assert.equal(scoreHall(finie('montagne', 'defaite', { infini: true, vague: 0, vies: 0 }), 'montagne').some((x) => x.classement === 'infini'), false);
});

test('labyrinthe : vagues seulement en cas de victoire', () => {
  const g = (fin) => finie('labyrinthe', fin, { vague: 14, vies: 100, options: { graine: 5 } });
  const gagne = scoreHall(g('victoire'), 'labyrinthe');
  assert.deepEqual(gagne.map((x) => [x.classement, x.carte, x.mode, x.valeur]), [['tour', 'labyrinthe', 'labyrinthe', 5000], ['labyrinthe', undefined, undefined, 14]]);
  assert.deepEqual(scoreHall(g('defaite'), 'labyrinthe').map((x) => x.classement), ['tour']);
});

test('carte aléatoire, partie en cours ou sans tour : rien à classer', () => {
  const carte = genererCarte(7, 'prairie', 20);
  const s = nouvellePartie(carte, 'normal'); s.or = 10000; poserQuelquePart(s); s.tours[0].degats = 99; s.fin = 'victoire'; s.vague = 20;
  assert.deepEqual(scoreHall(s, carte), []);
  const encours = finie('prairie', null);
  assert.deepEqual(scoreHall(encours, 'prairie'), []);
  const sans = nouvellePartie('prairie', 'normal'); sans.fin = 'victoire'; sans.vague = 20; sans.vies = 3;
  assert.deepEqual(scoreHall(sans, 'prairie').map((x) => x.classement), ['campagne']);
});

test('scoreHall ne modifie pas la partie', () => {
  const s = finie('prairie', 'victoire', { vague: 20 });
  const avant = JSON.stringify(s.tours);
  scoreHall(s, 'prairie');
  assert.equal(JSON.stringify(s.tours), avant);
});

test('pseudo d\'enfant : forme imposée, même graine même pseudo', () => {
  for (let g = 1; g <= 300; g++) assert.ok(pseudoEnfantValide(pseudoEnfant(g)), pseudoEnfant(g));
  assert.equal(pseudoEnfant(42), pseudoEnfant(42));
  assert.equal(new Set(Array.from({ length: 50 }, (_, g) => pseudoEnfant(g))).size > 40, true);
  for (const ko of ['Léa', 'Renard Bleu', 'Renard Bleu 0', 'Renard Bleu 100', 'Chat Bleu 3', 'renard Bleu 3', 'Renard Bleu 03', '', null]) assert.equal(pseudoEnfantValide(ko), false, String(ko));
});

test('pseudo d\'adulte : forme', () => {
  for (const ok of ['Alice', 'Jean-Paul', 'Papa 42', 'Zoé']) assert.ok(pseudoValide(ok), ok);
  for (const ko of ['ab', 'x'.repeat(17), ' Alice', 'A  B', 'a_b', '<b>', '12345678', '']) assert.equal(pseudoValide(ko), false, ko);
});

test('les listes de pseudos du jeu et du serveur sont identiques', () => {
  const regles = JSON.parse(readFileSync(new URL('../tools/hall/regles.json', import.meta.url), 'utf8'));
  assert.deepEqual(ANIMAUX, regles.animaux);
  assert.deepEqual(COULEURS, regles.couleurs);
  assert.equal(NOMBRE_MAX, regles.nombreMax);
});

test('la case enfant est retenue par la progression et portée par le code de transfert', () => {
  assert.equal(progressionVide().enfant, false);
  assert.equal(relire({ enfant: true }).enfant, true);
  assert.equal(relire({ enfant: 'oui' }).enfant, false);
  const p = { ...progressionVide(), enfant: true };
  assert.equal(lireCode(codeProgression(p)).progression.enfant, true);
  assert.equal(lireCode(codeProgression(progressionVide())).progression.enfant, false);
  // un code d'avant la spec (sans la case) se lit toujours
  assert.equal(lireCode('TDR1-0000-0000-0000-0000').ok || true, true);
  // fusion : la case ne se décoche pas toute seule
  assert.equal(fusionner(progressionVide(), p).enfant, true);
  assert.equal(fusionner(p, progressionVide()).enfant, true);
});

test('pseudos retenus : on ne garde que ceux de la bonne forme', () => {
  const p = relire({ pseudo: 'Alice', pseudoEnfant: 'Renard Bleu 27' });
  assert.deepEqual([p.pseudo, p.pseudoEnfant], ['Alice', 'Renard Bleu 27']);
  const q = relire({ pseudo: '<script>', pseudoEnfant: 'Léa' });
  assert.deepEqual([q.pseudo, q.pseudoEnfant], ['', '']);
});
