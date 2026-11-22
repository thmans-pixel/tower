// Tours. Portée en pixels (une case = 40), cadence = secondes entre deux tirs.
// `prix` : construction ; `ameliorations` : prix du niveau 2, puis du niveau 3.
// `description` : une phrase par niveau et par spécialisation, affichée dans les fiches (spec 008).
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
      { degats: 8, cadence: 0.55, portee: 120, description: 'Une volée de flèches rapide et bon marché, qui touche aussi les volants.' },
      { degats: 13, cadence: 0.48, portee: 132, description: 'Arcs renforcés : plus de dégâts, un tir un peu plus rapide et plus lointain.' },
    ],
    specialisations: {
      a: { nom: "Tireurs d'élite", resume: 'Très longue portée, gros dégâts', description: 'Des tireurs postés qui visent de très loin et frappent fort, mais lentement : parfaits contre les gros ennemis.', degats: 40, cadence: 1.2, portee: 200 },
      b: { nom: 'Arbalétriers', resume: 'Tir très rapide, perce la moitié de l’armure', description: 'Une pluie de carreaux très rapide qui traverse la moitié de l’armure des orcs blindés.', degats: 12, cadence: 0.3, portee: 140, perce: 0.5 },
    },
  },
  canon: {
    nom: 'Canon', touche: '2', prix: 110, ameliorations: [95, 170], volants: false, degat: 'physique',
    resume: 'Dégâts de zone, pas les volants',
    niveaux: [
      { degats: 20, cadence: 1.6, portee: 110, zone: 42, description: 'Un boulet qui éclate et touche tout un groupe. Ne peut pas viser les volants.' },
      { degats: 34, cadence: 1.5, portee: 118, zone: 50, description: 'Boulets plus lourds : plus de dégâts et une explosion plus large.' },
    ],
    specialisations: {
      a: { nom: 'Mortier', resume: 'Très longue portée, grande zone, rien de trop près', description: 'Tire de très loin des obus qui frappent une grande zone, mais ne peut pas viser ce qui est tout près de lui.', degats: 60, cadence: 2.4, portee: 180, porteeMin: 40, zone: 70 },
      b: { nom: 'Lance-flammes', resume: 'Flammes à courte portée qui brûlent', description: 'Crache des flammes à courte portée sur tout un groupe ; les ennemis touchés continuent de brûler.', degats: 12, cadence: 0.3, portee: 90, zone: 40, brulure: { dps: 4, duree: 3 } },
    },
  },
  givre: {
    nom: 'Givre', touche: '3', prix: 90, ameliorations: [70, 120], volants: true, degat: 'magique',
    resume: 'Ralentit les ennemis',
    niveaux: [
      { degats: 3, cadence: 0.9, portee: 100, ralenti: 0.3, duree: 1.6, description: 'Un trait de glace qui ralentit sa cible : peu de dégâts, mais les autres tours ont plus de temps pour tirer.' },
      { degats: 5, cadence: 0.85, portee: 110, ralenti: 0.4, duree: 1.9, description: 'Glace plus froide : ralentit plus fort, plus longtemps et d’un peu plus loin.' },
    ],
    specialisations: {
      a: { nom: 'Blizzard', resume: 'Ralentit de 40 % tout ce qui est à portée', description: 'Un froid permanent qui ralentit tous les ennemis à portée en même temps, sans avoir à viser.', aura: true, degats: 2, cadence: 0.25, portee: 120, ralenti: 0.4, duree: 0.4 },
      b: { nom: 'Cristal éternel', resume: 'Gèle sa cible sur place', description: 'Enferme sa cible dans la glace : elle s’arrête net. Le boss, lui, est seulement ralenti.', degats: 20, cadence: 3, portee: 120, gel: 1.2 },
    },
  },
  mage: {
    nom: 'Mage', touche: '4', prix: 130, ameliorations: [110, 190], volants: true, degat: 'magique',
    resume: 'Ignore l’armure',
    niveaux: [
      { degats: 28, cadence: 1.2, portee: 120, description: 'Une boule magique qui ignore l’armure et voit le Spectre même invisible.' },
      { degats: 46, cadence: 1.1, portee: 130, description: 'Sorts plus puissants : beaucoup plus de dégâts, lancés un peu plus vite.' },
    ],
    specialisations: {
      a: { nom: 'Arcanes', resume: 'Éclair puissant qui rebondit', description: 'Un éclair très puissant qui rebondit sur un second ennemi proche.', degats: 110, cadence: 1.0, portee: 145, rebond: { facteur: 0.6, portee: 90 } },
      b: { nom: 'Pyromancien', resume: 'Boule de feu en zone qui brûle', description: 'Une boule de feu qui explose sur un groupe et laisse les ennemis en feu.', degats: 60, cadence: 1.1, portee: 135, zone: 45, brulure: { dps: 6, duree: 3 } },
    },
  },
  baliste: {
    nom: 'Baliste', touche: '5', prix: 150, ameliorations: [120, 200], volants: true, degat: 'physique',
    resume: 'Longue portée, très gros dégâts',
    niveaux: [
      { degats: 60, cadence: 2.2, portee: 200, description: 'Un énorme carreau tiré de très loin : très gros dégâts, mais lentement.' },
      { degats: 95, cadence: 2.0, portee: 220, description: 'Arc d’acier : encore plus de dégâts et de portée.' },
    ],
    specialisations: {
      a: { nom: 'Baliste lourde', resume: 'Le carreau transperce les rangs', description: 'Un carreau géant qui traverse tous les ennemis alignés derrière sa cible.', degats: 280, cadence: 2.4, portee: 240, transperce: 120 },
      b: { nom: 'Répétition', resume: 'Salve de trois carreaux', description: 'Trois carreaux tirés d’affilée à chaque salve, pour ne rien laisser passer.', degats: 70, cadence: 1.8, portee: 220, salve: 3 },
    },
  },
  tempete: {
    nom: 'Tempête', touche: '6', prix: 160, ameliorations: [130, 210], volants: true, degat: 'magique',
    resume: 'Éclair qui saute d’ennemi en ennemi',
    niveaux: [
      { degats: 18, cadence: 1.4, portee: 110, chaine: { nombre: 5, baisse: 0.15, saut: 80 }, description: 'Un éclair qui saute d’ennemi en ennemi (5 au plus) et voit le Spectre même invisible.' },
      { degats: 28, cadence: 1.3, portee: 120, chaine: { nombre: 5, baisse: 0.15, saut: 80 }, description: 'Orage plus fort : plus de dégâts et de portée.' },
    ],
    specialisations: {
      a: { nom: 'Orage', resume: 'Chaîne de 8 ennemis', description: 'Une chaîne énorme qui frappe jusqu’à 8 ennemis et perd moins de force à chaque saut.', degats: 55, cadence: 1.2, portee: 130, chaine: { nombre: 8, baisse: 0.12, saut: 90 } },
      b: { nom: 'Paratonnerre', resume: 'Étourdit chaque ennemi touché', description: 'Chaque ennemi touché par l’éclair est étourdi un instant et s’arrête.', degats: 42, cadence: 1.2, portee: 130, chaine: { nombre: 5, baisse: 0.15, saut: 80 }, etourdit: 0.5 },
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
