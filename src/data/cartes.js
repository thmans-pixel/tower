// Cartes. Le chemin est une suite de cases (colonne, ligne) reliées en ligne droite ; la première est hors de
// l'écran (entrée des ennemis), la dernière est la porte du château.
// Une vague = suite de groupes [ennemi, nombre, secondes entre deux ennemis], lancés l'un après l'autre.
const VAGUES_PRAIRIE = [
  [['gob', 8, 1.1]],
  [['gob', 12, 0.9]],
  [['gob', 8, 0.9], ['loup', 5, 0.8]],
  [['loup', 10, 0.7], ['gob', 6, 0.8]],
  [['gob', 10, 0.8], ['orc', 4, 1.6]],
  [['slime', 6, 1.0], ['gob', 8, 0.7]],
  [['loup', 8, 0.6], ['orc', 6, 1.4], ['slime', 4, 1.0]],
  [['gob', 12, 0.6], ['cham', 3, 1.8], ['orc', 4, 1.4]],
  [['bat', 12, 0.7], ['loup', 6, 0.6], ['slime', 6, 0.9]],
  [['gob', 10, 0.6], ['orc', 4, 1.4], ['ogre', 1, 2], ['cham', 2, 1.5]],                  // boss
  [['loup', 20, 0.45], ['bat', 6, 0.8], ['slime', 8, 0.8]],
  [['golem', 2, 3], ['gob', 12, 0.5], ['cham', 3, 1.4]],
  [['spectre', 6, 1.0], ['bat', 10, 0.6], ['orc', 4, 1.2]],
  [['gob', 25, 0.35], ['loup', 10, 0.45], ['slime', 8, 0.7]],
  [['golem', 4, 2.5], ['orc', 8, 1.0], ['cham', 6, 1.2]],
  [['spectre', 8, 0.8], ['loup', 12, 0.45], ['bat', 8, 0.5]],
  [['golem', 4, 2.4], ['orc', 8, 1.0], ['cham', 4, 1.3], ['slime', 8, 0.7]],
  [['bat', 14, 0.5], ['spectre', 5, 0.9], ['orc', 6, 1.0]],
  [['loup', 20, 0.35], ['golem', 4, 2.4], ['cham', 5, 1.1]],
  [['gob', 20, 0.3], ['bat', 15, 0.4], ['orc', 12, 0.8], ['golem', 4, 2.0], ['ogre', 1, 2], ['cham', 8, 0.9]],  // boss
];

const VAGUES_DESERT = [
  [['gob', 10, 1.0]],
  [['gob', 12, 0.8], ['loup', 4, 0.8]],
  [['loup', 10, 0.7], ['gob', 8, 0.7]],
  [['gob', 10, 0.7], ['orc', 4, 1.4]],
  [['slime', 6, 1.0], ['gob', 10, 0.6]],
  [['bat', 10, 0.7], ['loup', 8, 0.6]],
  [['orc', 8, 1.2], ['cham', 3, 1.6], ['gob', 8, 0.6]],
  [['slime', 10, 0.8], ['loup', 10, 0.5]],
  [['bat', 12, 0.6], ['orc', 6, 1.1], ['cham', 3, 1.5]],
  [['gob', 12, 0.5], ['orc', 6, 1.2], ['ogre', 1, 2], ['cham', 3, 1.4]],                  // boss
  [['golem', 3, 2.76], ['loup', 17, 0.41], ['slime', 7, 0.74]],
  [['spectre', 7, 0.83], ['bat', 12, 0.55], ['gob', 15, 0.45]],
  [['orc', 12, 0.92], ['cham', 6, 1.19], ['slime', 9, 0.64]],
  [['loup', 29, 0.32], ['bat', 9, 0.55]],
  [['golem', 5, 2.21], ['orc', 9, 0.92], ['cham', 6, 1.1]],
  [['spectre', 9, 0.74], ['loup', 17, 0.37], ['bat', 12, 0.45]],
  [['gob', 36, 0.28], ['slime', 12, 0.55], ['cham', 5, 1.1]],
  [['golem', 6, 2.02], ['orc', 12, 0.83], ['spectre', 5, 0.92]],
  [['bat', 21, 0.41], ['loup', 21, 0.32], ['cham', 5, 1.1]],
  [['orc', 12, 0.83], ['golem', 3, 2.21], ['ogre', 1, 2], ['cham', 7, 0.92], ['spectre', 5, 0.92]],  // boss
  [['loup', 29, 0.28], ['slime', 15, 0.55], ['bat', 12, 0.45]],
  [['golem', 7, 1.84], ['orc', 15, 0.74], ['cham', 7, 0.92]],
  [['spectre', 12, 0.64], ['bat', 19, 0.41], ['loup', 17, 0.37]],
  [['golem', 7, 1.84], ['gob', 36, 0.28], ['cham', 7, 0.92], ['slime', 12, 0.55]],
  [['orc', 17, 0.74], ['golem', 6, 1.84], ['spectre', 7, 0.83], ['ogre', 1, 2], ['cham', 9, 0.83], ['bat', 17, 0.41]],  // boss
];

import { VAGUES_MONTAGNE } from './vagues.js';

export const CARTES = {
  prairie: {
    id: 'prairie', nom: 'La Prairie', resume: 'Un chemin sinueux à travers les prés.',
    ouverte: true, orDepart: 250, graine: 7,
    vagues: VAGUES_PRAIRIE,
    chemin: [[-1, 3], [5, 3], [5, 11], [10, 11], [10, 4], [15, 4], [15, 12], [19, 12], [19, 7], [20, 7]],
    chateau: { c: 21, r: 5, l: 3, h: 5 },
    entree: { c: 0, r: 2, l: 1, h: 3 },
    decor: { arbre: 14, sapin: 8, buisson: 6, souche: 3, rocher: 5, rocher_gros: 2, petit_rocher: 5, fleurs: 16, herbes: 12 },
  },
  desert: {
    id: 'desert', nom: 'Le Désert', resume: 'Deux entrées, un seul fort à tenir.',
    ouverte: true, orDepart: 280, graine: 11,
    vagues: VAGUES_DESERT,
    // Deux chemins qui se rejoignent en (12, 7) puis partagent la fin du trajet jusqu'à la forteresse.
    chemins: [
      [[-1, 2], [7, 2], [7, 7], [12, 7], [12, 4], [17, 4], [17, 11], [19, 11], [19, 7], [20, 7]],
      [[-1, 13], [5, 13], [5, 9], [12, 9], [12, 4], [17, 4], [17, 11], [19, 11], [19, 7], [20, 7]],
    ],
    chateau: { c: 21, r: 5, l: 3, h: 5 },
    entrees: [{ c: 0, r: 1, l: 1, h: 3 }, { c: 0, r: 12, l: 1, h: 3 }],
    noms: { chateau: 'forteresse', entrees: ['entree_nord', 'entree_sud'] },
    sol: { fond: '#e3c27a', taches: ['#d4b26a', '#ecd08c'], chemin: '#c9a35c', cailloux: ['#b08d57', '#e8d29a'] },
    decor: { cactus: 12, palmier: 5, rocher: 5, rocher_gros: 2, dune: 4, oasis: 1, petit_rocher: 6, touffe: 12 },
  },
  montagne: {
    id: 'montagne', nom: 'La Montagne enneigée', resume: 'Un long chemin en lacets ; la neige ralentit tout le monde.',
    ouverte: true, orDepart: 300, graine: 23, vitesse: 0.9,
    pvParVague: 0.017,   // chemin très long : ennemis de plus en plus solides (+50 % à la vague 30)
    vagues: VAGUES_MONTAGNE,
    chemin: [[-1, 2], [4, 2], [4, 13], [8, 13], [8, 2], [12, 2], [12, 13], [16, 13], [16, 2], [19, 2], [19, 7], [20, 7]],
    chateau: { c: 21, r: 5, l: 3, h: 5 },
    entree: { c: 0, r: 1, l: 1, h: 3 },
    noms: { chateau: 'fort', entrees: ['entree'] },
    ponts: [[8, 8]],
    sol: { fond: '#eef3f8', taches: ['#dce6ef', '#f8fbfd'], chemin: '#b8c8d8', cailloux: ['#9aaabb', '#d4dee8'] },
    decor: { sapin_neige: 16, rocher: 5, rocher_gros: 2, congere: 4, lac: 1, petit_rocher: 6, touffe: 10 },
  },
};
