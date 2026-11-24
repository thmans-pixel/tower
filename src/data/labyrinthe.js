// Mode labyrinthe (spec 016) : chiffres du mode. Les zones agissent soit sur les monstres au sol qui passent
// dessus (`cible: 'monstre'`), soit sur la tour construite dessus (`cible: 'tour'`). Les volants les ignorent.
export const LABYRINTHE = {
  objectif: 100,          // vies à atteindre pour gagner
  orDepart: 250,
  prixMur: 5,             // revendu au prix plein
  partOr: 0.5,            // part de l'or habituel rendue par une mise à terre
  tailleVagues: 0.5,      // effectifs des vagues générées (1 = ceux du mode infini)
  multPV: 1,              // PV de base des monstres, multipliés (ils rapportent des vies : il faut qu'ils résistent)
  pvParVague: 0.06,       // PV en plus par vague : sans cela, la partie est gagnée en quelques vagues
  checkpoints: [3, 5],    // nombre de checkpoints : de 3 à 5
  paires: [1, 2],         // paires de téléporteurs : 1 ou 2
  nbZones: 8,
  formes: ['rond', 'losange'],   // une forme par paire de téléporteurs
};

export const ZONES = {
  // Sur les monstres
  boue:     { nom: 'Boue',        cible: 'monstre', vitesse: 0.6, description: 'Ralentit de 40 % les monstres qui la traversent.' },
  ronces:   { nom: 'Ronces',      cible: 'monstre', degats: 0.05, description: 'Blessent les monstres qui la traversent (5 % de leurs PV par seconde).' },
  sentier:  { nom: 'Sentier',     cible: 'monstre', vitesse: 1.3, description: 'Accélère de 30 % les monstres qui le traversent.' },
  source:   { nom: 'Source',      cible: 'monstre', soin: 0.1, description: 'Soigne les monstres qui la traversent (10 % de leurs PV par seconde).' },
  // Sur la tour construite dessus
  promontoire: { nom: 'Promontoire', cible: 'tour', portee: 1.25, description: 'La tour construite ici a 25 % de portée en plus.' },
  forge:       { nom: 'Forge',       cible: 'tour', degats: 1.25, description: 'La tour construite ici fait 25 % de dégâts en plus.' },
  marais:      { nom: 'Marais',      cible: 'tour', cadence: 0.75, description: 'La tour construite ici tire 25 % moins vite.' },
};
export const ORDRE_ZONES = Object.keys(ZONES);
