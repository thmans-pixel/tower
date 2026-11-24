// Mode labyrinthe (spec 016, lot 2) : dessin du terrain (zones, checkpoints, téléporteurs, entrée, sortie), des murs,
// de ce qui est prévu et du trajet des monstres. Tout est dessiné en code ; rien ne modifie l'état.
import { T } from '../sim/const.js';
import { ZONES } from '../data/labyrinthe.js';

const POLICE = '"Chiffres", "Pixelify Sans", system-ui, sans-serif';

/** Couleur et pictogramme de chaque zone. */
export const ASPECT_ZONES = {
  boue: { fond: '110,72,40', trait: '#5a3a1e' },
  ronces: { fond: '60,110,50', trait: '#274d22' },
  sentier: { fond: '235,215,160', trait: '#b89a5a' },
  source: { fond: '90,170,235', trait: '#2f6fb0' },
  promontoire: { fond: '200,200,215', trait: '#f2f2ff' },
  forge: { fond: '240,130,50', trait: '#ffd27a' },
  marais: { fond: '90,120,80', trait: '#c9e0a0' },
};

/** Bloc de mur (toile 40 × 48 : le dessus dépasse de 8 px au-dessus de la case). */
let imageMur = null;
export function spriteMur() {
  if (imageMur) return imageMur;
  const c = document.createElement('canvas');
  c.width = T; c.height = T + 8;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1420'; g.fillRect(1, 0, T - 2, T + 8);            // contour
  g.fillStyle = '#b9bcc6'; g.fillRect(3, 2, T - 6, 20);               // dessus
  g.fillStyle = '#d6d8e0'; g.fillRect(3, 2, T - 6, 3);
  g.fillStyle = '#7d808c'; g.fillRect(3, 22, T - 6, T - 16);          // face
  g.fillStyle = '#5f626e';                                           // joints des pierres
  g.fillRect(3, 30, T - 6, 2); g.fillRect(3, 38, T - 6, 2);
  g.fillRect(14, 22, 2, 8); g.fillRect(28, 22, 2, 8); g.fillRect(8, 32, 2, 6); g.fillRect(22, 32, 2, 6); g.fillRect(16, 40, 2, 6); g.fillRect(30, 40, 2, 6);
  g.fillStyle = '#a3a6b2'; g.fillRect(12, 8, 6, 2); g.fillRect(24, 13, 8, 2); g.fillRect(8, 15, 4, 2);
  imageMur = c;
  return c;
}

export function mur(g, c, r, alpha = 1) {
  if (alpha < 1) g.globalAlpha = alpha;
  g.drawImage(spriteMur(), c * T, r * T - 8);
  if (alpha < 1) g.globalAlpha = 1;
}

/** Croix rouge sur un élément à retirer. */
export function croix(g, c, r) {
  const x = c * T, y = r * T;
  g.lineWidth = 5; g.strokeStyle = '#1a1420';
  g.beginPath(); g.moveTo(x + 8, y + 4); g.lineTo(x + T - 8, y + T - 8); g.moveTo(x + T - 8, y + 4); g.lineTo(x + 8, y + T - 8); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#ff5a4a'; g.stroke();
}

function pictogramme(g, sorte, x, y, t) {
  const a = ASPECT_ZONES[sorte];
  g.strokeStyle = a.trait; g.fillStyle = a.trait; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath();
  switch (sorte) {
    case 'boue':
      g.ellipse(x - 6, y + 4, 7, 4, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 7, y - 4, 5, 3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 6, y + 8, 3, 2, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'ronces':
      for (const [dx, dy] of [[-7, -5], [6, -6], [0, 5], [-8, 8], [9, 6]]) {
        g.moveTo(x + dx - 4, y + dy - 4); g.lineTo(x + dx + 4, y + dy + 4); g.moveTo(x + dx + 4, y + dy - 4); g.lineTo(x + dx - 4, y + dy + 4);
      }
      g.stroke();
      break;
    case 'sentier': {
      const d = (t * 10) % 8;
      for (const k of [-10, -2, 6]) { g.moveTo(x + k + d - 3, y - 6); g.lineTo(x + k + d + 3, y); g.lineTo(x + k + d - 3, y + 6); }
      g.stroke();
      break;
    }
    case 'source':
      g.moveTo(x, y - 10); g.quadraticCurveTo(x + 9, y + 2, x, y + 8); g.quadraticCurveTo(x - 9, y + 2, x, y - 10); g.fill();
      g.fillStyle = '#e8f6ff'; g.fillRect(x - 3, y + 1, 2, 3);
      break;
    case 'promontoire':
      g.arc(x, y, 9, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x - 5, y); g.moveTo(x + 5, y); g.lineTo(x + 13, y); g.moveTo(x, y - 13); g.lineTo(x, y - 5); g.moveTo(x, y + 5); g.lineTo(x, y + 13); g.stroke();
      break;
    case 'forge':
      g.moveTo(x, y - 11); g.quadraticCurveTo(x + 10, y - 1, x + 5, y + 8); g.lineTo(x - 5, y + 8); g.quadraticCurveTo(x - 10, y, x - 3, y - 4); g.quadraticCurveTo(x - 2, y - 1, x, y - 11); g.fill();
      break;
    default:   // marais
      for (const dy of [-6, 1, 8]) { g.moveTo(x - 11, y + dy); g.quadraticCurveTo(x - 5, y + dy - 5, x, y + dy); g.quadraticCurveTo(x + 5, y + dy + 5, x + 11, y + dy); }
      g.stroke();
  }
}

/** Zone au sol : dalle pour les monstres, socle à coins marqués pour les tours. */
export function zone(g, z, t) {
  const a = ASPECT_ZONES[z.sorte], x = z.c * T, y = z.r * T, tour = ZONES[z.sorte].cible === 'tour';
  g.fillStyle = `rgba(${a.fond},${tour ? 0.5 : 0.62})`;
  g.fillRect(x + 2, y + 2, T - 4, T - 4);
  g.lineWidth = 2;
  if (tour) {
    g.strokeStyle = a.trait;
    g.beginPath();
    for (const [cx, cy, sx, sy] of [[x + 3, y + 3, 1, 1], [x + T - 3, y + 3, -1, 1], [x + 3, y + T - 3, 1, -1], [x + T - 3, y + T - 3, -1, -1]]) {
      g.moveTo(cx, cy + 9 * sy); g.lineTo(cx, cy); g.lineTo(cx + 9 * sx, cy);
    }
    g.stroke();
  } else {
    g.strokeStyle = `rgba(26,20,32,.55)`; g.strokeRect(x + 2, y + 2, T - 4, T - 4);
  }
  pictogramme(g, z.sorte, x + T / 2, y + T / 2, t);
}

export function checkpoint(g, p) {
  const x = p.c * T + T / 2, y = p.r * T + T / 2;
  g.fillStyle = 'rgba(26,20,32,.45)'; g.beginPath(); g.ellipse(x, y + 14, 13, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a1420'; g.fillRect(x - 9, y - 22, 4, 38);
  g.fillStyle = '#d9c9a8'; g.fillRect(x - 8, y - 21, 2, 36);
  g.fillStyle = '#1a1420'; g.beginPath(); g.moveTo(x - 6, y - 23); g.lineTo(x + 17, y - 13); g.lineTo(x - 6, y - 2); g.fill();
  g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(x - 5, y - 20); g.lineTo(x + 12, y - 13); g.lineTo(x - 5, y - 5); g.fill();
  g.font = `700 15px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = '#1a1420'; g.strokeText(String(p.n), x + 7, y + 8);
  g.fillStyle = '#fff3b0'; g.fillText(String(p.n), x + 7, y + 8);
}

function forme(g, nom, x, y, r) {
  g.beginPath();
  if (nom === 'losange') { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
  else g.arc(x, y, r, 0, Math.PI * 2);
}

/** Téléporteur : entrée bleue, sortie rouge, même forme pour une paire. */
export function teleporteur(g, p, nom, sortie, t) {
  const x = p.c * T + T / 2, y = p.r * T + T / 2;
  const [vif, clair, sombre] = sortie ? ['#e5533d', '#ffb0a0', '120,30,20'] : ['#3d8be5', '#a8d4ff', '20,50,120'];
  const pouls = 0.5 + 0.5 * Math.sin(t * 4 + (sortie ? 2 : 0));
  g.fillStyle = `rgba(${sombre},.55)`; forme(g, nom, x, y, 17); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#1a1420'; forme(g, nom, x, y, 15); g.stroke();
  g.lineWidth = 3; g.strokeStyle = vif; g.stroke();
  // L'entrée aspire (anneau qui se resserre), la sortie repousse (anneau qui s'ouvre).
  const k = (t * 0.9) % 1, rayon = sortie ? 3 + k * 10 : 13 - k * 10;
  g.lineWidth = 2; g.strokeStyle = clair; g.globalAlpha = 0.9 - k * 0.6; forme(g, nom, x, y, rayon); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = clair; forme(g, nom, x, y, 2 + pouls * 1.5); g.fill();
}

export function entree(g, p) {
  const x = p.c * T, y = p.r * T;
  g.fillStyle = '#1a1420'; g.fillRect(x, y - 6, T, T + 6);
  g.fillStyle = '#6b6f7a'; g.fillRect(x + 2, y - 4, T - 4, T + 2);
  g.fillStyle = '#8b8f9a'; g.fillRect(x + 2, y - 4, T - 4, 4);
  g.fillStyle = '#120d18'; g.beginPath(); g.moveTo(x + 7, y + T - 2); g.lineTo(x + 7, y + 14); g.quadraticCurveTo(x + T / 2, y - 2, x + T - 7, y + 14); g.lineTo(x + T - 7, y + T - 2); g.fill();
  g.fillStyle = '#e5533d'; g.fillRect(x + 14, y + 20, 3, 3); g.fillRect(x + 23, y + 20, 3, 3);
}

export function sortie(g, p) {
  const x = p.c * T, y = p.r * T;
  g.fillStyle = '#1a1420'; g.fillRect(x, y - 14, T, T + 14);
  g.fillStyle = '#c9b48a'; g.fillRect(x + 2, y - 6, T - 4, T + 4);
  g.fillStyle = '#e2d2ae'; g.fillRect(x + 2, y - 6, T - 4, 4);
  g.fillStyle = '#1a1420'; for (const k of [0, 14, 28]) g.fillRect(x + k, y - 14, 12, 10);
  g.fillStyle = '#c9b48a'; for (const k of [0, 14, 28]) g.fillRect(x + k + 2, y - 12, 8, 8);
  g.fillStyle = '#5a3a1e'; g.beginPath(); g.moveTo(x + 9, y + T - 2); g.lineTo(x + 9, y + 16); g.quadraticCurveTo(x + T / 2, y + 2, x + T - 9, y + 16); g.lineTo(x + T - 9, y + T - 2); g.fill();
  g.fillStyle = '#f2c14e'; g.fillRect(x + 24, y + 24, 3, 3);
  g.fillStyle = '#3d6fd0'; g.fillRect(x + T / 2 - 1, y - 28, 2, 16); g.fillRect(x + T / 2 + 1, y - 28, 10, 7);
}

/**
 * Trajet des monstres en pointillés qui avancent, avec des flèches. `style` : 'cours' (trajet actuel) ou 'futur'
 * (ce qu'il deviendra une fois les travaux prévus appliqués).
 */
export function tracer(g, trajet, t, style, alpha = 1) {
  const futur = style === 'futur';
  const couleur = futur ? '130,225,255' : '255,240,180';
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.setLineDash([7, 9]); g.lineDashOffset = -t * 26;
  for (const [largeur, c] of [[6, `rgba(26,20,32,${0.45 * alpha})`], [3, `rgba(${couleur},${0.85 * alpha})`]]) {
    g.lineWidth = largeur; g.strokeStyle = c;
    g.beginPath();
    let leve = true;
    for (const sg of trajet.segs) {
      if (sg.saut) { leve = true; continue; }
      if (leve) { g.moveTo(sg.a.x, sg.a.y); leve = false; }
      g.lineTo(sg.b.x, sg.b.y);
    }
    g.stroke();
  }
  g.setLineDash([]);
  // Une flèche toutes les trois cases.
  g.fillStyle = `rgba(${couleur},${alpha})`; g.strokeStyle = `rgba(26,20,32,${0.7 * alpha})`; g.lineWidth = 2;
  trajet.segs.forEach((sg, i) => {
    if (sg.saut || i % 3 !== 1) return;
    const x = (sg.a.x + sg.b.x) / 2, y = (sg.a.y + sg.b.y) / 2, ux = (sg.b.x - sg.a.x) / sg.l, uy = (sg.b.y - sg.a.y) / sg.l;
    g.beginPath();
    g.moveTo(x + ux * 7, y + uy * 7); g.lineTo(x - ux * 5 - uy * 6, y - uy * 5 + ux * 6); g.lineTo(x - ux * 5 + uy * 6, y - uy * 5 - ux * 6); g.closePath();
    g.stroke(); g.fill();
  });
  g.restore();
}

/** Texte de la bulle d'aide d'une case du terrain (zone, checkpoint, téléporteur, entrée, sortie), ou null. */
export function aideCase(lab, c, r) {
  const ici = (p) => p.c === c && p.r === r;
  const z = lab.zones.find(ici);
  if (z) return { titre: ZONES[z.sorte].nom, texte: ZONES[z.sorte].description, pour: ZONES[z.sorte].cible === 'tour' ? 'Zone de tour' : 'Zone de monstres' };
  const p = lab.cp.find(ici);
  if (p) return { titre: 'Checkpoint ' + p.n, texte: `Les monstres passent par les checkpoints dans l’ordre, de 1 à ${lab.cp.length}, avant d’aller à la sortie.`, pour: 'Passage obligé' };
  for (const t of lab.tp) {
    if (ici(t.a)) return { titre: 'Téléporteur : entrée', texte: 'Les monstres passent dessus sans le prendre. Fermez-leur tout autre passage avec vos murs : ils sont alors obligés d’y entrer, et ressortent par le téléporteur rouge de la même forme.', pour: 'Sens unique' };
    if (ici(t.b)) return { titre: 'Téléporteur : sortie', texte: 'Les monstres entrés par le téléporteur bleu de la même forme réapparaissent ici.', pour: 'Sens unique' };
  }
  if (ici(lab.entree)) return { titre: 'Entrée', texte: 'Les monstres arrivent par ici.', pour: '' };
  if (ici(lab.sortie)) return { titre: 'Sortie', texte: 'Chaque monstre qui arrive ici vous coûte des vies, puis s’en va.', pour: '' };
  return null;
}
