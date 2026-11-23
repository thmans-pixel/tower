# 014 — Musique et sons

Statut : **validé** (« ok continue ») — parties 1 et 2 **réalisées**.

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

## Partie 2 — Musique (réalisée)

Demande de Thibault : la musique d'Arkanoid pour la Prairie et celle de Tetris pour la Montagne.

- **Montagne** : « Korobeiniki », l'air populaire russe du XIXe siècle repris par Tetris, dans le domaine public ;
  arrangement 8 bits original.
- **Prairie** : la musique d'Arkanoid est protégée, elle n'est pas reprise ; air original entraînant dans un
  esprit arcade des années 80.
- **Désert** : air original en mode oriental, percussions doum-tek. **Boss** (tant que l'Ogre est en vie) :
  demande « dans le style de Game of Thrones » ; ce thème est protégé et n'est pas repris : thème original en ut
  mineur à trois temps, violoncelle en ostinato, cordes graves doublées à l'octave, tambours de guerre. **Menu** : l'air de la Prairie plus lent. Victoire et défaite : les fanfares de la partie 1.
- **L'Apprenti sorcier** (Paul Dukas, 1897, domaine public) : le thème des balais, l'air du jeu Sorcery sur Amstrad
  CPC (demande de Thibault), en son carré 8 bits, mesures à trois croches.
- **Choix de l'air** : à chaque partie, un air est tiré au hasard parmi Prairie, Désert, Montagne (Korobeiniki) et
  l'Apprenti sorcier, jamais deux fois le même de suite (`AIRS_DE_PARTIE`). Le boss garde son thème.
- Intensité : entre les vagues, mélodie, basse douce et accords ; pendant une vague, batterie et basse pleine ;
  au dernier quart des vagues, tempo +8 %. Coupée quand l'onglet est caché ou le curseur Musique à 0.
- `src/audio/musique.js` : séquenceur à programmation anticipée (`AIRS`, `Musique.jouer`, `intensite`) sur la voie
  `musique` du `Son` ; piloté par `majMusique` dans main.js.
