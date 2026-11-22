# 001 — Les Tours du Royaume, tower defense

Statut : **validé** par Thibault le 22 novembre 2026 (« je valide tous »).

Ce fichier reprend le cahier des charges validé dans la feuille Claude Sheets « Cahier des charges — Tower
defense » (onglets Cahier des charges, Tours, Ennemis). En cas d'écart, la feuille fait foi.

## Intention

Un tower defense complet, jouable dans le navigateur sur PC (souris) et tablette (tactile), qui reprend tous les
codes du genre. Une partie dure de 10 à 20 minutes par carte.

## Univers

- Fantasy médiévale : des créatures attaquent un royaume.
- Pixel-art propre dessiné en code, sans reprise d'un jeu existant (voir l'avenant 002 pour les décors de Blender).
- Jeu en français.

## Boucle de jeu

- Les ennemis suivent un chemin tracé, de l'entrée jusqu'au château.
- Chaque ennemi qui atteint le château coûte 1 vie (plus pour les gros) ; défaite à 0 vie.
- Les tours se posent sur des emplacements libres à côté du chemin.
- Or à chaque ennemi tué, plus un bonus à chaque vague terminée.
- Appeler la vague suivante plus tôt rapporte un bonus d'or.
- Types et nombre d'ennemis de la vague suivante visibles à l'avance.
- Phase de préparation avant la vague 1.
- Pause, vitesse ×1 / ×2 / ×3, Recommencer.

## Tours (6)

| Tour | Rôle | Particularité | Étape |
| --- | --- | --- | --- |
| Archers | Polyvalente, pas chère | Tir rapide, touche aussi les volants | 1 |
| Canon | Dégâts de zone | Lent, ne touche pas les volants | 1 |
| Givre | Ralentissement | Peu de dégâts, ralentit de 30 à 50 % | 1 |
| Mage | Magie | Ignore l'armure | 1 |
| Baliste | Longue portée | Très gros dégâts sur une seule cible | 2 |
| Tempête | Chaîne d'éclairs | Touche jusqu'à 5 ennemis à la suite | 2 |

- 3 niveaux par tour ; au niveau 3, choix entre 2 spécialisations (étape 2).
- Revente à 70 % de ce que la tour a coûté.
- Ciblage réglable par tour : premier, dernier, plus fort, plus proche.
- Portée affichée au survol et à la pose ; statistiques et dégâts totaux.

## Ennemis (8 + boss)

Gobelin (de base), Loup (rapide), Orc blindé (armure), Chauve-souris (volante, ignore le chemin au sol),
Chaman (soigne les ennemis proches), Slime (se divise en deux à sa mort), Golem (très résistant, lent),
Spectre (devient invisible par moments). Un boss toutes les 10 vagues (étape 2). Barre de vie et icône
d'armure ou de résistance sur chaque ennemi.

## Pouvoirs du joueur (étape 2)

- Pluie de météores : dégâts de zone sur un point choisi, puis temps de recharge.
- Renforts : 2 soldats bloquent le chemin pendant quelques secondes.

## Cartes et progression

- 3 cartes : Prairie (étape 1), Désert, Montagne enneigée ; 20 à 30 vagues ; battre une carte débloque la suivante.
- 1 à 3 étoiles par carte gagnée selon les vies restantes ; difficulté Facile, Normal, Difficile ; mode infini
  après la carte 3 ; sauvegarde dans le navigateur (étape 3).

## Interface

Écran titre → choix de la carte → partie. En haut : vies, or, vague ; en bas : tours à acheter et pouvoirs ;
panneau à la sélection d'une tour. Effets sonores générés en code, désactivables. Raccourcis : 1 à 6 pour les
tours, Espace pour la pause, F pour la vitesse.

## Technique

- Modules JavaScript servis tels quels, sans dépendance ni étape de construction ; servi en local par
  `tools/serveur.py` (comme Élite 27) et en ligne comme site statique.
  (Le cahier des charges prévoyait un seul fichier HTML ; Thibault a demandé le 22 novembre 2026 de mettre le
  code dans le dépôt thmans-pixel/tower avec un serveur Python, « comme pour le jeu elite27 ».)

## Livraison

1. **Étape 1** : carte Prairie jouable de bout en bout, 4 tours, 5 ennemis, 20 vagues, améliorations et vente.
2. **Étape 2** : Baliste et Tempête, spécialisations, tous les ennemis, boss, pouvoirs.
3. **Étape 3** : cartes 2 et 3, étoiles, difficultés, mode infini, sauvegarde.

Hors périmètre : multijoueur, comptes en ligne, classement partagé.

## Critères d'acceptation

- Victoire et défaite possibles sans aucun bug bloquant.
- Toutes les commandes marchent aussi au tactile.
- 60 images par seconde avec plus de 100 ennemis à l'écran.
- Progression graduelle ; Normal se gagne sans tout connaître par cœur.
