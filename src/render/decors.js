// Packs de décors rendus par Blender (tools/blender/rendu_blender.py) : assets/decors/<carte>/manifest.json + PNG.
// Chaque élément du pack remplace l'élément de code du même nom ; ce qui manque garde sa version en code.
import { T } from '../sim/const.js';
import { decorsDeSecours } from './sprites.js';

function image(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

async function lirePack(carte) {
  const base = `assets/decors/${carte}/`;
  try {
    const rep = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!rep.ok) return null;
    const m = await rep.json();
    const ppc = m.pixels_par_case || 20;
    const lisse = m.style === 'lisse';
    const els = await Promise.all((m.elements || []).map(async (e) => {
      const img = await image(base + e.fichier);
      return img && { ...e, img, echelle: T / (e.pixels_par_case || ppc), lisse };
    }));
    return els.filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Spec 013 : ombres du décor allégées d'un tiers. L'ombre rendue par Blender est faite de pixels noirs à demi
 * transparents ; le contour et les objets eux-mêmes sont opaques et ne changent pas.
 */
function alleger(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] > 0 && p[i + 3] < 235 && p[i] < 40 && p[i + 1] < 40 && p[i + 2] < 40) p[i + 3] = Math.round(p[i + 3] * 0.66);
  }
  g.putImageData(d, 0, 0);
  return c;
}

/** Éléments de décor d'une carte, par nom : { img, ancre:[x,y], echelle, lisse } ; et textures de sol éventuelles. */
export async function chargerDecors(carte) {
  const elements = decorsDeSecours(carte);
  const sols = {};
  const pack = await lirePack(carte);
  let venusDuPack = 0;
  for (const e of pack || []) {
    if (e.type === 'sol') { sols[e.nom.replace(carte + '_sol_', '')] = e; venusDuPack++; continue; }
    elements[e.nom] = { img: alleger(e.img), ancre: e.ancre, echelle: e.echelle, lisse: e.lisse };
    venusDuPack++;
  }
  return { elements, sols, venusDuPack };
}
