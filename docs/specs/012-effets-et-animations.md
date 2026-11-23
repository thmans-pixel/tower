# 012 — Effets et animations

Statut : **validé** (« ok vas y ») — lot A **réalisé** ; lots B et C à faire.

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

## Lot B — Tours, projectiles et impacts (à faire)

Pose qui tombe et rebondit ; amélioration avec colonne de lumière ; vente qui s'enfonce ; lueur, recul et fumée
au tir ; flèches et carreaux en arc avec traînée, boulet avec fumée et ombre, boule magique pulsante, cône de feu ;
impacts selon le type, cratères quelques secondes ; halo de la tour choisie.

## Lot C — Vie du décor et interface (à faire)

Feuilles et papillons (Prairie), sable et chaleur (Désert), neige (Montagne) ; drapeaux et eau animés ; cœur qui
tremble, or qui défile, bandeaux qui glissent ; option « Effets réduits ».
