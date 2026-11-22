# 005 — Étape 3 : cartes, difficultés, étoiles, mode infini, sauvegarde

Statut : **validé** par Thibault le 22 novembre 2026, avec les propositions par défaut (l'Ogre chef de guerre
sert de boss sur les trois cartes).

## Livraison

1. **Lot 1 — progression** (sur la Prairie) : difficultés, étoiles, sauvegarde, déblocage des cartes. — *réalisé*
2. **Lot 2 — le Désert**, avec son décor Blender. — *réalisé*
3. **Lot 3 — la Montagne enneigée et le mode infini.**

## Difficultés (choisies sur l'écran des cartes, gardées d'une visite à l'autre)

| | Facile | Normal | Difficile |
| --- | --- | --- | --- |
| PV des ennemis | ×0,75 | ×1 | ×1,3 |
| Or de départ | +30 % | — | −20 % |
| Vies | 30 | 20 | 10 |
| Compte à rebours entre vagues | 24 s | 18 s | 12 s |

Repères du joueur automatique « posé » sur la Prairie : Facile gagné sans perdre de vie, Normal gagné avec
3 vies, Difficile perdu vers la vague 7 (il place mal ses premières tours ; à confirmer par une vraie partie).

## Étoiles

Partie gagnée : 3 étoiles à 90 % des vies ou plus, 2 à 50 % ou plus, 1 en dessous. Gardées par carte et par
difficulté (la meilleure note reste), affichées sur l'écran des cartes et à la fin de la partie.

## Déblocage

Gagner une carte, quelle que soit la difficulté, débloque la suivante (Prairie → Désert → Montagne) ; gagner
la Montagne débloque le mode infini. Une carte débloquée mais pas encore construite affiche « Bientôt ».

## Le Désert (lot 2)

25 vagues ; deux entrées dont les chemins se rejoignent avant la forteresse ; boss aux vagues 10, 20 et 25.
Décor : cactus, rochers rouges, dunes, palmiers, oasis, forteresse de grès (modélisés dans Blender).

Réalisation : les ennemis partent de chaque entrée à tour de rôle ; les volants vont tout droit de leur entrée à
la forteresse ; des renforts posés sur le tronçon commun bloquent les deux routes. Or de départ 280. Repères du
joueur automatique « posé » : Facile gagné sans perte, Normal gagné avec 8 vies (pertes aux vagues 8 et 14,
quand les deux entrées poussent), Difficile perdu tôt (comme sur la Prairie).

## La Montagne enneigée (lot 3)

30 vagues ; le plus long chemin, en lacets, avec un pont ; la neige ralentit tous les ennemis de 10 % mais ils
sont plus nombreux ; boss aux vagues 10, 20 et 30. Décor : sapins enneigés, rochers glacés, congères, lac gelé,
fort de montagne.

## Boss

L'Ogre chef de guerre sur les trois cartes.

## Mode infini (lot 3)

Sur toute carte gagnée, une fois la Montagne battue. Vagues tirées au hasard (même suite pour une carte
donnée), de plus en plus fortes, boss toutes les 10 vagues. Score = vague atteinte ; meilleur score gardé par carte.

## Sauvegarde

Dans le navigateur (`localStorage`, clé `tours-du-royaume`) : cartes débloquées, étoiles, meilleurs scores du
mode infini, difficulté choisie, réglage du son. Bouton « Effacer la progression » (avec confirmation). La
partie en cours n'est pas sauvegardée. La progression est propre à un navigateur sur un appareil.

## Hors périmètre

Comptes en ligne, classement partagé, sauvegarde d'une partie en cours.

## Critères d'acceptation

- Chaque carte gagnable en Normal par le joueur automatique prudent ; plus facile en Facile, plus dure en Difficile.
- Étoiles, déblocages et meilleurs scores survivent à un rechargement.
- Sans progression enregistrée, seule la Prairie est ouverte.
- Le mode infini monte en difficulté sans jamais planter, même après la vague 50.
