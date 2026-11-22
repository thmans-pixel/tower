# 008 — Fiches des tours et des améliorations

Statut : **validé** (« ok continue ») — **réalisé**.

## 1. Fiche au survol de la boutique

- Quand la souris passe sur un bouton de tour en bas de l'écran, une fiche s'ouvre juste au-dessus du bouton.
  Elle disparaît dès que la souris sort du bouton.
- Contenu : nom, prix et touche ; une phrase de description ; chiffres du niveau 1 (dégâts, tirs par seconde,
  portée, effets) ; pastilles **physique**/**magique**, volants, invisibles ; prix des améliorations ; les deux
  spécialisations du niveau 3 en une ligne. Si l'or manque, le prix passe en rouge avec « Il manque X or ».
- Même fiche pour les pouvoirs Météores et Renforts : effet, chiffres, recharge, touches.
- Tactile : le premier toucher choisit la tour comme avant ; sa fiche reste affichée tant qu'elle est choisie.
- La bulle grise du navigateur (`title`) est retirée ; la fiche ne sort pas de l'écran.

## 2. Description des améliorations dans le panneau d'une tour posée

- **Niveau 1** : encadré « Au niveau 2 » au-dessus du bouton Améliorer, avec une phrase et ce qui change.
- **Niveau 2** : chaque spécialisation devient une petite fiche : nom et prix, phrase de description,
  chiffres comparés à la tour actuelle (vert : mieux, rouge : moins bien, or : effet nouveau), puis
  « Choix définitif ».
- **Niveau 3** : sous le titre, une ligne rappelle ce que fait la spécialisation choisie.

## Réalisation

- Textes : `description` sur chaque niveau et chaque spécialisation (`src/data/tours.js`) et chaque pouvoir
  (`src/data/pouvoirs.js`).
- `src/ui/fiches.js` : HTML des fiches et comparaisons (`comparer`, `ficheTour`, `fichePouvoir`,
  `encadreNiveau2`, `ficheSpecialisation`), sans DOM ; testé par `tests/fiches.test.js`.
- `Interface.majFiche` place `#fiche` au-dessus du bouton ; panneau élargi à 300 px, défilant s'il dépasse.
- Aucun changement de règles ni d'équilibrage.
