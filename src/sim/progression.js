// Progression du joueur (spec 005) : cartes débloquées, étoiles, meilleurs scores du mode infini.
// Données pures : la lecture et l'écriture dans le navigateur sont dans src/ui/sauvegarde.js.
import { DIFFICULTES, NB_PRESTIGES, estPrestige } from '../data/difficultes.js';
import { formePseudo } from '../data/pseudos.js';

export const ORDRE_CARTES = ['prairie', 'desert', 'montagne'];

export function progressionVide() {
  return { version: 1, debloquees: ['prairie'], etoiles: {}, infini: {}, aleatoires: {}, labyrinthe: {}, reglesLaby: 2, difficulte: 'normal', son: true, volMusique: 0.6, volEffets: 0.8, effetsReduits: false, vivaldi: false, prestige: 0, barresVie: false, infiniOuvert: false, enfant: false, ageRepondu: false, pseudo: '', pseudoEnfant: '' };
}

/** Étoiles d'une partie gagnée : 3 à 90 % des vies ou plus, 2 à 50 % ou plus, 1 sinon ; 0 si perdue. */
export function etoilesPartie(s) {
  if (s.fin !== 'victoire') return 0;
  const r = s.vies / s.viesDepart;
  return r >= 0.9 ? 3 : r >= 0.5 ? 2 : 1;
}

export const estDebloquee = (p, carte) => p.debloquees.includes(carte);

/**
 * Plus haut prestige ouvert (0 = aucun) : le 1er après une victoire en Difficile sur une carte, chaque suivant après
 * avoir gagné le précédent (`p.prestige` = plus haut prestige gagné).
 */
export function prestigeOuvert(p) {
  const difficileGagne = Object.values(p.etoiles).some((e) => e && e.difficile > 0);
  if (!difficileGagne && !(p.prestige > 0)) return 0;
  return Math.min(NB_PRESTIGES, Math.max(1, (p.prestige || 0) + 1));
}

/** Une difficulté est choisissable : les trois d'origine toujours, un prestige une fois ouvert. */
export function difficulteOuverte(p, d) {
  if (!DIFFICULTES[d]) return false;
  return !estPrestige(d) || DIFFICULTES[d].prestige <= prestigeOuvert(p);
}

export const meilleuresEtoiles = (p, carte, difficulte) => (p.etoiles[carte] || {})[difficulte] || 0;

/**
 * Enregistre une victoire ; renvoie { progression, nouvelles: [cartes débloquées], infini: vrai si le mode infini
 * vient de s'ouvrir }. Ne modifie pas `p`.
 */
export function enregistrerVictoire(p, carte, difficulte, etoiles) {
  const q = structuredClone(p);
  q.etoiles[carte] = { ...(q.etoiles[carte] || {}) };
  q.etoiles[carte][difficulte] = Math.max(q.etoiles[carte][difficulte] || 0, etoiles);
  if (estPrestige(difficulte) && etoiles > 0) q.prestige = Math.max(q.prestige || 0, DIFFICULTES[difficulte].prestige);
  const nouvelles = [];
  const suivante = ORDRE_CARTES[ORDRE_CARTES.indexOf(carte) + 1];
  if (suivante && !q.debloquees.includes(suivante)) { q.debloquees.push(suivante); nouvelles.push(suivante); }
  const infini = carte === ORDRE_CARTES[ORDRE_CARTES.length - 1] && !q.infiniOuvert;
  if (infini) q.infiniOuvert = true;
  return { progression: q, nouvelles, infini };
}

/** Les cartes aléatoires s'ouvrent une fois la Prairie gagnée (spec 007). */
export const aleatoireOuvert = (p) => p.debloquees.includes('desert');

/** Compte une carte aléatoire gagnée dans cette difficulté. */
export function enregistrerAleatoire(p, difficulte) {
  const q = structuredClone(p);
  q.aleatoires[difficulte] = (q.aleatoires[difficulte] || 0) + 1;
  return q;
}

/** Garde le meilleur score du mode infini d'une carte ; renvoie { progression, record: vrai si battu }. */
export function enregistrerInfini(p, carte, score) {
  const q = structuredClone(p);
  const record = score > (q.infini[carte] || 0);
  if (record) q.infini[carte] = score;
  return { progression: q, record };
}

/**
 * Labyrinthe (spec 016) : garde, par difficulté, le plus petit nombre de vagues qu'il a fallu pour gagner.
 * Renvoie { progression, record: vrai si battu (ou premier) }.
 */
export function enregistrerLabyrinthe(p, difficulte, vagues) {
  const q = structuredClone(p);
  const ancien = q.labyrinthe[difficulte] || 0;
  const record = vagues > 0 && (!ancien || vagues < ancien);
  if (record) q.labyrinthe[difficulte] = vagues;
  return { progression: q, record };
}

/** Le mode infini se joue sur une carte gagnée au moins une fois, une fois la Montagne battue. */
export const infiniJouable = (p, carte) => p.infiniOuvert && Object.values(p.etoiles[carte] || {}).some((n) => n > 0);

/** Relit une progression enregistrée, en ignorant tout ce qui n'a pas la bonne forme. */
export function relire(brut) {
  const p = progressionVide();
  if (!brut || typeof brut !== 'object') return p;
  if (Array.isArray(brut.debloquees)) p.debloquees = [...new Set(['prairie', ...brut.debloquees.filter((c) => ORDRE_CARTES.includes(c))])];
  if (brut.etoiles && typeof brut.etoiles === 'object') {
    for (const c of ORDRE_CARTES) if (brut.etoiles[c]) {
      p.etoiles[c] = {};
      for (const [d, n] of Object.entries(brut.etoiles[c])) if (DIFFICULTES[d] && Number.isInteger(n) && n >= 0 && n <= 3) p.etoiles[c][d] = n;
    }
  }
  if (brut.infini && typeof brut.infini === 'object') for (const c of ORDRE_CARTES) if (Number.isInteger(brut.infini[c])) p.infini[c] = brut.infini[c];
  if (brut.aleatoires && typeof brut.aleatoires === 'object') for (const d of ['facile', 'normal', 'difficile']) if (Number.isInteger(brut.aleatoires[d])) p.aleatoires[d] = brut.aleatoires[d];
  // Records du labyrinthe : seulement ceux faits avec les règles de la spec 017 (population, obstacles) ; les autres sont effacés.
  if (brut.reglesLaby === 2 && brut.labyrinthe && typeof brut.labyrinthe === 'object') for (const d of ['facile', 'normal', 'difficile']) if (Number.isInteger(brut.labyrinthe[d]) && brut.labyrinthe[d] > 0) p.labyrinthe[d] = brut.labyrinthe[d];
  if (typeof brut.son === 'boolean') p.son = brut.son;
  if (typeof brut.effetsReduits === 'boolean') p.effetsReduits = brut.effetsReduits;
  if (Number.isInteger(brut.prestige) && brut.prestige >= 0) p.prestige = Math.min(NB_PRESTIGES, brut.prestige);
  if (typeof brut.barresVie === 'boolean') p.barresVie = brut.barresVie;
  if (typeof brut.vivaldi === 'boolean') p.vivaldi = brut.vivaldi;
  for (const k of ['volMusique', 'volEffets']) if (typeof brut[k] === 'number' && brut[k] >= 0 && brut[k] <= 1) p[k] = brut[k];
  p.infiniOuvert = brut.infiniOuvert === true;
  // Hall of fame (spec 018) : la case « enfant » et les pseudos retenus (même forme que celle que le serveur accepte).
  p.enfant = brut.enfant === true;
  p.ageRepondu = p.enfant || brut.ageRepondu === true;   // l'écran de fin ne propose le pseudo libre qu'après avoir demandé l'âge
  if (formePseudo(brut.pseudo)) p.pseudo = brut.pseudo;
  if (formePseudo(brut.pseudoEnfant)) p.pseudoEnfant = brut.pseudoEnfant;   // le pseudo proposé (« Renard Bleu 27 ») ou un pseudo libre
  if (difficulteOuverte(p, brut.difficulte)) p.difficulte = brut.difficulte;   // un prestige non ouvert retombe sur Normal
  return p;
}
