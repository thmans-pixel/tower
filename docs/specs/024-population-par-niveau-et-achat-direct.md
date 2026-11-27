# Spec 024 — Population par niveau (labyrinthe) et achat direct d'une tour évoluée

Demande de Thibault (2026-11-27), à propos du critère 19 de la spec 016 (les murs ne servent à rien pour le joueur automatique) :
un mur ou une tour compte +1 de population, **les améliorations aussi** ; et on peut **acheter directement** une tour évoluée au maximum avant l'ultime.
**Statut : validée le 2026-11-27 (réponses de Thibault aux trois questions).**

## 1. Population par niveau (labyrinthe seulement : la population n'existe que là)
- Une tour compte `niveau + 1` places : niveau 1 = 1, niveau 2 = 2, niveau 3 (spécialisation) = 3 (et l'ultime = 4, qui n'existe qu'en
  prestige, donc jamais dans le labyrinthe). Un mur compte toujours 1 ; les obstacles 0.
- `populationLabyrinthe(s)` somme ces places, prévues comprises (une vente prévue libère les places de la tour vendue).
- **Améliorer** demande une place libre : au plafond, `ameliorer` refuse avec `raison: 'population'`, sans débiter l'or.
  La fiche de la tour le dit (« Population maximale atteinte »).
- Compteur « Pop 23 / 40 » inchangé. La fiche d'une tour indique ses places.
- Le joueur automatique du labyrinthe respecte la règle ; ses repères sont remesurés et notés dans le CLAUDE.md.

## 2. Achat direct d'une tour évoluée (tous les modes)
- Dans la boutique, avant de poser, le joueur choisit le **niveau de pose** : « Niveau 1 » (comme aujourd'hui), « Niveau 3 · A » ou « Niveau 3 · B »
  (les deux spécialisations de la tour choisie, avec leur nom). Le choix reste pour les poses suivantes (pose en série) jusqu'à ce qu'on le change.
- Commande `poserEvoluee(s, sorte, c, r, variante)` : pose la tour directement au niveau 3 avec sa spécialisation.
  **Prix = somme des trois prix** (construction + niveau 2 + niveau 3), donc aucun avantage d'or ; le gain est le geste et le temps.
  `depense` = ce prix (la revente est calculée comme aujourd'hui). Refus : `or`, `population` (3 places en labyrinthe), case occupée, comme `poser`.
- L'ultime n'est pas concerné (il reste une amélioration, en prestige seulement).
- Les fiches de la boutique (spec 008) affichent le prix total du niveau choisi.
- Mêmes événements que `poser` (animation de pose), plus `amelioration` pour le rendu du niveau 3.

## 3. Vérification
- Tests : population par niveau (poser, améliorer, vendre prévu, refus au plafond), `poserEvoluee` (prix, refus, revente, tour au niveau 3).
- Joueur automatique : il peut acheter des tours évoluées ; repères du labyrinthe remesurés (avec et sans mur) et notés ici.
- Critère 19 de la spec 016 : à rejuger avec ces chiffres.

## Livraison (2026-11-27)
Fait : `placesTour`, `populationLabyrinthe` par niveau, `ameliorer` refusé au plafond (`raison: 'population'`), `poserEvoluee` et `prixDirect`
(`tours.js`), poses prévues avec leurs places, boutons « Niveau 1 / Niv. 3 · A / Niv. 3 · B » dans la boutique (`ui.niveauPose`, prix des boutons et
fiche mis à jour), fiche d'une tour : ligne « Population » et message au plafond ; tests dans `tests/population-obstacles.test.js`.
Non vérifié à l'écran : aucun navigateur sur ce serveur, seuls la syntaxe et les tests ont été contrôlés.
**Mesure** (`node tests/simulate.js labyrinthe`, 10 terrains) : Normal avec murs 9 gagnés sur 10 (5 à 20 vagues), sans mur 8 sur 10 : **inchangé**.
Le joueur automatique gagne avec ~9 tours et 3 murs, il n'atteint jamais le plafond de population : la nouvelle règle n'agit pas sur lui.
Critère 19 (spec 016) toujours non atteint : il faudrait des monstres plus durs dans le labyrinthe (renfort > 30 %, PV, vagues), à décider avec Thibault.
