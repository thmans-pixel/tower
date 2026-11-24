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
import { silhouette, suivre, poseMort, genreMort } from './monstres.js';
import { poseTour, boutArme, DUREES } from './tours-effets.js';
import { Ambiance } from './ambiance.js';
import * as Laby from './labyrinthe.js';
import { statsEffectives, trajetPrevu, enVague } from '../sim/partie.js';
import { ZONES, LABYRINTHE } from '../data/labyrinthe.js';

const TAILLE_MONSTRES = 1.25;   // spec 013 : monstres affichés plus gros (la logique ne change pas)

const COULEUR_ENN = { gob: '#5fae3a', loup: '#8c8f99', orc: '#9aa3ad', bat: '#6d5585', cham: '#9b5fc0', slime: '#8be04e', slime_petit: '#8be04e', golem: '#7f8288', spectre: '#cfe3f0', ogre: '#8a9a5b' };
const POLICE = '"Chiffres", "Pixelify Sans", system-ui, sans-serif';   // chiffres lisibles (spec 009)

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
  let k = d[(mid(y0, y1) * c.width + x0) * 4] < 60 ? 1 : 0;   // contour sombre : un pixel de plus
  // Le contour peut rentrer d'un pixel dans les coins (points noirs en grille sur le sable) : on rogne encore.
  const sombre = (x, y) => d[(y * c.width + x) * 4 + 3] === 255 && d[(y * c.width + x) * 4] < 60 && d[(y * c.width + x) * 4 + 1] < 60;
  while (k < 3 && (sombre(x0 + k, y0 + k) || sombre(x1 - k, y0 + k) || sombre(x0 + k, y1 - k) || sombre(x1 - k, y1 - k))) k++;
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
    this.couronnes = [];   // couronne au-dessus de la tour de la vague (spec 017)
    this.eclairs = [];
    this.bandeau = null;
    this.secousse = 0;
    this.horloge = 0;
    this.modeles = { tours: {}, ennemis: {} };   // remplis par main.js quand les packs Blender sont chargés
    // Spec 011 et 012 (lot A) : suivi des monstres à l'écran, corps qui tombent, nuages, pièces d'or.
    this.suivi = new Map();
    this.morts = [];
    this.bouffees = [];
    this.pieces = [];
    this.dtImage = 0;
    this.cibleOr = null;    // () => { x, y } : compteur d'or en coordonnées de la toile (main.js)
    this.surPiece = null;   // appelé quand une pièce arrive au compteur
    // Spec 012 (lot B) : animations des tours, tours vendues, lueurs additives, cratères au sol.
    this.animTours = new Map();   // id de tour → { genre, t }
    this.derniereTour = new Map();   // "x,y" → dernière apparence dessinée (pour la vente)
    this.vendues = [];
    this.colonnes = [];
    this.lueurs = [];
    this.crateres = [];
    this.etat = null;
    // Spec 012 (lot C) : vie du décor ; « Effets réduits » coupe l'ambiance et allège les particules.
    this.ambiance = new Ambiance();
    this.reduits = false;
    this.barres = false;    // touche V : barres de vie de tous les monstres, même pleines (spec 016)
    this.apercuTrajet = { cle: '', trajet: null };
  }

  /** Prépare le fond et le décor d'une carte construite par la logique. */
  preparer(carte, decors) {
    this.carte = carte;
    this.decors = decors;
    this.eclats = []; this.textes = []; this.anneaux = []; this.couronnes = []; this.eclairs = []; this.bandeau = null;
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
    // Spec 013 : grandes taches douces, claires et sombres, pour casser la répétition de la texture du sol.
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 120, clair = rnd() < 0.5;
      const d = g.createRadialGradient(x, y, 0, x, y, r);
      d.addColorStop(0, clair ? 'rgba(255,250,230,.07)' : 'rgba(60,40,20,.07)'); d.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = d; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // Chemin plus contrasté selon le décor, bords doux au lieu d'un trait sombre, traces de pas.
    const theme = (carte.def.aleatoire && carte.def.aleatoire.theme) || carte.def.id;
    const teinte = { desert: '150,95,40', montagne: '90,120,170', prairie: '110,70,30' }[theme] || '110,70,30';
    g.fillStyle = `rgba(${teinte},${theme === 'montagne' ? 0.1 : 0.16})`;
    // Labyrinthe : le chemin change à chaque mur, il est tracé à chaque image et non peint dans le fond.
    const cases = carte.lab ? [] : carte.cheminCases;
    for (const [c, r] of cases) g.fillRect(c * T, r * T, T, T);
    const estChemin = (c, r) => carte.etat(c, r) === CHEMIN || (c < 0 && carte.etat(0, r) === CHEMIN);
    // Dégradé de 7 px depuis le bord (ex, ey) vers l'intérieur du chemin (direction vx, vy).
    const bord = (ex, ey, vx, vy, rx, ry, l, h) => {
      const d = g.createLinearGradient(ex, ey, ex + vx * 7, ey + vy * 7);
      d.addColorStop(0, `rgba(${teinte},.42)`); d.addColorStop(1, `rgba(${teinte},0)`);
      g.fillStyle = d; g.fillRect(rx, ry, l, h);
    };
    for (const [c, r] of cases) {
      const x = c * T, y = r * T;
      if (!estChemin(c, r - 1)) bord(x, y, 0, 1, x, y, T, 7);
      if (!estChemin(c, r + 1)) bord(x, y + T, 0, -1, x, y + T - 7, T, 7);
      if (!estChemin(c - 1, r)) bord(x, y, 1, 0, x, y, 7, T);
      if (!estChemin(c + 1, r) && !(c + 1 === carte.chateau.c)) bord(x + T, y, -1, 0, x + T - 7, y, 7, T);
    }
    for (const [c, r] of cases) {
      if (rnd() < 0.55) continue;
      const x = c * T + 8 + rnd() * 20, y = r * T + 8 + rnd() * 20;
      g.fillStyle = `rgba(${teinte},.22)`;
      g.fillRect(Math.round(x), Math.round(y), 3, 2); g.fillRect(Math.round(x) + 5, Math.round(y) + 4, 3, 2);
    }
    this.fond = f;
    // Décor fixe : château, entrée, puis éléments placés par la logique.
    const ch = carte.chateau, id = carte.def.id;
    const noms = carte.def.noms || { chateau: 'chateau', entrees: carte.entrees.map(() => 'entree') };
    this.fixes = carte.lab ? [] : [
      ...carte.entrees.map((en, k) => ({ nom: id + '_' + noms.entrees[k], x: (en.c + en.l / 2) * T, y: (en.r + en.h / 2) * T, c: -1, r: -1, bloquant: true })),
      { nom: id + '_' + noms.chateau, x: (ch.c + ch.l / 2) * T, y: (ch.r + ch.h / 2) * T, c: -1, r: -1, bloquant: true },
      // Ponts : posés sur le chemin, dessinés sous les ennemis.
      ...(carte.def.ponts || []).map(([c, r]) => ({ nom: id + '_pont', x: c * T + T / 2, y: r * T + T / 2, c: -1, r: -1, bloquant: true, sol: true })),
      ...carte.decors,
    ];
    this.ambiance.preparer(carte, this.fixes);
  }

  evenements(liste) {
    for (const e of liste) {
      switch (e.type) {
        case 'mort': this.mourir(e); break;
        case 'blesse': {
          const st = this.suivi.get(e.id);
          if (st) st.flash = 0.09;
          if (e.armure) for (let i = 0; i < 3; i++) this.eclats.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y - (e.vol ? 22 : 12), vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 50, vie: 0.25, t: 0, col: i ? '#e8eef2' : '#9aa3ad', s: 2 });
          break;
        }
        case 'explosion':
          if (e.feu && e.sorte === 'canon') { this.eclater(e.x, e.y - 4, '#ff8a2b', 4); this.eclater(e.x, e.y - 4, '#ffd23f', 2); break; }
          this.anneaux.push({ x: e.x, y: e.y, r: 4, max: e.rayon, vie: 0.35, t: 0, col: e.feu ? '255,110,40' : '255,170,60' });
          this.lueurs.push({ x: e.x, y: e.y - 4, r: Math.min(40, e.rayon * 0.7), t: 0, vie: 0.14, col: '255,200,120' });
          this.eclater(e.x, e.y, e.feu ? '#ff6a2b' : '#f29a3a', e.rayon > 60 ? 16 : 8);
          this.poussiere(e.x, e.y, e.rayon > 60 ? 7 : 4, e.feu ? '120,80,60' : '110,100,90');
          this.crateres.push({ x: e.x, y: e.y, r: Math.min(26, e.rayon * 0.45), t: 0, vie: 4 });
          break;
        case 'eclair':
          this.eclairs.push({ points: e.points, t: 0, vie: 0.22, col: e.sorte === 'mage' ? '#d29bff' : '#bff0ff' });
          for (const pt of e.points.slice(1)) this.lueurs.push({ x: pt.x, y: pt.y, r: 14, t: 0, vie: 0.12, col: e.sorte === 'mage' ? '210,155,255' : '190,240,255' });
          break;
        case 'aura': if (Math.random() < 0.5) this.eclater(e.x + (Math.random() - 0.5) * e.rayon * 1.4, e.y + (Math.random() - 0.5) * e.rayon * 1.2, '#e8f8ff', 1); break;
        case 'transperce': this.eclairs.push({ points: [{ x: e.x, y: e.y - 8 }, { x: e.x2, y: e.y2 - 8 }], t: 0, vie: 0.15, col: '#f5e6c8', droit: true }); break;
        case 'touche':
          if (e.sorte === 'givre') {
            for (let i = 0; i < (e.gel ? 10 : 5); i++) this.eclats.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 110, vy: -50 - Math.random() * 60, vie: 0.45, t: 0, col: i % 2 ? '#e8f8ff' : '#7fd0ff', s: 2 + (i % 3 === 0 ? 1 : 0), losange: true });
          }
          if (e.sorte === 'mage') { this.eclater(e.x, e.y - 6, '#d29bff', 5); this.lueurs.push({ x: e.x, y: e.y - 8, r: 10, t: 0, vie: 0.1, col: '210,155,255' }); }
          if (e.sorte === 'archers' || e.sorte === 'baliste') {
            for (let i = 0; i < (e.sorte === 'baliste' ? 6 : 3); i++) this.eclats.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 50, vie: 0.35, t: 0, col: i % 2 ? '#9b6b3d' : '#d9b58a', s: 2 });
          }
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
        case 'pose': this.animTours.set(e.tour, { genre: 'pose', t: 0 }); break;
        case 'amelioration':
          this.animTours.set(e.tour, { genre: 'amel', t: 0 });
          this.colonnes.push({ x: e.x, y: e.y + 19, t: 0, vie: DUREES.colonne });
          for (let i = 0; i < 18; i++) this.eclats.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y - 40 - Math.random() * 30, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, vie: 0.7 + Math.random() * 0.4, t: 0, col: i % 3 ? '#f2c14e' : '#fff3b0', s: 2, g: 0.35 });
          this.texte(e.x, e.y - 50, 'Niveau ' + (e.niveau + 1), '#f2c14e');
          break;
        case 'vente': {
          const d = this.derniereTour.get(e.x + ',' + e.y);
          if (d) this.vendues.push({ tour: d, t: 0 });
          this.poussiere(e.x, e.y + 16, 6);
          for (let i = 0; i < 10; i++) this.eclats.push({ x: e.x, y: e.y - 10, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 80, vie: 0.7, t: 0, col: i % 2 ? '#f2c14e' : '#fff3b0', s: 3 });
          for (let i = 0; i < 3 && this.pieces.length < 25 && this.cibleOr; i++) this.pieces.push({ x0: e.x + (i - 1) * 8, y0: e.y - 10, t: -i * 0.06, vie: 0.6 });
          this.texte(e.x, e.y - 24, '+' + e.or, '#f2c14e');
          break;
        }
        case 'tir': this.tirer(e); break;
        case 'aTerre': {   // labyrinthe : le monstre repart, le joueur gagne une vie
          const st = this.suivi.get(e.id);
          if (st) st.flash = 0.25;
          this.anneaux.push({ x: e.x, y: e.y, r: 4, max: e.boss ? 46 : 24, vie: 0.4, t: 0, col: '125,255,154' });
          for (let i = 0; i < 6; i++) this.eclats.push({ x: e.x, y: e.y - (e.vol ? 24 : 10), vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, vie: 0.5, t: 0, col: i % 2 ? '#7dff9a' : '#eafff0', s: 2 });
          this.texte(e.x, e.y - (e.vol ? 44 : 28), '+1 ♥', '#7dff9a');
          if (this.pieces.length < 25 && this.cibleOr) this.pieces.push({ x0: e.x, y0: e.y - 12, t: 0, vie: 0.6 });
          break;
        }
        case 'poseMur': this.poussiere(e.x, e.y + 14, 4); break;
        case 'venteMur': this.poussiere(e.x, e.y + 14, 5); this.texte(e.x, e.y - 18, '+' + e.or, '#f2c14e'); break;
        case 'prevusAppliques': this.bandeau = { texte: 'Travaux terminés', sous: 'Le labyrinthe est à jour', t: 0, vie: 1.6 }; break;
        case 'fuite': this.secousse = 0.25; this.texte((this.carte.chateau.c + 0.5) * T, this.carte.chateau.r * T + 20, '−' + e.vies + ' ♥', '#ff6b5a'); break;
        case 'vague': this.bandeau = { texte: 'Vague ' + e.vague, sous: '', t: 0, vie: 2 }; break;
        case 'tpUse':
          this.bandeau = { texte: 'Téléporteur usé', sous: 'Il ne téléporte plus : le trajet est recalculé', t: 0, vie: 2.2 };
          this.anneaux.push({ x: e.x, y: e.y, r: 4, max: 36, vie: 0.6, t: 0, col: '160,160,170' }, { x: e.x2, y: e.y2, r: 4, max: 36, vie: 0.6, t: 0, col: '160,160,170' });
          break;
        case 'tourDeLaVague':
          this.bandeau = { texte: 'Tour de la vague : ' + e.nom, sous: '+' + e.or + ' or · vague ' + e.vague + ' terminée', t: 0, vie: 2.4 };
          this.couronnes.push({ x: e.x, y: e.y, t: 0, vie: 4 });
          this.texte(e.x, e.y - 36, '+' + e.or, '#f2c14e');
          break;
        case 'finVague': this.bandeau = { texte: 'Vague ' + e.vague + ' terminée', sous: '+' + e.or + ' or', t: 0, vie: 1.8 }; break;
        case 'bonusAppel': this.texte(W - 120, H - 30, '+' + e.or + ' or', '#f2c14e'); break;
        default:
      }
    }
  }

  /** Mort d'un monstre : son corps tombe et s'efface, un nuage, une pièce qui file au compteur d'or. */
  mourir(e) {
    const st = this.suivi.get(e.id);
    this.suivi.delete(e.id);
    const actions = this.modeles.ennemis[nomEnnemi(e.sorte)];
    const genre = genreMort(e.sorte, e.vol);
    const vx = st ? st.vx : e.dx || 1;
    this.morts.push({ sorte: e.sorte, x: e.x, y: e.y, t: 0, boss: e.boss, genre, cote: vx < 0 ? -1 : 1,
      dernier: st && st.dernier, mort: actions && actions.mort, dir: st ? Math.max(0, st.dir) : 0 });
    const col = COULEUR_ENN[e.sorte];
    if (genre === 'slime') {
      for (let i = 0; i < 10; i++) this.eclats.push({ x: e.x, y: e.y - 6, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, vie: 0.5, t: 0, col: i % 3 ? col : '#d8ffb0', s: 2 + (i % 2) * 2 });
      this.bouffees.push({ x: e.x, y: e.y + 6, r: 4, max: 14, vie: 1.6, t: 0, col: '139,224,78', plat: true, a: 0.45 });
    } else if (genre === 'spectre') {
      for (let i = 0; i < 6; i++) this.bouffees.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - 10 - Math.random() * 14, r: 3, max: 9 + Math.random() * 5, vie: 0.9, t: 0, col: '207,227,240', monte: 22, a: 0.5 });
    } else if (!e.vol) {
      this.poussiere(e.x, e.y + 6, e.boss ? 10 : 4);
    }
    if (e.boss) {
      this.eclater(e.x, e.y - 20, '#f2c14e', 40); this.eclater(e.x, e.y - 20, col, 30);
      for (let i = 0; i < 14; i++) this.eclats.push({ x: e.x, y: e.y - 24, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, vie: 0.9 + Math.random() * 0.4, t: 0, col: i % 2 ? '#5b4a3a' : col, s: 4 + (i % 3) * 2 });
      this.anneaux.push({ x: e.x, y: e.y, r: 8, max: 110, vie: 0.6, t: 0, col: '255,190,80' });
      this.secousse = 0.8;
      this.bandeau = { texte: 'L’Ogre chef de guerre est vaincu !', sous: '+' + e.or + ' or', t: 0, vie: 2.4 };
    } else this.eclater(e.x, e.y - (e.vol ? 18 : 8), col, 5);
    // Pièce d'or vers le compteur (au plus 25 à la fois ; sinon le compteur pulse directement).
    if (this.pieces.length < 25 && this.cibleOr) this.pieces.push({ x0: e.x, y0: e.y - 16, t: 0, vie: 0.55 + Math.random() * 0.15 });
    else this.surPiece?.();
  }

  /** Nuage de poussière (ronds doux qui gonflent, montent un peu et s'effacent). */
  poussiere(x, y, n, col = '201,170,120') {
    if (this.reduits) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      this.bouffees.push({ x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 6, r: 2, max: 6 + Math.random() * 6, vie: 0.5 + Math.random() * 0.3, t: 0, col, monte: 10, a: 0.45 });
    }
  }

  /** Lueur, fumée ou jet de flammes au bout de l'arme qui vient de tirer (spec 012, lot B). */
  tirer(e) {
    const t = this.etat && this.etat.tours.find((x) => x.x === e.x && x.y === e.y);
    if (!t) return;
    const b = boutArme(t), a = t.angle || 0;
    const coul = { archers: '255,233,168', canon: '255,190,90', givre: '190,235,255', mage: '215,160,255', baliste: '255,233,168', tempete: '190,240,255' }[t.sorte];
    if (t.sorte === 'canon' && t.variante === 'b') {   // Lance-flammes : un vrai cône de feu
      for (let i = 0; i < 16; i++) {
        const da = (Math.random() - 0.5) * 0.6, v = 140 + Math.random() * 110;
        this.eclats.push({ x: b.x, y: b.y, vx: Math.cos(a + da) * v, vy: Math.sin(a + da) * v * 0.8, vie: 0.22 + Math.random() * 0.14, t: 0,
          col: ['#ffd23f', '#ff8a2b', '#ff5a2b', '#fff3b0'][i % 4], s: 3 + (i % 3), g: -0.4, flamme: true });
      }
      this.lueurs.push({ x: b.x, y: b.y, r: 16, t: 0, vie: 0.1, col: '255,150,60' });
      return;
    }
    this.lueurs.push({ x: b.x, y: b.y, r: t.sorte === 'canon' ? 14 : 9, t: 0, vie: 0.09, col: coul });
    if (t.sorte === 'canon') {
      for (let i = 0; i < 3; i++) this.bouffees.push({ x: b.x + Math.cos(a) * 4, y: b.y, r: 2, max: 6 + i * 2, vie: 0.6 + i * 0.15, t: 0, col: '170,165,160', monte: 14, a: 0.5 });
    }
  }

  eclater(x, y, col, n) {
    if (this.reduits) n = Math.ceil(n / 2);
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
    this.dtImage = dt;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.secousse > 0) { this.secousse -= dt; g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6); }
    g.imageSmoothingEnabled = false;
    if (this.fond) g.drawImage(this.fond, 0, 0);
    if (!s) return;
    this.etat = s;
    // Cratères laissés par les explosions, sous tout le reste.
    this.crateres = this.crateres.filter((c) => (c.t += dt) < c.vie);
    for (const c of this.crateres) {
      const a = 0.35 * Math.min(1, (c.vie - c.t) / 1.2);
      g.fillStyle = `rgba(40,28,20,${a})`; g.beginPath(); g.ellipse(c.x, c.y + 4, c.r, c.r * 0.45, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(20,14,10,${a})`; g.beginPath(); g.ellipse(c.x, c.y + 4, c.r * 0.55, c.r * 0.25, 0, 0, Math.PI * 2); g.fill();
    }
    for (const [id, a] of this.animTours) { a.tPrec = a.t; a.t += dt; if (a.t > 1) this.animTours.delete(id); }

    // Cases constructibles (`caseLibre` : test rapide, sans chercher si le passage du labyrinthe reste ouvert).
    if (ui.construction) {
      const libre = ui.caseLibre || ui.peutPoser;
      g.fillStyle = 'rgba(255,255,255,.07)';
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        if (libre(c, r)) g.fillRect(c * T + 2, r * T + 2, T - 4, T - 4);
    }

    // Portées.
    const sel = ui.selection && s.tours.find((t) => t.id === ui.selection);
    if (sel) this.portee(sel.x, sel.y, statsEffectives(s, sel).portee, true);
    let fantome = null;
    const unMur = ui.construction === 'mur';
    if (ui.construction && ui.fantome) {
      const { c, r } = ui.fantome;
      const raison = ui.raisonPose ? ui.raisonPose(c, r) : ui.peutPoser(c, r) ? null : 'place';
      const ok = !raison && s.or >= (unMur ? LABYRINTHE.prixMur : TOURS[ui.construction].prix);
      fantome = { c, r, ok, raison };
      if (!unMur) {
        const z = s.labyrinthe && s.carte.zoneEn(c, r);
        this.portee(c * T + T / 2, r * T + T / 2, TOURS[ui.construction].niveaux[0].portee * ((z && ZONES[z.sorte].portee) || 1), ok);
      }
    }
    if (s.labyrinthe) this.solLabyrinthe(s, fantome);

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
    for (const t of s.tours) liste.push({ y: t.y + 1, f: () => { this.tour(t, t.id === ui.selection); if (t.aRetirer) Laby.croix(g, t.c, t.r); } });
    if (s.labyrinthe) this.objetsLabyrinthe(s, liste);
    this.vendues = this.vendues.filter((v) => (v.t += dt) < DUREES.vente);
    for (const v of this.vendues) liste.push({ y: v.tour.y + 1, f: () => this.tour(v.tour, false, { genre: 'vente', t: v.t }) });
    for (const e of s.ennemis) if (!e.vol) liste.push({ y: e.y, f: () => this.ennemi(e) });
    this.morts = this.morts.filter((m) => (m.t += dt) < (m.boss ? 1.5 : 0.8));
    for (const m of this.morts) liste.push({ y: m.y - 1, f: () => this.corps(m) });
    for (const gr of s.renforts || []) liste.push({ y: gr.y, f: () => this.soldats(gr) });
    liste.sort((a, b) => a.y - b.y);
    for (const o of liste) o.f();
    this.ambiance.details(g, this.horloge);
    for (const e of s.ennemis) if (e.vol) this.ennemi(e);
    if (this.suivi.size > s.ennemis.length) {   // monstres partis (tués ou passés) : on oublie leur suivi
      const ici = new Set(s.ennemis.map((e) => e.id));
      for (const id of this.suivi.keys()) if (!ici.has(id)) this.suivi.delete(id);
    }

    for (const p of s.projectiles) this.projectile(p);
    for (const m of s.meteores || []) this.meteore(m);
    this.effets(dt);
    if (!this.reduits) this.ambiance.dessiner(g, dt, this.horloge);

    if (fantome) {
      if (unMur) Laby.mur(g, fantome.c, fantome.r, 0.65);
      else {
        g.globalAlpha = 0.65;
        this.tour({ sorte: ui.construction, niveau: 0, x: fantome.c * T + T / 2, y: fantome.r * T + T / 2, angle: 0, tir: 0 }, false);
        g.globalAlpha = 1;
      }
      if (!fantome.ok) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 3; g.strokeRect(fantome.c * T + 3, fantome.r * T + 3, T - 6, T - 6); }
      if (fantome.raison === 'population') this.etiquette(fantome.c * T + T / 2, fantome.r * T - 14, 'Population maximale atteinte', '#ff8a7a');
      if (fantome.raison === 'bouche') this.etiquette(fantome.c * T + T / 2, fantome.r * T - 14, 'Le passage serait bouché', '#ff8a7a');
    }
    this.dessinerCouronnes(dt);
    this.dessinerBandeau(dt);
  }

  /** Petit texte fixe sur fond sombre, gardé dans l'écran. */
  etiquette(x, y, txt, col) {
    const g = this.g;
    g.font = `700 14px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const l = g.measureText(txt).width + 14;
    const cx = Math.max(l / 2 + 4, Math.min(W - l / 2 - 4, x)), cy = Math.max(14, y);
    g.fillStyle = 'rgba(26,20,32,.88)'; g.fillRect(cx - l / 2, cy - 11, l, 22);
    g.fillStyle = col; g.fillText(txt, cx, cy + 1);
  }

  /**
   * Labyrinthe, à plat sous les objets : zones, trajet des monstres, téléporteurs. Pendant une vague le trajet en
   * cours est estompé ; s'il y a des travaux prévus (ou une pose visée), le futur trajet est tracé en bleu clair.
   */
  solLabyrinthe(s, fantome) {
    const g = this.g, lab = s.carte.lab, t = this.horloge + performance.now() / 1000;
    const prises = new Set(s.tours.map((x) => x.c + ',' + x.r));
    for (const z of lab.zones) if (!s.labyrinthe.murs.has(z.r * COLS + z.c)) Laby.zone(g, z, prises.has(z.c + ',' + z.r) ? 0 : t);
    const vague = enVague(s);
    const vise = fantome && !fantome.raison ? fantome : null;
    let futur = null;
    if (s.labyrinthe.prevus.length || vise) {
      const cle = s.labyrinthe.prevus.map((p) => p.type + p.c + ',' + p.r).join(';') + '|' + s.tours.length + '|' + s.labyrinthe.murs.size + '|' + (vise ? vise.c + ',' + vise.r : '') + '|' + lab.tp.map((x) => (x.use ? 1 : 0)).join('');
      if (this.apercuTrajet.cle !== cle) this.apercuTrajet = { cle, trajet: vise ? trajetPrevu(s, vise.c, vise.r) : trajetPrevu(s) };
      futur = this.apercuTrajet.trajet;
    }
    if (s.carte.sol) Laby.tracer(g, s.carte.sol, t, 'cours', futur ? 0.4 : vague ? 0.55 : 1);
    if (futur) Laby.tracer(g, futur, t, 'futur', 1);
    for (const tp of lab.tp) { Laby.teleporteur(g, tp.a, tp.forme, false, t, tp.use); Laby.teleporteur(g, tp.b, tp.forme, true, t, tp.use); }
  }

  /** Labyrinthe, objets debout triés par profondeur : entrée, sortie, checkpoints, murs, travaux prévus. */
  objetsLabyrinthe(s, liste) {
    const g = this.g, lab = s.carte.lab, l = s.labyrinthe;
    const y = (r) => r * T + T / 2;
    liste.push({ y: y(lab.entree.r), f: () => Laby.entree(g, lab.entree) }, { y: y(lab.sortie.r), f: () => Laby.sortie(g, lab.sortie) });
    for (const p of lab.cp) liste.push({ y: y(p.r) - 12, f: () => Laby.checkpoint(g, p) });
    for (const o of lab.obstacles || []) {
      const ens = new Set(o.cases.map((p) => p.r * COLS + p.c));
      for (const p of o.cases) liste.push({ y: y(p.r) + 2, f: () => Laby.obstacle(g, o.type, p.c, p.r, ens.has((p.r - 1) * COLS + p.c)) });
    }
    const aVendre = new Set(l.prevus.filter((p) => p.type === 'venteMur').map((p) => p.r * COLS + p.c));
    for (const k of l.murs) {
      const c = k % COLS, r = Math.floor(k / COLS);
      liste.push({ y: y(r) + 1, f: () => { Laby.mur(g, c, r); if (aVendre.has(k)) Laby.croix(g, c, r); } });
    }
    const pouls = 0.42 + 0.12 * Math.sin(performance.now() / 250);
    for (const p of l.prevus) {
      if (p.type === 'poseMur') liste.push({ y: y(p.r) + 1, f: () => Laby.mur(g, p.c, p.r, pouls) });
      else if (p.type === 'poseTour') liste.push({ y: y(p.r) + 1, f: () => {
        g.globalAlpha = pouls;
        this.tour({ sorte: p.sorte, niveau: 0, x: p.c * T + T / 2, y: y(p.r), angle: 0, tir: 0 }, false);
        g.globalAlpha = 1;
      } });
    }
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

  tour(t, choisie, animForcee) {
    const g = this.g;
    const m = this.modeles.tours[nomTour(t.sorte, t.niveau, t.variante)];
    const bas = t.y + 19;
    if (t.id !== undefined && !animForcee) this.derniereTour.set(t.x + ',' + t.y, { sorte: t.sorte, niveau: t.niveau, variante: t.variante, x: t.x, y: t.y, angle: t.angle, tir: 0 });
    if (choisie) {   // halo pulsé à la base de la tour choisie
      const p = 0.55 + 0.35 * Math.sin(this.horloge * 5);
      g.strokeStyle = `rgba(242,193,78,${p})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(t.x, bas - 3, 21 + p * 2, 8 + p, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = `rgba(242,193,78,${p * 0.18})`; g.fill();
    }
    const anim = animForcee || (t.id !== undefined && this.animTours.get(t.id));
    let pose = null;
    if (anim) {
      pose = poseTour(anim, anim.t, anim.tPrec ?? anim.t);
      if (pose.impact) { this.poussiere(t.x, bas - 2, 7); this.secousse = Math.max(this.secousse, 0.08); }
      g.save();
      if (anim.genre === 'vente') { g.beginPath(); g.rect(t.x - 40, t.y - 120, 80, bas - t.y + 122); g.clip(); }
      g.translate(t.x + (pose.tremble ? (Math.random() - 0.5) * pose.tremble * 2 : 0), bas + pose.dy);
      g.scale(pose.sx, pose.sy);
      g.translate(-t.x, -bas);
    }
    if (m) this.tourModele(t, m);
    else this.tourCode(t, bas);
    if (anim) g.restore();
    if (!anim || anim.genre !== 'vente') for (let i = 0; i <= t.niveau; i++) { g.fillStyle = '#1a1420'; g.fillRect(t.x - 10 + i * 8, bas + 1, 6, 4); g.fillStyle = '#f2c14e'; g.fillRect(t.x - 9 + i * 8, bas + 2, 4, 2); }
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
      const recul = t.tir > 0 ? -(t.sorte === 'canon' || t.sorte === 'baliste' ? 5 : 3) * Math.min(1, t.tir / 0.15) : 0;
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
    const st = suivre(this.suivi.get(e.id), e, this.dtImage, a ? a.dirs : 1);
    this.suivi.set(e.id, st);
    let src;
    if (a) {
      const i = rugit ? Math.min(a.n - 1, Math.floor((1 - e.rugit / 0.8) * a.n))
        : e.vol ? Math.floor(this.horloge * 12 + e.id) % a.n : Math.floor(e.pas / 5) % a.n;
      const ligne = a.dirs > 1 ? st.dir : 0;
      src = { img: a.img, sx: i * a.l, sy: ligne * a.h, sw: a.l, sh: a.h, ax: a.ancre[0], ay: a.ancre[1], k: a.k * TAILLE_MONSTRES, lisse: a.lisse, dirs: a.dirs };
    } else {
      const sp = spriteEnnemi(e.sorte, Math.floor(e.pas / 14) % 2);
      src = { img: sp, sx: 0, sy: 0, sw: sp.width, sh: sp.height, ax: sp.width / 2, ay: sp.height - 1, k: ECHELLE * TAILLE_MONSTRES, lisse: false, dirs: 1 };
    }
    src.flip = src.dirs === 1 && st.vx < -0.1;
    st.dernier = src;
    // Ombre de contact nette sous chaque monstre (spec 013), plus petite pour un volant.
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath(); g.ellipse(e.x, e.y + 8, e.vol ? 8 : 11 * TAILLE_MONSTRES, 3.5, 0, 0, Math.PI * 2); g.fill();
    const l = src.sw * src.k, h = src.sh * src.k;
    const x = Math.round(e.x - src.ax * src.k), y = Math.round(e.y + 9 - haut - src.ay * src.k);
    let alpha = Math.min(1, st.age / 0.35);   // apparition en fondu
    if (e.sorte === 'spectre') alpha *= e.invisible ? 0.18 : 0.75;
    // Liseré clair d'un pixel pour détacher le monstre du sol (spec 013).
    if (!this.reduits) {
      const lis = { ...src, img: silhouette(src.img, src.sx, src.sy, src.sw, src.sh, '#fff6dc'), sx: 0, sy: 0 };
      g.globalAlpha = alpha * 0.45;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.image(lis, e.x + ox, e.y + 9 - haut + oy, 0, 1, 1);
    }
    g.globalAlpha = alpha;
    this.image(src, e.x, e.y + 9 - haut, 0, 1, 1);
    if (st.flash > 0) {
      g.globalAlpha = alpha * Math.min(1, st.flash / 0.06) * 0.85;
      this.image({ ...src, img: silhouette(src.img, src.sx, src.sy, src.sw, src.sh), sx: 0, sy: 0 }, e.x, e.y + 9 - haut, 0, 1, 1);
    }
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
    if ((e.pv < e.pvMax || this.barres) && !e.invisible) {
      g.fillStyle = '#1a1420'; g.fillRect(bx - 1, by - 1, 28, 6);
      const p = Math.max(0, e.pv / e.pvMax);
      g.fillStyle = p > 0.5 ? '#5fd068' : p > 0.25 ? '#f2c14e' : '#e5533d';
      g.fillRect(bx, by, Math.ceil(26 * p), 4);
    }
    const d = ENNEMIS[e.sorte];
    if (d.armure) { g.fillStyle = '#1a1420'; g.fillRect(bx - 9, by - 3, 8, 9); g.fillStyle = '#c5ccd4'; g.fillRect(bx - 8, by - 2, 6, 5); g.fillRect(bx - 7, by + 3, 4, 2); }
    if (d.soin) { g.fillStyle = '#1a1420'; g.fillRect(bx - 9, by - 3, 8, 8); g.fillStyle = '#5dff9a'; g.fillRect(bx - 6, by - 2, 2, 6); g.fillRect(bx - 8, by, 6, 2); }
  }

  /** Dessine une image d'ennemi posée sur ses pieds en (px, py), tournée de `rot` et étirée (sx, sy). */
  image(src, px, py, rot, ex, ey) {
    const g = this.g, k = src.k;
    const l = src.sw * k, h = src.sh * k;
    const ax = (src.flip ? src.sw - src.ax : src.ax) * k, ay = src.ay * k;
    g.imageSmoothingEnabled = src.lisse;
    if (!rot && ex === 1 && ey === 1 && !src.flip) {
      g.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, Math.round(px - ax), Math.round(py - ay), l, h);
    } else {
      g.save();
      g.translate(Math.round(px), Math.round(py));
      if (rot) g.rotate(rot);
      g.scale(src.flip ? -ex : ex, ey);
      g.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, src.flip ? -(l - ax) : -ax, -ay, l, h);
      g.restore();
    }
    g.imageSmoothingEnabled = false;
  }

  /** Corps d'un monstre mort (spec 012, lot A). */
  corps(m) {
    const p = poseMort(m, m.t);
    if (p.alpha <= 0) return;
    let src = m.dernier;
    if (p.action) {
      const a = p.action;
      src = { img: a.img, sx: p.image * a.l, sy: (a.dirs > 1 ? m.dir : 0) * a.h, sw: a.l, sh: a.h, ax: a.ancre[0], ay: a.ancre[1], k: a.k * TAILLE_MONSTRES, lisse: a.lisse, flip: a.dirs === 1 && m.cote < 0 };
    }
    if (!src) return;
    const g = this.g;
    g.globalAlpha = p.alpha * (m.sorte === 'spectre' ? 0.75 : 1);
    this.image(src, m.x, m.y + 9 + p.dy, p.rot, p.sx, p.sy);
    g.globalAlpha = 1;
  }

  projectile(p) {
    const g = this.g;
    const dx = p.tx - p.x, dy = p.ty - p.y, n = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, p.parcours / p.total);
    if (p.sorte === 'archers' || p.sorte === 'baliste') {
      // Flèche ou carreau en arc, avec une traînée qui s'efface (spec 012, lot B).
      const lourd = p.sorte === 'baliste';
      const hauteur = Math.min(lourd ? 10 : 22, p.total * (lourd ? 0.05 : 0.12));
      // Le projectile suit sa cible (logique) ; l'arc n'est qu'une hauteur ajoutée à l'affichage.
      const ux = dx / n, uy = dy / n;
      const pos = (q) => { const recul = (k - q) * p.total; return { x: p.x - ux * recul, y: p.y - uy * recul - Math.sin(Math.PI * q) * hauteur }; };
      const a = pos(k);
      const ang = Math.atan2(uy - Math.cos(Math.PI * k) * Math.PI * hauteur / p.total, ux);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 6, 3, 2);
      for (let i = 1; i <= 3; i++) {   // traînée
        const q = pos(Math.max(0, k - i * 0.05));
        g.fillStyle = `rgba(255,245,220,${0.35 - i * 0.1})`; g.fillRect(Math.round(q.x), Math.round(q.y), 2, 2);
      }
      const L = lourd ? 16 : 11;
      g.save(); g.translate(a.x, a.y); g.rotate(ang);
      g.fillStyle = '#1a1420'; g.fillRect(-L - 1, lourd ? -2 : -1.5, L + 2, lourd ? 4 : 3);
      g.fillStyle = lourd ? '#9b6b3d' : '#7a5230'; g.fillRect(-L, -1, L, 2);
      g.fillStyle = '#e8eef2'; g.fillRect(-1, -2, 3, 4);                       // pointe
      g.fillStyle = lourd ? '#cfd8dc' : '#f2f2f2'; g.fillRect(-L, -2, 3, 1); g.fillRect(-L, 1, 3, 1);   // empennage
      g.restore();
    } else if (p.brulure && p.sorte === 'canon') {
      // Lance-flammes : le cône de feu est dessiné au tir ; le projectile n'est qu'une braise.
      g.fillStyle = 'rgba(255,140,50,.5)'; g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2); g.fill();
      if (Math.random() < 0.7) this.eclats.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30, vy: -10, vie: 0.25, t: 0, col: Math.random() < 0.5 ? '#ff8a2b' : '#ffd23f', s: 3, g: -0.4, flamme: true });
    } else if (p.brulure) {
      const r = 6 + Math.sin(this.horloge * 30) * 1.5;
      g.fillStyle = 'rgba(255,120,40,.4)'; g.beginPath(); g.arc(p.x, p.y, r + 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff8a2b'; g.beginPath(); g.arc(p.x, p.y, r - 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff3b0'; g.fillRect(p.x - 2, p.y - 2, 4, 4);
      if (Math.random() < 0.8) this.eclats.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: -20, vie: 0.3, t: 0, col: Math.random() < 0.5 ? '#ff8a2b' : '#ffd23f', s: 2, g: -0.3 });
    } else if (p.sorte === 'canon') {
      const h = Math.sin(Math.PI * k) * (p.zone > 60 ? 70 : 28);
      const ombre = 3 + 3 * (1 - h / 70);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(p.x, p.y, ombre + 1, ombre / 2, 0, 0, Math.PI * 2); g.fill();
      if (Math.random() < 0.5) this.bouffees.push({ x: p.x, y: p.y - h, r: 1.5, max: 4 + Math.random() * 2, vie: 0.5, t: 0, col: '160,155,150', monte: 6, a: 0.45 });
      g.fillStyle = '#1a1420'; g.fillRect(p.x - 4, p.y - h - 4, 8, 8);
      g.fillStyle = '#4a4d55'; g.fillRect(p.x - 3, p.y - h - 3, 6, 6);
      g.fillStyle = '#8a8f99'; g.fillRect(p.x - 2, p.y - h - 2, 2, 2);
    } else if (p.sorte === 'givre') {
      g.fillStyle = 'rgba(160,220,255,.35)'; g.beginPath(); g.arc(p.x, p.y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d8f3ff'; g.save(); g.translate(p.x, p.y); g.rotate(this.horloge * 10); g.fillRect(-3, -3, 6, 6); g.restore();
      g.fillStyle = '#5cb8f0'; g.fillRect(p.x - 1, p.y - 1, 2, 2);
      if (Math.random() < 0.4) this.eclats.push({ x: p.x, y: p.y, vx: 0, vy: 0, vie: 0.3, t: 0, col: '#e8f8ff', s: 1, g: 0.1 });
    } else {
      const r = 7 + Math.sin(this.horloge * 24) * 2;   // boule magique qui pulse
      g.fillStyle = 'rgba(199,125,255,.35)'; g.beginPath(); g.arc(p.x, p.y, r + 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(230,200,255,.7)'; g.beginPath(); g.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(p.x - 1, p.y - 1, 3, 3);
      for (let i = 0; i < 2; i++) this.eclats.push({ x: p.x - (dx / n) * 4, y: p.y - (dy / n) * 4, vx: -(dx / n) * 20 + (Math.random() - 0.5) * 20, vy: -(dy / n) * 20 + (Math.random() - 0.5) * 20, vie: 0.35, t: 0, col: i ? '#c77dff' : '#f0dcff', s: 2, g: 0 });
    }
  }

  effets(dt) {
    const g = this.g;
    this.bouffees = this.bouffees.filter((b) => (b.t += dt) < b.vie);
    for (const b of this.bouffees) {
      const k = b.t / b.vie, r = b.r + (b.max - b.r) * (1 - (1 - k) * (1 - k));
      g.fillStyle = `rgba(${b.col},${(b.a || 0.4) * (1 - k)})`;
      g.beginPath();
      if (b.plat) g.ellipse(b.x, b.y, r * 1.6, r * 0.5, 0, 0, Math.PI * 2);
      else g.arc(b.x, b.y - (b.monte || 0) * k, r, 0, Math.PI * 2);
      g.fill();
    }
    if (this.pieces.length) {
      const c = this.cibleOr ? this.cibleOr() : { x: W - 40, y: -20 };
      this.pieces = this.pieces.filter((p) => {
        p.t += dt;
        if (p.t >= p.vie) { this.surPiece?.(); return false; }
        return true;
      });
      for (const p of this.pieces) {
        const k = p.t / p.vie;
        const sautY = -36 * Math.sin(Math.min(1, k * 2.2) * Math.PI);   // petit saut, puis vol vers le compteur
        const v = k < 0.35 ? 0 : (k - 0.35) / 0.65, e = v * v;
        const x = p.x0 + (c.x - p.x0) * e, y = p.y0 + (k < 0.35 ? sautY : (c.y - p.y0) * e);
        const larg = 2 + Math.round(Math.abs(Math.cos(this.horloge * 14 + p.x0)) * 2);
        g.fillStyle = '#1a1420'; g.fillRect(Math.round(x) - larg - 1, Math.round(y) - 4, larg * 2 + 2, 8);
        g.fillStyle = '#f2c14e'; g.fillRect(Math.round(x) - larg, Math.round(y) - 3, larg * 2, 6);
        g.fillStyle = '#fff3b0'; g.fillRect(Math.round(x) - larg, Math.round(y) - 3, Math.max(1, larg - 1), 2);
      }
    }
    this.eclats = this.eclats.filter((p) => (p.t += dt) < p.vie);
    const plafond = this.reduits ? 160 : 600;   // au-delà, les plus anciens s'en vont
    if (this.eclats.length > plafond) this.eclats.splice(0, this.eclats.length - plafond);
    if (this.bouffees.length > plafond / 3) this.bouffees.splice(0, this.bouffees.length - plafond / 3);
    for (const p of this.eclats) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * (p.g ?? 1) * dt;
      if (p.flamme) { p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
      const k = p.t / p.vie;
      g.globalAlpha = 1 - k; g.fillStyle = p.col;
      const sz = p.flamme ? Math.max(1, Math.round(p.s * (1 - k * 0.6))) : p.s;
      if (p.losange) { g.fillRect(Math.round(p.x), Math.round(p.y) - 1, sz, sz + 2); g.fillRect(Math.round(p.x) - 1, Math.round(p.y), sz + 2, sz); }
      else g.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
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
    // Colonnes de lumière (amélioration) et lueurs, en mode additif.
    g.globalCompositeOperation = 'lighter';
    this.colonnes = this.colonnes.filter((c) => (c.t += dt) < c.vie);
    for (const c of this.colonnes) {
      const k = c.t / c.vie, a = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.55, l = 26 * (1 - k * 0.4);
      const d = g.createLinearGradient(0, c.y - 120, 0, c.y);
      d.addColorStop(0, 'rgba(255,220,120,0)'); d.addColorStop(1, `rgba(255,220,120,${a})`);
      g.fillStyle = d; g.fillRect(c.x - l / 2, c.y - 120, l, 120);
      g.fillStyle = `rgba(255,240,180,${a * 0.6})`; g.fillRect(c.x - l / 6, c.y - 120, l / 3, 120);
    }
    this.lueurs = this.lueurs.filter((l) => (l.t += dt) < l.vie);
    for (const l of this.lueurs) {
      const k = l.t / l.vie;
      const d = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      d.addColorStop(0, `rgba(${l.col},${0.9 * (1 - k)})`); d.addColorStop(1, `rgba(${l.col},0)`);
      g.fillStyle = d; g.beginPath(); g.arc(l.x, l.y, l.r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
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

  /** Petite couronne en pixels qui flotte au-dessus de la tour de la vague. */
  dessinerCouronnes(dt) {
    this.couronnes = this.couronnes.filter((c) => (c.t += dt) < c.vie);
    const g = this.g;
    for (const c of this.couronnes) {
      const a = Math.min(1, (c.vie - c.t) * 2), x = Math.round(c.x) - 8, y = Math.round(c.y - 44 + Math.sin(c.t * 4) * 2);
      g.globalAlpha = a;
      g.fillStyle = '#1a1420'; g.fillRect(x - 2, y - 2, 20, 14);
      g.fillStyle = '#f2c14e'; g.fillRect(x, y + 4, 16, 6); g.fillRect(x, y, 3, 5); g.fillRect(x + 6, y - 1, 4, 6); g.fillRect(x + 13, y, 3, 5);
      g.fillStyle = '#c0392b'; g.fillRect(x + 7, y + 6, 2, 2);
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
    // Glisse depuis le haut, puis repart vers le haut (spec 012, lot C).
    const entree = Math.min(1, b.t / 0.3), sortie = Math.max(0, 1 - (b.vie - b.t) / 0.3);
    const dy = -(1 - (1 - (1 - entree) ** 3)) * 120 - sortie * sortie * 80;
    g.globalAlpha = a;
    g.save(); g.translate(0, dy);
    g.fillStyle = 'rgba(26,20,32,.72)'; g.fillRect(0, H / 2 - 44, W, b.sous ? 88 : 70);
    g.fillStyle = b.alerte ? 'rgba(255,138,122,.8)' : 'rgba(242,193,78,.8)'; g.fillRect(0, H / 2 - 44, W, 2); g.fillRect(0, H / 2 - 44 + (b.sous ? 88 : 70) - 2, W, 2);
    g.textAlign = 'center';
    let taille = 40;
    for (; taille > 20; taille -= 2) { g.font = `700 ${taille}px ${POLICE}`; if (g.measureText(b.texte).width < W - 60) break; }
    g.font = `700 ${taille}px ${POLICE}`; g.fillStyle = b.alerte ? '#ff8a7a' : '#f2c14e'; g.fillText(b.texte, W / 2, H / 2 + 6);
    if (b.sous) { g.font = `600 18px ${POLICE}`; g.fillStyle = '#fdf6e3'; g.fillText(b.sous, W / 2, H / 2 + 32); }
    g.restore();
    g.globalAlpha = 1;
  }
}

export { LIBRE };
