// Tours de l'étape 1. Portée en pixels, cadence = secondes entre deux tirs.
// `prix` : construction ; `ameliorations` : prix des niveaux 2 et 3.
export const TOURS = {
  archers: {
    nom: 'Archers', touche: '1', prix: 70, ameliorations: [65, 120], volants: true, degat: 'physique',
    resume: 'Tir rapide, touche les volants',
    niveaux: [
      { degats: 8, cadence: 0.55, portee: 120 },
      { degats: 13, cadence: 0.48, portee: 132 },
      { degats: 21, cadence: 0.40, portee: 145 },
    ],
  },
  canon: {
    nom: 'Canon', touche: '2', prix: 110, ameliorations: [95, 170], volants: false, degat: 'physique',
    resume: 'Dégâts de zone, pas les volants',
    niveaux: [
      { degats: 20, cadence: 1.6, portee: 110, zone: 42 },
      { degats: 34, cadence: 1.5, portee: 118, zone: 50 },
      { degats: 56, cadence: 1.4, portee: 126, zone: 58 },
    ],
  },
  givre: {
    nom: 'Givre', touche: '3', prix: 90, ameliorations: [70, 120], volants: true, degat: 'magique',
    resume: 'Ralentit les ennemis',
    niveaux: [
      { degats: 3, cadence: 0.9, portee: 100, ralenti: 0.3, duree: 1.6 },
      { degats: 5, cadence: 0.85, portee: 110, ralenti: 0.4, duree: 1.9 },
      { degats: 8, cadence: 0.8, portee: 120, ralenti: 0.5, duree: 2.2 },
    ],
  },
  mage: {
    nom: 'Mage', touche: '4', prix: 130, ameliorations: [110, 190], volants: true, degat: 'magique',
    resume: 'Ignore l’armure',
    niveaux: [
      { degats: 28, cadence: 1.2, portee: 120 },
      { degats: 46, cadence: 1.1, portee: 130 },
      { degats: 75, cadence: 1.0, portee: 140 },
    ],
  },
};

export const ORDRE_TOURS = ['archers', 'canon', 'givre', 'mage'];

export const CIBLAGES = {
  premier: 'Premier',
  dernier: 'Dernier',
  fort: 'Plus fort',
  proche: 'Plus proche',
};
