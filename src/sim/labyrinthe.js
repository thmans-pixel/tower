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

  // Checkpoints répartis de gauche à droite : chacun dans sa tranche de colonnes.
  const nbCp = entier(...LABYRINTHE.checkpoints);
  const largeur = (COLS - 4) / nbCp;
  const cp = [];
  for (let i = 0; i < nbCp; i++) {
    const c0 = 2 + Math.floor(i * largeur), c1 = 2 + Math.floor((i + 1) * largeur) - 1;
    cp.push({ n: i + 1, ...place(c0, Math.max(c0, c1)) });
  }

  const nbTp = entier(...LABYRINTHE.paires);
  const tp = [];
  for (let i = 0; i < nbTp; i++) tp.push({ forme: LABYRINTHE.formes[i % LABYRINTHE.formes.length], a: place(1, COLS - 2), b: place(1, COLS - 2) });

  const zones = [];
  for (let i = 0; i < LABYRINTHE.nbZones; i++) zones.push({ sorte: ORDRE_ZONES[Math.floor(rnd() * ORDRE_ZONES.length)], ...place(1, COLS - 2, 0, ROWS - 1) });

  return { graine, entree, sortie, cp, tp, zones };
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
 * Marcher sur l'entrée d'un téléporteur mène aussitôt à sa sortie, sans coût. Renvoie la suite de cases
 * [{ c, r, saut? }] (`saut` : arrivée d'un téléporteur), ou null s'il n'y a aucun chemin.
 */
function plusCourt(lab, bloques, de, vers) {
  const entrees = new Map(lab.tp.map((t) => [cle(t.a.c, t.a.r), t.b]));
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
 * Chemin complet des monstres au sol : entrée, checkpoints 1 à n dans l'ordre, sortie. `bloques` : cases fermées
 * (murs, tours). Renvoie la suite de cases, ou null si le passage est bouché.
 */
export function cheminLabyrinthe(lab, bloques) {
  const etapes = [lab.entree, ...lab.cp, lab.sortie];
  const tout = [];
  for (let i = 0; i + 1 < etapes.length; i++) {
    const morceau = plusCourt(lab, bloques, etapes[i], etapes[i + 1]);
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
  const vols = [trajetVol(lab)];
  const carte = {
    def: {
      id: 'labyrinthe', nom: 'Labyrinthe', graine: lab.graine, orDepart: LABYRINTHE.orDepart, vagues: [], ouverte: true,
      theme: 'prairie', labyrinthe: lab,
    },
    lab, murs, fixes, decors: [], cheminCases: [], vols, vol: vols[0],
    sols: [], sol: null,
    chateau: { c: lab.sortie.c, r: lab.sortie.r, l: 1, h: 1 },
    entrees: [{ c: lab.entree.c, r: lab.entree.r, l: 1, h: 1 }],
    zoneEn: (c, r) => lab.zones.find((z) => z.c === c && z.r === r) || null,
    etat: (c, r) => (!dedans(c, r) || fixes.has(cle(c, r)) || murs.has(cle(c, r)) ? PRIS : LIBRE),
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
