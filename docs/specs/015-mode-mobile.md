# 015 — Mode mobile

Statut : **validé** (« validés ») — **réalisé**.

Déclencheur : sur téléphone, choisir une tour ouvrait sa fiche, qui couvrait la carte et empêchait de bâtir
(corrigé d'abord par la PR #27 : plus de fiche au toucher).

## Réalisé

- Détection (`src/ui/mobile.js`, `Mobile.detecter`) : écran tactile dont le petit côté fait moins de 600 px, ou
  `?mobile=1` pour essayer (`?mobile=0` pour couper). Classes `mobile`, `paysage` / `portrait` sur `<body>`.
- **Paysage** : la carte prend toute la hauteur ; boutique en colonne à droite (6 tours en icônes et prix sur deux
  colonnes, bouton ×n, pouvoirs, bouton de vague) ; barre du haut d'une ligne avec un menu **☰** (Son, Effets,
  Pause, Vitesse, Recommencer, Cartes).
- **Portrait** : carte sur toute la largeur, une rangée d'icônes qui défile, pouvoirs et vague sur une ligne ;
  bandeau « Tournez le téléphone pour mieux jouer » qu'on peut fermer.
- **Poser au doigt** : un toucher montre la tour fantôme et sa portée ; on glisse le doigt pour ajuster ; boutons
  **✔ Bâtir** (« ✖ Impossible » si la case est interdite ou l'or manque) et **✖** près de la case. Même chose pour
  les pouvoirs (**✔ Lancer**). Un second toucher sur la même case bâtit toujours.
- **Zoom** : pincer jusqu'à ×2 (transformation CSS de la toile, les coordonnées restent justes), glisser à deux
  doigts ou à un doigt quand on ne vise pas, double toucher pour revenir à la vue entière.
- **Fiches** : appui long sur une icône → fiche en feuille au bas de l'écran (un tiers au plus), bouton ✖. La pose
  en série devient le bouton **×n**. Le panneau d'une tour posée est une feuille au bas de l'écran, gros boutons.
- Étiquettes de clavier cachées, boutons de 44 px au moins.
- Écran d'accueil : `assets/manifest.webmanifest` (plein écran, paysage, icônes `assets/icone-192.png` et
  `icone-512.png`), balises Apple. Placé dans `assets/` pour être copié par le script de mise en ligne actuel.

## Code

`main.js` : `toucher(e)` (un clic ou un toucher sur la carte), `batir(c, r, serie)`, `majConfirmation()` ; au doigt
sur téléphone, `pointerdown` laisse la main à `Mobile` (gestes). Rien ne change dans `src/sim/`.
