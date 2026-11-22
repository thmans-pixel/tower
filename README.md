# Tower defense — décor

Objets de décor low poly pour un tower defense en vue 3/4, faits dans Blender.

- `decor.blend` : tous les objets, dans la collection « Decor », espacés de 4 unités sur X.
- `scripts/` : un script Python par famille d'objets. Il rouvre `decor.blend`, remplace ses objets et refait l'aperçu.
- `apercu_*.png` : rendus de contrôle en vue 3/4.

Lancer un script :

```sh
flatpak run org.blender.Blender -b -P scripts/prairie_chenes.py
```

## Règles

1 unité = 1 case, origine au centre de la base à Z = 0, face vers -Y, un seul objet par élément,
Principled BSDF en couleur unie (rugosité 0,8), moins de 1 500 faces, propriétés `cases_l`, `cases_h`, `bloquant`.

## Objets

| Objet | Cases | Bloquant | Faces |
|---|---|---|---|
| prairie_chene_1 / 2 / 3 | 1 × 1 | 1 | 434 |
| prairie_sapin_1 / 2 | 1 × 1 | 1 | 65 / 84 |
| prairie_souche | 1 × 1 | 1 | 115 |
| prairie_buisson | 1 × 1 | 1 | 620 |
| prairie_fleurs_1 / 2 | 1 × 1 | 0 | 241 |
| prairie_herbes_hautes | 1 × 1 | 0 | 198 |
| prairie_rocher_petit | 1 × 1 | 0 | 80 |
| prairie_rocher_moyen | 1 × 1 | 1 | 80 |
| prairie_rocher_gros | 2 × 1 | 1 | 240 |
