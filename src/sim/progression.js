// Progression du joueur (spec 005) : cartes débloquées, étoiles, meilleurs scores du mode infini.
// Données pures : la lecture et l'écriture dans le navigateur sont dans src/ui/sauvegarde.js.
export const ORDRE_CARTES = ['prairie', 'desert', 'montagne'];

export function progressionVide() {
  return { version: 1, debloquees: ['prairie'], etoiles: {}, infini: {}, aleatoires: {}, difficulte: 'normal', son: true, effetsReduits: false, infiniOuvert: false };
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
      for (const [d, n] of Object.entries(brut.etoiles[c])) if (Number.isInteger(n) && n >= 0 && n <= 3) p.etoiles[c][d] = n;
    }
  }
  if (brut.infini && typeof brut.infini === 'object') for (const c of ORDRE_CARTES) if (Number.isInteger(brut.infini[c])) p.infini[c] = brut.infini[c];
  if (['facile', 'normal', 'difficile'].includes(brut.difficulte)) p.difficulte = brut.difficulte;
  if (brut.aleatoires && typeof brut.aleatoires === 'object') for (const d of ['facile', 'normal', 'difficile']) if (Number.isInteger(brut.aleatoires[d])) p.aleatoires[d] = brut.aleatoires[d];
  if (typeof brut.son === 'boolean') p.son = brut.son;
  if (typeof brut.effetsReduits === 'boolean') p.effetsReduits = brut.effetsReduits;
  p.infiniOuvert = brut.infiniOuvert === true;
  return p;
}
