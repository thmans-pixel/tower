// Ennemis de l'étape 1. Vitesses en pixels par seconde (une case = 40), armure = part des dégâts physiques absorbée.
export const ENNEMIS = {
  gob:  { nom: 'Gobelin',       pluriel: 'Gobelins',       pv: 32, vitesse: 52, or: 6,  vies: 1, armure: 0 },
  loup: { nom: 'Loup',          pluriel: 'Loups',          pv: 24, vitesse: 95, or: 7,  vies: 1, armure: 0 },
  orc:  { nom: 'Orc blindé',    pluriel: 'Orcs blindés',   pv: 95, vitesse: 38, or: 14, vies: 2, armure: 0.5 },
  bat:  { nom: 'Chauve-souris', pluriel: 'Chauves-souris', pv: 26, vitesse: 68, or: 8,  vies: 1, armure: 0, vol: true },
  cham: { nom: 'Chaman',        pluriel: 'Chamans',        pv: 65, vitesse: 42, or: 16, vies: 1, armure: 0,
          soin: { rayon: 80, pv: 10, toutes: 1.2 } },
};

/** Points de vie multipliés à mesure que les vagues avancent. */
export const multPV = (vague) => 1 + 0.09 * (vague - 1) + 0.003 * (vague - 1) ** 2;
