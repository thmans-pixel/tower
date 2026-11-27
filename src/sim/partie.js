// Déroulement d'une partie : vagues, déplacements, tirs, or et vies. Aucune dépendance au navigateur.
// L'affichage et le son lisent l'état et vident `etat.evenements` ; ils ne le modifient jamais directement :
// toute action du joueur passe par les commandes exportées (poser, ameliorer, vendre, cibler, appelerVague).
import { T, DT, COMPTE_VAGUE, BONUS_AVANCE, REVENTE, ECART_GROUPES, COMPENSATION_OR, PRIME_TOUR } from './const.js';
import { CARTES } from '../data/cartes.js';
import { TOURS, statsTour, prixDirect } from '../data/tours.js';
import { ENNEMIS, multPV, VOIENT_INVISIBLE } from '../data/ennemis.js';
import { POUVOIRS } from '../data/pouvoirs.js';
import { DIFFICULTES, estPrestige } from '../data/difficultes.js';
import { genererVague } from '../data/vagues.js';
import { LABYRINTHE } from '../data/labyrinthe.js';
import { construireCarte, positionSur, centre, LIBRE, CHEMIN } from './carte.js';
import { genererLabyrinthe, carteLabyrinthe, majChemin, cheminLabyrinthe, passageAPied, trajetDeChemin, zoneMonstre, zoneTour, cle } from './labyrinthe.js';

/**
 * `options.infini` : mode infini (vagues générées sans fin, score = vagues terminées).
 * `idCarte === 'labyrinthe'` : mode labyrinthe (spec 016), terrain tiré de `options.graine`.
 */
export function nouvellePartie(idCarte = 'prairie', difficulte = 'normal', options = {}) {
  // Une carte de la campagne par son nom, ou une carte aléatoire déjà décrite (src/sim/generateur.js).
  const maze = idCarte === 'labyrinthe';
  const carteMaze = maze ? carteLabyrinthe(genererLabyrinthe(options.graine || 1)) : null;
  const def = maze ? carteMaze.def : typeof idCarte === 'object' ? idCarte : CARTES[idCarte];
  if (!def || !def.ouverte) throw new Error('Carte indisponible : ' + idCarte);
  const diff = DIFFICULTES[difficulte];
  if (!diff) throw new Error('Difficulté inconnue : ' + difficulte);
  const s = {
    difficulte, multNombre: diff.nombre || 1, multGain: diff.gain || 1, multPV: diff.pv * (maze ? LABYRINTHE.multPV : 1), pvParVague: def.pvParVague || 0, compteVague: diff.compte, multVitesse: def.vitesse || 1,
    carte: maze ? carteMaze : construireCarte(def),
    labyrinthe: maze ? { objectif: LABYRINTHE.objectif, murs: carteMaze.murs, prevus: [], popMax: carteMaze.lab.popMax, tpPris: new Set() } : null,
    or: Math.round(def.orDepart * diff.or), vies: diff.vies, viesDepart: diff.vies,
    vague: 0, nbVagues: options.infini || maze ? Infinity : def.vagues.length, infini: !!options.infini,
    temps: 0,
    tours: [], ennemis: [], projectiles: [],
    lancement: null,          // vague en train d'arriver : { vague, file: [{ sorte, a }], t }
    compte: null,             // secondes avant la vague suivante ; null avant la vague 1 ou pendant un lancement
    vivants: {},              // ennemis restants par vague
    finies: {},               // vagues entièrement lancées
    payees: {},               // vagues dont le bonus de fin a été versé
    fin: null,                // 'victoire' ou 'defaite'
    abattus: 0, orGagne: 0,
    orVague: {},              // or des monstres de chaque vague, tant que son bonus n'est pas versé
    vendues: [],              // tours vendues, gardées jusqu'à la fin des vagues où elles ont frappé
    resteOr: 0,               // fraction d'or non versée (compensation × 0,8)
    pouvoirs: { meteores: 0, renforts: 0 },   // secondes de recharge restantes
    meteores: [],             // météores en train de tomber : { x, y, t }
    renforts: [],             // groupes de soldats : { id, x, y, ds: { route: distance }, pv, pvMax, t }
    routeSuivante: 0,
    prochainId: 1,
    evenements: [],
  };
  if (maze) recalculerChemin(s);
  return s;
}

const ev = (s, type, donnees = {}) => s.evenements.push({ type, ...donnees });

// ---------------------------------------------------------------- commandes du joueur

/** Case sans rien de construit ni de prévu (sans vérifier que le passage reste ouvert). */
export function caseLibre(s, c, r) {
  if (s.carte.etat(c, r) !== LIBRE || s.tours.some((t) => t.c === c && t.r === r)) return false;
  return !s.labyrinthe || !s.labyrinthe.prevus.some((p) => p.c === c && p.r === r && p.type.startsWith('pose'));
}

/** Labyrinthe : murs et tours construits ou prévus (poses prévues comptées, ventes prévues déduites). */
/** Places qu'une tour prend dans la population du labyrinthe : une par niveau (spec 024). */
export const placesTour = (t) => t.niveau + 1;

/** Variation de population d'une pose ou d'une vente prévue. */
function placesPrevu(s, p) {
  if (p.type === 'poseMur') return 1;
  if (p.type === 'poseTour') return p.places || 1;
  if (p.type === 'venteMur') return -1;
  const t = s.tours.find((x) => x.id === p.id);
  return -(t ? placesTour(t) : 1);
}

export function populationLabyrinthe(s) {
  const l = s.labyrinthe;
  let n = l.murs.size + s.tours.reduce((a, t) => a + placesTour(t), 0);
  for (const p of l.prevus) n += placesPrevu(s, p);
  return n;
}

/** Pourquoi on ne peut pas construire en (c, r) : 'place', 'population' (labyrinthe : plafond atteint), 'bouche' (labyrinthe : plus de passage), ou null. */
export function raisonPose(s, c, r, places = 1) {
  if (!caseLibre(s, c, r)) return 'place';
  if (!s.labyrinthe) return null;
  if (populationLabyrinthe(s) + places > s.labyrinthe.popMax) return 'population';
  const b = bloquesPrevus(s);
  b.add(cle(c, r));
  return passageAPied(s.carte.lab, b) ? null : 'bouche';
}

export const peutPoser = (s, c, r, places = 1) => raisonPose(s, c, r, places) === null;

function construireTour(s, sorte, c, r, prix, variante = null) {
  const t = {
    id: s.prochainId++, sorte, niveau: variante ? 2 : 0, c, r, x: centre(c), y: centre(r),
    recharge: 0, ciblage: 'premier', degats: 0, abattus: 0, depense: prix, angle: 0, tir: 0, variante,
    degatsVague: {}, couronnes: 0,   // dégâts par vague du monstre touché ; vagues remportées (spec 017)
  };
  s.tours.push(t);
  ev(s, 'pose', { tour: t.id, x: t.x, y: t.y });
  return t;
}

/** Prix d'une tour posée directement au niveau 3 : la somme de ses trois prix (spec 024). */
export const prixEvoluee = prixDirect;

export function poser(s, sorte, c, r) {
  return poserTour(s, sorte, c, r, null);
}

/** Achat direct d'une tour de niveau 3 avec sa spécialisation (`variante` = 'a' ou 'b'), au prix de la somme des trois prix. */
export function poserEvoluee(s, sorte, c, r, variante) {
  if (variante !== 'a' && variante !== 'b') return { ok: false, raison: 'choix' };
  return poserTour(s, sorte, c, r, variante);
}

function poserTour(s, sorte, c, r, variante) {
  const d = TOURS[sorte];
  if (!d || s.fin) return { ok: false, raison: 'impossible' };
  if (s.labyrinthe && !enVague(s)) appliquerPrevus(s);
  const places = variante ? 3 : 1, prix = variante ? prixEvoluee(sorte) : d.prix;
  const raison = raisonPose(s, c, r, places);
  if (raison) return { ok: false, raison };
  if (s.or < prix) return { ok: false, raison: 'or' };
  s.or -= prix;
  if (s.labyrinthe && enVague(s)) {
    s.labyrinthe.prevus.push({ type: 'poseTour', sorte, c, r, prix, variante, places });
    ev(s, 'prevu', { x: centre(c), y: centre(r) });
    return { ok: true, prevu: true };
  }
  const t = construireTour(s, sorte, c, r, prix, variante);
  if (s.labyrinthe) recalculerChemin(s);
  return { ok: true, tour: t };
}

// ---------------------------------------------------------------- labyrinthe (spec 016)

/** Une vague est en cours : des monstres arrivent ou sont encore sur la carte. */
export const enVague = (s) => !!s.lancement || s.ennemis.length > 0;

/** Cases fermées (murs et tours construits). */
function bloquesActuels(s) {
  const b = new Set(s.labyrinthe.murs);
  for (const t of s.tours) b.add(cle(t.c, t.r));
  return b;
}

/** Cases fermées une fois tout ce qui est prévu appliqué. */
function bloquesPrevus(s) {
  const b = bloquesActuels(s);
  for (const p of s.labyrinthe.prevus) {
    if (p.type === 'poseMur' || p.type === 'poseTour') b.add(cle(p.c, p.r));
    else b.delete(cle(p.c, p.r));
  }
  return b;
}

/**
 * Trajet au sol une fois tout ce qui est prévu appliqué, et la case (c, r) fermée si elle est donnée (aperçu d'une
 * pose). Renvoie null si le passage serait bouché.
 */
export function trajetPrevu(s, c = null, r = null) {
  const b = bloquesPrevus(s);
  if (c !== null) b.add(cle(c, r));
  const chemin = cheminLabyrinthe(s.carte.lab, b);
  return chemin ? trajetDeChemin(chemin) : null;
}

function recalculerChemin(s) {
  return majChemin(s.carte, bloquesActuels(s));
}

/** Construit d'un coup ce qui était prévu pendant la vague (ventes d'abord, puis poses). */
/**
 * Fin de vague (spec 019) : les paires de téléporteurs qu'un monstre a franchies pendant la vague sont usées pour de bon ;
 * le trajet est recalculé sans elles. Jamais en pleine vague : le trajet ne change pas sous les pieds des monstres.
 */
function usureTp(s) {
  const l = s.labyrinthe;
  if (!l || !l.tpPris.size) return;
  const lab = s.carte.lab;
  for (const i of l.tpPris) {
    const t = lab.tp[i];
    t.use = true;
    ev(s, 'tpUse', { x: centre(t.a.c), y: centre(t.a.r), x2: centre(t.b.c), y2: centre(t.b.r) });
  }
  l.tpPris.clear();
  recalculerChemin(s);
}

export function appliquerPrevus(s) {
  const l = s.labyrinthe;
  usureTp(s);
  if (!l || !l.prevus.length) return;
  const liste = l.prevus;
  l.prevus = [];
  for (const p of liste) {
    if (p.type === 'venteTour') {
      const i = s.tours.findIndex((t) => t.id === p.id);
      if (i < 0) continue;
      const t = s.tours[i], gain = prixRevente(t);
      s.or += gain;
      s.tours.splice(i, 1);
      s.vendues.push(t);
      ev(s, 'vente', { x: t.x, y: t.y, or: gain });
    } else if (p.type === 'venteMur') {
      l.murs.delete(cle(p.c, p.r));
      s.or += LABYRINTHE.prixMur;
      ev(s, 'venteMur', { x: centre(p.c), y: centre(p.r), or: LABYRINTHE.prixMur });
    }
  }
  for (const p of liste) {
    if (p.type === 'poseMur') { l.murs.add(cle(p.c, p.r)); ev(s, 'poseMur', { x: centre(p.c), y: centre(p.r) }); }
    else if (p.type === 'poseTour') construireTour(s, p.sorte, p.c, p.r, p.prix, p.variante || null);
  }
  recalculerChemin(s);
  ev(s, 'prevusAppliques', { n: liste.length });
}

/** Construit un mur (labyrinthe seulement). Pendant une vague, le mur est seulement prévu. */
export function poserMur(s, c, r) {
  if (!s.labyrinthe || s.fin) return { ok: false, raison: 'impossible' };
  if (!enVague(s)) appliquerPrevus(s);
  const raison = raisonPose(s, c, r);
  if (raison) return { ok: false, raison };
  if (s.or < LABYRINTHE.prixMur) return { ok: false, raison: 'or' };
  s.or -= LABYRINTHE.prixMur;
  if (enVague(s)) {
    s.labyrinthe.prevus.push({ type: 'poseMur', c, r, prix: LABYRINTHE.prixMur });
    ev(s, 'prevu', { x: centre(c), y: centre(r) });
    return { ok: true, prevu: true };
  }
  s.labyrinthe.murs.add(cle(c, r));
  ev(s, 'poseMur', { x: centre(c), y: centre(r) });
  recalculerChemin(s);
  return { ok: true };
}

/** Vend un mur : rend tout son prix (à la fin de la vague si l'on est en pleine vague). */
export function vendreMur(s, c, r) {
  const l = s.labyrinthe;
  if (!l || s.fin || !l.murs.has(cle(c, r))) return { ok: false, raison: 'impossible' };
  if (!enVague(s)) appliquerPrevus(s);
  if (l.prevus.some((p) => p.type === 'venteMur' && p.c === c && p.r === r)) return { ok: false, raison: 'deja' };
  if (enVague(s)) {
    l.prevus.push({ type: 'venteMur', c, r });
    ev(s, 'prevu', { x: centre(c), y: centre(r) });
    return { ok: true, prevu: true, or: LABYRINTHE.prixMur };
  }
  l.murs.delete(cle(c, r));
  s.or += LABYRINTHE.prixMur;
  ev(s, 'venteMur', { x: centre(c), y: centre(r), or: LABYRINTHE.prixMur });
  recalculerChemin(s);
  return { ok: true, or: LABYRINTHE.prixMur };
}

/** Annule ce qui était prévu en (c, r) : rend l'or d'une pose, garde ce qu'on voulait vendre. */
export function annulerPrevu(s, c, r) {
  const l = s.labyrinthe;
  const i = l ? l.prevus.findIndex((p) => p.c === c && p.r === r) : -1;
  if (i < 0) return { ok: false, raison: 'impossible' };
  const p = l.prevus[i];
  if (p.type === 'venteMur' || p.type === 'venteTour') {
    // Garder ce qu'on voulait vendre referme la case : il faut qu'un passage reste, et une place dans la population.
    const rendue = p.type === 'venteTour' ? placesPrevu(s, p) : -1;   // places qu'on reprend en gardant la tour
    if (populationLabyrinthe(s) - rendue > l.popMax) return { ok: false, raison: 'population' };
    const b = bloquesPrevus(s);
    b.add(cle(c, r));
    if (!passageAPied(s.carte.lab, b)) return { ok: false, raison: 'bouche' };
    const t = p.type === 'venteTour' && s.tours.find((x) => x.id === p.id);
    if (t) t.aRetirer = false;
  } else {
    s.or += p.prix;
  }
  l.prevus.splice(i, 1);
  return { ok: true };
}

/** Prix du niveau suivant ; le niveau ultime (spec 023) n'existe qu'en prestige, donc faut-il passer la partie `s`. */
export function prixAmelioration(t, s = null) {
  const d = TOURS[t.sorte];
  if (t.niveau === d.ameliorations.length) return s && estPrestige(s.difficulte) ? d.prixUltime : null;
  return t.niveau < d.ameliorations.length ? d.ameliorations[t.niveau] : null;
}

/** Au niveau 2, l'amélioration demande le choix d'une spécialisation : `variante` = 'a' ou 'b'. */
export function ameliorer(s, id, variante) {
  const t = s.tours.find((x) => x.id === id);
  if (!t || s.fin || t.aRetirer) return { ok: false, raison: 'impossible' };   // (aRetirer : vente prévue)
  const prix = prixAmelioration(t, s);
  if (prix === null) return { ok: false, raison: 'max' };
  if (t.niveau === 1 && variante !== 'a' && variante !== 'b') return { ok: false, raison: 'choix' };
  if (s.labyrinthe && populationLabyrinthe(s) + 1 > s.labyrinthe.popMax) return { ok: false, raison: 'population' };   // spec 024 : chaque niveau prend une place
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
  if (s.labyrinthe && !enVague(s)) appliquerPrevus(s);
  const i = s.tours.findIndex((x) => x.id === id);
  if (i < 0 || s.fin) return { ok: false, raison: 'impossible' };
  const t = s.tours[i];
  const gain = prixRevente(t);
  if (s.labyrinthe && enVague(s)) {
    if (t.aRetirer) return { ok: false, raison: 'deja' };
    t.aRetirer = true;
    s.labyrinthe.prevus.push({ type: 'venteTour', id: t.id, c: t.c, r: t.r });
    ev(s, 'prevu', { x: t.x, y: t.y });
    return { ok: true, prevu: true, or: gain };
  }
  s.or += gain;
  s.tours.splice(i, 1);
  s.vendues.push(t);
  ev(s, 'vente', { x: t.x, y: t.y, or: gain });
  if (s.labyrinthe) recalculerChemin(s);
  return { ok: true, or: gain };
}

export function cibler(s, id, mode) {
  const t = s.tours.find((x) => x.id === id);
  if (!t || !['premier', 'dernier', 'fort', 'proche'].includes(mode)) return { ok: false };
  t.ciblage = mode;
  return { ok: true };
}

/** La vague suivante peut-elle être lancée maintenant ? */
export const peutAppeler = (s) => !s.fin && !s.lancement && s.vague < s.nbVagues && (!s.labyrinthe || s.ennemis.length === 0);

/** Bonus d'or si l'on appelle la vague suivante maintenant. */
export const bonusAppel = (s) => (s.compte !== null ? Math.ceil(s.compte) * BONUS_AVANCE : 0);

export function appelerVague(s) {
  if (!peutAppeler(s)) return { ok: false };
  appliquerPrevus(s);
  const bonus = bonusAppel(s);
  if (bonus > 0) { s.or += bonus; s.orGagne += bonus; ev(s, 'bonusAppel', { or: bonus }); }
  s.vague++;
  const file = [];
  let a = 0;
  for (const [sorte, effectif, ecart] of vagueN(s, s.vague)) {
    const nombre = effectifDe(s, sorte, effectif);
    for (let n = 0; n < nombre; n++) { file.push({ sorte, a }); a += ecart; }
    a += ECART_GROUPES - ecart;
  }
  s.lancement = { vague: s.vague, file, t: 0 };
  s.vivants[s.vague] = 0;
  s.compte = null;
  ev(s, 'vague', { vague: s.vague });
  return { ok: true, bonus };
}

/** Effectif d'un groupe selon la difficulté (prestiges : plus de monstres ; un boss reste seul). */
const effectifDe = (s, sorte, nombre) => (s.multNombre > 1 && !ENNEMIS[sorte].boss ? Math.round(nombre * s.multNombre) : nombre);

/** Groupes de la vague n : ceux de la carte, ou tirés au hasard (à graine) en mode infini. */
function vagueN(s, n) {
  if (s.labyrinthe) return genererVague(s.carte.def.graine, n, LABYRINTHE.tailleVagues);
  return s.infini ? genererVague(s.carte.def.graine, n) : s.carte.def.vagues[n - 1];
}

/** Score du mode infini : nombre de vagues entièrement repoussées (lancées, et plus aucun de leurs ennemis). */
export function scoreInfini(s) {
  let n = 0;
  while (s.payees[n + 1]) n++;
  return n;
}

/** Composition d'une vague (numérotée à partir de 1), pour l'aperçu. */
export function composition(s, n) {
  const v = vagueN(s, n);
  if (!v) return [];
  const tot = {};
  for (const [sorte, nombre] of v) tot[sorte] = (tot[sorte] || 0) + effectifDe(s, sorte, nombre);
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
  if (s.retards && s.retards.length) {   // seconds obus du Pilonnage
    const parId = new Map(s.ennemis.map((e) => [e.id, e]));
    for (let i = s.retards.length - 1; i >= 0; i--) {
      if ((s.retards[i].t -= dt) > 0) continue;
      const [r] = s.retards.splice(i, 1);
      impact(s, r.p, null, parId);
    }
  }
}

function lancer(s, dt) {
  if (s.lancement) {
    const l = s.lancement;
    l.t += dt;
    while (l.file.length && l.file[0].a <= l.t) apparaitre(s, l.file.shift().sorte, l.vague);
    if (!l.file.length) {
      s.finies[l.vague] = true;
      s.lancement = null;
      // Labyrinthe : la pause ne commence que quand tous les monstres de la vague sont sortis.
      if (!s.labyrinthe && s.vague < s.nbVagues) s.compte = s.compteVague;
    }
  } else if (s.labyrinthe && s.compte === null) {
    if (s.vague > 0 && s.ennemis.length === 0) { appliquerPrevus(s); s.compte = s.compteVague; }
  } else if (s.compte !== null) {
    s.compte -= dt;
    if (s.compte <= 0) { s.compte = 0; appelerVague(s); }
  }
}

/** Trajet suivi par un ennemi (au sol ou en vol, sur la route qui lui a été donnée). */
export const trajetDe = (s, e) => (e.vol ? s.carte.vols : s.carte.sols)[e.route || 0];

function apparaitre(s, sorte, vague, distance = 0, route = null) {
  const d = ENNEMIS[sorte];
  const m = multPV(vague) * s.multPV * (1 + s.pvParVague * (vague - 1));
  // Sur une carte à plusieurs entrées, les ennemis partent de chacune à tour de rôle.
  if (route === null) { route = s.routeSuivante % s.carte.sols.length; s.routeSuivante++; }
  const tr = (d.vol ? s.carte.vols : s.carte.sols)[route];
  const p = positionSur(tr, distance);
  const e = {
    id: s.prochainId++, sorte, vague, route, pv: d.pv * m, pvMax: d.pv * m, mult: m,
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
    if (e.fragile && (e.fragile.t -= dt) <= 0) e.fragile = null;
    if (e.rage > 0) e.rage -= dt;
    const zone = s.labyrinthe && !e.vol ? zoneMonstre(s.carte, e) : null;
    const v = e.gel > 0 ? 0 : d.vitesse * s.multVitesse * (1 - e.ralFacteur) * (e.rage > 0 ? 1 + e.rageBonus : 1) * (zone && zone.vitesse ? zone.vitesse : 1);
    // Renforts : un ennemi au sol s'arrête devant les soldats (sauf le boss, qui les écrase).
    e.bloque = null;
    if (!e.vol) for (const g of s.renforts) {
      const gd = g.ds[e.route || 0];
      if (gd === undefined || e.d > gd || e.d + v * dt < gd - 16) continue;
      if (d.boss) { g.pv = 0; ev(s, 'ecrases', { x: g.x, y: g.y }); continue; }
      e.bloque = g.id;
      break;
    }
    const avance = e.bloque ? Math.max(0, Math.min(v * dt, s.renforts.find((g) => g.id === e.bloque).ds[e.route || 0] - 16 - e.d)) : v * dt;
    const avant = e.d;
    e.d += avance;
    e.pas += avance;
    const tr = trajetDe(s, e);
    if (s.labyrinthe && !e.vol) noterSauts(s, tr, avant, e.d);
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
    if (zone && zone.soin) e.pv = Math.min(e.pvMax, e.pv + zone.soin * e.pvMax * dt);
    if (zone && zone.degats) blesser(s, e, zone.degats * e.pvMax * dt, 'magique', null, 0, true);
  }
}

/** Labyrinthe : note les téléporteurs franchis entre les distances `d0` et `d1` du trajet (ils s'useront à la fin de la vague). */
function noterSauts(s, tr, d0, d1) {
  for (const sg of tr.segs) {
    if (!sg.saut || sg.debut < d0 || sg.debut >= d1) continue;
    const i = s.carte.lab.tp.findIndex((t) => centre(t.b.c) === sg.b.x && centre(t.b.r) === sg.b.y);
    if (i >= 0) s.labyrinthe.tpPris.add(i);
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
  const surChemin = s.labyrinthe ? s.carte.cheminCases.some(([i, j]) => i === c && j === r) : s.carte.etat(c, r) === CHEMIN;
  if (!surChemin) return { ok: false, raison: 'place' };
  const p = POUVOIRS.renforts;
  // Distance des soldats sur chaque route qui passe par cette case (deux routes sur un tronçon commun).
  const ds = {};
  let pos = null;
  s.carte.sols.forEach((tr, k) => {
    const { d, ecart } = distanceSurTrajet(tr, centre(c), centre(r));
    if (ecart < 6) { ds[k] = d; pos = pos || positionSur(tr, d); }
  });
  if (!pos) return { ok: false, raison: 'place' };
  s.pouvoirs.renforts = p.recharge;
  const g = { id: s.prochainId++, x: pos.x, y: pos.y, ds, pv: p.pv * p.soldats, pvMax: p.pv * p.soldats, t: p.duree, coup: 0 };
  s.renforts.push(g);
  ev(s, 'renforts', { x: g.x, y: g.y });
  return { ok: true, groupe: g };
}

/** Distance le long du trajet du point le plus proche de (x, y). */
function distanceSurTrajet(tr, x, y) {
  let best = 0, dmin = Infinity;
  for (const sg of tr.segs) {
    if (sg.saut) continue;
    const ux = (sg.b.x - sg.a.x) / sg.l, uy = (sg.b.y - sg.a.y) / sg.l;
    const t = Math.max(0, Math.min(sg.l, (x - sg.a.x) * ux + (y - sg.a.y) * uy));
    const px = sg.a.x + ux * t, py = sg.a.y + uy * t;
    const dd = Math.hypot(px - x, py - y);
    if (dd < dmin) { dmin = dd; best = sg.debut + t; }
  }
  return { d: best, ecart: dmin };
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
    if (bloques.length && soldats > 0) { g.coup = 0.2; blesser(s, bloques[0], pr.dps * soldats * dt, 'physique', null, 0, true); }
    else if (g.coup > 0) g.coup -= dt;
    if (g.t <= 0 || g.pv <= 0) {
      s.renforts.splice(i, 1);
      for (const e of s.ennemis) if (e.bloque === g.id) e.bloque = null;
      ev(s, 'finRenforts', { x: g.x, y: g.y, tombes: g.pv <= 0 });
    }
  }
}

/** Avancement d'un ennemi sur son trajet, de 0 à 1 (sert aux ciblages premier et dernier). */
const avance = (s, e) => e.d / trajetDe(s, e).longueur;

/** Caractéristiques d'une tour, avec l'effet de la zone sur laquelle elle est construite (labyrinthe). */
export function statsEffectives(s, t) {
  const n = statsTour(t);
  const z = s.labyrinthe ? zoneTour(s.carte, t) : null;
  if (!z) return n;
  const r = { ...n };
  if (z.portee) r.portee = n.portee * z.portee;
  if (z.degats) {
    r.degats = n.degats * z.degats;
    if (n.brulure) r.brulure = { ...n.brulure, dps: n.brulure.dps * z.degats };
  }
  if (z.cadence) r.cadence = n.cadence / z.cadence;
  return r;
}

export function choisirCible(s, t) {
  const n = statsEffectives(s, t);
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
    const n = statsEffectives(s, t);
    if (n.aura) { auraTour(s, t, n); continue; }
    const cible = choisirCible(s, t);
    if (!cible) continue;
    t.recharge = n.cadence;
    t.tir = 0.15;
    t.angle = Math.atan2(cible.y - t.y, cible.x - t.x);
    if (n.chaine) { eclair(s, t, n, cible); continue; }
    const depart = { x: t.x, y: t.y - T * 0.55 };
    const salve = n.salve || 1;
    let degats = n.degats;
    if (n.critique) { t.tirs = (t.tirs || 0) + 1; if (t.tirs % n.critique.tous === 0) degats *= n.critique.facteur; }
    for (let k = 0; k < salve; k++) {
      const dec = (k - (salve - 1) / 2) * 7;          // carreaux d'une salve légèrement décalés
      const x = depart.x + Math.sin(t.angle) * dec, y = depart.y - Math.cos(t.angle) * dec;
      s.projectiles.push({
        sorte: t.sorte, variante: t.variante, x, y, x0: x, y0: y, cible: cible.id, tx: cible.x, ty: cible.y,
        vitesse: n.brulure && n.zone ? 400 : VITESSE_PROJ[t.sorte], degats, degat: n.degat,
        zone: n.zone || 0, ralenti: n.ralenti || 0, duree: n.duree || 0, gel: n.gel || 0, brulure: n.brulure || null,
        perce: n.perce || 0, rebond: n.rebond || null, transperce: n.transperce || 0, volants: n.volants, tour: t.id,
        gelBoss: n.gelBoss || 0, gelZone: n.gelZone || 0, second: n.second || 0, execute: n.execute || 0,
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
    if (n.fragilise) e.fragile = { part: n.fragilise, t: n.duree + 0.3 };
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
    if (n.etourdit) geler(e, n.etourdit, 0.5, n.etourdirBoss || 0);
    if (n.ralenti) ralentir(e, n.ralenti, n.duree);
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
export function geler(e, duree, ralentiBoss = 0.5, arretBoss = 0) {
  if (ENNEMIS[e.sorte].boss) {
    ralentir(e, ralentiBoss, duree);
    if (arretBoss) e.gel = Math.max(e.gel, arretBoss);   // ultimes : le boss s'arrête un instant
  } else e.gel = Math.max(e.gel, duree);
}

function bruler(s, dt) {
  for (const e of [...s.ennemis]) {
    if (!e.brule) continue;
    e.brule.t -= dt;
    const tour = s.tours.find((t) => t.id === e.brule.tour);
    const dps = e.brule.dps, b = e.brule;
    if (b.propage) {   // Dragon : toutes les 0,5 s la flamme gagne les voisins qui ne brûlent pas
      b.prop = (b.prop || 0) + dt;
      if (b.prop >= 0.5) {
        b.prop = 0;
        for (const v of s.ennemis) {
          if (v === e || v.brule || (v.vol && !e.vol) || Math.hypot(v.x - e.x, v.y - e.y) > b.propage) continue;
          v.brule = { dps: b.dps, t: 2, tour: b.tour, propage: b.propage };
        }
      }
    }
    blesser(s, e, dps * dt, 'magique', tour, 0, true);
    if (b.t <= 0 && e.brule === b) e.brule = null;
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
    if (p.gel) geler(e, p.gel, p.gelBoss || 0.5);
    if (p.brulure) e.brule = { dps: p.brulure.dps, t: p.brulure.duree, tour: p.tour, propage: p.brulure.propage || 0, explose: p.brulure.explose || null };
  };
  if (p.zone) {
    ev(s, 'explosion', { x: p.tx, y: p.ty, rayon: p.zone, feu: !!p.brulure, sorte: p.sorte });
    for (const e of [...s.ennemis]) {
      if ((e.vol && !p.volants) || Math.hypot(e.x - p.tx, e.y - p.ty) > p.zone) continue;
      effets(e);
      blesser(s, e, p.degats, p.degat, tour, p.perce);
    }
    if (p.second && !p.deuxieme) (s.retards ??= []).push({ t: p.second, p: { ...p, deuxieme: true } });   // Pilonnage
    return;
  }
  if (!cible || !parId.has(cible.id) || cible.pv <= 0) return;
  ev(s, 'touche', { sorte: p.sorte, x: cible.x, y: cible.y, gel: !!p.gel });
  effets(cible);
  const { x: cx, y: cy } = cible;
  if (p.gelZone) for (const e of s.ennemis) if (e !== cible && !(e.vol && !p.volants) && Math.hypot(e.x - cx, e.y - cy) <= p.gelZone) geler(e, p.gel, p.gelBoss || 0.5);
  if (p.execute && !ENNEMIS[cible.sorte].boss && cible.pv <= p.execute * cible.pvMax) blesser(s, cible, cible.pv * 10, 'magique', tour);   // Lance de titan
  else blesser(s, cible, p.degats, p.degat, tour, p.perce);
  if (p.rebond) {
    // Chaque rebond part du dernier ennemi touché ; Foudre sacrée en enchaîne plusieurs (`nombre`).
    const touches = [cible];
    let cour = { x: cx, y: cy }, degats = p.degats;
    for (let k = 0; k < (p.rebond.nombre || 1); k++) {
      let best = null, dmin = p.rebond.portee;
      for (const e of s.ennemis) {
        if (touches.includes(e) || (e.vol && !p.volants)) continue;
        const d = Math.hypot(e.x - cour.x, e.y - cour.y);
        if (d <= dmin) { dmin = d; best = e; }
      }
      if (!best) break;
      degats *= p.rebond.facteur;
      ev(s, 'eclair', { points: [{ x: cour.x, y: cour.y - 8 }, { x: best.x, y: best.y - 8 }], sorte: p.sorte });
      blesser(s, best, degats, p.degat, tour, p.perce);
      touches.push(best);
      cour = { x: best.x, y: best.y };
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
/** `continu` : dégâts par seconde (brûlure, soldats), sans événement « blesse » à chaque pas. */
export function blesser(s, e, degats, type, tour, perce = 0, continu = false) {
  if (e.pv <= 0) return;
  const armure = type === 'physique' ? ENNEMIS[e.sorte].armure * (1 - perce) : 0;
  const reel = degats * (1 - armure) * (e.fragile ? 1 + e.fragile.part : 1);
  if (!continu) ev(s, 'blesse', { id: e.id, x: e.x, y: e.y, vol: e.vol, armure: armure >= 0.2 });
  const avant = e.pv;
  e.pv -= reel;
  if (tour) { const d = Math.min(reel, avant); tour.degats += d; (tour.degatsVague ??= {})[e.vague] = (tour.degatsVague[e.vague] || 0) + d; }
  if (e.pv > 0) return;
  if (e.brule && e.brule.explose) {   // Météore : un ennemi qui meurt en brûlant blesse ses voisins
    const { rayon, degats: dg } = e.brule.explose, tb = s.tours.find((t) => t.id === e.brule.tour);
    e.brule = null;
    ev(s, 'explosion', { x: e.x, y: e.y, rayon, feu: true, sorte: 'mage' });
    for (const v of [...s.ennemis]) if (v !== e && Math.hypot(v.x - e.x, v.y - e.y) <= rayon) blesser(s, v, dg, 'magique', tb);
  }
  if (s.labyrinthe) { metAterre(s, e, tour); return; }
  const i = s.ennemis.indexOf(e);
  if (i >= 0) s.ennemis.splice(i, 1);
  s.vivants[e.vague]--;
  const gain = orCompense(s, ENNEMIS[e.sorte].or);
  s.or += gain; s.orGagne += gain; s.orVague[e.vague] = (s.orVague[e.vague] || 0) + gain;
  s.abattus++;
  if (tour) tour.abattus++;
  ev(s, 'mort', { id: e.id, sorte: e.sorte, x: e.x, y: e.y, dx: e.dx, dy: e.dy, or: gain, vol: e.vol, boss: !!ENNEMIS[e.sorte].boss });
  const div = ENNEMIS[e.sorte].division;
  if (div) for (let k = 0; k < div.nombre; k++) apparaitre(s, div.sorte, e.vague, Math.max(0, e.d + (k - (div.nombre - 1) / 2) * 14), e.route);
}

/**
 * Labyrinthe : un monstre dont les PV tombent à zéro n'est pas retiré. Il rapporte une vie et la moitié de son or,
 * puis repart de là où il est avec tous ses PV.
 */
function metAterre(s, e, tour) {
  const d = ENNEMIS[e.sorte];
  e.pvMax *= 1 + LABYRINTHE.renfort;   // il revient plus fort : les gains d'une vague plafonnent
  e.aTerre = (e.aTerre || 0) + 1;
  e.pv = e.pvMax;
  e.brule = null;
  const gain = orCompense(s, Math.ceil(d.or * LABYRINTHE.partOr));
  s.or += gain; s.orGagne += gain; s.orVague[e.vague] = (s.orVague[e.vague] || 0) + gain;
  s.abattus++;
  if (tour) tour.abattus++;
  s.vies++;
  ev(s, 'aTerre', { id: e.id, sorte: e.sorte, x: e.x, y: e.y, or: gain, vol: e.vol, boss: !!d.boss });
  if (s.vies >= s.labyrinthe.objectif && !s.fin) { s.fin = 'victoire'; ev(s, 'victoire'); }
}

/** Or des monstres et bonus de fin de vague, × 0,8 : compense la prime de la meilleure tour (0,8 × 1,25 = 1). Les restes s'additionnent. */
function orCompense(s, base) {
  const total = base * COMPENSATION_OR * s.multGain + s.resteOr;   // `multGain` : or des monstres et bonus de fin, plus généreux en prestige (spec 023)
  const gain = Math.floor(total + 1e-9);
  s.resteOr = total - gain;
  return gain;
}

/** Nom d'une tour : celui de sa spécialisation au niveau 3. */
export const nomTour = (t) => (t.niveau === 3 ? TOURS[t.sorte].ultimes[t.variante].nom : t.niveau === 2 && t.variante ? TOURS[t.sorte].specialisations[t.variante].nom : TOURS[t.sorte].nom);

/** Tours classées par dégâts totaux (la plus ancienne devant en cas d'égalité) : pour l'écran. */
export function classement(s) {
  return [...s.tours]
    .sort((a, b) => b.degats - a.degats || a.id - b.id)
    .map((t, i) => ({ rang: i + 1, id: t.id, sorte: t.sorte, niveau: t.niveau, variante: t.variante, degats: t.degats, couronnes: t.couronnes, nom: nomTour(t) }));
}

/** La tour qui a fait le plus de dégâts aux monstres de la vague v (vendues comprises), ou null. */
function tourDeLaVague(s, v) {
  let meilleure = null;
  for (const t of [...s.tours, ...s.vendues]) {
    const d = (t.degatsVague || {})[v] || 0;
    if (d > 0 && (!meilleure || d > (meilleure.degatsVague[v] || 0) || (d === (meilleure.degatsVague[v] || 0) && t.id < meilleure.id))) meilleure = t;
  }
  return meilleure;
}

function bilanVagues(s) {
  for (let v = 1; v <= s.vague; v++) {
    if (s.payees[v] || !s.finies[v] || s.vivants[v] > 0) continue;
    s.payees[v] = true;
    const bonus = orCompense(s, 15 + 4 * v);
    s.or += bonus; s.orGagne += bonus;
    ev(s, 'finVague', { vague: v, or: bonus });
    const meilleure = tourDeLaVague(s, v);
    if (meilleure) {
      const prime = Math.ceil(((s.orVague[v] || 0) + bonus) * PRIME_TOUR);
      meilleure.couronnes++;
      s.or += prime; s.orGagne += prime;
      ev(s, 'tourDeLaVague', { tour: meilleure.id, sorte: meilleure.sorte, niveau: meilleure.niveau, nom: nomTour(meilleure), x: meilleure.x, y: meilleure.y, vague: v, or: prime });
    }
    delete s.orVague[v];
    for (const t of [...s.tours, ...s.vendues]) if (t.degatsVague) delete t.degatsVague[v];
    s.vendues = s.vendues.filter((t) => Object.keys(t.degatsVague || {}).length > 0);
  }
  if (s.vague === s.nbVagues && s.finies[s.vague] && s.ennemis.length === 0) {
    s.fin = 'victoire';
    ev(s, 'victoire');
  }
}
