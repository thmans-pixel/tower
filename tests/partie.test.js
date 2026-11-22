import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nouvellePartie, avancer, poser, ameliorer, vendre, cibler, appelerVague, peutPoser, peutAppeler,
  bonusAppel, choisirCible, composition, blesser,
} from '../src/sim/partie.js';
import { CHEMIN, PRIS, LIBRE } from '../src/sim/carte.js';
import { COMPTE_VAGUE, COLS, ROWS, T } from '../src/sim/const.js';
import { TOURS } from '../src/data/tours.js';
import { jouer } from './simulate.js';

const libre = (s) => {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (peutPoser(s, c, r)) return [c, r];
  throw new Error('aucune case libre');
};
const vider = (s) => { s.evenements.length = 0; };
const tours = (s, n) => { for (let i = 0; i < n; i++) avancer(s); };

test('la carte Prairie : chemin continu, château et entrée pris, décor hors du chemin', () => {
  const s = nouvellePartie('prairie');
  const k = s.carte;
  assert.ok(k.cheminCases.length > 40);
  for (const [c, r] of k.cheminCases) assert.equal(k.etat(c, r), CHEMIN);
  assert.equal(k.etat(22, 7), PRIS);
  assert.equal(k.etat(0, 2), PRIS);
  for (const d of k.decors) assert.notEqual(k.etat(d.c, d.r), CHEMIN);
  assert.ok(k.decors.some((d) => d.bloquant) && k.decors.some((d) => !d.bloquant));
  // Toujours la même carte.
  assert.deepEqual(nouvellePartie('prairie').carte.decors, k.decors);
});

test('poser une tour : place libre, or suffisant, pas sur le chemin ni sur une autre tour', () => {
  const s = nouvellePartie('prairie');
  const [c, r] = libre(s);
  const or = s.or;
  assert.equal(poser(s, 'archers', c, r).ok, true);
  assert.equal(s.or, or - TOURS.archers.prix);
  assert.equal(poser(s, 'archers', c, r).raison, 'place');
  const [cc, rc] = s.carte.cheminCases[3];
  assert.equal(poser(s, 'archers', cc, rc).raison, 'place');
  s.or = 10;
  const [c2, r2] = libre(s);
  assert.equal(poser(s, 'mage', c2, r2).raison, 'or');
});

test('améliorer jusqu’au niveau 3 puis revendre à 70 % de tout ce qui a été payé', () => {
  const s = nouvellePartie('prairie');
  s.or = 10000;
  const [c, r] = libre(s);
  const t = poser(s, 'canon', c, r).tour;
  assert.equal(ameliorer(s, t.id).ok, true);
  assert.equal(ameliorer(s, t.id).raison, 'choix', 'le niveau 3 demande une spécialisation');
  assert.equal(ameliorer(s, t.id, 'a').ok, true);
  assert.equal(t.niveau, 2);
  assert.equal(t.variante, 'a');
  assert.equal(ameliorer(s, t.id, 'b').raison, 'max');
  const paye = TOURS.canon.prix + TOURS.canon.ameliorations[0] + TOURS.canon.ameliorations[1];
  const avant = s.or;
  assert.equal(vendre(s, t.id).or, Math.floor(paye * 0.7));
  assert.equal(s.or, avant + Math.floor(paye * 0.7));
  assert.equal(s.tours.length, 0);
  assert.equal(peutPoser(s, c, r), true);
});

test('vagues : préparation, lancement, compte à rebours, bonus d’appel anticipé', () => {
  const s = nouvellePartie('prairie');
  tours(s, 600);
  assert.equal(s.vague, 0, 'rien ne part avant que le joueur lance la vague 1');
  assert.deepEqual(composition(s, 1), [{ sorte: 'gob', nombre: 8 }]);
  appelerVague(s);
  assert.equal(s.vague, 1);
  assert.equal(peutAppeler(s), false, 'pas d’appel pendant qu’une vague arrive');
  while (s.lancement) avancer(s);
  assert.equal(s.ennemis.length, 8);
  assert.equal(s.compte, COMPTE_VAGUE);
  tours(s, 60 * 4);
  const bonus = bonusAppel(s);
  assert.ok(bonus > 0);
  const or = s.or;
  appelerVague(s);
  assert.equal(s.or, or + bonus);
  assert.equal(s.vague, 2);
});

test('le compte à rebours lance seul la vague suivante', () => {
  const s = nouvellePartie('prairie');
  appelerVague(s);
  while (s.lancement) avancer(s);
  tours(s, Math.ceil(COMPTE_VAGUE * 60) + 2);
  assert.equal(s.vague, 2);
});

test('un ennemi qui atteint le château coûte ses vies ; à zéro, défaite', () => {
  const s = nouvellePartie('prairie');
  s.vies = 2;
  appelerVague(s);
  for (let i = 0; i < 60 * 120 && !s.fin; i++) avancer(s);
  assert.equal(s.fin, 'defaite');
  assert.equal(s.vies, 0);
  assert.ok(s.evenements.some((e) => e.type === 'fuite'));
});

test('armure : les dégâts physiques sont réduits, la magie non', () => {
  const s = nouvellePartie('prairie');
  appelerVague(s);
  s.ennemis.length = 0;
  const orc = { id: 99, sorte: 'orc', vague: 1, pv: 100, pvMax: 100, mult: 1, x: 0, y: 0, d: 0, vol: false, ralenti: 0, ralFacteur: 0 };
  s.ennemis.push(orc); s.vivants[1] = 1;
  blesser(s, orc, 20, 'physique', null);
  assert.equal(orc.pv, 90);
  blesser(s, orc, 20, 'magique', null);
  assert.equal(orc.pv, 70);
});

test('ciblage : premier, dernier, plus fort, plus proche ; le canon ignore les volants', () => {
  const s = nouvellePartie('prairie');
  const t = { id: 1, sorte: 'archers', niveau: 1, x: 200, y: 200, ciblage: 'premier' };
  const e = (id, d, x, pv, vol = false) => ({ id, sorte: vol ? 'bat' : 'gob', d, x, y: 200, pv, pvMax: pv, vol });
  s.ennemis = [e(1, 100, 230, 10), e(2, 300, 300, 50), e(3, 200, 205, 20)];
  assert.equal(choisirCible(s, t).id, 2);
  t.ciblage = 'dernier'; assert.equal(choisirCible(s, t).id, 1);
  t.ciblage = 'fort'; assert.equal(choisirCible(s, t).id, 2);
  t.ciblage = 'proche'; assert.equal(choisirCible(s, t).id, 3);
  const canon = { ...t, sorte: 'canon', ciblage: 'premier' };
  s.ennemis = [e(4, 500, 210, 30, true)];
  assert.equal(choisirCible(s, canon), null);
  assert.equal(choisirCible(s, t).id, 4);
});

test('le givre ralentit sa cible', () => {
  const s = nouvellePartie('prairie');
  s.or = 1000;
  appelerVague(s);
  const [c, r] = s.carte.cheminCases[2];
  // Une case libre voisine du début du chemin.
  let place = null;
  for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0], [1, 1], [1, -1]]) if (peutPoser(s, c + dc, r + dr)) { place = [c + dc, r + dr]; break; }
  assert.ok(place);
  poser(s, 'givre', ...place);
  let ralenti = false;
  for (let i = 0; i < 60 * 20 && !ralenti; i++) { avancer(s); ralenti = s.ennemis.some((e) => e.ralFacteur > 0); }
  assert.ok(ralenti);
});

test('cibler refuse un mode inconnu', () => {
  const s = nouvellePartie('prairie');
  const [c, r] = libre(s);
  const t = poser(s, 'mage', c, r).tour;
  assert.equal(cibler(s, t.id, 'fort').ok, true);
  assert.equal(cibler(s, t.id, 'n’importe').ok, false);
  assert.equal(t.ciblage, 'fort');
});

test('la logique est rejouable : mêmes actions, même résultat', () => {
  assert.deepEqual(jouer({ presse: true }), jouer({ presse: true }));
});

test('équilibre : le joueur automatique prudent gagne la Prairie, sans tour on perd', () => {
  const r = jouer();
  assert.equal(r.fin, 'victoire');
  const s = nouvellePartie('prairie');
  appelerVague(s);
  for (let i = 0; i < 60 * 60 * 20 && !s.fin; i++) { avancer(s); vider(s); if (!s.lancement && s.compte !== null) appelerVague(s); }
  assert.equal(s.fin, 'defaite');
});
