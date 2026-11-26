// Difficultés (spec 005). `pv` multiplie les PV des ennemis, `or` l'or de départ ; `compte` = secondes entre
// deux vagues ; `nombre` multiplie l'effectif de chaque groupe d'une vague (sauf les boss, toujours seuls).
export const DIFFICULTES = {
  facile:    { nom: 'Facile',    pv: 0.75, or: 1.3, vies: 30, compte: 24 },
  normal:    { nom: 'Normal',    pv: 1,    or: 1,   vies: 20, compte: 18 },
  difficile: { nom: 'Difficile', pv: 1.1,  or: 1,   vies: 10, compte: 15 },   // spec 010
};
/** Les trois difficultés d'origine : seules à avoir des records partagés (hall of fame, labyrinthe, code de transfert). */
export const ORDRE_DIFFICULTES = ['facile', 'normal', 'difficile'];

// Prestiges (spec 022) : après Difficile, chaque niveau gonfle les PV (× 1,18 par niveau) et l'effectif (+ 10 % par niveau),
// retire des vies, raccourcit l'attente entre les vagues. Le dernier est « tout juste possible ».
export const NB_PRESTIGES = 10;
export const ORDRE_PRESTIGES = [];
for (let k = 1; k <= NB_PRESTIGES; k++) {
  const cle = 'prestige' + k;
  DIFFICULTES[cle] = {
    nom: 'Prestige ' + k, prestige: k,
    pv: Math.round(1.1 * 1.18 ** k * 100) / 100, nombre: Math.round((1 + 0.1 * k) * 100) / 100,
    or: 1, gain: 1 + 0.25 * k, vies: Math.max(5, 10 - Math.floor(k / 2)), compte: Math.max(8, 15 - k),
  };
  ORDRE_PRESTIGES.push(cle);
}
export const estPrestige = (d) => !!(DIFFICULTES[d] && DIFFICULTES[d].prestige);
