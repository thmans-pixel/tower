// Cartes aléatoires (spec 007) : un numéro (graine) donne toujours la même carte. Le chemin est une suite de
// couloirs verticaux reliés par des tronçons horizontaux, de gauche à droite : il ne peut pas se croiser, et deux
// couloirs voisins sont séparés d'au moins deux cases pour y bâtir. Une fois sur deux, une seconde entrée rejoint
// le premier couloir. Le château est toujours à droite (comme sur les cartes de la campagne).
import { CARTES } from '../data/cartes.js';
import { genererVague } from '../data/vagues.js';
import { hasard } from './hasard.js';

export const THEMES = {
  prairie: { chateau: 'chateau', entrees: ['entree', 'entree'] },
  desert: { chateau: 'forteresse', entrees: ['entree_nord', 'entree_sud'] },
  montagne: { chateau: 'fort', entrees: ['entree', 'entree'] },
};
export const LONGUEURS = [20, 25, 30];

const CHATEAU = { c: 21, r: 5, l: 3, h: 5 };
const PORTE = [20, 7];                 // dernière case du chemin, devant le château
const COL_FINALE = 19;                 // couloir qui mène à la porte

const longueurChemin = (ch) => ch.slice(1).reduce((t, p, i) => t + Math.abs(p[0] - ch[i][0]) + Math.abs(p[1] - ch[i][1]), 0);

/** Tracé d'une carte : { chemins, entrees }. Essais successifs du même hasard jusqu'à un tracé valide. */
export function genererTrace(graine) {
  const rnd = hasard(graine * 2654435761 % 4294967296);
  const entier = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  for (let essai = 0; essai < 500; essai++) {
    // Couloirs verticaux : colonnes croissantes, au moins 3 d'écart (2 cases libres entre deux couloirs).
    const nb = entier(2, 4);
    const cols = [];
    let c = entier(2, 4);
    for (let i = 0; i < nb && c <= COL_FINALE - 3; i++) { cols.push(c); c += entier(3, 5); }
    if (cols.length < 2) continue;
    const r0 = entier(2, 13);
    const ch = [[-1, r0]];
    let r = r0;
    for (const x of cols) {
      ch.push([x, r]);
      // Chaque couloir change de ligne d'au moins 4 cases, vers le bord opposé à la ligne actuelle.
      let r2 = r < 8 ? entier(Math.min(14, r + 4), 14) : entier(1, Math.max(1, r - 4));
      if (Math.abs(r2 - r) < 4) continue;
      ch.push([x, r2]);
      r = r2;
    }
    if (ch.length !== 1 + 2 * cols.length) continue;
    ch.push([COL_FINALE, r]);
    if (r !== PORTE[1]) ch.push([COL_FINALE, PORTE[1]]);
    ch.push(PORTE);
    const l = longueurChemin(ch);
    if (l < 45 || l > 75) continue;

    const entrees = [{ c: 0, r: r0 - 1, l: 1, h: 3 }];
    const chemins = [ch];
    // Seconde entrée : rejoint le premier couloir, à au moins 3 lignes de la première entrée.
    if (rnd() < 0.5) {
      const [x1, ya] = ch[1], yb = ch[2][1];
      const lo = Math.min(ya, yb) + 1, hi = Math.max(ya, yb) - 1;
      const possibles = [];
      for (let y = lo; y <= hi; y++) if (Math.abs(y - r0) >= 3 && y >= 1 && y <= 14) possibles.push(y);
      if (possibles.length) {
        const y = possibles[Math.floor(rnd() * possibles.length)];
        chemins.push([[-1, y], [x1, y], ...ch.slice(2)]);
        entrees.push({ c: 0, r: y - 1, l: 1, h: 3 });
      }
    }
    return { chemins, entrees, longueur: l };
  }
  throw new Error('Aucun tracé valide pour la graine ' + graine);
}

/** Description complète d'une carte aléatoire, au même format que celles de src/data/cartes.js. */
export function genererCarte(graine, theme = 'prairie', nbVagues = 25) {
  const base = CARTES[theme];
  const { chemins, entrees, longueur } = genererTrace(graine);
  const noms = THEMES[theme];
  return {
    id: theme,                        // décor (noms des images) du thème choisi
    aleatoire: { graine, theme, nbVagues },
    nom: `Carte n° ${graine}`, resume: 'Carte aléatoire.',
    ouverte: true, orDepart: 260, graine,
    vitesse: base.vitesse || 1,
    // Plus le chemin est long, plus les tours ont le temps de tirer : PV un peu plus forts au fil des vagues.
    pvParVague: 0.02 + Math.max(0, ((longueur - 45) / 25) * 0.017),
    vagues: Array.from({ length: nbVagues }, (_, i) => genererVague(graine, i + 1, 1.5)),
    chemins, entrees,
    chateau: { ...CHATEAU },
    noms: { chateau: noms.chateau, entrees: noms.entrees.slice(0, entrees.length) },
    sol: base.sol,
    decor: base.decor,
  };
}
