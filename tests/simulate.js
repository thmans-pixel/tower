// Joueur automatique simple, pour contrôler l'équilibre : `npm run simulate`.
// Il pose des tours là où elles couvrent le plus de chemin, les améliore quand il peut, et laisse le compte à
// rebours lancer les vagues (sauf `presse`, qui appelle chaque vague dès que possible).
import { nouvellePartie, avancer, poser, ameliorer, peutPoser, appelerVague, peutAppeler, prixAmelioration } from '../src/sim/partie.js';
import { TOURS } from '../src/data/tours.js';
import { COLS, ROWS, T } from '../src/sim/const.js';
import { centre } from '../src/sim/carte.js';

function couverture(s, c, r, portee) {
  const x = centre(c), y = centre(r);
  let n = 0;
  for (const [i, j] of s.carte.cheminCases) if (Math.hypot(centre(i) - x, centre(j) - y) <= portee) n++;
  return n;
}

export function jouer({ carte = 'prairie', plan = ['archers', 'archers', 'mage', 'canon', 'givre', 'mage', 'archers', 'mage'], presse = false, max = 60 * 60 * 30 } = {}) {
  const s = nouvellePartie(carte);
  const places = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (peutPoser(s, c, r)) places.push([c, r, couverture(s, c, r, 125)]);
  places.sort((a, b) => b[2] - a[2]);
  let k = 0;
  appelerVague(s);
  for (let i = 0; i < max && !s.fin; i++) {
    if (i % 30 === 0) {
      const sorte = plan[k % plan.length];
      const prochaine = plan.length && s.tours.length < 20 ? TOURS[sorte].prix : Infinity;
      // Améliorer la moins chère quand on a déjà assez de tours, sinon poser.
      const amel = s.tours.filter((t) => prixAmelioration(t) !== null).sort((a, b) => prixAmelioration(a) - prixAmelioration(b))[0];
      if (s.or >= prochaine && (s.tours.length < 8 || !amel || prixAmelioration(amel) > prochaine)) {
        const p = places.find(([c, r]) => peutPoser(s, c, r));
        if (p && poser(s, sorte, p[0], p[1]).ok) k++;
      } else if (amel && s.or >= prixAmelioration(amel)) ameliorer(s, amel.id);
      if (presse && peutAppeler(s)) appelerVague(s);
    }
    avancer(s);
    s.evenements.length = 0;
  }
  return { fin: s.fin, vague: s.vague, vies: s.vies, or: s.or, tours: s.tours.length, abattus: s.abattus, minutes: +(s.temps / 60).toFixed(1) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Joueur posé    :', jouer());
  console.log('Joueur pressé  :', jouer({ presse: true }));
  console.log('Que des archers:', jouer({ plan: ['archers'] }));
  console.log('Sans tour      :', jouer({ plan: ['archers'], max: 1, _x: 60 * 60 * 10 }));
}
