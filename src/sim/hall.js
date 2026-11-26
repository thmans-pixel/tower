// Hall of fame (spec 018) : ce que la logique sait dire d'une partie finie, et les pseudos. Pur : aucun réseau.
import { ANIMAUX, COULEURS, NOMBRE_MAX, formePseudo } from '../data/pseudos.js';
import { scoreInfini, classement } from './partie.js';
import { hasard } from './hasard.js';
import { ORDRE_DIFFICULTES } from '../data/difficultes.js';

export const CLASSEMENTS = ['tour', 'labyrinthe', 'infini', 'campagne'];
const CARTES_CLASSEES = ['prairie', 'desert', 'montagne'];

/**
 * Résultats classables d'une partie finie : liste de { classement, carte, difficulte, valeur, ... }, prête à envoyer
 * (sans pseudo). `idCarte` : 'prairie' | 'desert' | 'montagne' | 'labyrinthe', ou la description d'une carte
 * aléatoire (qui ne donne rien). Ne modifie pas la partie.
 */
export function scoreHall(s, idCarte) {
  if (!s || !s.fin) return [];
  if (!ORDRE_DIFFICULTES.includes(s.difficulte)) return [];   // prestiges : pas de classement (le serveur ne les connaît pas)
  const maze = !!s.labyrinthe;
  if (!maze && !CARTES_CLASSEES.includes(idCarte)) return [];   // carte aléatoire : jamais classée
  const r = [];
  const vagues = s.vague;
  const mode = maze ? 'labyrinthe' : s.infini ? 'infini' : 'campagne';
  const meilleure = s.tours.length ? classement(s)[0] : null;
  if (meilleure && meilleure.degats >= 1 && vagues >= 1) {
    r.push({ classement: 'tour', carte: maze ? 'labyrinthe' : idCarte, difficulte: s.difficulte, mode,
      tour: meilleure.sorte, vagues, valeur: Math.floor(meilleure.degats) });
  }
  if (maze) {
    if (s.fin === 'victoire' && vagues >= 1) r.push({ classement: 'labyrinthe', difficulte: s.difficulte, valeur: vagues });
  } else if (s.infini) {
    const v = scoreInfini(s);
    if (v >= 1) r.push({ classement: 'infini', carte: idCarte, difficulte: s.difficulte, valeur: v });
  } else if (s.fin === 'victoire' && s.vies >= 1) {
    r.push({ classement: 'campagne', carte: idCarte, difficulte: s.difficulte, valeur: s.vies });
  }
  return r;
}

/** Pseudo d'enfant proposé : « Renard Bleu 27 ». Même graine, même pseudo. */
export function pseudoEnfant(graine) {
  const h = hasard(graine);
  const pick = (l) => l[Math.floor(h() * l.length) % l.length];
  return `${pick(ANIMAUX)} ${pick(COULEURS)} ${1 + Math.floor(h() * NOMBRE_MAX) % NOMBRE_MAX}`;
}

/** Le pseudo proposé par le jeu : « Animal Couleur nombre ». */
export function pseudoEnfantValide(p) {
  if (typeof p !== 'string') return false;
  const m = p.split(' ');
  return m.length === 3 && ANIMAUX.includes(m[0]) && COULEURS.includes(m[1]) && /^[1-9][0-9]?$/.test(m[2]) && +m[2] <= NOMBRE_MAX;
}

/** Pseudo d'enfant que le jeu veut bien envoyer : celui qu'il propose, ou un pseudo libre bien formé (le serveur refuse les prénoms et les noms). */
export function pseudoEnfantEnvoyable(p) {
  return pseudoEnfantValide(p) || formePseudo(p);
}

/** Forme d'un pseudo d'adulte (le serveur filtre en plus les mots interdits). */
export function pseudoValide(t) {
  return formePseudo(t) && !pseudoEnfantValide(t);   // la forme « Animal Couleur nombre » est réservée aux enfants
}
