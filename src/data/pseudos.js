// Pseudos des enfants (spec 018) : « Animal Couleur nombre », jamais de texte libre. Mêmes listes que
// tools/hall/regles.json (un test vérifie qu'elles sont identiques). Les noms sont au masculin : pas d'accord à faire.
export const ANIMAUX = ['Renard', 'Loup', 'Ours', 'Lapin', 'Hibou', 'Dragon', 'Lion', 'Tigre', 'Panda', 'Dauphin', 'Faucon', 'Hérisson', 'Castor', 'Lynx', 'Cerf', 'Phoque'];
export const COULEURS = ['Bleu', 'Rouge', 'Vert', 'Jaune', 'Rose', 'Orange', 'Violet', 'Blanc', 'Noir', 'Gris', 'Doré', 'Argenté'];
export const NOMBRE_MAX = 99;

// Pseudos des adultes : de 3 à 16 caractères, lettres, chiffres, espaces et tirets. La liste des mots interdits
// est tenue par le serveur (tools/hall/regles.json) : le jeu ne fait que les vérifications de forme.
export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 16;
export const CHIFFRES_MAX = 5;
