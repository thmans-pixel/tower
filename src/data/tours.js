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

// Niveau ultime (spec 023, niveau 4) : réservé aux prestiges. Il prolonge la spécialisation choisie (`a` ou `b`) pour `prixUltime`
// or, avec des caractéristiques complètes et un effet en plus. Effets nouveaux reconnus par la logique :
//   critique { tous, facteur } (un tir sur `tous`) · fragilise (part de dégâts en plus subie par les ralentis, aura) ·
//   gelBoss (ralenti du boss) · gelZone (rayon : les voisins gèlent aussi) · second (secondes avant un 2e obus) ·
//   brulure.propage (rayon) · brulure.explose { rayon, degats } · rebond.nombre · execute (part de PV) ·
//   étourdit le boss : etourdirBoss (secondes) · ralenti + duree sur une chaîne.
const ULTIMES = {
  archers: { prix: 3000,
    a: { nom: 'Œil de faucon', resume: 'Un tir sur trois est critique', description: 'Un tir sur trois est un coup critique (dégâts × 3), et la portée s’allonge encore.', degats: 110, cadence: 1.0, portee: 260, critique: { tous: 3, facteur: 3 } },
    b: { nom: 'Pluie d’acier', resume: 'Ignore toute l’armure et transperce', description: 'Les carreaux ignorent toute l’armure et traversent les ennemis alignés.', degats: 32, cadence: 0.26, portee: 150, perce: 1, transperce: 60 } },
  givre: { prix: 3500,
    a: { nom: 'Âge glaciaire', resume: 'Ralentit de 60 %, les ralentis subissent + 25 %', description: 'Un froid qui ralentit de 60 % tout ce qui est à portée ; les ennemis ralentis subissent 25 % de dégâts en plus de toutes les tours.', aura: true, degats: 6, cadence: 0.25, portee: 135, ralenti: 0.6, duree: 0.4, fragilise: 0.25 },
    b: { nom: 'Zéro absolu', resume: 'Gel de 2,2 s, gèle les voisins', description: 'Gèle sa cible 2,2 s, et les ennemis voisins avec elle. Le boss est ralenti de 60 %.', degats: 60, cadence: 2.6, portee: 135, gel: 2.2, gelBoss: 0.6, gelZone: 55 } },
  canon: { prix: 4000,
    a: { nom: 'Pilonnage', resume: 'Chaque obus en annonce un second', description: 'Chaque obus est suivi d’un second, 0,4 s plus tard au même endroit, sur une zone plus large.', degats: 170, cadence: 2.2, portee: 200, porteeMin: 40, zone: 90, second: 0.4 },
    b: { nom: 'Dragon', resume: 'Brûlure féroce qui se propage', description: 'Des flammes plus longues dont la brûlure est féroce et gagne les ennemis voisins.', degats: 32, cadence: 0.28, portee: 110, zone: 50, brulure: { dps: 14, duree: 3, propage: 50 } } },
  mage: { prix: 5000,
    a: { nom: 'Foudre sacrée', resume: 'L’éclair rebondit 3 fois sans s’affaiblir', description: 'Un éclair qui rebondit sur 3 ennemis sans rien perdre de sa force.', degats: 300, cadence: 0.95, portee: 160, rebond: { facteur: 1, portee: 100, nombre: 3 } },
    b: { nom: 'Météore', resume: 'Grande boule de feu, les brûlés explosent', description: 'Une boule de feu énorme ; un ennemi qui meurt en brûlant explose et blesse ses voisins.', degats: 165, cadence: 1.0, portee: 150, zone: 72, brulure: { dps: 18, duree: 4, explose: { rayon: 55, degats: 150 } } } },
  baliste: { prix: 6500,
    a: { nom: 'Lance de titan', resume: 'Transperce loin, achève sous 8 % de PV', description: 'Le carreau traverse tout sur une longue ligne et achève d’un coup un ennemi sous 8 % de PV (pas le boss).', degats: 760, cadence: 2.2, portee: 260, transperce: 240, execute: 0.08 },
    b: { nom: 'Mitrailleuse', resume: 'Salve de six carreaux', description: 'Six carreaux tirés à chaque salve, chacun avec de gros dégâts.', degats: 110, cadence: 1.7, portee: 240, salve: 6 } },
  tempete: { prix: 8000,
    a: { nom: 'Tempête parfaite', resume: 'Chaîne de 14 sans perte, ralentit', description: 'Une chaîne de 14 ennemis sans perte de force ; chaque ennemi touché est ralenti de 30 %.', degats: 150, cadence: 1.1, portee: 145, chaine: { nombre: 14, baisse: 0, saut: 100 }, ralenti: 0.3, duree: 1.5 },
    b: { nom: 'Colère divine', resume: 'Étourdit longtemps, même le boss', description: 'Chaque ennemi touché est étourdi 1,5 s ; le boss lui-même est arrêté 0,5 s par éclair.', degats: 115, cadence: 1.1, portee: 145, chaine: { nombre: 6, baisse: 0.1, saut: 90 }, etourdit: 1.5, etourdirBoss: 0.5 } },
};
for (const [k, u] of Object.entries(ULTIMES)) { TOURS[k].prixUltime = u.prix; TOURS[k].ultimes = { a: u.a, b: u.b }; }

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
  const n = t.niveau < 2 ? d.niveaux[t.niveau] : t.niveau === 2 ? d.specialisations[t.variante] : d.ultimes[t.variante];
  return { volants: d.volants, degat: d.degat, ...n };
}
