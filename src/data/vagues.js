// Vagues générées : celles de la Montagne (fixes, construites par une règle) et celles du mode infini
// (tirées au hasard à graine : toujours la même suite pour une carte donnée). Une vague = suite de groupes
// [ennemi, nombre, secondes entre deux ennemis], comme dans cartes.js.
import { hasard } from '../sim/hasard.js';

// Quand chaque ennemi peut apparaître, combien dans un groupe de base, et leur écart de base.
const RESERVE = [
  { sorte: 'gob', des: 1, nombre: 10, ecart: 0.7 },
  { sorte: 'loup', des: 2, nombre: 8, ecart: 0.5 },
  { sorte: 'orc', des: 4, nombre: 4, ecart: 1.3 },
  { sorte: 'slime', des: 5, nombre: 6, ecart: 0.8 },
  { sorte: 'bat', des: 6, nombre: 8, ecart: 0.6 },
  { sorte: 'cham', des: 8, nombre: 3, ecart: 1.4 },
  { sorte: 'golem', des: 12, nombre: 2, ecart: 2.4 },
  { sorte: 'spectre', des: 13, nombre: 5, ecart: 0.9 },
];

/**
 * Vague n (à partir de 1) : 2 à 5 groupes d'ennemis déjà apparus, de plus en plus fournis et serrés ;
 * l'Ogre chef de guerre toutes les 10 vagues (un de plus toutes les 30). `taille` multiplie les effectifs.
 */
export function genererVague(graine, n, taille = 1) {
  const rnd = hasard(graine * 1009 + n * 7919);
  const dispo = RESERVE.filter((r) => r.des <= n);
  const groupes = [];
  const nbGroupes = Math.min(5, 2 + Math.floor(n / 8));
  const deja = new Set();
  for (let g = 0; g < nbGroupes; g++) {
    let r = dispo[Math.floor(rnd() * dispo.length)];
    if (deja.has(r.sorte)) r = dispo.find((x) => !deja.has(x.sorte)) || r;
    deja.add(r.sorte);
    const nombre = Math.max(1, Math.round(r.nombre * (0.8 + n * 0.06) * taille));
    const ecart = Math.round(Math.max(0.25, r.ecart * (1 - Math.min(0.5, n * 0.015))) * 100) / 100;
    const meme = groupes.find((x) => x[0] === r.sorte);
    if (meme) meme[1] += nombre;          // au début, seul le gobelin est disponible : un seul groupe plus gros
    else groupes.push([r.sorte, nombre, ecart]);
  }
  if (n % 10 === 0) groupes.splice(Math.floor(groupes.length / 2), 0, ['ogre', 1 + Math.floor(n / 30), 2]);
  return groupes;
}

/** Les 30 vagues de la Montagne : la même règle, plus nombreuses (la neige ralentit les ennemis). */
export const VAGUES_MONTAGNE = Array.from({ length: 30 }, (_, i) => genererVague(23, i + 1, 1.35));
