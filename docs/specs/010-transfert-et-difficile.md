# 010 — Progression transférable et réglage du Difficile

Statut : **validé** (« validé ») — **réalisé**, avec un écart sur les chiffres du Difficile (voir 2).

## 1. Transférer sa progression

- Écran des cartes : bouton « Transférer ma progression ». La fenêtre montre **Mon code** (bouton Copier) et un
  champ **Code d'un autre appareil** (bouton Lire, ou Entrée).
- Le code (`TDR1-XXXX-XXXX-…`) porte les cartes ouvertes, les étoiles, l'ouverture et les records du mode
  infini, le compteur des cartes aléatoires. Alphabet sans I, L, O, U ; minuscules, espaces et tirets tolérés,
  O lu 0, I et L lus 1. Deux caractères de contrôle : un code mal recopié affiche « Code illisible » et ne change
  rien.
- Après lecture, le jeu dit ce que contient le code, puis « Réunir les progressions » garde le meilleur des deux
  (cartes ouvertes d'un côté ou de l'autre, meilleures étoiles, meilleurs records). La difficulté choisie et le
  son restent ceux de l'appareil.
- Rien n'est envoyé sur Internet. Code pur : `src/sim/transfert.js` (`codeProgression`, `lireCode`, `fusionner`),
  tests `tests/transfert.test.js`.

## 2. Difficile

- Visé : PV × 1,2, or × 0,9, 15 s entre les vagues, 10 vies. Au joueur automatique, ce réglage perdait encore
  vers la vague 7 ou 8 sur la Prairie et le Désert, comme l'ancien.
- Le joueur automatique est fragile ici : il gagne le Normal avec peu de marge (3 vies sur la Prairie) et une
  vague ratée suffit à vider 10 vies. Aucun réglage gardant une vraie difficulté ne lui fait passer les deux tiers
  du Désert (sa vague 8 : 10 slimes et 10 loups sur deux chemins).
- **Retenu : PV × 1,1, or × 1, 15 s, 10 vies.** Joueur automatique « posé » : Prairie jusqu'à la vague 18 sur 20,
  Montagne 17 sur 30, Désert 8 sur 25 ; cartes aléatoires : 2 victoires sur 8. À confirmer par une vraie partie.
- Facile et Normal inchangés.
