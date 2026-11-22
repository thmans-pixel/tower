// Tours et ennemis rendus par Blender (tools/blender/rendu_blender.py, docs/specs/003-tours-ennemis-blender.md).
// assets/tours/manifest.json : une image par tour et niveau, pièce mobile en bande de N orientations.
// assets/ennemis/manifest.json : une bande d'images par action. Ce qui manque garde son sprite en code.
import { T } from '../sim/const.js';

// Nom de l'ennemi dans le pack (propriété `ennemi` de l'armature, sans le préfixe « ennemi_ »).
const NOMS_ENNEMIS = { gob: 'gobelin', loup: 'loup', orc: 'orc_blinde', bat: 'chauve_souris', cham: 'chaman' };
const sansPrefixe = (nom) => String(nom).replace(/^ennemi_/, '');

export const nomTour = (sorte, niveau, variante) => `tour_${sorte}_${niveau + 1}${niveau === 2 && variante ? variante : ''}`;
export const nomEnnemi = (sorte) => NOMS_ENNEMIS[sorte];

function image(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

async function manifest(dossier) {
  try {
    const r = await fetch(dossier + 'manifest.json', { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** { tours: { nom: { img, ancre, k, lisse, piece? } }, ennemis: { nom: { action: { img, n, l, h, ancre, k, lisse } } } } */
export async function chargerModeles() {
  const res = { tours: {}, ennemis: {} };
  const bt = 'assets/tours/';
  const mt = await manifest(bt);
  if (mt) {
    const k = T / (mt.pixels_par_case || 20), lisse = mt.style === 'lisse';
    await Promise.all((mt.tours || []).map(async (t) => {
      const img = await image(bt + t.fichier);
      if (!img) return;
      const e = { img, ancre: t.ancre, k, lisse };
      if (t.piece) {
        const pi = await image(bt + t.piece.fichier);
        if (pi) e.piece = { img: pi, n: t.piece.images, l: t.piece.largeur, h: t.piece.hauteur, ancre: t.piece.ancre, pivot: t.pivot };
      }
      res.tours[t.nom] = e;
    }));
  }
  const be = 'assets/ennemis/';
  const me = await manifest(be);
  if (me) {
    const k = (T * (me.agrandissement || 1)) / (me.pixels_par_case || 20), lisse = me.style === 'lisse';
    await Promise.all((me.ennemis || []).map(async (e) => {
      const actions = {};
      for (const [nom, a] of Object.entries(e.actions || {})) {
        const img = await image(be + a.fichier);
        if (img) actions[nom] = { img, n: a.images, l: a.largeur, h: a.hauteur, ancre: a.ancre, k, lisse };
      }
      if (Object.keys(actions).length) res.ennemis[sansPrefixe(e.nom)] = actions;
    }));
  }
  return res;
}
