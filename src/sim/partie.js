// Déroulement d'une partie : vagues, déplacements, tirs, or et vies. Aucune dépendance au navigateur.
// L'affichage et le son lisent l'état et vident `etat.evenements` ; ils ne le modifient jamais directement :
// toute action du joueur passe par les commandes exportées (poser, ameliorer, vendre, cibler, appelerVague).
import { T, DT, COMPTE_VAGUE, BONUS_AVANCE, REVENTE, ECART_GROUPES } from './const.js';
import { CARTES } from '../data/cartes.js';
import { TOURS, statsTour } from '../data/tours.js';
import { ENNEMIS, multPV, VOIENT_INVISIBLE } from '../data/ennemis.js';
import { POUVOIRS } from '../data/pouvoirs.js';
import { construireCarte, positionSur, centre, LIBRE, CHEMIN } from './carte.js';

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
    pouvoirs: { meteores: 0, renforts: 0 },   // secondes de recharge restantes
    meteores: [],             // météores en train de tomber : { x, y, t }
    renforts: [],             // groupes de soldats : { id, x, y, d, pv, pvMax, t }
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
    recharge: 0, ciblage: 'premier', degats: 0, abattus: 0, depense: d.prix, angle: 0, tir: 0, variante: null,
  };
  s.tours.push(t);
  ev(s, 'pose', { tour: t.id, x: t.x, y: t.y });
  return { ok: true, tour: t };
}

export function prixAmelioration(t) {
  const d = TOURS[t.sorte];
  return t.niveau < d.ameliorations.length ? d.ameliorations[t.niveau] : null;
}

/** Au niveau 2, l'amélioration demande le choix d'une spécialisation : `variante` = 'a' ou 'b'. */
export function ameliorer(s, id, variante) {
  const t = s.tours.find((x) => x.id === id);
  if (!t || s.fin) return { ok: false, raison: 'impossible' };
  const prix = prixAmelioration(t);
  if (prix === null) return { ok: false, raison: 'max' };
  if (t.niveau === 1 && variante !== 'a' && variante !== 'b') return { ok: false, raison: 'choix' };
  if (s.or < prix) return { ok: false, raison: 'or' };
  s.or -= prix;
  if (t.niveau === 1) t.variante = variante;
  t.niveau++;
  t.depense += prix;
  ev(s, 'amelioration', { tour: t.id, x: t.x, y: t.y, niveau: t.niveau, variante: t.variante });
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
  pouvoirsEnnemis(s, dt);
  pouvoirsJoueur(s, dt);
  combattre(s, dt);
  bilanVagues(s);
}

/** Brûlures, tirs et projectiles, sans déplacement des ennemis (utilisé seul par les tests des tours). */
export function combattre(s, dt = DT) {
  bruler(s, dt);
  tirer(s, dt);
  voler(s, dt);
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

function apparaitre(s, sorte, vague, distance = 0) {
  const d = ENNEMIS[sorte];
  const m = multPV(vague);
  const tr = d.vol ? s.carte.vol : s.carte.sol;
  const p = positionSur(tr, distance);
  const e = {
    id: s.prochainId++, sorte, vague, pv: d.pv * m, pvMax: d.pv * m, mult: m,
    d: distance, x: p.x, y: p.y, dx: p.dx, dy: p.dy, vol: !!d.vol,
    ralenti: 0, ralFacteur: 0, gel: 0, brule: null, soinT: d.soin ? d.soin.toutes : 0, pas: 0,
    invisible: false, invisT: d.invisible ? d.invisible.toutes - d.invisible.duree : 0,
    rage: 0, rageBonus: 0, rugitT: d.rugissement ? d.rugissement.toutes : 0, rugit: 0,
  };
  s.ennemis.push(e);
  s.vivants[vague]++;
  if (d.boss) ev(s, 'boss', { sorte, nom: d.nom });
  return e;
}

function deplacer(s, dt) {
  for (let i = s.ennemis.length - 1; i >= 0; i--) {
    const e = s.ennemis[i];
    const d = ENNEMIS[e.sorte];
    if (e.ralenti > 0) { e.ralenti -= dt; if (e.ralenti <= 0) e.ralFacteur = 0; }
    if (e.gel > 0) e.gel -= dt;
    if (e.rage > 0) e.rage -= dt;
    const v = e.gel > 0 ? 0 : d.vitesse * (1 - e.ralFacteur) * (e.rage > 0 ? 1 + e.rageBonus : 1);
    // Renforts : un ennemi au sol s'arrête devant les soldats (sauf le boss, qui les écrase).
    e.bloque = null;
    if (!e.vol) for (const g of s.renforts) {
      if (e.d > g.d || e.d + v * dt < g.d - 16) continue;
      if (d.boss) { g.pv = 0; ev(s, 'ecrases', { x: g.x, y: g.y }); continue; }
      e.bloque = g.id;
      break;
    }
    const avance = e.bloque ? Math.max(0, Math.min(v * dt, s.renforts.find((g) => g.id === e.bloque).d - 16 - e.d)) : v * dt;
    e.d += avance;
    e.pas += avance;
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

/** Invisibilité des spectres et rugissement du boss. */
function pouvoirsEnnemis(s, dt) {
  for (const e of s.ennemis) {
    const d = ENNEMIS[e.sorte];
    if (d.invisible) {
      e.invisT -= dt;
      if (e.invisT <= 0) {
        e.invisible = !e.invisible;
        e.invisT = e.invisible ? d.invisible.duree : d.invisible.toutes - d.invisible.duree;
      }
    }
    if (e.rugit > 0) e.rugit -= dt;
    if (d.rugissement) {
      e.rugitT -= dt;
      if (e.rugitT <= 0) {
        const r = d.rugissement;
        e.rugitT = r.toutes;
        e.rugit = 0.8;
        for (const o of s.ennemis) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) <= r.rayon) { o.rage = r.duree; o.rageBonus = r.bonus; }
        ev(s, 'rugissement', { x: e.x, y: e.y, rayon: r.rayon });
      }
    }
  }
}

// ---------------------------------------------------------------- pouvoirs du joueur

export const pouvoirPret = (s, nom) => !s.fin && s.pouvoirs[nom] <= 0;

/** Pluie de météores autour du point (x, y), en pixels de jeu. */
export function lancerMeteores(s, x, y) {
  if (!pouvoirPret(s, 'meteores')) return { ok: false, raison: 'recharge' };
  const p = POUVOIRS.meteores;
  s.pouvoirs.meteores = p.recharge;
  // Disposition fixe : un au centre, deux de part et d'autre (rejouable, sans hasard).
  const places = [[0, 0], [-0.75, 0.55], [0.75, 0.55]].slice(0, p.nombre);
  places.forEach(([kx, ky], i) => s.meteores.push({ x: x + kx * p.rayon, y: y + ky * p.rayon, t: p.chute + i * p.ecart, chute: p.chute }));
  ev(s, 'meteores', { x, y, meteores: s.meteores.slice(-p.nombre).map((m) => ({ x: m.x, y: m.y, t: m.t })) });
  return { ok: true };
}

/** Renforts sur une case du chemin. */
export function appelerRenforts(s, c, r) {
  if (!pouvoirPret(s, 'renforts')) return { ok: false, raison: 'recharge' };
  if (s.carte.etat(c, r) !== CHEMIN) return { ok: false, raison: 'place' };
  const p = POUVOIRS.renforts;
  const d = distanceSurTrajet(s.carte.sol, centre(c), centre(r));
  const pos = positionSur(s.carte.sol, d);
  s.pouvoirs.renforts = p.recharge;
  const g = { id: s.prochainId++, x: pos.x, y: pos.y, d, pv: p.pv * p.soldats, pvMax: p.pv * p.soldats, t: p.duree, coup: 0 };
  s.renforts.push(g);
  ev(s, 'renforts', { x: g.x, y: g.y });
  return { ok: true, groupe: g };
}

/** Distance le long du trajet du point le plus proche de (x, y). */
function distanceSurTrajet(tr, x, y) {
  let best = 0, dmin = Infinity;
  for (const sg of tr.segs) {
    const ux = (sg.b.x - sg.a.x) / sg.l, uy = (sg.b.y - sg.a.y) / sg.l;
    const t = Math.max(0, Math.min(sg.l, (x - sg.a.x) * ux + (y - sg.a.y) * uy));
    const px = sg.a.x + ux * t, py = sg.a.y + uy * t;
    const dd = Math.hypot(px - x, py - y);
    if (dd < dmin) { dmin = dd; best = sg.debut + t; }
  }
  return best;
}

function pouvoirsJoueur(s, dt) {
  for (const k of Object.keys(s.pouvoirs)) if (s.pouvoirs[k] > 0) s.pouvoirs[k] = Math.max(0, s.pouvoirs[k] - dt);
  // Météores qui touchent le sol.
  const pm = POUVOIRS.meteores;
  for (let i = s.meteores.length - 1; i >= 0; i--) {
    const m = s.meteores[i];
    m.t -= dt;
    if (m.t > 0) continue;
    s.meteores.splice(i, 1);
    ev(s, 'impactMeteore', { x: m.x, y: m.y, rayon: pm.zone });
    for (const e of [...s.ennemis]) if (Math.hypot(e.x - m.x, e.y - m.y) <= pm.zone) blesser(s, e, pm.degats, 'magique', null);
  }
  // Soldats : ils frappent un ennemi qu'ils bloquent, encaissent les coups, puis s'en vont.
  const pr = POUVOIRS.renforts;
  for (let i = s.renforts.length - 1; i >= 0; i--) {
    const g = s.renforts[i];
    g.t -= dt;
    const bloques = s.ennemis.filter((e) => e.bloque === g.id);
    g.pv -= bloques.length * pr.coupEnnemi * dt;
    const soldats = Math.ceil(g.pv / pr.pv);
    if (bloques.length && soldats > 0) { g.coup = 0.2; blesser(s, bloques[0], pr.dps * soldats * dt, 'physique', null); }
    else if (g.coup > 0) g.coup -= dt;
    if (g.t <= 0 || g.pv <= 0) {
      s.renforts.splice(i, 1);
      for (const e of s.ennemis) if (e.bloque === g.id) e.bloque = null;
      ev(s, 'finRenforts', { x: g.x, y: g.y, tombes: g.pv <= 0 });
    }
  }
}

/** Avancement d'un ennemi sur son trajet, de 0 à 1 (sert aux ciblages premier et dernier). */
const avance = (s, e) => e.d / (e.vol ? s.carte.vol.longueur : s.carte.sol.longueur);

export function choisirCible(s, t) {
  const n = statsTour(t);
  let best = null, score = -Infinity;
  for (const e of s.ennemis) {
    if (e.vol && !n.volants) continue;
    if (e.invisible && !VOIENT_INVISIBLE.includes(t.sorte)) continue;
    const dist = Math.hypot(e.x - t.x, e.y - t.y);
    if (dist > n.portee || dist < (n.porteeMin || 0)) continue;
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

const VITESSE_PROJ = { archers: 520, canon: 300, givre: 420, mage: 360, baliste: 650 };

function tirer(s, dt) {
  for (const t of s.tours) {
    t.recharge -= dt;
    if (t.tir > 0) t.tir -= dt;
    if (t.recharge > 0) continue;
    const n = statsTour(t);
    if (n.aura) { auraTour(s, t, n); continue; }
    const cible = choisirCible(s, t);
    if (!cible) continue;
    t.recharge = n.cadence;
    t.tir = 0.15;
    t.angle = Math.atan2(cible.y - t.y, cible.x - t.x);
    if (n.chaine) { eclair(s, t, n, cible); continue; }
    const depart = { x: t.x, y: t.y - T * 0.55 };
    const salve = n.salve || 1;
    for (let k = 0; k < salve; k++) {
      const dec = (k - (salve - 1) / 2) * 7;          // carreaux d'une salve légèrement décalés
      const x = depart.x + Math.sin(t.angle) * dec, y = depart.y - Math.cos(t.angle) * dec;
      s.projectiles.push({
        sorte: t.sorte, variante: t.variante, x, y, x0: x, y0: y, cible: cible.id, tx: cible.x, ty: cible.y,
        vitesse: n.brulure && n.zone ? 400 : VITESSE_PROJ[t.sorte], degats: n.degats, degat: n.degat,
        zone: n.zone || 0, ralenti: n.ralenti || 0, duree: n.duree || 0, gel: n.gel || 0, brulure: n.brulure || null,
        perce: n.perce || 0, rebond: n.rebond || null, transperce: n.transperce || 0, volants: n.volants, tour: t.id,
        parcours: 0, total: Math.hypot(cible.x - x, cible.y - y) || 1,
      });
    }
    ev(s, 'tir', { sorte: t.sorte, variante: t.variante, x: t.x, y: t.y });
  }
}

/** Blizzard : ralentit et blesse tout ce qui est à portée, sans projectile. */
function auraTour(s, t, n) {
  t.recharge = n.cadence;
  let touches = 0;
  for (const e of [...s.ennemis]) {
    if ((e.vol && !n.volants) || Math.hypot(e.x - t.x, e.y - t.y) > n.portee) continue;
    ralentir(e, n.ralenti, n.duree);
    blesser(s, e, n.degats, n.degat, t);
    touches++;
  }
  if (touches) { t.tir = 0.15; ev(s, 'aura', { x: t.x, y: t.y, rayon: n.portee }); }
}

/** Tempête : éclair instantané qui saute de proche en proche, plus faible à chaque saut. */
function eclair(s, t, n, cible) {
  const touches = [cible];
  let courant = cible;
  while (touches.length < n.chaine.nombre) {
    let best = null, dmin = n.chaine.saut;
    for (const e of s.ennemis) {
      if (touches.includes(e) || (e.vol && !n.volants)) continue;
      const d = Math.hypot(e.x - courant.x, e.y - courant.y);
      if (d <= dmin) { dmin = d; best = e; }
    }
    if (!best) break;
    touches.push(best);
    courant = best;
  }
  const points = [{ x: t.x, y: t.y - T * 0.6 }];
  let degats = n.degats;
  for (const e of touches) {
    points.push({ x: e.x, y: e.y - (e.vol ? 26 : 8) });
    if (n.etourdit) geler(e, n.etourdit);
    blesser(s, e, degats, n.degat, t);
    degats *= 1 - n.chaine.baisse;
  }
  ev(s, 'eclair', { points, sorte: t.sorte });
}

export function ralentir(e, facteur, duree) {
  if (facteur >= e.ralFacteur) e.ralFacteur = facteur;
  e.ralenti = Math.max(e.ralenti, duree);
}

/** Gel et étourdissement immobilisent ; le boss n'est que ralenti de moitié. */
export function geler(e, duree) {
  if (ENNEMIS[e.sorte].boss) ralentir(e, 0.5, duree);
  else e.gel = Math.max(e.gel, duree);
}

function bruler(s, dt) {
  for (const e of [...s.ennemis]) {
    if (!e.brule) continue;
    e.brule.t -= dt;
    const tour = s.tours.find((t) => t.id === e.brule.tour);
    const dps = e.brule.dps;
    if (e.brule.t <= 0) e.brule = null;
    blesser(s, e, dps * dt, 'magique', tour);
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
  const effets = (e) => {
    if (p.ralenti) ralentir(e, p.ralenti, p.duree);
    if (p.gel) geler(e, p.gel);
    if (p.brulure) e.brule = { dps: p.brulure.dps, t: p.brulure.duree, tour: p.tour };
  };
  if (p.zone) {
    ev(s, 'explosion', { x: p.tx, y: p.ty, rayon: p.zone, feu: !!p.brulure, sorte: p.sorte });
    for (const e of [...s.ennemis]) {
      if ((e.vol && !p.volants) || Math.hypot(e.x - p.tx, e.y - p.ty) > p.zone) continue;
      effets(e);
      blesser(s, e, p.degats, p.degat, tour, p.perce);
    }
    return;
  }
  if (!cible || !parId.has(cible.id) || cible.pv <= 0) return;
  ev(s, 'touche', { sorte: p.sorte, x: cible.x, y: cible.y, gel: !!p.gel });
  effets(cible);
  const { x: cx, y: cy } = cible;
  blesser(s, cible, p.degats, p.degat, tour, p.perce);
  if (p.rebond) {
    let best = null, dmin = p.rebond.portee;
    for (const e of s.ennemis) {
      if (e === cible || (e.vol && !p.volants)) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d <= dmin) { dmin = d; best = e; }
    }
    if (best) {
      ev(s, 'eclair', { points: [{ x: cx, y: cy - 8 }, { x: best.x, y: best.y - 8 }], sorte: p.sorte });
      blesser(s, best, p.degats * p.rebond.facteur, p.degat, tour, p.perce);
    }
  }
  if (p.transperce) {
    // Les ennemis alignés derrière la cible, dans le prolongement du tir, sont touchés aussi.
    const dx = cx - p.x0, dy = cy - p.y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    for (const e of [...s.ennemis]) {
      if (e.vol && !p.volants) continue;
      const vx = e.x - cx, vy = e.y - cy;
      const le = vx * ux + vy * uy, travers = Math.abs(vx * uy - vy * ux);
      if (le > 0 && le <= p.transperce && travers <= 14) blesser(s, e, p.degats, p.degat, tour, p.perce);
    }
    ev(s, 'transperce', { x: cx, y: cy, x2: cx + ux * p.transperce, y2: cy + uy * p.transperce });
  }
}

/** `perce` : part de l'armure ignorée (Arbalétriers). */
export function blesser(s, e, degats, type, tour, perce = 0) {
  if (e.pv <= 0) return;
  const reel = type === 'physique' ? degats * (1 - ENNEMIS[e.sorte].armure * (1 - perce)) : degats;
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
  ev(s, 'mort', { sorte: e.sorte, x: e.x, y: e.y, or: gain, vol: e.vol, boss: !!ENNEMIS[e.sorte].boss });
  const div = ENNEMIS[e.sorte].division;
  if (div) for (let k = 0; k < div.nombre; k++) apparaitre(s, div.sorte, e.vague, Math.max(0, e.d + (k - (div.nombre - 1) / 2) * 14));
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
