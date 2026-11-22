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
  desert: { id: 'desert', nom: 'Le Désert', resume: 'Bientôt.', ouverte: false },
  montagne: { id: 'montagne', nom: 'La Montagne enneigée', resume: 'Bientôt.', ouverte: false },
};
