// Sortes de décor. La logique s'en sert pour savoir quelles cases sont prises ; l'affichage cherche, pour chaque
// sorte, une image nommée `<carte>_<nom>` dans le pack de Blender (docs/specs/002-decors-blender.md), sinon il
// dessine la version en code.
export const SORTES = {
  arbre:        { l: 1, h: 1, bloquant: true,  noms: ['chene_1', 'chene_2', 'chene_3'] },
  sapin:        { l: 1, h: 1, bloquant: true,  noms: ['sapin_1', 'sapin_2'] },
  buisson:      { l: 1, h: 1, bloquant: true,  noms: ['buisson'] },
  souche:       { l: 1, h: 1, bloquant: true,  noms: ['souche'] },
  rocher:       { l: 1, h: 1, bloquant: true,  noms: ['rocher_moyen'] },
  rocher_gros:  { l: 2, h: 1, bloquant: true,  noms: ['rocher_gros'] },
  cloture:      { l: 1, h: 1, bloquant: true,  noms: ['cloture'] },
  petit_rocher: { l: 1, h: 1, bloquant: false, noms: ['rocher_petit'] },
  fleurs:       { l: 1, h: 1, bloquant: false, noms: ['fleurs_1', 'fleurs_2'] },
  herbes:       { l: 1, h: 1, bloquant: false, noms: ['herbes_hautes'] },
};
