// Vie du décor (spec 012, lot C) : feuilles et papillons sur la Prairie, sable et chaleur dans le Désert, neige
// sur la Montagne ; reflets sur l'eau, fanion sur le château. Affichage seulement, hasard de l'affichage.
import { W, H, T } from '../sim/const.js';

const FEUILLES = ['#6fae3a', '#94c447', '#d9a33a', '#c9772f'];

/** Thème d'ambiance d'une carte (une carte aléatoire prend celui de son décor). */
export const themeDe = (def) => (def.aleatoire && def.aleatoire.theme) || def.id;

export class Ambiance {
  constructor() { this.parts = []; this.theme = null; this.eaux = []; this.chateau = null; this.attente = 0; }

  preparer(carte, fixes) {
    this.theme = themeDe(carte.def);
    this.parts = [];
    this.eaux = fixes.filter((d) => /oasis|lac|mare|etang|eau/.test(d.nom)).map((d) => ({ x: d.x, y: d.y }));
    const ch = carte.chateau;
    this.chateau = { x: (ch.c + ch.l / 2) * T, y: ch.r * T - 18 };
    // La neige et le sable sont déjà là au début, sans attendre qu'ils tombent.
    for (let i = 0; i < 60; i++) this.naitre(true);
  }

  naitre(partout) {
    const r = Math.random;
    if (this.theme === 'montagne') {
      if (this.parts.length > 140) return;
      this.parts.push({ genre: 'neige', x: r() * (W + 100) - 50, y: partout ? r() * H : -6, v: 18 + r() * 26, s: r() < 0.25 ? 3 : r() < 0.6 ? 2 : 1, ph: r() * 6 });
    } else if (this.theme === 'desert') {
      if (this.parts.length > 90) return;
      this.parts.push({ genre: 'sable', x: partout ? r() * W : -10, y: r() * H, v: 90 + r() * 120, s: r() < 0.3 ? 2 : 1, ph: r() * 6 });
    } else {
      if (this.parts.length > 22) return;
      if (r() < 0.2 && this.parts.filter((p) => p.genre === 'papillon').length < 4) {
        this.parts.push({ genre: 'papillon', x: r() * W, y: r() * H, cx: r() * W, cy: r() * H, ph: r() * 6, col: r() < 0.5 ? '#fdf6e3' : '#ffe08a' });
      } else {
        this.parts.push({ genre: 'feuille', x: partout ? r() * W : -10, y: partout ? r() * H : r() * H * 0.7, v: 25 + r() * 25, ph: r() * 6, col: FEUILLES[Math.floor(r() * 4)] });
      }
    }
  }

  /** Avance et dessine ; `horloge` en secondes. */
  dessiner(g, dt, horloge) {
    this.attente -= dt;
    const cadence = this.theme === 'montagne' ? 0.04 : this.theme === 'desert' ? 0.05 : 0.6;
    while (this.attente < 0) { this.naitre(false); this.attente += cadence; }
    this.parts = this.parts.filter((p) => p.x > -60 && p.x < W + 60 && p.y < H + 20 && p.y > -40);
    for (const p of this.parts) {
      if (p.genre === 'neige') {
        p.y += p.v * dt; p.x += Math.sin(horloge * 1.5 + p.ph) * 12 * dt - 6 * dt;
        g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      } else if (p.genre === 'sable') {
        p.x += p.v * dt; p.y += Math.sin(horloge * 3 + p.ph) * 8 * dt;
        g.fillStyle = 'rgba(240,215,160,.55)'; g.fillRect(Math.round(p.x), Math.round(p.y), p.s + 1, p.s);
      } else if (p.genre === 'feuille') {
        p.x += p.v * dt; p.y += (10 + Math.sin(horloge * 2 + p.ph) * 18) * dt;
        const larg = Math.abs(Math.cos(horloge * 3 + p.ph)) > 0.5 ? 3 : 1;
        g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), larg, 2);
      } else if (p.genre === 'papillon') {
        if (Math.random() < 0.01) { p.cx = Math.random() * W; p.cy = Math.random() * H; }
        p.x += (p.cx - p.x) * 0.25 * dt + Math.sin(horloge * 2 + p.ph) * 20 * dt;
        p.y += (p.cy - p.y) * 0.25 * dt + Math.cos(horloge * 3 + p.ph) * 14 * dt;
        const ouvert = Math.sin(horloge * 18 + p.ph) > 0;
        g.fillStyle = p.col;
        if (ouvert) { g.fillRect(Math.round(p.x) - 2, Math.round(p.y), 2, 2); g.fillRect(Math.round(p.x) + 1, Math.round(p.y), 2, 2); }
        else g.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
        g.fillStyle = '#1a1420'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      }
    }
    if (this.theme === 'desert') this.chaleur(g, horloge);
  }

  /** Ondulation de chaleur : quelques bandes claires qui ondulent lentement. */
  chaleur(g, horloge) {
    g.strokeStyle = 'rgba(255,240,200,.05)'; g.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      const y0 = ((horloge * 6 + k * 170) % (H + 60)) - 30;
      g.beginPath();
      for (let x = 0; x <= W; x += 24) g.lineTo(x, y0 + Math.sin(x / 60 + horloge * 2 + k) * 5);
      g.stroke();
    }
  }

  /** Reflets sur l'eau et fanion du château, dessinés avec le décor. */
  details(g, horloge) {
    for (const e of this.eaux) {
      for (let i = 0; i < 3; i++) {
        const ph = horloge * 1.3 + i * 2.1 + e.x;
        if (Math.sin(ph * 2.7) < 0.55) continue;
        const x = e.x + Math.sin(ph) * 16, y = e.y + Math.cos(ph * 1.7) * 6 - 2;
        g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(Math.round(x), Math.round(y), 2, 1); g.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 3);
      }
    }
    const c = this.chateau;
    if (!c) return;
    // Fanion qui flotte : trois bandes décalées par une onde.
    g.fillStyle = '#1a1420'; g.fillRect(c.x - 1, c.y - 2, 2, 22);
    for (let i = 0; i < 6; i++) {
      const dy = Math.round(Math.sin(horloge * 6 - i * 0.8) * (i * 0.4));
      g.fillStyle = '#1a1420'; g.fillRect(c.x + 1 + i * 2, c.y - 1 + dy, 2, 9 - i);
      g.fillStyle = i % 2 ? '#c8342c' : '#e5533d'; g.fillRect(c.x + 1 + i * 2, c.y + dy, 2, 7 - i);
    }
  }
}
