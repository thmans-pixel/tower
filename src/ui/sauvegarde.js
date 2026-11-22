// Sauvegarde de la progression dans le navigateur (localStorage). Tout est entouré de try/catch : si le
// navigateur refuse, le jeu marche quand même, sans mémoire.
import { relire } from '../sim/progression.js';

const CLE = 'tours-du-royaume';

export function charger() {
  try { return relire(JSON.parse(localStorage.getItem(CLE) || 'null')); } catch { return relire(null); }
}

export function enregistrer(p) {
  try { localStorage.setItem(CLE, JSON.stringify(p)); return true; } catch { return false; }
}

export function effacer() {
  try { localStorage.removeItem(CLE); } catch { /* rien à faire */ }
}
