// Raccourcis par position de touche (spec 007) : la rangée du haut choisit les tours (1 à 6) et les pouvoirs
// (7, 8), que le clavier soit AZERTY (& é " ' ( - è _) ou QWERTY, avec ou sans Maj ; le pavé numérique aussi.
// En mode labyrinthe (spec 016), la 7 est le Mur et les pouvoirs passent en 8 et 9.
export const TOUCHES_AZERTY = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç'];

/** Rang 1 à 9 de la touche (position sur la rangée du haut ou pavé numérique), ou 0. */
export function rangDeTouche(e) {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
  return m ? Number(m[1]) : 0;
}

/** Étiquette affichée pour le rang n : « & 1 ». */
export const etiquetteRang = (n) => `${TOUCHES_AZERTY[n - 1]} ${n}`;
