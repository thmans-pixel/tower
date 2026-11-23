// Affichage des monstres (spec 011 et lot A de la spec 012) : direction lissée dans les virages, clignotement
// quand ils sont touchés, apparition en fondu, mort animée. Ne lit l'état que pour le dessiner ; tout ce qui est
// retenu ici (direction, minuteries) vit dans la vue.

/** Silhouette blanche d'une image (morceau sx, sy, sw, sh), gardée en cache. */
const caches = new WeakMap();
export function silhouette(img, sx, sy, sw, sh, couleur = '#ffffff') {
  let c = caches.get(img);
  if (!c) { c = new Map(); caches.set(img, c); }
  const cle = sx + ',' + sy + couleur;
  let t = c.get(cle);
  if (!t) {
    t = document.createElement('canvas');
    t.width = sw; t.height = sh;
    const g = t.getContext('2d');
    g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = couleur;
    g.fillRect(0, 0, sw, sh);
    c.set(cle, t);
  }
  return t;
}

/** Suivi d'un monstre à l'écran : direction lissée sur une dizaine de pixels de marche. */
export function suivre(st, e, dt, dirs) {
  if (!st) st = { vx: e.dx || 1, vy: e.dy || 0, d: e.d, age: 0, flash: 0, dir: -1 };
  const dd = Math.abs(e.d - st.d);
  st.d = e.d;
  if (dd > 0 && (e.dx || e.dy)) {
    const a = 1 - Math.exp(-dd / 10);
    st.vx += ((e.dx || 0) - st.vx) * a;
    st.vy += ((e.dy || 0) - st.vy) * a;
  }
  st.age += dt;
  st.flash = Math.max(0, st.flash - dt);
  if (dirs > 1) {
    // À l'écran y descend ; dans Blender la direction k tourne de +X vers +Y (le haut de l'écran).
    const pas = (2 * Math.PI) / dirs;
    const angle = Math.atan2(-st.vy, st.vx);
    const cand = ((Math.round(angle / pas) % dirs) + dirs) % dirs;
    if (st.dir < 0) st.dir = cand;
    else if (cand !== st.dir) {
      let ecart = Math.abs(angle - st.dir * pas) % (2 * Math.PI);
      if (ecart > Math.PI) ecart = 2 * Math.PI - ecart;
      if (ecart > pas * 0.62) st.dir = cand;   // un peu au-delà de la moitié du secteur : pas de clignotement
    }
  }
  return st;
}

const doux = (k) => 1 - (1 - k) * (1 - k);

/**
 * Pose d'un monstre mort à l'instant t (secondes) : { image, alpha, rot, sx, sy, dy } pour le dessin.
 * Avec une action « mort » de Blender, ses images défilent ; sinon la dernière image de marche bascule.
 */
export function poseMort(m, t) {
  const FIN = m.boss ? 0.9 : 0.45, EFFACE = m.boss ? 0.6 : 0.35;
  const alpha = t < FIN ? 1 : Math.max(0, 1 - (t - FIN) / EFFACE);
  if (m.mort) {
    const i = Math.min(m.mort.n - 1, Math.floor((t / FIN) * m.mort.n));
    return { action: m.mort, image: i, alpha, rot: 0, sx: 1, sy: 1, dy: 0 };
  }
  const k = doux(Math.min(1, t / FIN));
  if (m.genre === 'slime') return { alpha, rot: 0, sx: 1 + 0.5 * k, sy: 1 - 0.75 * k, dy: 0 };
  if (m.genre === 'spectre') return { alpha: alpha * (1 - 0.6 * k), rot: 0, sx: 1 - 0.3 * k, sy: 1 + 0.2 * k, dy: -14 * k };
  if (m.genre === 'vol') return { alpha, rot: m.cote * k * Math.PI * 1.5, sx: 1, sy: 1, dy: (1 - k) * -22 };
  return { alpha, rot: m.cote * k * (Math.PI / 2), sx: 1, sy: 1 - 0.15 * k, dy: 0 };
}

export const genreMort = (sorte, vol) => (vol ? 'vol' : sorte === 'slime' || sorte === 'slime_petit' ? 'slime' : sorte === 'spectre' ? 'spectre' : 'sol');
