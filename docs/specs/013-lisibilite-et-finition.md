# 013 — Lisibilité et finition visuelle

Statut : **validé** (« validé », sur la capture du Désert) — **réalisé**.

## Réalisé

- **Écran** : la carte prend toute la place possible (marges réduites). Dans une fenêtre plus haute que large,
  la boutique remonte juste sous la carte (classe `etroit` sur `#app`) au lieu de laisser deux bandes vides.
  Barre du haut et boutique plus compactes.
- **Monstres** : affichés 25 % plus gros (`TAILLE_MONSTRES`, affichage seulement), liseré clair d'un pixel
  (coupé en « Effets réduits ») et ombre de contact sous chacun.
- **Chemin** : teinte plus marquée selon le décor (sable tassé, terre, neige tassée), bords en dégradé doux au
  lieu du trait sombre, traces de pas.
- **Décor** : Désert sans dunes, ossements et petits cailloux ramenés à 4 sur le Désert et la Montagne
  (`src/data/cartes.js`) ; ombres du décor de Blender allégées d'un tiers au chargement (`alleger`, decors.js).
  Joueur automatique inchangé (Désert 8 vies, Montagne 2, Prairie 3).
- **Sol** : grandes taches douces claires et sombres posées sur la texture pour casser la répétition.

## Écarts

- Pas de miroir au hasard sur le décor ni sur les tuiles de sol : les ombres sont dans les images de Blender et
  partiraient dans les deux sens ; les tuiles retournées créaient des coutures. Les taches douces font le travail.
- L'ovale violet de la capture n'a pas été retrouvé dans le décor ; c'est sans doute une pièce d'or vue de profil
  pendant sa rotation (contour sombre, intérieur doré).
