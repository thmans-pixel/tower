// Mode labyrinthe (spec 016) : génération du terrain, recherche du chemin des monstres, effets des zones.
// Logique pure, sans navigateur. Une case est repérée par la clé `r * COLS + c`.
import { T, COLS, ROWS } from './const.js';
import { hasard } from './hasard.js';
import { LABYRINTHE, ZONES, ORDRE_ZONES } from '../data/labyrinthe.js';
import { dedans, centre, trajet, LIBRE, PRIS } from './carte.js';

export const cle = (c, r) => r * COLS + c;
export const deCle = (k) => [k % COLS, Math.floor(k / COLS)];

/**
 * Terrain d'une partie, tiré d'une graine : entrée à gauche, sortie à droite, 3 à 5 checkpoints, 1 ou 2 paires de
 * téléporteurs (à sens unique : `a` est l'entrée, `b` la sortie) et des zones. Jamais deux éléments sur la même case.
 */
export function genererLabyrinthe(graine = 1) {
  const rnd = hasard(graine);
  const entier = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pris = new Set();
  const place = (cMin, cMax, rMin = 1, rMax = ROWS - 2) => {
    for (let essai = 0; essai < 200; essai++) {
      const c = entier(cMin, cMax), r = entier(rMin, rMax);
      if (!pris.has(cle(c, r))) { pris.add(cle(c, r)); return { c, r }; }
    }
    throw new Error('Labyrinthe : plus de place');
  };
  const entree = { c: 0, r: entier(2, ROWS - 3) }; pris.add(cle(entree.c, entree.r));
  const sortie = { c: COLS - 1, r: entier(2, ROWS - 3) }; pris.add(cle(sortie.c, sortie.r));

  // Checkpoints n'importe où sur la carte, dans le désordre : le 1 peut être loin de l'entrée, le 2 à côté du 3,
  // le dernier près de l'entrée… Les monstres doivent alors traverser la carte en tous sens.
  const nbCp = entier(...LABYRINTHE.checkpoints);
  const cp = [];
  for (let i = 0; i < nbCp; i++) cp.push({ n: i + 1, ...place(1, COLS - 2) });

  const nbTp = entier(...LABYRINTHE.paires);
  const tp = [];
  for (let i = 0; i < nbTp; i++) tp.push({ forme: LABYRINTHE.formes[i % LABYRINTHE.formes.length], a: place(1, COLS - 2), b: place(1, COLS - 2) });

  const zones = [];
  for (let i = 0; i < LABYRINTHE.nbZones; i++) zones.push({ sorte: ORDRE_ZONES[Math.floor(rnd() * ORDRE_ZONES.length)], ...place(1, COLS - 2, 0, ROWS - 1) });

  // Population maximale et obstacles (spec 017) : tirés en dernier, pour que les terrains d'avant ne changent pas.
  const popMax = LABYRINTHE.population[Math.floor(rnd() * LABYRINTHE.population.length)];
  const obstacles = [];
  const prisObs = new Set(pris);
  const libre = (c, r) => c >= 1 && c <= COLS - 2 && r >= 0 && r <= ROWS - 1 && !prisObs.has(cle(c, r));
  const nbRochers = entier(...LABYRINTHE.rochers);
  for (let i = 0; i < nbRochers; i++) {
    for (let essai = 0; essai < 200; essai++) {
      const c = entier(1, COLS - 2), r = entier(0, ROWS - 1);
      if (libre(c, r)) { prisObs.add(cle(c, r)); obstacles.push({ type: 'rocher', cases: [{ c, r }] }); break; }
    }
  }
  const nbMontagnes = entier(...LABYRINTHE.montagnes);
  for (let i = 0; i < nbMontagnes; i++) {
    const taille = entier(...LABYRINTHE.tailleMontagne);
    for (let essai = 0; essai < 100; essai++) {
      const c = entier(1, COLS - 2), r = entier(0, ROWS - 1);
      if (!libre(c, r)) continue;
      const cases = [{ c, r }], dans = new Set([cle(c, r)]);
      for (let k = 0; k < 60 && cases.length < taille; k++) {
        const o = cases[Math.floor(rnd() * cases.length)], [dc, dr] = VOISINS[Math.floor(rnd() * 4)];
        const nc = o.c + dc, nr = o.r + dr;
        if (libre(nc, nr) && !dans.has(cle(nc, nr))) { dans.add(cle(nc, nr)); cases.push({ c: nc, r: nr }); }
      }
      if (cases.length < LABYRINTHE.tailleMontagne[0]) continue;
      for (const k of dans) prisObs.add(k);
      obstacles.push({ type: 'montagne', cases });
      break;
    }
  }
  const lab = { graine, entree, sortie, cp, tp, zones, popMax, obstacles };
  // Le terrain vide doit toujours laisser un chemin à pied : sinon on retire des obstacles, en commençant par la fin.
  while (lab.obstacles.length && !cheminLabyrinthe(lab, new Set())) lab.obstacles.pop();
  return lab;
}

/** Cases fermées par les obstacles (rochers et montagnes). */
export function casesObstacles(lab) {
  const o = new Set();
  for (const ob of lab.obstacles || []) for (const p of ob.cases) o.add(cle(p.c, p.r));
  return o;
}

/** Cases où l'on ne construit pas : entrée, sortie, checkpoints et téléporteurs. */
export function casesFixes(lab) {
  const f = new Set([cle(lab.entree.c, lab.entree.r), cle(lab.sortie.c, lab.sortie.r)]);
  for (const p of lab.cp) f.add(cle(p.c, p.r));
  for (const t of lab.tp) { f.add(cle(t.a.c, t.a.r)); f.add(cle(t.b.c, t.b.r)); }
  return f;
}

const VOISINS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/**
 * Plus court chemin de `de` à `vers` en cases voisines (sans diagonale), en évitant les cases `bloques`.
 * `avecTp` : marcher sur l'entrée d'un téléporteur mène aussitôt à sa sortie, sans coût ; sinon les téléporteurs
 * sont des cases ordinaires. Renvoie la suite de cases [{ c, r, saut? }] (`saut` : arrivée d'un téléporteur),
 * ou null s'il n'y a aucun chemin.
 */
function plusCourt(lab, bloques, de, vers, avecTp) {
  const entrees = new Map(avecTp ? lab.tp.map((t) => [cle(t.a.c, t.a.r), t.b]) : []);
  const but = cle(vers.c, vers.r);
  const avant = new Map([[cle(de.c, de.r), null]]);   // case -> { depuis, via } ; via = entrée de TP empruntée
  const file = [cle(de.c, de.r)];
  for (let i = 0; i < file.length && !avant.has(but); i++) {
    const [c, r] = deCle(file[i]);
    for (const [dc, dr] of VOISINS) {
      const nc = c + dc, nr = r + dr;
      if (!dedans(nc, nr) || bloques.has(cle(nc, nr))) continue;
      const k = cle(nc, nr);
      const sortie = entrees.get(k);
      const arrivee = sortie ? cle(sortie.c, sortie.r) : k;
      if (avant.has(arrivee)) continue;
      avant.set(arrivee, { depuis: file[i], via: sortie ? k : null });
      file.push(arrivee);
    }
  }
  if (!avant.has(but)) return null;
  const chemin = [];
  for (let k = but; k !== null;) {
    const a = avant.get(k);
    const [c, r] = deCle(k);
    chemin.push(a && a.via !== null ? { c, r, saut: true } : { c, r });
    if (a && a.via !== null) { const [vc, vr] = deCle(a.via); chemin.push({ c: vc, r: vr }); }
    k = a ? a.depuis : null;
  }
  return chemin.reverse();
}

/**
 * Tronçon à pied où les téléporteurs agissent : la recherche ne les cherche jamais, mais un monstre dont le chemin
 * pose le pied sur une entrée est téléporté à la sortie, puis repart de là vers `vers`. C'est au joueur de placer ses
 * murs pour y faire passer le chemin (ou l'en écarter). Une entrée déjà prise sur ce tronçon n'est pas reprise.
 */
function troncon(lab, bloques, de, vers, pied, evites = new Set()) {
  const entrees = new Map(lab.tp.map((t) => [cle(t.a.c, t.a.r), t.b]));
  const pris = new Set();
  const sortie = [];
  let chemin = pied;
  for (let tour = 0; tour <= lab.tp.length; tour++) {
    const debut = sortie.length ? 1 : 0;
    const i = chemin.findIndex((p, k) => k > 0 && entrees.has(cle(p.c, p.r)) && !pris.has(cle(p.c, p.r)));
    if (i < 0) { sortie.push(...chemin.slice(debut)); return sortie; }
    const k = cle(chemin[i].c, chemin[i].r), b = entrees.get(k);
    pris.add(k);
    sortie.push(...chemin.slice(debut, i + 1), { c: b.c, r: b.r, saut: true });
    if (b.c === vers.c && b.r === vers.r) return sortie;
    chemin = plusCourt(lab, new Set([...bloques, ...pris]), b, vers, false) || plusCourt(lab, bloques, b, vers, false);
    if (!chemin) {   // la sortie est murée : on contourne cette entrée si l'on peut
      evites.add(k);
      const autre = plusCourt(lab, new Set([...bloques, ...evites]), de, vers, false);
      return autre ? troncon(lab, bloques, de, vers, autre, evites) : null;
    }
  }
  return sortie;
}

/**
 * Chemin complet des monstres au sol : entrée, checkpoints 1 à n dans l'ordre, sortie. `bloques` : cases fermées
 * (murs, tours). Renvoie la suite de cases, ou null si le passage est bouché.
 * Les téléporteurs ne sont jamais cherchés : la recherche marche, mais un monstre qui pose le pied sur une entrée est
 * téléporté (voir `troncon`). Sans chemin à pied, ils prennent un téléporteur si les murs ne laissent que lui.
 */
export function cheminLabyrinthe(lab, bloques) {
  if (lab.obstacles && lab.obstacles.length) bloques = new Set([...bloques, ...casesObstacles(lab)]);
  const etapes = [lab.entree, ...lab.cp, lab.sortie];
  const tout = [];
  const vus = new Map();   // tronçon à pied déjà calculé, par couple de points : l'aller et le retour suivent le même chemin
  for (let i = 0; i + 1 < etapes.length; i++) {
    const de = etapes[i], vers = etapes[i + 1];
    const kd = cle(de.c, de.r), kv = cle(vers.c, vers.r);
    const sens = kd <= kv;
    const kc = sens ? kd + '|' + kv : kv + '|' + kd;
    let pied = vus.get(kc);
    if (pied === undefined) {
      pied = sens ? plusCourt(lab, bloques, de, vers, false) : plusCourt(lab, bloques, vers, de, false);   // toujours calculé dans le même sens
      vus.set(kc, pied);
    }
    const morceau = (pied && troncon(lab, bloques, de, vers, sens ? pied : [...pied].reverse())) || plusCourt(lab, bloques, de, vers, true);
    if (!morceau) return null;
    tout.push(...(i === 0 ? morceau : morceau.slice(1)));
  }
  return tout;
}

/** Trajet au sol (au format de carte.js) d'un chemin de cases. */
export const trajetDeChemin = (chemin) => trajet(chemin.map((p) => ({ x: centre(p.c), y: centre(p.r), ...(p.saut ? { saut: true } : {}) })));

/** Les volants vont tout droit de l'entrée à la sortie en passant par les checkpoints : ni murs, ni TP, ni zones. */
export function trajetVol(lab) {
  return trajet([lab.entree, ...lab.cp, lab.sortie].map((p) => ({ x: centre(p.c), y: centre(p.r) })));
}

/**
 * Carte jouable du labyrinthe, au même format que `construireCarte`. `murs` est l'ensemble (de clés) des murs
 * construits ; le trajet est recalculé par `majChemin`.
 */
export function carteLabyrinthe(lab) {
  const murs = new Set();
  const fixes = casesFixes(lab);
  const obstacles = casesObstacles(lab);
  const vols = [trajetVol(lab)];
  const carte = {
    def: {
      id: 'labyrinthe', nom: 'Labyrinthe', graine: lab.graine, orDepart: LABYRINTHE.orDepart, pvParVague: LABYRINTHE.pvParVague, vagues: [], ouverte: true,
      theme: 'prairie', labyrinthe: lab,
    },
    lab, murs, fixes, obstacles, decors: [], cheminCases: [], vols, vol: vols[0],
    sols: [], sol: null,
    chateau: { c: lab.sortie.c, r: lab.sortie.r, l: 1, h: 1 },
    entrees: [{ c: lab.entree.c, r: lab.entree.r, l: 1, h: 1 }],
    zoneEn: (c, r) => lab.zones.find((z) => z.c === c && z.r === r) || null,
    etat: (c, r) => (!dedans(c, r) || fixes.has(cle(c, r)) || obstacles.has(cle(c, r)) || murs.has(cle(c, r)) ? PRIS : LIBRE),
  };
  return carte;
}

/** Recalcule le trajet au sol de la carte pour l'ensemble de cases fermées `bloques`. Renvoie false si bouché. */
export function majChemin(carte, bloques) {
  const chemin = cheminLabyrinthe(carte.lab, bloques);
  if (!chemin) return false;
  carte.chemin = chemin;
  carte.cheminCases = chemin.map((p) => [p.c, p.r]);
  carte.sols = [trajetDeChemin(chemin)];
  carte.sol = carte.sols[0];
  return true;
}

/** Zone de monstres sous un ennemi au sol (ou null). */
export function zoneMonstre(carte, e) {
  const z = carte.zoneEn(Math.floor(e.x / T), Math.floor(e.y / T));
  return z && ZONES[z.sorte].cible === 'monstre' ? ZONES[z.sorte] : null;
}

/** Zone de tour sous une tour (ou null). */
export function zoneTour(carte, t) {
  const z = carte.zoneEn(t.c, t.r);
  return z && ZONES[z.sorte].cible === 'tour' ? ZONES[z.sorte] : null;
}
