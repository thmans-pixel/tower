# 009 — Police lisible

Statut : **validé** (capture de l'utilisateur sur l'écran des cartes aléatoires) — **réalisé**.

## Problème

Dans Pixelify Sans, le **2** ressemble à un **8** et le **5** à un **S** (« 80 vies », « 8S vagues »,
« Vague 0/80 »). Les petits textes (11 à 13 px) et les phrases longues des fiches se lisent mal, et si la
police de Google ne se charge pas, la police de secours à chasse fixe change tout l'aspect.

## Correction

- **Chiffres** : police « Chiffres » limitée aux chiffres 0-9 (`unicode-range`), prise dans les polices déjà
  installées sur l'appareil (Segoe UI, Noto Sans, DejaVu Sans, Liberation Sans, Arial, Helvetica, avec leurs
  versions grasses). Elle passe avant Pixelify Sans partout, y compris dans les textes dessinés sur la carte.
- **Pixelify Sans** reste pour les lettres des titres, boutons, compteurs et noms.
- **Phrases et petits textes** (fiches, descriptions, comparaisons, notes, sous-titres des boutons, touches dans
  les coins) : police de l'appareil (`--texte-police`, `system-ui`).
- **Secours** : `system-ui` au lieu de la police à chasse fixe si Pixelify Sans ne se charge pas.
- **Taille minimale** 13 px, phrases en 14 px.
- Rien d'autre ne change (couleurs, mise en page, règles).
