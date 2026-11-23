# 014 — Musique et sons

Statut : **validé** (« ok continue ») — partie 1 (sons et réglages) **réalisée** ; partie 2 (musique) à faire.

Tout est synthétisé en code (Web Audio), sans fichier ni droit d'auteur. Règles, équilibrage et images inchangés.

## Partie 1 — Sons et réglages (réalisée)

- `src/audio/son.js` : deux voies (effets, musique) avec leur volume, coupure générale, compresseur en sortie.
  Briques : `ton` (attaque douce), `souffle` (bruit filtré qui glisse), `cloche` (partiels inharmoniques).
- Tirs : sifflement de flèche, détonation sourde du canon, souffle du lance-flammes, cristal du givre, montée
  magique du mage, claquement de la baliste, grésillement électrique de la Tempête.
- Morts selon le monstre (cri court, « plop » du slime, jappement du loup, éboulement du golem, plainte du
  spectre, couinement de la chauve-souris). Tink d'armure, tour qui touche le sol à la pose, cloches
  d'amélioration, de vague (cloche du château) et de victoire, pièce qui tinte en arrivant au compteur.
- Un même son en rafale est limité (`libre`).
- Bouton « Son » : petite fenêtre avec deux curseurs **Musique** et **Effets sonores** (0 à 100 %) et
  « Tout couper ». Retenus dans la progression (`volMusique`, `volEffets`, `son`).

## Partie 2 — Musique (à faire)

Un air par carte en boucle (Prairie champêtre, Désert oriental, Montagne froide) ; batterie et basse pendant les
vagues, tempo un peu plus vif aux dernières ; thème du boss ; thème du menu, fanfare de victoire, descente de
défaite ; coupure quand l'onglet est caché.
