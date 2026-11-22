// Tours. Portée en pixels (une case = 40), cadence = secondes entre deux tirs.
// `prix` : construction ; `ameliorations` : prix du niveau 2, puis du niveau 3.
// Niveaux 1 et 2 dans `niveaux` ; le niveau 3 est une spécialisation au choix, `a` ou `b` (spec 004),
// au même prix. Une spécialisation peut changer `volants` et `degat`.
//
// Effets reconnus par la logique (src/sim/partie.js) :
//   zone (rayon) · porteeMin · ralenti + duree · gel (secondes) · brulure { dps, duree } · perce (part d'armure
//   ignorée) · rebond { facteur, portee } · transperce (longueur derrière la cible) · salve (nombre de carreaux)
//   chaine { nombre, baisse, saut } (éclair instantané) · etourdit (secondes) · aura (effet sur toute la portée)
export const TOURS = {
  archers: {
    nom: 'Archers', touche: '1', prix: 70, ameliorations: [65, 120], volants: true, degat: 'physique',
    resume: 'Tir rapide, touche les volants',
    niveaux: [
      { degats: 8, cadence: 0.55, portee: 120 },
      { degats: 13, cadence: 0.48, portee: 132 },
    ],
    specialisations: {
      a: { nom: "Tireurs d'élite", resume: 'Très longue portée, gros dégâts', degats: 40, cadence: 1.2, portee: 200 },
      b: { nom: 'Arbalétriers', resume: 'Tir très rapide, perce la moitié de l’armure', degats: 12, cadence: 0.3, portee: 140, perce: 0.5 },
    },
  },
  canon: {
    nom: 'Canon', touche: '2', prix: 110, ameliorations: [95, 170], volants: false, degat: 'physique',
    resume: 'Dégâts de zone, pas les volants',
    niveaux: [
      { degats: 20, cadence: 1.6, portee: 110, zone: 42 },
      { degats: 34, cadence: 1.5, portee: 118, zone: 50 },
    ],
    specialisations: {
      a: { nom: 'Mortier', resume: 'Très longue portée, grande zone, rien de trop près', degats: 60, cadence: 2.4, portee: 180, porteeMin: 40, zone: 70 },
      b: { nom: 'Lance-flammes', resume: 'Flammes à courte portée qui brûlent', degats: 12, cadence: 0.3, portee: 90, zone: 40, brulure: { dps: 4, duree: 3 } },
    },
  },
  givre: {
    nom: 'Givre', touche: '3', prix: 90, ameliorations: [70, 120], volants: true, degat: 'magique',
    resume: 'Ralentit les ennemis',
    niveaux: [
      { degats: 3, cadence: 0.9, portee: 100, ralenti: 0.3, duree: 1.6 },
      { degats: 5, cadence: 0.85, portee: 110, ralenti: 0.4, duree: 1.9 },
    ],
    specialisations: {
      a: { nom: 'Blizzard', resume: 'Ralentit de 40 % tout ce qui est à portée', aura: true, degats: 2, cadence: 0.25, portee: 120, ralenti: 0.4, duree: 0.4 },
      b: { nom: 'Cristal éternel', resume: 'Gèle sa cible sur place', degats: 20, cadence: 3, portee: 120, gel: 1.2 },
    },
  },
  mage: {
    nom: 'Mage', touche: '4', prix: 130, ameliorations: [110, 190], volants: true, degat: 'magique',
    resume: 'Ignore l’armure',
    niveaux: [
      { degats: 28, cadence: 1.2, portee: 120 },
      { degats: 46, cadence: 1.1, portee: 130 },
    ],
    specialisations: {
      a: { nom: 'Arcanes', resume: 'Éclair puissant qui rebondit', degats: 110, cadence: 1.0, portee: 145, rebond: { facteur: 0.6, portee: 90 } },
      b: { nom: 'Pyromancien', resume: 'Boule de feu en zone qui brûle', degats: 60, cadence: 1.1, portee: 135, zone: 45, brulure: { dps: 6, duree: 3 } },
    },
  },
  baliste: {
    nom: 'Baliste', touche: '5', prix: 150, ameliorations: [120, 200], volants: true, degat: 'physique',
    resume: 'Longue portée, très gros dégâts',
    niveaux: [
      { degats: 60, cadence: 2.2, portee: 200 },
      { degats: 95, cadence: 2.0, portee: 220 },
    ],
    specialisations: {
      a: { nom: 'Baliste lourde', resume: 'Le carreau transperce les rangs', degats: 280, cadence: 2.4, portee: 240, transperce: 120 },
      b: { nom: 'Répétition', resume: 'Salve de trois carreaux', degats: 70, cadence: 1.8, portee: 220, salve: 3 },
    },
  },
  tempete: {
    nom: 'Tempête', touche: '6', prix: 160, ameliorations: [130, 210], volants: true, degat: 'magique',
    resume: 'Éclair qui saute d’ennemi en ennemi',
    niveaux: [
      { degats: 18, cadence: 1.4, portee: 110, chaine: { nombre: 5, baisse: 0.15, saut: 80 } },
      { degats: 28, cadence: 1.3, portee: 120, chaine: { nombre: 5, baisse: 0.15, saut: 80 } },
    ],
    specialisations: {
      a: { nom: 'Orage', resume: 'Chaîne de 8 ennemis', degats: 55, cadence: 1.2, portee: 130, chaine: { nombre: 8, baisse: 0.12, saut: 90 } },
      b: { nom: 'Paratonnerre', resume: 'Étourdit chaque ennemi touché', degats: 42, cadence: 1.2, portee: 130, chaine: { nombre: 5, baisse: 0.15, saut: 80 }, etourdit: 0.5 },
    },
  },
};

export const ORDRE_TOURS = ['archers', 'canon', 'givre', 'mage', 'baliste', 'tempete'];

export const CIBLAGES = {
  premier: 'Premier',
  dernier: 'Dernier',
  fort: 'Plus fort',
  proche: 'Plus proche',
};

/** Caractéristiques d'une tour posée : niveau 1 ou 2, ou sa spécialisation au niveau 3. */
export function statsTour(t) {
  const d = TOURS[t.sorte];
  const n = t.niveau < 2 ? d.niveaux[t.niveau] : d.specialisations[t.variante];
  return { volants: d.volants, degat: d.degat, ...n };
}
