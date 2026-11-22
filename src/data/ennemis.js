// Ennemis de l'étape 1. Vitesses en pixels par seconde (une case = 40), armure = part des dégâts physiques absorbée.
export const ENNEMIS = {
  gob:  { nom: 'Gobelin',       pluriel: 'Gobelins',       pv: 32, vitesse: 52, or: 6,  vies: 1, armure: 0 },
  loup: { nom: 'Loup',          pluriel: 'Loups',          pv: 24, vitesse: 95, or: 7,  vies: 1, armure: 0 },
  orc:  { nom: 'Orc blindé',    pluriel: 'Orcs blindés',   pv: 95, vitesse: 38, or: 14, vies: 2, armure: 0.5 },
  bat:  { nom: 'Chauve-souris', pluriel: 'Chauves-souris', pv: 26, vitesse: 68, or: 8,  vies: 1, armure: 0, vol: true },
  cham: { nom: 'Chaman',        pluriel: 'Chamans',        pv: 65, vitesse: 42, or: 16, vies: 1, armure: 0,
          soin: { rayon: 80, pv: 10, toutes: 1.2 } },
  // Étape 2, lot 2 (spec 004)
  slime: { nom: 'Slime', pluriel: 'Slimes', pv: 70, vitesse: 50, or: 8, vies: 1, armure: 0,
           division: { sorte: 'slime_petit', nombre: 2 } },
  slime_petit: { nom: 'Petit slime', pluriel: 'Petits slimes', pv: 25, vitesse: 75, or: 3, vies: 1, armure: 0 },
  golem: { nom: 'Golem', pluriel: 'Golems', pv: 320, vitesse: 24, or: 35, vies: 3, armure: 0.3 },
  spectre: { nom: 'Spectre', pluriel: 'Spectres', pv: 60, vitesse: 62, or: 12, vies: 1, armure: 0,
             invisible: { toutes: 5, duree: 2 } },
  ogre: { nom: 'Ogre chef de guerre', pluriel: 'Ogres chefs de guerre', pv: 1200, vitesse: 26, or: 250, vies: 10, armure: 0.25,
          boss: true, rugissement: { toutes: 10, rayon: 80, bonus: 0.3, duree: 3 } },
};

/** Tours qui voient un spectre invisible (la magie le révèle). */
export const VOIENT_INVISIBLE = ['mage', 'tempete'];

/** Points de vie multipliés à mesure que les vagues avancent. */
export const multPV = (vague) => 1 + 0.09 * (vague - 1) + 0.003 * (vague - 1) ** 2;
