// Construit une carte jouable à partir de sa description : cases du chemin, trajet en pixels, cases prises par
// le décor. Le décor est placé par un hasard à graine fixe : la carte est toujours la même.
import { T, COLS, ROWS } from './const.js';
import { SORTES } from '../data/decors.js';
import { hasard } from './hasard.js';

export const LIBRE = 0, CHEMIN = 1, PRIS = 2;

export const dedans = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
export const centre = (n) => n * T + T / 2;

export function construireCarte(def) {
  const grille = new Uint8Array(COLS * ROWS);
  const ix = (c, r) => r * COLS + c;

  // Chemin case par case.
  const cheminCases = [];
  for (let i = 0; i + 1 < def.chemin.length; i++) {
    const [c0, r0] = def.chemin[i], [c1, r1] = def.chemin[i + 1];
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    let c = c0, r = r0;
    for (;;) {
      if (dedans(c, r) && grille[ix(c, r)] !== CHEMIN) { grille[ix(c, r)] = CHEMIN; cheminCases.push([c, r]); }
      if (c === c1 && r === r1) break;
      c += dc; r += dr;
    }
  }

  // Trajet au sol : segments entre centres de cases.
  const points = def.chemin.map(([c, r]) => ({ x: centre(c), y: centre(r) }));
  const sol = trajet(points);
  // Les volants vont tout droit de l'entrée au château.
  const vol = trajet([points[0], points[points.length - 1]]);

  const prendre = (z) => {
    for (let r = z.r; r < z.r + z.h; r++) for (let c = z.c; c < z.c + z.l; c++)
      if (dedans(c, r) && grille[ix(c, r)] === LIBRE) grille[ix(c, r)] = PRIS;
  };
  prendre(def.chateau);
  prendre(def.entree);

  // Décor : les éléments qui bloquent restent à plus d'une case du chemin, pour laisser les bonnes places libres.
  const presDuChemin = (c, r) => {
    for (let j = r - 1; j <= r + 1; j++) for (let i = c - 1; i <= c + 1; i++)
      if (dedans(i, j) && grille[ix(i, j)] === CHEMIN) return true;
    return false;
  };
  const occupe = new Uint8Array(COLS * ROWS);   // une case n'accueille qu'un élément de décor
  const decors = [];
  const rnd = hasard(def.graine || 1);
  for (const [sorte, nombre] of Object.entries(def.decor || {})) {
    const s = SORTES[sorte];
    for (let n = 0; n < nombre; n++) {
      for (let essai = 0; essai < 60; essai++) {
        const c = Math.floor(rnd() * (COLS - s.l + 1)), r = Math.floor(rnd() * (ROWS - s.h + 1));
        let ok = true;
        for (let j = r; j < r + s.h && ok; j++) for (let i = c; i < c + s.l && ok; i++) {
          if (grille[ix(i, j)] !== LIBRE || occupe[ix(i, j)]) ok = false;
          else if (s.bloquant && presDuChemin(i, j)) ok = false;
        }
        if (!ok) continue;
        for (let j = r; j < r + s.h; j++) for (let i = c; i < c + s.l; i++) {
          occupe[ix(i, j)] = 1;
          if (s.bloquant) grille[ix(i, j)] = PRIS;
        }
        decors.push({
          sorte, nom: def.id + '_' + s.noms[Math.floor(rnd() * s.noms.length)],
          c, r, l: s.l, h: s.h, bloquant: s.bloquant,
          x: (c + s.l / 2) * T, y: (r + s.h / 2) * T,
        });
        break;
      }
    }
  }

  return {
    def, grille, cheminCases, sol, vol, decors,
    chateau: def.chateau, entree: def.entree,
    etat: (c, r) => (dedans(c, r) ? grille[ix(c, r)] : PRIS),
  };
}

function trajet(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, l, debut: total });
    total += l;
  }
  return { points, segs, longueur: total };
}

/** Position à la distance `d` le long d'un trajet, avec la direction du mouvement. */
export function positionSur(tr, d) {
  if (d <= 0) { const s = tr.segs[0]; return { x: s.a.x, y: s.a.y, dx: (s.b.x - s.a.x) / s.l, dy: (s.b.y - s.a.y) / s.l }; }
  for (const s of tr.segs) {
    if (d <= s.debut + s.l) {
      const t = (d - s.debut) / s.l;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dx: (s.b.x - s.a.x) / s.l, dy: (s.b.y - s.a.y) / s.l };
    }
  }
  const s = tr.segs[tr.segs.length - 1];
  return { x: s.b.x, y: s.b.y, dx: (s.b.x - s.a.x) / s.l, dy: (s.b.y - s.a.y) / s.l };
}
