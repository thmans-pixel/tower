# 012 — Effets et animations

Statut : **validé** (« ok vas y ») — lots A et B **réalisés** ; lot C à faire.

Tout se passe dans l'affichage (`src/render/`) ; règles, équilibrage et joueur automatique inchangés. Seuls
ajouts côté logique : événement `blesse` (id, armure) à chaque coup (pas pour la brûlure ni les soldats), `id`,
`dx`, `dy` dans l'événement `mort`.

## Lot A — Monstres (réalisé)

- Touché : clignotement blanc (silhouette en cache, `silhouette`). Armure qui encaisse (orc blindé) : étincelles
  grises et « tink ».
- Mort : le corps bascule et s'efface (0,45 s puis 0,35 s), nuage de poussière ; slime en flaque avec
  éclaboussures, spectre qui se dissout en fumée, chauve-souris qui tombe en tournoyant. Avec une action `mort`
  de Blender, ses images défilent à la place (`poseMort`).
- Or : une pièce saute du monstre et file vers le compteur, qui pulse (25 pièces au plus à la fois). Plus de
  « +5 » au-dessus des monstres.
- Apparition en fondu (0,35 s). Boss : grosse explosion, débris, onde, tremblement plus fort.

## Lot B — Tours, projectiles et impacts (réalisé)

- Pose : la tour tombe et rebondit (écrasement, petit tremblement, poussière). Amélioration : colonne de lumière
  dorée, la tour grossit un instant, étincelles qui retombent. Vente : la tour s'enfonce dans le sol (découpée au
  ras du sol), pièces qui jaillissent et filent au compteur. Calculs dans `src/render/tours-effets.js`.
- Tir : lueur additive au bout de l'arme (`boutArme`), recul plus marqué pour Canon et Baliste, fumée du Canon ;
  Lance-flammes : vrai cône de flammes.
- Projectiles : flèches et carreaux en arc avec traînée et ombre (l'arc ne change pas le trajet de la logique),
  boulet avec fumée et ombre qui grandit à l'approche du sol, éclat de givre qui tourne, boule magique qui pulse
  avec une queue d'étincelles, boule de feu pulsante.
- Impacts : éclats de bois (flèches, carreaux), cristaux de glace, lueur aux points touchés par l'éclair,
  explosion avec lueur, poussière et cratère qui reste 4 s au sol.
- Tour choisie : halo pulsé à sa base au lieu du carré.

## Lot C — Vie du décor et interface (à faire)

Feuilles et papillons (Prairie), sable et chaleur (Désert), neige (Montagne) ; drapeaux et eau animés ; cœur qui
tremble, or qui défile, bandeaux qui glissent ; option « Effets réduits ».
