// Progression du joueur (spec 005) : cartes débloquées, étoiles, meilleurs scores du mode infini.
// Données pures : la lecture et l'écriture dans le navigateur sont dans src/ui/sauvegarde.js.
export const ORDRE_CARTES = ['prairie', 'desert', 'montagne'];

export function progressionVide() {
  return { version: 1, debloquees: ['prairie'], etoiles: {}, infini: {}, difficulte: 'normal', son: true, infiniOuvert: false };
}

/** Étoiles d'une partie gagnée : 3 à 90 % des vies ou plus, 2 à 50 % ou plus, 1 sinon ; 0 si perdue. */
export function etoilesPartie(s) {
  if (s.fin !== 'victoire') return 0;
  const r = s.vies / s.viesDepart;
  return r >= 0.9 ? 3 : r >= 0.5 ? 2 : 1;
}

export const estDebloquee = (p, carte) => p.debloquees.includes(carte);

export const meilleuresEtoiles = (p, carte, difficulte) => (p.etoiles[carte] || {})[difficulte] || 0;

/**
 * Enregistre une victoire ; renvoie { progression, nouvelles: [cartes débloquées], infini: vrai si le mode infini
 * vient de s'ouvrir }. Ne modifie pas `p`.
 */
export function enregistrerVictoire(p, carte, difficulte, etoiles) {
  const q = structuredClone(p);
  q.etoiles[carte] = { ...(q.etoiles[carte] || {}) };
  q.etoiles[carte][difficulte] = Math.max(q.etoiles[carte][difficulte] || 0, etoiles);
  const nouvelles = [];
  const suivante = ORDRE_CARTES[ORDRE_CARTES.indexOf(carte) + 1];
  if (suivante && !q.debloquees.includes(suivante)) { q.debloquees.push(suivante); nouvelles.push(suivante); }
  const infini = carte === ORDRE_CARTES[ORDRE_CARTES.length - 1] && !q.infiniOuvert;
  if (infini) q.infiniOuvert = true;
  return { progression: q, nouvelles, infini };
}

/** Relit une progression enregistrée, en ignorant tout ce qui n'a pas la bonne forme. */
export function relire(brut) {
  const p = progressionVide();
  if (!brut || typeof brut !== 'object') return p;
  if (Array.isArray(brut.debloquees)) p.debloquees = [...new Set(['prairie', ...brut.debloquees.filter((c) => ORDRE_CARTES.includes(c))])];
  if (brut.etoiles && typeof brut.etoiles === 'object') {
    for (const c of ORDRE_CARTES) if (brut.etoiles[c]) {
      p.etoiles[c] = {};
      for (const [d, n] of Object.entries(brut.etoiles[c])) if (Number.isInteger(n) && n >= 0 && n <= 3) p.etoiles[c][d] = n;
    }
  }
  if (brut.infini && typeof brut.infini === 'object') for (const c of ORDRE_CARTES) if (Number.isInteger(brut.infini[c])) p.infini[c] = brut.infini[c];
  if (['facile', 'normal', 'difficile'].includes(brut.difficulte)) p.difficulte = brut.difficulte;
  if (typeof brut.son === 'boolean') p.son = brut.son;
  p.infiniOuvert = brut.infiniOuvert === true;
  return p;
}
