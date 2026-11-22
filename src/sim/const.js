// Dimensions communes à la logique et à l'affichage.
export const T = 40;          // taille d'une case en pixels de jeu
export const COLS = 24;
export const ROWS = 16;
export const W = COLS * T;    // 960
export const H = ROWS * T;    // 640
export const DT = 1 / 60;     // pas fixe de la logique

export const COMPTE_VAGUE = 18;   // secondes avant la vague suivante en Normal (voir src/data/difficultes.js)
export const BONUS_AVANCE = 2;    // or par seconde gagnée en appelant la vague plus tôt
export const REVENTE = 0.7;       // part du prix rendue à la vente
export const ECART_GROUPES = 1.2; // secondes entre deux groupes d'une même vague
