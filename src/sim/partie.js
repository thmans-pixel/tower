// Déroulement d'une partie : vagues, déplacements, tirs, or et vies. Aucune dépendance au navigateur.
// L'affichage et le son lisent l'état et vident `etat.evenements` ; ils ne le modifient jamais directement :
// toute action du joueur passe par les commandes exportées (poser, ameliorer, vendre, cibler, appelerVague).
import { T, DT, COMPTE_VAGUE, BONUS_AVANCE, REVENTE, ECART_GROUPES } from './const.js';
import { CARTES } from '../data/cartes.js';
import { TOURS } from '../data/tours.js';
import { ENNEMIS, multPV } from '../data/ennemis.js';
import { construireCarte, positionSur, centre, LIBRE } from './carte.js';

export function nouvellePartie(idCarte = 'prairie') {
  const def = CARTES[idCarte];
  if (!def || !def.ouverte) throw new Error('Carte indisponible : ' + idCarte);
  return {
    carte: construireCarte(def),
    or: def.orDepart, vies: def.vies, viesDepart: def.vies,
    vague: 0, nbVagues: def.vagues.length,
    temps: 0,
    tours: [], ennemis: [], projectiles: [],
    lancement: null,          // vague en train d'arriver : { vague, file: [{ sorte, a }], t }
    compte: null,             // secondes avant la vague suivante ; null avant la vague 1 ou pendant un lancement
    vivants: {},              // ennemis restants par vague
    finies: {},               // vagues entièrement lancées
    payees: {},               // vagues dont le bonus de fin a été versé
    fin: null,                // 'victoire' ou 'defaite'
    abattus: 0, orGagne: 0,
    prochainId: 1,
    evenements: [],
  };
}

const ev = (s, type, donnees = {}) => s.evenements.push({ type, ...donnees });

// ---------------------------------------------------------------- commandes du joueur

export function peutPoser(s, c, r) {
  return s.carte.etat(c, r) === LIBRE && !s.tours.some((t) => t.c === c && t.r === r);
}

export function poser(s, sorte, c, r) {
  const d = TOURS[sorte];
  if (!d || s.fin) return { ok: false, raison: 'impossible' };
  if (!peutPoser(s, c, r)) return { ok: false, raison: 'place' };
  if (s.or < d.prix) return { ok: false, raison: 'or' };
  s.or -= d.prix;
  const t = {
    id: s.prochainId++, sorte, niveau: 0, c, r, x: centre(c), y: centre(r),
    recharge: 0, ciblage: 'premier', degats: 0, abattus: 0, depense: d.prix, angle: 0, tir: 0,
  };
  s.tours.push(t);
  ev(s, 'pose', { tour: t.id, x: t.x, y: t.y });
  return { ok: true, tour: t };
}

export function prixAmelioration(t) {
  const d = TOURS[t.sorte];
  return t.niveau < d.ameliorations.length ? d.ameliorations[t.niveau] : null;
}

export function ameliorer(s, id) {
  const t = s.tours.find((x) => x.id === id);
  if (!t || s.fin) return { ok: false, raison: 'impossible' };
  const prix = prixAmelioration(t);
  if (prix === null) return { ok: false, raison: 'max' };
  if (s.or < prix) return { ok: false, raison: 'or' };
  s.or -= prix;
  t.niveau++;
  t.depense += prix;
  ev(s, 'amelioration', { tour: t.id, x: t.x, y: t.y, niveau: t.niveau });
  return { ok: true };
}

export const prixRevente = (t) => Math.floor(t.depense * REVENTE);

export function vendre(s, id) {
  const i = s.tours.findIndex((x) => x.id === id);
  if (i < 0 || s.fin) return { ok: false, raison: 'impossible' };
  const t = s.tours[i];
  const gain = prixRevente(t);
  s.or += gain;
  s.tours.splice(i, 1);
  ev(s, 'vente', { x: t.x, y: t.y, or: gain });
  return { ok: true, or: gain };
}

export function cibler(s, id, mode) {
  const t = s.tours.find((x) => x.id === id);
  if (!t || !['premier', 'dernier', 'fort', 'proche'].includes(mode)) return { ok: false };
  t.ciblage = mode;
  return { ok: true };
}

/** La vague suivante peut-elle être lancée maintenant ? */
export const peutAppeler = (s) => !s.fin && !s.lancement && s.vague < s.nbVagues;

/** Bonus d'or si l'on appelle la vague suivante maintenant. */
export const bonusAppel = (s) => (s.compte !== null ? Math.ceil(s.compte) * BONUS_AVANCE : 0);

export function appelerVague(s) {
  if (!peutAppeler(s)) return { ok: false };
  const bonus = bonusAppel(s);
  if (bonus > 0) { s.or += bonus; s.orGagne += bonus; ev(s, 'bonusAppel', { or: bonus }); }
  s.vague++;
  const file = [];
  let a = 0;
  for (const [sorte, nombre, ecart] of s.carte.def.vagues[s.vague - 1]) {
    for (let n = 0; n < nombre; n++) { file.push({ sorte, a }); a += ecart; }
    a += ECART_GROUPES - ecart;
  }
  s.lancement = { vague: s.vague, file, t: 0 };
  s.vivants[s.vague] = 0;
  s.compte = null;
  ev(s, 'vague', { vague: s.vague });
  return { ok: true, bonus };
}

/** Composition d'une vague (numérotée à partir de 1), pour l'aperçu. */
export function composition(s, n) {
  const v = s.carte.def.vagues[n - 1];
  if (!v) return [];
  const tot = {};
  for (const [sorte, nombre] of v) tot[sorte] = (tot[sorte] || 0) + nombre;
  return Object.entries(tot).map(([sorte, nombre]) => ({ sorte, nombre }));
}

// ---------------------------------------------------------------- un pas de logique

export function avancer(s, dt = DT) {
  if (s.fin) return;
  s.temps += dt;
  lancer(s, dt);
  deplacer(s, dt);
  if (s.fin) return;
  soigner(s, dt);
  tirer(s, dt);
  voler(s, dt);
  bilanVagues(s);
}

function lancer(s, dt) {
  if (s.lancement) {
    const l = s.lancement;
    l.t += dt;
    while (l.file.length && l.file[0].a <= l.t) apparaitre(s, l.file.shift().sorte, l.vague);
    if (!l.file.length) {
      s.finies[l.vague] = true;
      s.lancement = null;
      if (s.vague < s.nbVagues) s.compte = COMPTE_VAGUE;
    }
  } else if (s.compte !== null) {
    s.compte -= dt;
    if (s.compte <= 0) { s.compte = 0; appelerVague(s); }
  }
}

function apparaitre(s, sorte, vague) {
  const d = ENNEMIS[sorte];
  const m = multPV(vague);
  const tr = d.vol ? s.carte.vol : s.carte.sol;
  const p = positionSur(tr, 0);
  s.ennemis.push({
    id: s.prochainId++, sorte, vague, pv: d.pv * m, pvMax: d.pv * m, mult: m,
    d: 0, x: p.x, y: p.y, dx: p.dx, dy: p.dy, vol: !!d.vol,
    ralenti: 0, ralFacteur: 0, soinT: d.soin ? d.soin.toutes : 0, pas: 0,
  });
  s.vivants[vague]++;
}

function deplacer(s, dt) {
  for (let i = s.ennemis.length - 1; i >= 0; i--) {
    const e = s.ennemis[i];
    const d = ENNEMIS[e.sorte];
    if (e.ralenti > 0) { e.ralenti -= dt; if (e.ralenti <= 0) e.ralFacteur = 0; }
    const v = d.vitesse * (1 - e.ralFacteur);
    e.d += v * dt;
    e.pas += v * dt;
    const tr = e.vol ? s.carte.vol : s.carte.sol;
    if (e.d >= tr.longueur) {
      s.ennemis.splice(i, 1);
      s.vivants[e.vague]--;
      s.vies = Math.max(0, s.vies - d.vies);
      ev(s, 'fuite', { sorte: e.sorte, vies: d.vies });
      if (s.vies <= 0) { s.fin = 'defaite'; ev(s, 'defaite'); return; }
      continue;
    }
    const p = positionSur(tr, e.d);
    e.x = p.x; e.y = p.y; e.dx = p.dx; e.dy = p.dy;
  }
}

function soigner(s, dt) {
  for (const e of s.ennemis) {
    const soin = ENNEMIS[e.sorte].soin;
    if (!soin) continue;
    e.soinT -= dt;
    if (e.soinT > 0) continue;
    e.soinT = soin.toutes;
    let soignes = 0;
    for (const o of s.ennemis) {
      if (o === e || o.pv >= o.pvMax) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) <= soin.rayon) { o.pv = Math.min(o.pvMax, o.pv + soin.pv * e.mult); soignes++; }
    }
    ev(s, 'soin', { x: e.x, y: e.y, rayon: soin.rayon, soignes });
  }
}

/** Avancement d'un ennemi sur son trajet, de 0 à 1 (sert aux ciblages premier et dernier). */
const avance = (s, e) => e.d / (e.vol ? s.carte.vol.longueur : s.carte.sol.longueur);

export function choisirCible(s, t) {
  const d = TOURS[t.sorte];
  const n = d.niveaux[t.niveau];
  let best = null, score = -Infinity;
  for (const e of s.ennemis) {
    if (e.vol && !d.volants) continue;
    const dist = Math.hypot(e.x - t.x, e.y - t.y);
    if (dist > n.portee) continue;
    let v;
    switch (t.ciblage) {
      case 'dernier': v = -avance(s, e); break;
      case 'fort': v = e.pv; break;
      case 'proche': v = -dist; break;
      default: v = avance(s, e);
    }
    if (v > score) { score = v; best = e; }
  }
  return best;
}

const VITESSE_PROJ = { archers: 520, canon: 300, givre: 420, mage: 360 };

function tirer(s, dt) {
  for (const t of s.tours) {
    t.recharge -= dt;
    if (t.tir > 0) t.tir -= dt;
    if (t.recharge > 0) continue;
    const cible = choisirCible(s, t);
    if (!cible) continue;
    const d = TOURS[t.sorte], n = d.niveaux[t.niveau];
    t.recharge = n.cadence;
    t.tir = 0.15;
    t.angle = Math.atan2(cible.y - t.y, cible.x - t.x);
    const depart = { x: t.x, y: t.y - T * 0.55 };
    s.projectiles.push({
      sorte: t.sorte, x: depart.x, y: depart.y, cible: cible.id, tx: cible.x, ty: cible.y,
      vitesse: VITESSE_PROJ[t.sorte], degats: n.degats, degat: d.degat, zone: n.zone || 0,
      ralenti: n.ralenti || 0, duree: n.duree || 0, tour: t.id,
      parcours: 0, total: Math.hypot(cible.x - depart.x, cible.y - depart.y) || 1,
    });
    ev(s, 'tir', { sorte: t.sorte, x: t.x, y: t.y });
  }
}

function voler(s, dt) {
  const parId = new Map(s.ennemis.map((e) => [e.id, e]));
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i];
    const c = parId.get(p.cible);
    if (c) { p.tx = c.x; p.ty = c.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    const pas = p.vitesse * dt;
    if (dist <= pas + 4) {
      s.projectiles.splice(i, 1);
      impact(s, p, c, parId);
      continue;
    }
    p.x += (dx / dist) * pas;
    p.y += (dy / dist) * pas;
    p.parcours += pas;
  }
}

function impact(s, p, cible, parId) {
  const tour = s.tours.find((t) => t.id === p.tour);
  if (p.zone) {
    ev(s, 'explosion', { x: p.tx, y: p.ty, rayon: p.zone });
    for (const e of [...s.ennemis]) {
      if (e.vol || Math.hypot(e.x - p.tx, e.y - p.ty) > p.zone) continue;
      blesser(s, e, p.degats, p.degat, tour);
    }
    return;
  }
  if (!cible || !parId.has(cible.id) || cible.pv <= 0) return;
  ev(s, 'touche', { sorte: p.sorte, x: cible.x, y: cible.y });
  if (p.ralenti && p.ralenti >= cible.ralFacteur) { cible.ralFacteur = p.ralenti; cible.ralenti = Math.max(cible.ralenti, p.duree); }
  else if (p.ralenti) cible.ralenti = Math.max(cible.ralenti, p.duree);
  blesser(s, cible, p.degats, p.degat, tour);
}

export function blesser(s, e, degats, type, tour) {
  if (e.pv <= 0) return;
  const reel = type === 'physique' ? degats * (1 - ENNEMIS[e.sorte].armure) : degats;
  const avant = e.pv;
  e.pv -= reel;
  if (tour) tour.degats += Math.min(reel, avant);
  if (e.pv > 0) return;
  const i = s.ennemis.indexOf(e);
  if (i >= 0) s.ennemis.splice(i, 1);
  s.vivants[e.vague]--;
  const gain = ENNEMIS[e.sorte].or;
  s.or += gain; s.orGagne += gain;
  s.abattus++;
  if (tour) tour.abattus++;
  ev(s, 'mort', { sorte: e.sorte, x: e.x, y: e.y, or: gain, vol: e.vol });
}

function bilanVagues(s) {
  for (let v = 1; v <= s.vague; v++) {
    if (s.payees[v] || !s.finies[v] || s.vivants[v] > 0) continue;
    s.payees[v] = true;
    const bonus = 15 + 4 * v;
    s.or += bonus; s.orGagne += bonus;
    ev(s, 'finVague', { vague: v, or: bonus });
  }
  if (s.vague === s.nbVagues && s.finies[s.vague] && s.ennemis.length === 0) {
    s.fin = 'victoire';
    ev(s, 'victoire');
  }
}
