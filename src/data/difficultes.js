// Difficultés (spec 005). `pv` multiplie les PV des ennemis, `or` l'or de départ ; `compte` = secondes entre
// deux vagues.
export const DIFFICULTES = {
  facile:    { nom: 'Facile',    pv: 0.75, or: 1.3, vies: 30, compte: 24 },
  normal:    { nom: 'Normal',    pv: 1,    or: 1,   vies: 20, compte: 18 },
  difficile: { nom: 'Difficile', pv: 1.1,  or: 1,   vies: 10, compte: 15 },   // spec 010
};
export const ORDRE_DIFFICULTES = ['facile', 'normal', 'difficile'];
