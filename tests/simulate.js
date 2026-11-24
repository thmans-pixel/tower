// Joueur automatique simple, pour contrôler l'équilibre : `npm run simulate`.
// Il pose des tours là où elles couvrent le plus de chemin, les améliore quand il peut, et laisse le compte à
// rebours lancer les vagues (sauf `presse`, qui appelle chaque vague dès que possible).
import { nouvellePartie, avancer, poser, ameliorer, peutPoser, appelerVague, peutAppeler, prixAmelioration, poserMur, caseLibre, enVague, trajetPrevu } from '../src/sim/partie.js';
import { LABYRINTHE } from '../src/data/labyrinthe.js';
import { TOURS } from '../src/data/tours.js';
import { COLS, ROWS, T } from '../src/sim/const.js';
import { centre } from '../src/sim/carte.js';

function couverture(s, c, r, portee) {
  const x = centre(c), y = centre(r);
  let n = 0;
  for (const [i, j] of s.carte.cheminCases) if (Math.hypot(centre(i) - x, centre(j) - y) <= portee) n++;
  return n;
}

export function jouer({ carte = 'prairie', difficulte = 'normal', maxTours = 20, plan = ['archers', 'archers', 'mage', 'canon', 'givre', 'mage', 'baliste', 'tempete'], presse = false, max = 60 * 60 * 30 } = {}) {
  const s = nouvellePartie(carte, difficulte);
  const places = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (peutPoser(s, c, r)) places.push([c, r, couverture(s, c, r, 125)]);
  places.sort((a, b) => b[2] - a[2]);
  let k = 0;
  const journal = [];   // vies au lancement de chaque vague
  appelerVague(s);
  for (let i = 0; i < max && !s.fin; i++) {
    if (i % 30 === 0) {
      const sorte = plan[k % plan.length];
      const prochaine = plan.length && s.tours.length < maxTours ? TOURS[sorte].prix : Infinity;
      // Améliorer la moins chère quand on a déjà assez de tours, sinon poser.
      const amel = s.tours.filter((t) => prixAmelioration(t) !== null).sort((a, b) => prixAmelioration(a) - prixAmelioration(b))[0];
      if (s.or >= prochaine && (s.tours.length < 8 || !amel || prixAmelioration(amel) > prochaine)) {
        const p = places.find(([c, r]) => peutPoser(s, c, r));
        const r = p && poser(s, sorte, p[0], p[1]);
        if (r && r.ok) { k++; if (k % 2 === 0 && s.vague >= 8) r.tour.ciblage = 'fort'; }   // une tour sur deux vise le plus fort, comme un joueur face au boss
      } else if (amel && s.or >= prixAmelioration(amel)) ameliorer(s, amel.id, amel.id % 2 ? 'a' : 'b');
      if (presse && peutAppeler(s)) appelerVague(s);
    }
    const v = s.vague;
    avancer(s);
    if (s.vague !== v) journal.push(s.vies);
    s.evenements.length = 0;
  }
  return { fin: s.fin, vague: s.vague, vies: s.vies, or: s.or, orGagne: s.orGagne, tours: s.tours.length, abattus: s.abattus, minutes: +(s.temps / 60).toFixed(1), journal };
}

/**
 * Joueur automatique du mode labyrinthe (spec 016). Entre les vagues, il dessine un serpentin de murs (une colonne
 * sur trois, ouverte tour à tour en bas et en haut), pose ses tours là où elles couvrent le plus de trajet et les
 * améliore. `murs: false` : il ne pose que des tours. `maxVagues` : abandon (fin = null) au-delà.
 */
export function jouerLabyrinthe({ graine = 1, difficulte = 'normal', murs = true, maxTours = 16, maxVagues = 60, parTour = 15, debut = 5, plan = ['archers', 'archers', 'mage', 'canon', 'givre', 'mage', 'baliste', 'tempete'] } = {}) {
  const s = nouvellePartie('labyrinthe', difficulte, { graine });
  // Murs : l'un après l'autre, celui qui rallonge le plus le trajet (population limitée, spec 017) ; les tours gardent
  // leur place dans le plafond.
  const budgetMurs = murs ? Math.max(0, s.labyrinthe.popMax - maxTours) : 0;
  const meilleurMur = () => {
    let best = null, longueur = s.carte.sol.longueur;
    for (const [c, r] of s.carte.cheminCases) {
      if (!caseLibre(s, c, r)) continue;
      const tr = trajetPrevu(s, c, r);
      if (tr && tr.longueur > longueur) { longueur = tr.longueur; best = [c, r]; }
    }
    return best;
  };
  const couvre = (c, r, portee) => s.carte.cheminCases.reduce((n, [i, j]) => n + (Math.hypot(centre(i) - centre(c), centre(j) - centre(r)) <= portee ? 1 : 0), 0);
  let k = 0, pose = 0;
  const batir = () => {
    for (let essai = 0; essai < 400; essai++) {
      const sorte = plan[k % plan.length];
      const amel = s.tours.filter((t) => prixAmelioration(t) !== null).sort((a, b) => prixAmelioration(a) - prixAmelioration(b))[0];
      const veutTour = s.tours.length < maxTours && (s.tours.length < debut + pose / parTour || !murs || pose >= budgetMurs);
      if (veutTour) {
        if (s.or < TOURS[sorte].prix) return;
        // La case libre qui couvre le plus de trajet (hors des cases réservées aux murs).
        let best = null, score = -1;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (!caseLibre(s, c, r)) continue;
          const n = couvre(c, r, 125);
          if (n > score && peutPoser(s, c, r)) { score = n; best = [c, r]; }
        }
        if (!best || !poser(s, sorte, best[0], best[1]).ok) return;
        k++;
      } else if (murs && pose < budgetMurs) {
        if (s.or < LABYRINTHE.prixMur) return;
        const m = meilleurMur();
        if (!m) pose = budgetMurs;   // plus aucun mur ne rallonge le trajet
        else { pose++; poserMur(s, m[0], m[1]); }
      } else if (amel && s.or >= prixAmelioration(amel)) ameliorer(s, amel.id, amel.id % 2 ? 'a' : 'b');
      else return;
    }
  };
  const journal = [];
  batir();
  appelerVague(s);
  for (let i = 0; i < 60 * 60 * 120 && !s.fin && s.vague <= maxVagues; i++) {
    if (i % 30 === 0 && !enVague(s)) batir();
    const v = s.vague;
    avancer(s);
    if (s.vague !== v) journal.push(s.vies);
    s.evenements.length = 0;
  }
  return { fin: s.fin, vague: s.vague, vies: s.vies, or: s.or, tours: s.tours.length, murs: s.labyrinthe.murs.size, trajet: Math.round(s.carte.sol.longueur / T), abattus: s.abattus, minutes: +(s.temps / 60).toFixed(1), journal };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'labyrinthe') {
  for (const difficulte of ['facile', 'normal', 'difficile']) {
    const l = Array.from({ length: 10 }, (_, g) => jouerLabyrinthe({ graine: g + 1, difficulte }));
    console.log(`Labyrinthe, ${difficulte} :`, l.map((r) => (r.fin === 'victoire' ? r.vague : r.fin === 'defaite' ? 'perdu' + r.vague : '…')).join(' '));
  }
  console.log('Sans mur (Normal) :', Array.from({ length: 10 }, (_, g) => jouerLabyrinthe({ graine: g + 1, murs: false })).map((r) => (r.fin === 'victoire' ? r.vague : r.fin === 'defaite' ? 'perdu' + r.vague : '…')).join(' '));
  console.log('Détail, graine 1 :', jouerLabyrinthe({ graine: 1 }));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Joueur posé    :', jouer());
  console.log('Joueur pressé  :', jouer({ presse: true }));
  console.log('Que des archers:', jouer({ plan: ['archers'] }));
  console.log('Étape 1 seule :', jouer({ presse: true, plan: ['archers', 'archers', 'mage', 'canon', 'givre', 'mage', 'archers', 'mage'] }));
  console.log('Posé, Facile   :', jouer({ difficulte: 'facile' }));
  console.log('Posé, Difficile:', jouer({ difficulte: 'difficile' }));
  console.log('Sans tour      :', jouer({ plan: [], max: 60 * 60 * 10 }));
}
