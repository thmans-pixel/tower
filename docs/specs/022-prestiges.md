# Spec 022 — Prestiges

Demande de Thibault (2026-11-25) : après Facile, Normal et Difficile, des niveaux « prestige » 1, 2, 3… qui
augmentent à chaque fois le nombre et les PV des monstres, jusqu'à un niveau tout juste possible mais très compliqué.

## Règles
- `src/data/difficultes.js` : `prestige1` à `prestige10` (`NB_PRESTIGES`), générés par formule.
  PV = 1,1 × 1,15^k ; effectif de chaque groupe × (1 + 0,1 k) ; vies = max(5, 10 − ⌊k/2⌋) ; attente entre vagues = max(8, 15 − k) s ;
  or de départ inchangé. Un boss reste seul. `ORDRE_DIFFICULTES` garde les trois d'origine (records, hall, labyrinthe).
- Déblocage (`prestigeOuvert`, `difficulteOuverte`) : Prestige 1 après une victoire en Difficile sur une carte de la campagne ;
  Prestige k+1 après une victoire en Prestige k (`progression.prestige` = plus haut prestige gagné).
- Écran des cartes : les prestiges ouverts et le prochain (grisé, cadenas) suivent Difficile.
- Code de transfert : préfixe `TDR3` quand un prestige est gagné (les trois records de labyrinthe, puis le niveau) ; les anciens codes ne changent pas.
- Hall of fame : **aucun classement pour les prestiges** pour l'instant (`scoreHall` renvoie rien) ; le serveur ne connaît pas ces
  difficultés et ses plafonds de dégâts sont réglés pour les trois d'origine.

## Équilibre (joueur automatique, `tests/simulate.js`, 2026-11-25)
Vague atteinte avant la défaite : Prairie Difficile 18, P1 12, P2-P3 7, P4-P5 4, P10 2 ; le joueur automatique n'améliore pas
assez pour juger les niveaux hauts : à régler à la main en jouant (les chiffres sont tous dans `difficultes.js`).

## À valider
- Les chiffres ci-dessus et le nombre de niveaux (10).
- Ouvrir un classement des prestiges au hall of fame (serveur + règles à étendre).
