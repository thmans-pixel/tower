// Dessin de la partie sur la toile. Lit l'état, ne le modifie jamais ; les effets (éclats, chiffres, bandeaux)
// naissent des événements de la logique et ne vivent qu'ici.
import { T, COLS, ROWS, W, H } from '../sim/const.js';
import { CHEMIN, LIBRE } from '../sim/carte.js';
import { TOURS, statsTour } from '../data/tours.js';
import { ENNEMIS } from '../data/ennemis.js';
import { hasard } from '../sim/hasard.js';
import { spriteEnnemi, spriteTour, ECHELLE } from './sprites.js';
import { nomTour, nomEnnemi } from './modeles.js';
import { POUVOIRS } from '../data/pouvoirs.js';

const COULEUR_ENN = { gob: '#5fae3a', loup: '#8c8f99', orc: '#9aa3ad', bat: '#6d5585', cham: '#9b5fc0', slime: '#8be04e', slime_petit: '#8be04e', golem: '#7f8288', spectre: '#cfe3f0', ogre: '#8a9a5b' };
const POLICE = '"Pixelify Sans", ui-monospace, monospace';

/** Rectangle intérieur d'une image de sol : sans bords transparents, et sans le contour sombre d'un pixel. */
function partiePleine(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const plein = (x, y) => d[(y * c.width + x) * 4 + 3] === 255;
  let x0 = 0, y0 = 0, x1 = c.width - 1, y1 = c.height - 1;
  const mid = (a, b) => Math.floor((a + b) / 2);
  while (x0 < x1 && !plein(x0, mid(y0, y1))) x0++;
  while (x1 > x0 && !plein(x1, mid(y0, y1))) x1--;
  while (y0 < y1 && !plein(mid(x0, x1), y0)) y0++;
  while (y1 > y0 && !plein(mid(x0, x1), y1)) y1--;
  const k = d[(mid(y0, y1) * c.width + x0) * 4] < 60 ? 1 : 0;   // contour sombre : un pixel de plus
  return [x0 + k, y0 + k, x1 - x0 + 1 - 2 * k, y1 - y0 + 1 - 2 * k];
}

export class Vue {
  constructor(toile) {
    this.toile = toile;
    this.g = toile.getContext('2d');
    this.fond = null;
    this.carte = null;
    this.decors = null;
    this.eclats = [];
    this.textes = [];
    this.anneaux = [];
    this.eclairs = [];
    this.bandeau = null;
    this.secousse = 0;
    this.horloge = 0;
    this.modeles = { tours: {}, ennemis: {} };   // remplis par main.js quand les packs Blender sont chargés
  }

  /** Prépare le fond et le décor d'une carte construite par la logique. */
  preparer(carte, decors) {
    this.carte = carte;
    this.decors = decors;
    this.eclats = []; this.textes = []; this.anneaux = []; this.eclairs = []; this.bandeau = null;
    const f = document.createElement('canvas');
    f.width = W; f.height = H;
    const g = f.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rnd = hasard(carte.def.graine * 31 + 5);
    const motif = (nom) => {
      const s = decors.sols[nom];
      if (!s) return null;
      const c = document.createElement('canvas');
      c.width = 2 * T; c.height = 2 * T;
      const cg = c.getContext('2d');
      cg.imageSmoothingEnabled = !!s.lisse;
      // Les textures de sol doivent se répéter sans couture : on ne garde que leur partie pleine (sans la marge
      // transparente ni le contour qu'un ancien rendu leur ajoutait).
      const [x0, y0, l, h] = partiePleine(s.img);
      cg.drawImage(s.img, x0, y0, l, h, 0, 0, 2 * T, 2 * T);
      return g.createPattern(c, 'repeat');
    };
    const herbe = motif('herbe') || motif('sable'), terre = motif('chemin');
    const sol = carte.def.sol || { fond: '#5c9e3f', taches: ['#4f8f35', '#6db34b'], chemin: '#c8a165', cailloux: ['#b08d57', '#dcc08a'] };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c * T, y = r * T, chemin = carte.etat(c, r) === CHEMIN;
      if (chemin) {
        g.fillStyle = terre || sol.chemin; g.fillRect(x, y, T, T);
        if (!terre) for (let i = 0; i < 5; i++) {
          g.fillStyle = rnd() < 0.5 ? sol.cailloux[0] : sol.cailloux[1];
          g.fillRect(x + Math.floor(rnd() * 18) * 2, y + Math.floor(rnd() * 18) * 2, 4, 2);
        }
      } else {
        g.fillStyle = herbe || sol.fond; g.fillRect(x, y, T, T);
        if (!herbe) for (let i = 0; i < 6; i++) {
          g.fillStyle = rnd() < 0.5 ? sol.taches[0] : sol.taches[1];
          g.fillRect(x + Math.floor(rnd() * 10) * 4, y + Math.floor(rnd() * 10) * 4, 4, 4);
        }
      }
    }
    // Bords du chemin.
    const estChemin = (c, r) => carte.etat(c, r) === CHEMIN || (c < 0 && carte.etat(0, r) === CHEMIN);
    g.fillStyle = 'rgba(70,45,20,.45)';
    for (const [c, r] of carte.cheminCases) {
      const x = c * T, y = r * T;
      if (!estChemin(c, r - 1)) g.fillRect(x, y, T, 4);
      if (!estChemin(c, r + 1)) g.fillRect(x, y + T - 4, T, 4);
      if (!estChemin(c - 1, r)) g.fillRect(x, y, 4, T);
      if (!estChemin(c + 1, r) && !(c + 1 === carte.chateau.c)) g.fillRect(x + T - 4, y, 4, T);
    }
    this.fond = f;
    // Décor fixe : château, entrée, puis éléments placés par la logique.
    const ch = carte.chateau, id = carte.def.id;
    const noms = carte.def.noms || { chateau: 'chateau', entrees: carte.entrees.map(() => 'entree') };
    this.fixes = [
      ...carte.entrees.map((en, k) => ({ nom: id + '_' + noms.entrees[k], x: (en.c + en.l / 2) * T, y: (en.r + en.h / 2) * T, c: -1, r: -1, bloquant: true })),
      { nom: id + '_' + noms.chateau, x: (ch.c + ch.l / 2) * T, y: (ch.r + ch.h / 2) * T, c: -1, r: -1, bloquant: true },
      // Ponts : posés sur le chemin, dessinés sous les ennemis.
      ...(carte.def.ponts || []).map(([c, r]) => ({ nom: id + '_pont', x: c * T + T / 2, y: r * T + T / 2, c: -1, r: -1, bloquant: true, sol: true })),
      ...carte.decors,
    ];
  }

  evenements(liste) {
    for (const e of liste) {
      switch (e.type) {
        case 'mort':
          if (e.boss) {
            this.eclater(e.x, e.y - 20, '#f2c14e', 40); this.eclater(e.x, e.y - 20, COULEUR_ENN[e.sorte], 30);
            this.secousse = 0.5;
            this.bandeau = { texte: 'L’Ogre chef de guerre est vaincu !', sous: '+' + e.or + ' or', t: 0, vie: 2.4 };
          }
          this.eclater(e.x, e.y - (e.vol ? 18 : 6), COULEUR_ENN[e.sorte], 10);
          this.texte(e.x, e.y - 20, '+' + e.or, '#f2c14e');
          break;
        case 'explosion':
          if (e.feu && e.sorte === 'canon') { this.eclater(e.x, e.y - 4, '#ff8a2b', 4); this.eclater(e.x, e.y - 4, '#ffd23f', 2); break; }
          this.anneaux.push({ x: e.x, y: e.y, r: 4, max: e.rayon, vie: 0.35, t: 0, col: e.feu ? '255,110,40' : '255,170,60' });
          this.eclater(e.x, e.y, e.feu ? '#ff6a2b' : '#f29a3a', e.rayon > 60 ? 16 : 8);
          break;
        case 'eclair': this.eclairs.push({ points: e.points, t: 0, vie: 0.22, col: e.sorte === 'mage' ? '#d29bff' : '#bff0ff' }); break;
        case 'aura': if (Math.random() < 0.5) this.eclater(e.x + (Math.random() - 0.5) * e.rayon * 1.4, e.y + (Math.random() - 0.5) * e.rayon * 1.2, '#e8f8ff', 1); break;
        case 'transperce': this.eclairs.push({ points: [{ x: e.x, y: e.y - 8 }, { x: e.x2, y: e.y2 - 8 }], t: 0, vie: 0.15, col: '#f5e6c8', droit: true }); break;
        case 'touche':
          if (e.sorte === 'givre') this.eclater(e.x, e.y - 6, '#bfe9ff', e.gel ? 10 : 4);
          if (e.sorte === 'mage') this.eclater(e.x, e.y - 6, '#d29bff', 5);
          break;
        case 'soin':
          if (e.soignes) this.anneaux.push({ x: e.x, y: e.y, r: 6, max: e.rayon, vie: 0.6, t: 0, col: '93,255,154' });
          break;
        case 'boss': this.bandeau = { texte: e.nom + ' arrive !', sous: 'Visez-le avec le ciblage « Plus fort »', t: 0, vie: 3, alerte: true }; this.secousse = 0.4; break;
        case 'rugissement':
          this.anneaux.push({ x: e.x, y: e.y, r: 10, max: e.rayon, vie: 0.6, t: 0, col: '255,80,60' });
          this.texte(e.x, e.y - 70, 'Rugissement !', '#ff8a7a'); this.secousse = 0.3;
          break;
        case 'impactMeteore':
          this.anneaux.push({ x: e.x, y: e.y, r: 6, max: e.rayon + 10, vie: 0.4, t: 0, col: '255,120,40' });
          this.eclater(e.x, e.y, '#ff6a2b', 14); this.eclater(e.x, e.y, '#6b4423', 8); this.secousse = 0.25;
          break;
        case 'renforts': this.eclater(e.x, e.y + 6, '#c9a46a', 12); this.texte(e.x, e.y - 34, 'Renforts !', '#8fc0ff'); break;
        case 'ecrases': this.eclater(e.x, e.y, '#3a6fc4', 12); this.texte(e.x, e.y - 30, 'Écrasés !', '#ff8a7a'); break;
        case 'finRenforts': if (!e.tombes) this.eclater(e.x, e.y, '#8fc0ff', 6); break;
        case 'pose': this.eclater(e.x, e.y + 12, '#c9a46a', 10); break;
        case 'amelioration': this.eclater(e.x, e.y - 20, '#f2c14e', 16); this.texte(e.x, e.y - 44, 'Niveau ' + (e.niveau + 1), '#f2c14e'); break;
        case 'vente': this.eclater(e.x, e.y, '#c9a46a', 12); this.texte(e.x, e.y - 20, '+' + e.or, '#f2c14e'); break;
        case 'fuite': this.secousse = 0.25; this.texte((this.carte.chateau.c + 0.5) * T, this.carte.chateau.r * T + 20, '−' + e.vies + ' ♥', '#ff6b5a'); break;
        case 'vague': this.bandeau = { texte: 'Vague ' + e.vague, sous: '', t: 0, vie: 2 }; break;
        case 'finVague': this.bandeau = { texte: 'Vague ' + e.vague + ' terminée', sous: '+' + e.or + ' or', t: 0, vie: 1.8 }; break;
        case 'bonusAppel': this.texte(W - 120, H - 30, '+' + e.or + ' or', '#f2c14e'); break;
        default:
      }
    }
  }

  eclater(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
      this.eclats.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, vie: 0.5 + Math.random() * 0.3, t: 0, col, s: 2 + Math.floor(Math.random() * 2) * 2 });
    }
  }

  texte(x, y, txt, col) { this.textes.push({ x, y, txt, col, t: 0, vie: 1 }); }

  /** `ui` : { construction, fantome:{c,r}, selection, peutPoser(c,r) } ; `dt` : secondes de jeu écoulées. */
  dessiner(s, ui, dt) {
    const g = this.g;
    this.horloge += dt;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.secousse > 0) { this.secousse -= dt; g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6); }
    g.imageSmoothingEnabled = false;
    if (this.fond) g.drawImage(this.fond, 0, 0);
    if (!s) return;

    // Cases constructibles.
    if (ui.construction) {
      g.fillStyle = 'rgba(255,255,255,.07)';
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        if (ui.peutPoser(c, r)) g.fillRect(c * T + 2, r * T + 2, T - 4, T - 4);
    }

    // Portées.
    const sel = ui.selection && s.tours.find((t) => t.id === ui.selection);
    if (sel) this.portee(sel.x, sel.y, statsTour(sel).portee, true);
    let fantome = null;
    if (ui.construction && ui.fantome) {
      const { c, r } = ui.fantome;
      const ok = ui.peutPoser(c, r) && s.or >= TOURS[ui.construction].prix;
      fantome = { c, r, ok };
      this.portee(c * T + T / 2, r * T + T / 2, TOURS[ui.construction].niveaux[0].portee, ok);
    }

    // Visée d'un pouvoir.
    if (ui.pouvoir && ui.visee) {
      const v = ui.visee;
      if (ui.pouvoir === 'meteores') {
        const p = POUVOIRS.meteores;
        g.beginPath(); g.arc(v.x, v.y, p.rayon + p.zone, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,110,40,.15)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,150,60,.8)'; g.stroke();
      } else {
        const ok = ui.surChemin(v.c, v.r);
        g.fillStyle = ok ? 'rgba(90,160,255,.3)' : 'rgba(255,80,60,.25)'; g.fillRect(v.c * T, v.r * T, T, T);
        g.strokeStyle = ok ? '#8fc0ff' : '#ff5a4a'; g.lineWidth = 2; g.strokeRect(v.c * T + 1, v.r * T + 1, T - 2, T - 2);
      }
    }

    // Objets triés par profondeur.
    const occupees = new Set(s.tours.map((t) => t.c + ',' + t.r));
    const liste = [];
    for (const d of this.fixes) {
      if (!d.bloquant && occupees.has(d.c + ',' + d.r)) continue;
      liste.push({ y: d.sol ? -1e6 : d.bloquant ? d.y : d.y - 30, f: () => this.element(d) });
    }
    for (const t of s.tours) liste.push({ y: t.y + 1, f: () => this.tour(t, t.id === ui.selection) });
    for (const e of s.ennemis) if (!e.vol) liste.push({ y: e.y, f: () => this.ennemi(e) });
    for (const gr of s.renforts || []) liste.push({ y: gr.y, f: () => this.soldats(gr) });
    liste.sort((a, b) => a.y - b.y);
    for (const o of liste) o.f();
    for (const e of s.ennemis) if (e.vol) this.ennemi(e);

    for (const p of s.projectiles) this.projectile(p);
    for (const m of s.meteores || []) this.meteore(m);
    this.effets(dt);

    if (fantome) {
      g.globalAlpha = 0.65;
      this.tour({ sorte: ui.construction, niveau: 0, x: fantome.c * T + T / 2, y: fantome.r * T + T / 2, angle: 0, tir: 0 }, false);
      g.globalAlpha = 1;
      if (!fantome.ok) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 3; g.strokeRect(fantome.c * T + 3, fantome.r * T + 3, T - 6, T - 6); }
    }
    this.dessinerBandeau(dt);
  }

  /** Météore en chute : arrive en diagonale depuis le haut, son ombre grandit au sol. */
  meteore(m) {
    if (m.t > m.chute) return;
    const g = this.g, k = 1 - m.t / m.chute;
    g.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * k})`;
    g.beginPath(); g.ellipse(m.x, m.y, 6 + 10 * k, 3 + 4 * k, 0, 0, Math.PI * 2); g.fill();
    const x = m.x + (1 - k) * 140, y = m.y - (1 - k) * 380;
    g.strokeStyle = 'rgba(255,140,40,.5)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x + 30, y - 80); g.lineTo(x, y); g.stroke();
    g.fillStyle = '#1a1420'; g.fillRect(x - 8, y - 8, 16, 16);
    g.fillStyle = '#ff6a2b'; g.fillRect(x - 7, y - 7, 14, 14);
    g.fillStyle = '#ffd23f'; g.fillRect(x - 4, y - 5, 6, 6);
    if (Math.random() < 0.8) this.eclats.push({ x: x + (Math.random() - 0.5) * 10, y, vx: 30, vy: -60, vie: 0.4, t: 0, col: Math.random() < 0.5 ? '#ff8a2b' : '#ffd23f', s: 3 });
  }

  /** Groupe de renforts : un ou deux soldats selon les PV restants, barre de vie commune. */
  soldats(gr) {
    const g = this.g;
    const n = Math.ceil(gr.pv / POUVOIRS.renforts.pv);
    for (let i = 0; i < n; i++) {
      const sp = spriteEnnemi('soldat', gr.coup > 0 ? Math.floor(this.horloge * 10) % 2 : 0);
      const x = gr.x + (i - (n - 1) / 2) * 16;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, gr.y + 8, 9, 3, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(sp, Math.round(x - sp.width), Math.round(gr.y + 9 - sp.height * ECHELLE), sp.width * ECHELLE, sp.height * ECHELLE);
    }
    const p = Math.max(0, gr.pv / gr.pvMax);
    g.fillStyle = '#1a1420'; g.fillRect(gr.x - 15, gr.y - 31, 30, 6);
    g.fillStyle = '#5aa0ff'; g.fillRect(gr.x - 14, gr.y - 30, Math.ceil(28 * p), 4);
  }

  portee(x, y, r, ok) {
    const g = this.g;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = ok ? 'rgba(255,255,255,.10)' : 'rgba(255,80,60,.12)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = ok ? 'rgba(255,255,255,.55)' : 'rgba(255,90,70,.7)'; g.stroke();
  }

  element(d) {
    const el = this.decors.elements[d.nom];
    if (!el) return;
    const g = this.g;
    g.imageSmoothingEnabled = el.lisse;
    const k = el.echelle;
    g.drawImage(el.img, Math.round(d.x - el.ancre[0] * k), Math.round(d.y - el.ancre[1] * k), el.img.width * k, el.img.height * k);
    g.imageSmoothingEnabled = false;
  }

  tour(t, choisie) {
    const g = this.g;
    const m = this.modeles.tours[nomTour(t.sorte, t.niveau, t.variante)];
    const bas = t.y + 19;
    if (m) this.tourModele(t, m);
    else this.tourCode(t, bas);
    for (let i = 0; i <= t.niveau; i++) { g.fillStyle = '#1a1420'; g.fillRect(t.x - 10 + i * 8, bas + 1, 6, 4); g.fillStyle = '#f2c14e'; g.fillRect(t.x - 9 + i * 8, bas + 2, 4, 2); }
    if (choisie) { g.strokeStyle = '#f2c14e'; g.lineWidth = 2; g.strokeRect(t.x - T / 2 + 1, t.y - T / 2 + 1, T - 2, T - 2); }
  }

  /** Tour de Blender : le corps ancré au centre de la case, la pièce mobile dans l'orientation la plus proche. */
  tourModele(t, m) {
    const g = this.g, k = m.k;
    g.imageSmoothingEnabled = m.lisse;
    g.drawImage(m.img, Math.round(t.x - m.ancre[0] * k), Math.round(t.y - m.ancre[1] * k), m.img.width * k, m.img.height * k);
    const p = m.piece;
    if (p) {
      // À l'écran y descend ; dans Blender l'angle tourne vers +Y (le haut de l'écran) : d'où le signe moins.
      const pas = (2 * Math.PI) / p.n;
      const i = ((Math.round(-t.angle / pas) % p.n) + p.n) % p.n;
      const recul = t.tir > 0 ? -3 : 0;
      const px = t.x + (p.pivot[0] - m.ancre[0]) * k + Math.cos(t.angle) * recul;
      const py = t.y + (p.pivot[1] - m.ancre[1]) * k + Math.sin(t.angle) * recul;
      g.drawImage(p.img, i * p.l, 0, p.l, p.h, Math.round(px - p.ancre[0] * k), Math.round(py - p.ancre[1] * k), p.l * k, p.h * k);
    }
    g.imageSmoothingEnabled = false;
  }

  tourCode(t, bas) {
    const g = this.g;
    const sp = spriteTour(t.sorte, t.niveau);
    const l = sp.width * ECHELLE, h = sp.height * ECHELLE;
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath(); g.ellipse(t.x + 2, bas - 4, 17, 6, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(sp, Math.round(t.x - l / 2), Math.round(bas - h), l, h);
    if (t.sorte === 'baliste') {
      g.save(); g.translate(t.x, t.y - 4); g.rotate(t.angle);
      const recul = t.tir > 0 ? -3 : 0;
      g.fillStyle = '#1a1420'; g.fillRect(recul - 6, -3, 22, 6); g.fillRect(recul + 2, -11, 4, 22);
      g.fillStyle = '#9b6b3d'; g.fillRect(recul - 5, -2, 20, 4); g.fillStyle = '#7a5230'; g.fillRect(recul + 3, -10, 2, 20);
      g.restore();
    } else if (t.sorte === 'tempete') {
      if (t.tir > 0) { g.fillStyle = 'rgba(159,227,255,.6)'; g.beginPath(); g.arc(t.x, t.y - 36, 10, 0, Math.PI * 2); g.fill(); }
    } else if (t.sorte === 'canon') {
      g.save(); g.translate(t.x, t.y - 12); g.rotate(t.angle);
      const recul = t.tir > 0 ? -3 : 0;
      g.fillStyle = '#1a1420'; g.fillRect(recul - 2, -5, 20, 10);
      g.fillStyle = '#3a3d44'; g.fillRect(recul, -3, 16, 6);
      g.fillStyle = '#5a5e66'; g.fillRect(recul, -3, 16, 2);
      g.restore();
      g.fillStyle = '#2a2d33'; g.fillRect(t.x - 5, t.y - 17, 10, 10);
    } else if (t.sorte === 'mage') {
      const p = 0.6 + 0.4 * Math.sin(this.horloge * 4 + t.x);
      g.fillStyle = `rgba(199,125,255,${0.35 * p})`; g.beginPath(); g.arc(t.x, t.y - 38, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = t.tir > 0 ? '#ffffff' : '#c77dff'; g.fillRect(t.x - 3, t.y - 41, 6, 6);
    } else if (t.sorte === 'givre') {
      if (Math.sin(this.horloge * 3 + t.y) > 0.92) { g.fillStyle = '#ffffff'; g.fillRect(t.x - 1 + ((t.x * 7) % 9) - 4, t.y - 30, 2, 2); }
    } else if (t.sorte === 'archers' && t.tir > 0) {
      g.fillStyle = '#ffe9a8'; g.fillRect(t.x - 2, t.y - 30, 4, 2);
    }
  }

  ennemi(e) {
    const g = this.g;
    const haut = e.vol ? 22 + Math.sin(this.horloge * 8 + e.id) * 3 : 0;
    // Image à dessiner : bande de Blender si elle existe, sinon sprite en code. Point d'ancrage = les pieds.
    const actions = this.modeles.ennemis[nomEnnemi(e.sorte)];
    const rugit = e.rugit > 0 && actions && actions.rugissement;
    const a = actions && (rugit ? actions.rugissement : actions.marche || actions.vol || Object.values(actions)[0]);
    let src;
    if (a) {
      const i = rugit ? Math.min(a.n - 1, Math.floor((1 - e.rugit / 0.8) * a.n))
        : e.vol ? Math.floor(this.horloge * 12 + e.id) % a.n : Math.floor(e.pas / 5) % a.n;
      src = { img: a.img, sx: i * a.l, sw: a.l, sh: a.h, ax: a.ancre[0], ay: a.ancre[1], k: a.k, lisse: a.lisse };
    } else {
      const sp = spriteEnnemi(e.sorte, Math.floor(e.pas / 14) % 2);
      src = { img: sp, sx: 0, sw: sp.width, sh: sp.height, ax: sp.width / 2, ay: sp.height - 1, k: ECHELLE, lisse: false };
    }
    if (!a || e.vol) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.beginPath(); g.ellipse(e.x, e.y + 8, e.vol ? 9 : 12, 4, 0, 0, Math.PI * 2); g.fill();
    }
    const l = src.sw * src.k, h = src.sh * src.k;
    const x = Math.round(e.x - src.ax * src.k), y = Math.round(e.y + 9 - haut - src.ay * src.k);
    g.imageSmoothingEnabled = src.lisse;
    if (e.sorte === 'spectre') g.globalAlpha = e.invisible ? 0.18 : 0.75;
    if (e.dx < -0.1) {
      const xm = Math.round(e.x - (src.sw - src.ax) * src.k);
      g.save(); g.translate(xm + l, y); g.scale(-1, 1); g.drawImage(src.img, src.sx, 0, src.sw, src.sh, 0, 0, l, h); g.restore();
    } else g.drawImage(src.img, src.sx, 0, src.sw, src.sh, x, y, l, h);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    if (e.rage > 0) { g.fillStyle = '#ff5a4a'; g.fillRect(x + l / 2 - 1 + ((Math.floor(this.horloge * 10) % 3) - 1) * 6, y - 2, 3, 3); }
    if (e.gel > 0) {
      g.fillStyle = 'rgba(170,225,255,.55)'; g.fillRect(x + l * 0.2, y + h * 0.25, l * 0.6, h * 0.6);
      g.strokeStyle = '#e8f8ff'; g.lineWidth = 1; g.strokeRect(x + l * 0.2 + 0.5, y + h * 0.25 + 0.5, l * 0.6, h * 0.6);
    }
    if (e.brule && Math.random() < 0.5) this.eclats.push({ x: e.x + (Math.random() - 0.5) * 14, y: e.y - 4 - haut - Math.random() * 14, vx: 0, vy: -30, vie: 0.35, t: 0, col: Math.random() < 0.5 ? '#ff8a2b' : '#ffd23f', s: 2 });
    if (e.ralenti > 0) {
      const pied = e.y + 9 - haut;
      g.fillStyle = 'rgba(160,220,255,.45)'; g.fillRect(e.x - 10, pied - 6, 20, 5);
      g.fillStyle = '#e8f8ff'; g.fillRect(e.x - 8 + ((Math.floor(this.horloge * 6) * 5) % 16), y + 6, 2, 2);
    }
    // Barre de vie et marques.
    const bx = Math.round(e.x - 13), by = y - 4;
    if (e.pv < e.pvMax && !e.invisible) {
      g.fillStyle = '#1a1420'; g.fillRect(bx - 1, by - 1, 28, 6);
      const p = Math.max(0, e.pv / e.pvMax);
      g.fillStyle = p > 0.5 ? '#5fd068' : p > 0.25 ? '#f2c14e' : '#e5533d';
      g.fillRect(bx, by, Math.ceil(26 * p), 4);
    }
    const d = ENNEMIS[e.sorte];
    if (d.armure) { g.fillStyle = '#1a1420'; g.fillRect(bx - 9, by - 3, 8, 9); g.fillStyle = '#c5ccd4'; g.fillRect(bx - 8, by - 2, 6, 5); g.fillRect(bx - 7, by + 3, 4, 2); }
    if (d.soin) { g.fillStyle = '#1a1420'; g.fillRect(bx - 9, by - 3, 8, 8); g.fillStyle = '#5dff9a'; g.fillRect(bx - 6, by - 2, 2, 6); g.fillRect(bx - 8, by, 6, 2); }
  }

  projectile(p) {
    const g = this.g;
    const dx = p.tx - p.x, dy = p.ty - p.y, n = Math.hypot(dx, dy) || 1;
    if (p.sorte === 'archers') {
      g.strokeStyle = '#6b4423'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p.x - (dx / n) * 10, p.y - (dy / n) * 10); g.lineTo(p.x, p.y); g.stroke();
      g.fillStyle = '#e8e8e8'; g.fillRect(p.x - 1, p.y - 1, 3, 3);
    } else if (p.sorte === 'baliste') {
      g.strokeStyle = '#1a1420'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(p.x - (dx / n) * 16, p.y - (dy / n) * 16); g.lineTo(p.x, p.y); g.stroke();
      g.strokeStyle = '#9b6b3d'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p.x - (dx / n) * 15, p.y - (dy / n) * 15); g.lineTo(p.x, p.y); g.stroke();
      g.fillStyle = '#cfd8dc'; g.fillRect(p.x - 2, p.y - 2, 4, 4);
    } else if (p.brulure) {
      g.fillStyle = 'rgba(255,120,40,.45)'; g.beginPath(); g.arc(p.x, p.y, p.zone > 42 ? 6 : 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd23f'; g.fillRect(p.x - 2, p.y - 2, 4, 4);
      if (Math.random() < 0.6) this.eclats.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: -20, vie: 0.3, t: 0, col: '#ff8a2b', s: 2 });
    } else if (p.sorte === 'canon') {
      const h = Math.sin(Math.PI * Math.min(1, p.parcours / p.total)) * (p.zone > 60 ? 70 : 28);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(p.x, p.y, 5, 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1420'; g.fillRect(p.x - 4, p.y - h - 4, 8, 8);
      g.fillStyle = '#4a4d55'; g.fillRect(p.x - 3, p.y - h - 3, 4, 3);
    } else if (p.sorte === 'givre') {
      g.fillStyle = '#d8f3ff'; g.save(); g.translate(p.x, p.y); g.rotate(Math.PI / 4); g.fillRect(-3, -3, 6, 6); g.restore();
      g.fillStyle = '#5cb8f0'; g.fillRect(p.x - 1, p.y - 1, 2, 2);
    } else {
      g.fillStyle = 'rgba(199,125,255,.4)'; g.beginPath(); g.arc(p.x, p.y, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0dcff'; g.fillRect(p.x - 2, p.y - 2, 4, 4);
      if (Math.random() < 0.5) this.eclats.push({ x: p.x, y: p.y, vx: 0, vy: -10, vie: 0.3, t: 0, col: '#c77dff', s: 2 });
    }
  }

  effets(dt) {
    const g = this.g;
    this.eclats = this.eclats.filter((p) => (p.t += dt) < p.vie);
    for (const p of this.eclats) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
      g.globalAlpha = 1 - p.t / p.vie; g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    this.anneaux = this.anneaux.filter((a) => (a.t += dt) < a.vie);
    for (const a of this.anneaux) {
      const k = a.t / a.vie;
      g.globalAlpha = 1 - k; g.strokeStyle = `rgb(${a.col})`; g.lineWidth = 3;
      g.beginPath(); g.arc(a.x, a.y, a.r + (a.max - a.r) * k, 0, Math.PI * 2); g.stroke();
    }
    this.eclairs = this.eclairs.filter((l) => (l.t += dt) < l.vie);
    for (const l of this.eclairs) {
      g.globalAlpha = 1 - l.t / l.vie;
      for (const [w, col] of [[5, 'rgba(120,200,255,.35)'], [2, l.col]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath();
        l.points.forEach((p, i) => {
          if (i === 0) { g.moveTo(p.x, p.y); return; }
          const a = l.points[i - 1];
          if (!l.droit) {   // ligne brisée, différente à chaque image
            const mx = (a.x + p.x) / 2 + (Math.random() - 0.5) * 14, my = (a.y + p.y) / 2 + (Math.random() - 0.5) * 14;
            g.lineTo(mx, my);
          }
          g.lineTo(p.x, p.y);
        });
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    this.textes = this.textes.filter((t) => (t.t += dt) < t.vie);
    g.font = `600 14px ${POLICE}`; g.textAlign = 'center';
    for (const t of this.textes) {
      const y = t.y - t.t * 26;
      g.globalAlpha = 1 - t.t / t.vie;
      g.fillStyle = '#1a1420'; g.fillText(t.txt, t.x + 1, y + 1);
      g.fillStyle = t.col; g.fillText(t.txt, t.x, y);
    }
    g.globalAlpha = 1;
  }

  dessinerBandeau(dt) {
    const b = this.bandeau;
    if (!b) return;
    b.t += dt;
    if (b.t > b.vie) { this.bandeau = null; return; }
    const g = this.g;
    const a = Math.min(1, b.t * 4, (b.vie - b.t) * 3);
    g.globalAlpha = a;
    g.fillStyle = 'rgba(26,20,32,.72)'; g.fillRect(0, H / 2 - 44, W, b.sous ? 88 : 70);
    g.textAlign = 'center';
    g.font = `700 ${b.texte.length > 26 ? 32 : 40}px ${POLICE}`; g.fillStyle = b.alerte ? '#ff8a7a' : '#f2c14e'; g.fillText(b.texte, W / 2, H / 2 + 6);
    if (b.sous) { g.font = `600 18px ${POLICE}`; g.fillStyle = '#fdf6e3'; g.fillText(b.sous, W / 2, H / 2 + 32); }
    g.globalAlpha = 1;
  }
}

export { LIBRE };
