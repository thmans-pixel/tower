// Spec 016, lot 1 : la logique du mode labyrinthe (terrain, chemin, murs, prévus, mise à terre, zones).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nouvellePartie, avancer, appelerVague, peutAppeler, poser, vendre, poserMur, vendreMur, annulerPrevu, blesser,
  enVague, statsEffectives,
} from '../src/sim/partie.js';
import { genererLabyrinthe, carteLabyrinthe, majChemin, cle } from '../src/sim/labyrinthe.js';
import { positionSur, centre } from '../src/sim/carte.js';
import { ENNEMIS } from '../src/data/ennemis.js';
import { statsTour } from '../src/data/tours.js';
import { LABYRINTHE } from '../src/data/labyrinthe.js';
import { COLS, ROWS, T, DT } from '../src/sim/const.js';

const vide = { graine: 1, entree: { c: 0, r: 5 }, sortie: { c: 23, r: 5 }, cp: [], tp: [], zones: [] };

/** Partie sur un terrain décrit à la main (la carte tirée au sort est remplacée). */
function partieSur(lab) {
  const s = nouvellePartie('labyrinthe', 'normal', { graine: 1 });
  s.carte = carteLabyrinthe({ ...vide, ...lab });
  s.labyrinthe.murs = s.carte.murs;
  assert.ok(majChemin(s.carte, new Set()));
  return s;
}

/** Vague en cours : fait sortir tous les monstres d'un coup, puis laisse la pause s'ouvrir. */
function finirVague(s) {
  s.vies = Math.min(s.vies, 50);
  for (let i = 0; i < 20000 && enVague(s); i++) {
    if (!s.lancement) for (const e of s.ennemis) e.d = 1e9;
    avancer(s);
  }
  avancer(s);
  assert.ok(!enVague(s));
}

/** Lance une vague et attend qu'un premier monstre soit sorti. */
function premierMonstre(s) {
  appelerVague(s);
  while (!s.ennemis.length) avancer(s);
  return s.ennemis[0];
}

test('terrain : toujours le même pour une graine, 3 à 5 checkpoints, 1 ou 2 paires de TP, jamais deux éléments sur une case', () => {
  for (let g = 1; g <= 50; g++) {
    const a = genererLabyrinthe(g);
    assert.deepEqual(genererLabyrinthe(g), a);
    assert.ok(a.cp.length >= 3 && a.cp.length <= 5, 'checkpoints ' + g);
    assert.ok(a.tp.length >= 1 && a.tp.length <= 2, 'paires ' + g);
    assert.equal(a.zones.length, LABYRINTHE.nbZones);
    const cases = [a.entree, a.sortie, ...a.cp, ...a.tp.flatMap((t) => [t.a, t.b]), ...a.zones].map((p) => cle(p.c, p.r));
    assert.equal(new Set(cases).size, cases.length, 'cases en double, graine ' + g);
    assert.deepEqual(a.cp.map((p) => p.n), a.cp.map((_, i) => i + 1));
    const s = nouvellePartie('labyrinthe', 'normal', { graine: g });
    assert.ok(s.carte.sol.longueur > 0, 'un chemin existe sur la carte vide, graine ' + g);
    assert.deepEqual(nouvellePartie('labyrinthe', 'normal', { graine: g }).carte.lab, s.carte.lab);
  }
  assert.notDeepEqual(genererLabyrinthe(1), genererLabyrinthe(2));
});

test('trajet : par les checkpoints dans l\'ordre puis la sortie, de case en case sans diagonale', () => {
  for (let g = 1; g <= 30; g++) {
    const s = nouvellePartie('labyrinthe', 'normal', { graine: g });
    const lab = s.carte.lab, pts = s.carte.sol.points;
    assert.deepEqual([pts[0].x, pts[0].y], [centre(lab.entree.c), centre(lab.entree.r)]);
    const fin = pts[pts.length - 1];
    assert.deepEqual([fin.x, fin.y], [centre(lab.sortie.c), centre(lab.sortie.r)]);
    let depuis = 0;
    for (const p of lab.cp) {
      const i = pts.findIndex((q, k) => k >= depuis && q.x === centre(p.c) && q.y === centre(p.r));
      assert.ok(i >= 0, `checkpoint ${p.n} manqué, graine ${g}`);
      depuis = i;
    }
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].saut) continue;
      assert.equal(Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y), T, 'pas d\'une case, graine ' + g);
    }
  }
});

test('boucher le passage est refusé, sans débiter l\'or, pour un mur comme pour une tour', () => {
  const s = partieSur({});
  for (let r = 0; r < ROWS; r++) if (r !== 7) assert.ok(poserMur(s, 10, r).ok);
  const or = s.or;
  assert.deepEqual(poserMur(s, 10, 7), { ok: false, raison: 'bouche' });
  assert.deepEqual(poser(s, 'archers', 10, 7), { ok: false, raison: 'bouche' });
  assert.equal(s.or, or);
  assert.ok(!s.labyrinthe.murs.has(cle(10, 7)) && s.tours.length === 0);
  assert.ok(s.carte.sol.longueur > 0);
  // Une tour ailleurs reste possible.
  assert.ok(poser(s, 'archers', 12, 3).ok);
});

test('des murs en serpentin allongent le trajet ; une tour ferme sa case', () => {
  const s = partieSur({});
  const droit = s.carte.sol.longueur;
  for (let r = 0; r < ROWS - 1; r++) assert.ok(poserMur(s, 8, r).ok);       // ouvert en bas
  for (let r = 1; r < ROWS; r++) assert.ok(poserMur(s, 14, r).ok);          // ouvert en haut
  assert.ok(s.carte.sol.longueur > droit + 10 * T, `${s.carte.sol.longueur} > ${droit}`);
  const avant = s.carte.sol.longueur;
  s.or = 1000;
  assert.ok(poser(s, 'canon', 4, 5).ok);                                   // sur le chemin direct de l'entrée
  assert.ok(s.carte.sol.longueur >= avant);
  assert.ok(!s.carte.cheminCases.some(([c, r]) => c === 4 && r === 5), 'le chemin contourne la tour');
});

test('pendant une vague, murs et tours sont seulement prévus, appliqués d\'un coup à la fin ; vendre aussi', () => {
  const s = partieSur({});
  assert.ok(poserMur(s, 12, 5).ok);
  assert.ok(poser(s, 'archers', 5, 8).ok);
  const tour = s.tours[0];
  premierMonstre(s);
  const trajet = s.carte.sol;
  const or0 = s.or;
  // Poses prévues : l'or part tout de suite, rien n'est construit.
  assert.deepEqual(poserMur(s, 12, 6), { ok: true, prevu: true });
  const rt = poser(s, 'givre', 6, 8);
  assert.ok(rt.ok && rt.prevu);
  assert.equal(s.or, or0 - LABYRINTHE.prixMur - 90);
  assert.ok(!s.labyrinthe.murs.has(cle(12, 6)));
  assert.equal(s.tours.length, 1);
  assert.equal(s.carte.sol, trajet, 'le trajet en cours ne bouge pas');
  // Vente prévue : l'élément reste, marqué, et rien n'est payé.
  assert.equal(vendre(s, tour.id).prevu, true);
  assert.equal(tour.aRetirer, true);
  assert.equal(s.tours.length, 1);
  assert.equal(vendre(s, tour.id).raison, 'deja');
  const mur = vendreMur(s, 12, 5);
  assert.ok(mur.ok && mur.prevu && s.labyrinthe.murs.has(cle(12, 5)));
  assert.equal(s.or, or0 - LABYRINTHE.prixMur - 90);
  // Annuler une pose rend tout l'or ; annuler une vente garde l'élément.
  assert.ok(annulerPrevu(s, 12, 6).ok);
  assert.equal(s.or, or0 - 90);
  assert.ok(annulerPrevu(s, 12, 5).ok);
  assert.ok(annulerPrevu(s, tour.id && tour.c, tour.r).ok);
  assert.equal(tour.aRetirer, false);
  assert.equal(annulerPrevu(s, 1, 1).ok, false);
  // On repose et on revend, puis la vague se termine.
  assert.ok(poserMur(s, 12, 6).ok);
  assert.ok(vendre(s, tour.id).ok);
  const or1 = s.or;
  finirVague(s);
  assert.ok(s.labyrinthe.murs.has(cle(12, 6)), 'mur construit à la fin');
  assert.ok(s.tours.some((t) => t.sorte === 'givre'), 'tour construite à la fin');
  assert.ok(!s.tours.some((t) => t.id === tour.id), 'tour vendue à la fin');
  assert.ok(s.or > or1, 'la vente est payée à la fin (avec le bonus de vague)');
  assert.ok(s.carte.sol !== trajet, 'le trajet est recalculé');
  assert.ok(!s.carte.cheminCases.some(([c, r]) => c === 12 && r === 6), 'et contourne le nouveau mur');
  assert.equal(s.labyrinthe.prevus.length, 0);
});

test('le refus « bouché » tient compte de ce qui est prévu ; annuler une vente qui refermerait le passage est refusé', () => {
  const s = partieSur({});
  for (let r = 0; r < ROWS - 1; r++) assert.ok(poserMur(s, 10, r).ok);     // seule la case (10, 15) est libre
  premierMonstre(s);
  assert.ok(vendreMur(s, 10, 0).prevu);                                     // une 2e ouverture est prévue en haut
  assert.ok(poserMur(s, 10, 15).prevu);                                     // fermer le bas est permis grâce à elle
  assert.equal(poserMur(s, 10, 0).raison, 'place', 'le mur du haut existe encore tant que la vente n\'est pas faite');
  assert.equal(annulerPrevu(s, 10, 0).raison, 'bouche', 'rouvrir le mur du haut fermerait tout');
  assert.ok(annulerPrevu(s, 10, 15).ok);
  assert.ok(annulerPrevu(s, 10, 0).ok);
});

test('entre les vagues, poses et ventes sont immédiates ; un mur vendu rend tout son prix', () => {
  const s = partieSur({});
  const or = s.or;
  assert.deepEqual(poserMur(s, 6, 6), { ok: true });
  assert.ok(s.labyrinthe.murs.has(cle(6, 6)));
  assert.equal(s.or, or - LABYRINTHE.prixMur);
  assert.deepEqual(vendreMur(s, 6, 6), { ok: true, or: LABYRINTHE.prixMur });
  assert.equal(s.or, or);
  assert.ok(!s.labyrinthe.murs.has(cle(6, 6)));
  const r = poser(s, 'archers', 6, 6);
  assert.ok(r.ok && r.tour && !r.prevu);
  assert.ok(vendre(s, r.tour.id).ok && s.tours.length === 0);
  assert.equal(poserMur(s, 0, 5).raison, 'place', 'pas sur l\'entrée');
  assert.equal(poserMur(s, 23, 5).raison, 'place', 'pas sur la sortie');
});

test('téléporteur : le monstre saute de l\'entrée à la sortie sans glisser, et ne le prend que s\'il raccourcit', () => {
  // Raccourci : (5, 5) -> (18, 5).
  const s = partieSur({ tp: [{ forme: 'rond', a: { c: 5, r: 5 }, b: { c: 18, r: 5 } }] });
  const pts = s.carte.sol.points;
  assert.ok(pts.some((p) => p.saut), 'le trajet passe par le téléporteur');
  assert.ok(s.carte.sol.longueur < 23 * T);
  const e = premierMonstre(s);
  let saut = null, prec = { x: e.x, y: e.y };
  for (let i = 0; i < 60 * 60 && s.ennemis.includes(e); i++) {
    avancer(s);
    if (!s.ennemis.includes(e)) break;
    const d = Math.hypot(e.x - prec.x, e.y - prec.y);
    if (d > 3) { saut = { avant: prec, apres: { x: e.x, y: e.y } }; break; }
    prec = { x: e.x, y: e.y };
  }
  assert.ok(saut, 'un saut a eu lieu');
  assert.ok(Math.abs(saut.avant.x - centre(5)) < 2 && Math.abs(saut.avant.y - centre(5)) < 2, 'part de l\'entrée');
  assert.ok(Math.abs(saut.apres.x - centre(18)) < 2 && Math.abs(saut.apres.y - centre(5)) < 2, 'arrive à la sortie');
  // Détour : (10, 5) -> (11, 12) allongerait le trajet, les monstres l'évitent.
  const t = partieSur({ tp: [{ forme: 'rond', a: { c: 10, r: 5 }, b: { c: 11, r: 12 } }] });
  assert.ok(!t.carte.sol.points.some((p) => p.saut));
  assert.ok(!t.carte.cheminCases.some(([c, r]) => c === 10 && r === 5));
  // Passage obligé : un mur ferme toute la colonne sauf la case du téléporteur, même s'il rallonge.
  for (let r = 0; r < ROWS; r++) if (r !== 5) assert.ok(poserMur(t, 10, r).ok);
  assert.ok(t.carte.sol.points.some((p) => p.saut), 'le téléporteur est le seul passage');
  assert.ok(t.carte.sol.longueur > 23 * T);
});

test('mise à terre : +1 vie, la moitié de l\'or, le monstre reste sur place avec tous ses PV', () => {
  const s = partieSur({});
  const e = premierMonstre(s);
  e.pv = 1;
  const { x, y, d } = e, vies = s.vies, or = s.or, vivants = s.vivants[e.vague];
  blesser(s, e, 1e6, 'physique', null);
  assert.equal(s.vies, vies + 1);
  assert.equal(s.or, or + Math.ceil(ENNEMIS.gob.or / 2));
  assert.ok(s.ennemis.includes(e));
  assert.equal(e.pv, e.pvMax);
  assert.deepEqual([e.x, e.y, e.d], [x, y, d]);
  assert.equal(s.vivants[e.vague], vivants);
  assert.ok(s.evenements.some((v) => v.type === 'aTerre' && v.id === e.id));
  assert.ok(!s.evenements.some((v) => v.type === 'mort'));
});

test('sortie : le monstre coûte ses vies et disparaît ; la vague suivante attend la fin de la précédente', () => {
  const s = partieSur({});
  const e = premierMonstre(s);
  assert.equal(peutAppeler(s), false);
  const vies = s.vies;
  e.d = s.carte.sol.longueur;
  avancer(s);
  assert.ok(!s.ennemis.includes(e));
  assert.equal(s.vies, vies - ENNEMIS.gob.vies);
  assert.equal(s.compte, null, 'pas de compte à rebours tant que des monstres restent');
  finirVague(s);
  assert.equal(s.compte, s.compteVague);
  assert.equal(peutAppeler(s), true);
  assert.ok(appelerVague(s).ok);
  assert.equal(s.vague, 2);
});

test('gagner à 100 vies, perdre à 0', () => {
  const s = partieSur({});
  const e = premierMonstre(s);
  s.vies = LABYRINTHE.objectif - 1;
  blesser(s, e, 1e6, 'magique', null);
  assert.equal(s.fin, 'victoire');
  const t = partieSur({});
  const f = premierMonstre(t);
  t.vies = 1;
  f.d = t.carte.sol.longueur;
  avancer(t);
  assert.equal(t.fin, 'defaite');
});

test('zones des monstres : boue, sentier, ronces, source ; les volants les ignorent', () => {
  const lab = { zones: [{ sorte: 'boue', c: 5, r: 5 }, { sorte: 'sentier', c: 8, r: 5 }, { sorte: 'ronces', c: 11, r: 5 }, { sorte: 'source', c: 14, r: 5 }] };
  const pas = (c, prep = () => {}) => {
    const s = partieSur(lab);
    const e = premierMonstre(s);
    e.d = c * T;
    const p = positionSur(s.carte.sol, e.d);
    e.x = p.x; e.y = p.y;
    prep(e);
    const d0 = e.d, pv0 = e.pv;
    avancer(s);
    return { dd: e.d - d0, dpv: e.pv - pv0, e };
  };
  const base = ENNEMIS.gob.vitesse * DT;
  assert.ok(Math.abs(pas(3).dd - base) < 1e-9);
  assert.ok(Math.abs(pas(5).dd - base * 0.6) < 1e-9, 'boue');
  assert.ok(Math.abs(pas(8).dd - base * 1.3) < 1e-9, 'sentier');
  const ronces = pas(11);
  assert.ok(Math.abs(ronces.dpv + 0.05 * ronces.e.pvMax * DT) < 1e-9, 'ronces');
  const source = pas(14, (e) => { e.pv = e.pvMax / 2; });
  assert.ok(Math.abs(source.dpv - 0.1 * source.e.pvMax * DT) < 1e-9, 'source');
  // Un mur (ou une tour) sur la zone la rend inutile : le monstre ne peut plus y passer.
  const s = partieSur(lab);
  assert.ok(poserMur(s, 5, 5).ok);
  assert.ok(!s.carte.cheminCases.some(([c, r]) => c === 5 && r === 5));
});

test('zones des tours : portée, dégâts et cadence', () => {
  const s = partieSur({ zones: [{ sorte: 'promontoire', c: 5, r: 8 }, { sorte: 'forge', c: 7, r: 8 }, { sorte: 'marais', c: 9, r: 8 }] });
  s.or = 2000;
  const base = (sorte) => statsTour({ sorte, niveau: 0 });
  const sur = (sorte, c) => statsEffectives(s, poser(s, sorte, c, 8).tour);
  const a = sur('archers', 5), b = sur('mage', 7), m = sur('canon', 9), n = statsEffectives(s, poser(s, 'givre', 12, 8).tour);
  assert.ok(Math.abs(a.portee - base('archers').portee * 1.25) < 1e-9);
  assert.equal(a.degats, base('archers').degats);
  assert.ok(Math.abs(b.degats - base('mage').degats * 1.25) < 1e-9);
  assert.ok(Math.abs(m.cadence - base('canon').cadence / 0.75) < 1e-9);
  assert.equal(n.portee, base('givre').portee, 'hors zone, rien ne change');
  // Dans les autres modes, rien ne change.
  const p = nouvellePartie('prairie');
  const t = poser(p, 'archers', 5, 8).tour || poser(p, 'archers', 3, 4).tour;
  assert.deepEqual(statsEffectives(p, t), statsTour(t));
});

test('volants : ligne droite entrée, checkpoints, sortie, sans tenir compte des murs ni des téléporteurs', () => {
  const s = partieSur({ cp: [{ n: 1, c: 8, r: 2 }, { n: 2, c: 15, r: 12 }], tp: [{ forme: 'rond', a: { c: 3, r: 5 }, b: { c: 20, r: 1 } }] });
  const vol = s.carte.vols[0];
  assert.equal(vol.points.length, 4);
  assert.ok(vol.points.every((p) => !p.saut));
  const droit = [[0, 5], [8, 2], [15, 12], [23, 5]].map(([c, r]) => ({ x: centre(c), y: centre(r) }));
  assert.deepEqual(vol.points.map(({ x, y }) => ({ x, y })), droit);
  const avant = vol.longueur;
  for (let r = 0; r < ROWS - 1; r++) assert.ok(poserMur(s, 11, r).ok);
  assert.equal(s.carte.vols[0].longueur, avant);
});
