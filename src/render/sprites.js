// Pixel-art dessiné en code : chaque sprite est tracé en petits rectangles sur une toile basse résolution,
// entouré d'un contour sombre d'un pixel, puis affiché ×2. Sert aussi de secours aux décors de Blender.
export const ECHELLE = 2;
const CONTOUR = [26, 20, 32];

export function dessiner(l, h, trace, contour = true) {
  const c = document.createElement('canvas');
  c.width = l + 2; c.height = h + 2;
  const g = c.getContext('2d');
  const r = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, w, hh); };
  trace(r, g);
  if (contour) entourer(c);
  return c;
}

function entourer(c) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const d = g.getImageData(0, 0, w, h), s = new Uint8ClampedArray(d.data);
  const a = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : s[(j * w + i) * 4 + 3]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (a(i, j) > 0) continue;
    if (a(i - 1, j) > 0 || a(i + 1, j) > 0 || a(i, j - 1) > 0 || a(i, j + 1) > 0) {
      const k = (j * w + i) * 4;
      d.data[k] = CONTOUR[0]; d.data[k + 1] = CONTOUR[1]; d.data[k + 2] = CONTOUR[2]; d.data[k + 3] = 255;
    }
  }
  g.putImageData(d, 0, 0);
}

// ---------------------------------------------------------------- ennemis (16 × 16, deux images de marche)

const ENN = {
  gob(r, f) {
    const G = '#5fae3a', GC = '#86d65a';
    r(2, 5, 2, 2, G); r(12, 5, 2, 2, G);
    r(4, 3, 8, 6, G); r(5, 3, 4, 1, GC);
    r(6, 5, 1, 1, '#ffde3b'); r(9, 5, 1, 1, '#ffde3b');
    r(7, 7, 2, 1, '#5a1a1a');
    r(5, 9, 6, 4, '#8a5a2b'); r(5, 11, 6, 1, '#4a2f17');
    r(4, 9, 1, 3, G); r(11, 9, 1, 3, G); r(12, 7, 1, 4, '#cfd8dc');
    if (f) { r(5, 13, 2, 2, G); r(9, 13, 2, 2, G); } else { r(6, 13, 2, 2, G); r(8, 13, 2, 1, G); }
  },
  loup(r, f) {
    const g = '#8c8f99', s = '#5c5f68', c = '#c9ccd4';
    r(0, 6, 2, 2, g); r(2, 7, 10, 4, g); r(3, 7, 8, 1, s); r(3, 10, 8, 1, c);
    r(11, 5, 4, 4, g); r(14, 7, 2, 2, g); r(11, 3, 1, 2, s); r(13, 3, 1, 2, s);
    r(13, 6, 1, 1, '#ffcf3b'); r(15, 7, 1, 1, '#1a1420');
    if (f) { r(3, 11, 1, 3, s); r(5, 11, 1, 2, s); r(9, 11, 1, 3, s); r(11, 11, 1, 2, s); }
    else { r(3, 11, 1, 2, s); r(5, 11, 1, 3, s); r(9, 11, 1, 2, s); r(11, 11, 1, 3, s); }
  },
  orc(r, f) {
    const p = '#6b8f3a', a = '#9aa3ad', s = '#5b636c';
    r(5, 2, 6, 5, p); r(4, 1, 8, 3, a); r(3, 0, 1, 2, '#e8e2c8'); r(12, 0, 1, 2, '#e8e2c8');
    r(6, 4, 1, 1, '#ff3b3b'); r(9, 4, 1, 1, '#ff3b3b'); r(6, 6, 1, 1, '#fff'); r(9, 6, 1, 1, '#fff');
    r(3, 7, 10, 6, a); r(3, 9, 10, 1, s); r(2, 7, 2, 2, s); r(12, 7, 2, 2, s);
    r(14, 4, 1, 9, '#7a5230'); r(13, 4, 3, 3, '#cfd8dc');
    if (f) { r(4, 13, 3, 3, s); r(9, 13, 3, 2, s); } else { r(4, 13, 3, 2, s); r(9, 13, 3, 3, s); }
  },
  bat(r, f) {
    const b = '#4b3a5c', w = '#6d5585';
    r(6, 6, 4, 5, b); r(6, 4, 1, 2, b); r(9, 4, 1, 2, b);
    r(7, 7, 1, 1, '#ff4d6d'); r(8, 7, 1, 1, '#ff4d6d');
    r(4, 6, 2, 2, w); r(10, 6, 2, 2, w);
    if (f) { r(1, 3, 4, 3, w); r(11, 3, 4, 3, w); r(0, 2, 2, 2, w); r(14, 2, 2, 2, w); }
    else { r(1, 8, 4, 3, w); r(11, 8, 4, 3, w); r(0, 10, 2, 2, w); r(14, 10, 2, 2, w); }
  },
  cham(r, f) {
    const robe = '#7b3fa0';
    r(4, 0, 1, 3, '#e04848'); r(11, 0, 1, 3, '#3b8fe0');
    r(5, 2, 6, 5, '#5fae3a'); r(5, 2, 6, 3, '#e8e2c8'); r(6, 3, 1, 1, '#222'); r(9, 3, 1, 1, '#222');
    r(4, 7, 8, 6, robe); r(3, 11, 10, 2, robe); r(4, 10, 8, 1, '#d4a73a');
    r(13, 2, 1, 13, '#8a5a2b'); r(12, 0, 3, 3, '#5dff9a');
    if (f) { r(5, 13, 2, 2, '#4a2f17'); r(9, 13, 2, 1, '#4a2f17'); } else { r(5, 13, 2, 1, '#4a2f17'); r(9, 13, 2, 2, '#4a2f17'); }
  },
};

ENN.slime = (r, f) => {
  const v = '#8be04e', c = '#c4f59a', s = '#5aa62e';
  if (f) { r(2, 7, 12, 7, v); r(4, 5, 8, 2, v); r(3, 13, 10, 1, s); r(5, 6, 3, 1, c); }
  else { r(1, 8, 14, 6, v); r(3, 6, 10, 2, v); r(2, 13, 12, 1, s); r(4, 7, 3, 1, c); }
  r(5, 9, 2, 2, '#1a1420'); r(9, 9, 2, 2, '#1a1420');
};
ENN.slime_petit = (r, f) => {
  const v = '#8be04e';
  r(4, 9 + (f ? 0 : 1), 8, 5 - (f ? 0 : 1), v); r(5, 8 + (f ? 0 : 1), 6, 1, v); r(6, 10, 1, 1, '#1a1420'); r(9, 10, 1, 1, '#1a1420');
};
ENN.golem = (r, f) => {
  const p = '#7f8288', c = '#9fa2a8', m = '#5b8f3a', o = '#ff9a3a';
  r(5, 0, 6, 4, p); r(6, 2, 1, 1, o); r(9, 2, 1, 1, o);
  r(3, 4, 10, 7, p); r(3, 4, 10, 1, c); r(4, 4, 3, 1, m); r(7, 6, 2, 2, o);
  r(0, 4, 3, 8, p); r(13, 4, 3, 8, p); r(0, 10, 3, 2, c); r(13, 10, 3, 2, c);
  if (f) { r(4, 11, 3, 5, p); r(9, 11, 3, 4, p); } else { r(4, 11, 3, 4, p); r(9, 11, 3, 5, p); }
};
ENN.spectre = (r, f) => {
  const d = '#cfe3f0', s = '#a9c4d6';
  r(4, 1, 8, 4, d); r(3, 4, 10, 7, d); r(3, 4, 2, 7, s);
  r(6, 3, 1, 2, '#7fd8ff'); r(9, 3, 1, 2, '#7fd8ff');
  for (let i = 0; i < 5; i++) r(3 + i * 2, 11, 2, (i + f) % 2 ? 4 : 3, i % 2 ? s : d);
};
ENN.ogre = (r, f) => {
  const p = '#8a9a5b', a = '#7a7f86', c = '#c0392b', o = '#f2c14e';
  r(1, 6, 4, 9, c); r(6, 1, 8, 6, p); r(6, 0, 8, 2, o); r(7, 0, 1, 1, '#ffe08a'); r(12, 0, 1, 1, '#ffe08a');
  r(8, 3, 1, 1, '#ff3b3b'); r(11, 3, 1, 1, '#ff3b3b'); r(8, 5, 4, 1, '#3a2a1a'); r(8, 6, 1, 1, '#fff'); r(11, 6, 1, 1, '#fff');
  r(4, 7, 12, 9, p); r(6, 8, 8, 6, a); r(6, 11, 8, 1, '#5b636c');
  r(16, 3, 3, 3, '#6b4423'); r(17, 6, 2, 9, '#6b4423'); r(16, 2, 1, 1, '#cfd8dc'); r(18, 2, 1, 1, '#cfd8dc');
  if (f) { r(5, 16, 4, 4, '#4a4e44'); r(11, 16, 4, 3, '#4a4e44'); } else { r(5, 16, 4, 3, '#4a4e44'); r(11, 16, 4, 4, '#4a4e44'); }
};
ENN.soldat = (r, f) => {
  const b = '#3a6fc4', a = '#cfd8dc', p = '#f0c8a0';
  r(5, 1, 6, 3, a); r(5, 4, 6, 3, p); r(7, 5, 1, 1, '#1a1420'); r(9, 5, 1, 1, '#1a1420');
  r(4, 7, 8, 5, b); r(4, 9, 8, 1, '#f2c14e'); r(1, 7, 3, 5, '#b8862a'); r(2, 8, 1, 3, '#f2c14e');
  r(12, f ? 2 : 5, 1, 7, a); r(11, 9, 3, 1, '#6b4423');
  r(5, 12, 2, 3, '#4a4e5a'); r(9, 12, 2, 3, '#4a4e5a');
};
const TAILLES_ENN = { ogre: [20, 20] };

const cacheEnn = {};
export function spriteEnnemi(sorte, image) {
  const k = sorte + image;
  const [l, h] = TAILLES_ENN[sorte] || [16, 16];
  return cacheEnn[k] || (cacheEnn[k] = dessiner(l, h, (r) => ENN[sorte](r, image)));
}

// ---------------------------------------------------------------- tours (20 × 30, une image par niveau)

const PIERRE = ['#8d9099', '#6e717a', '#a9acb4'];
function socle(r) {
  r(3, 23, 14, 7, PIERRE[0]); r(3, 23, 14, 1, PIERRE[2]);
  r(5, 26, 3, 1, PIERRE[1]); r(11, 26, 3, 1, PIERRE[1]); r(8, 28, 3, 1, PIERRE[1]);
}

const TOUR = {
  archers(r, n) {
    socle(r);
    r(5, 13, 10, 10, '#9b6b3d'); r(5, 16, 10, 1, '#7a5230'); r(5, 19, 10, 1, '#7a5230'); r(9, 17, 2, 3, '#2b1a10');
    r(3, 12, 14, 2, '#7a5230');
    if (n >= 2) r(3, 12, 14, 1, '#f2c14e');
    const toit = n >= 2 ? '#3a6fc4' : '#c0392b';
    for (let i = 0; i < 6; i++) r(9 - i, 6 + i, 2 + 2 * i, 1, toit);
    if (n >= 2) r(9, 5, 2, 1, '#f2c14e');
    if (n >= 1) { r(10, 0, 1, 6, '#4a2f17'); r(11, 0, 4, 3, n >= 2 ? '#f2c14e' : '#e5533d'); }
  },
  canon(r, n) {
    socle(r);
    r(3, 12, 14, 11, PIERRE[0]); r(3, 12, 2, 11, PIERRE[2]); r(15, 12, 2, 11, PIERRE[1]);
    r(3, 10, 3, 2, PIERRE[0]); r(8, 10, 4, 2, PIERRE[0]); r(14, 10, 3, 2, PIERRE[0]);
    r(3, 18, 14, 1, ['#6e717a', '#b08d57', '#f2c14e'][n]);
    r(9, 25, 2, 4, '#3a2a1a');
    if (n >= 1) { r(3, 15, 14, 1, PIERRE[1]); }
  },
  givre(r, n) {
    socle(r); r(3, 23, 14, 1, '#e8f6ff');
    r(8, 6, 4, 17, '#8fd6ff'); r(8, 6, 1, 17, '#d8f3ff'); r(9, 4, 2, 2, '#d8f3ff');
    r(5, 14, 3, 9, '#5cb8f0'); r(12, 16, 3, 7, '#5cb8f0');
    if (n >= 1) { r(3, 18, 2, 5, '#8fd6ff'); r(15, 17, 2, 6, '#8fd6ff'); }
    if (n >= 2) { r(9, 1, 2, 3, '#ffffff'); r(6, 11, 2, 3, '#d8f3ff'); r(12, 12, 2, 4, '#d8f3ff'); }
  },
  mage(r, n) {
    socle(r);
    r(6, 12, 8, 11, '#5b4a8a'); r(6, 12, 2, 11, '#7a68b0'); r(9, 16, 2, 3, '#ffd36b');
    r(6, 20, 8, 1, ['#5b4a8a', '#b08d57', '#f2c14e'][n]);
    const toit = n >= 2 ? '#2a1f4d' : '#3d2e66';
    for (let i = 0; i < 7; i++) r(9 - Math.floor(i * 0.75), 5 + i, 2 + 2 * Math.floor(i * 0.75), 1, toit);
    if (n >= 2) r(9, 4, 2, 1, '#f2c14e');
  },
  baliste(r, n) {
    socle(r);
    r(3, 17, 14, 6, '#7a5230'); r(3, 17, 14, 1, '#9b6b3d');
    r(4, 23, 2, 2, '#4a2f17'); r(14, 23, 2, 2, '#4a2f17');
    if (n >= 1) { r(3, 19, 14, 1, '#6e717a'); }
    if (n >= 2) r(3, 17, 14, 1, '#f2c14e');
  },
  tempete(r, n) {
    socle(r);
    r(7, 9, 6, 14, '#4a4e5a'); r(7, 9, 2, 14, '#5d6270');
    r(6, 4, 8, 6, '#b87333'); r(7, 3, 6, 1, '#d4914f'); r(8, 5, 2, 2, '#e8b07a');
    if (n >= 1) { r(5, 2, 1, 4, '#b87333'); r(14, 2, 1, 4, '#b87333'); r(9, 0, 2, 3, '#b87333'); }
    if (n >= 2) { r(4, 0, 12, 2, '#6d7a8c'); r(9, 6, 2, 1, '#9fe3ff'); }
  },
};

const cacheTour = {};
export function spriteTour(sorte, niveau) {
  const k = sorte + niveau;
  return cacheTour[k] || (cacheTour[k] = dessiner(20, 30, (r) => TOUR[sorte](r, niveau)));
}

// ---------------------------------------------------------------- décor de secours

function chene(r, v) {
  const f = ['#2f7d32', '#357f2f', '#2b7440'][v], c = ['#4caf50', '#5bb347', '#47a86a'][v];
  r(7, 14, 3, 6, '#6b4423'); r(6, 18, 5, 2, '#6b4423');
  if (v === 1) { r(1, 5, 15, 8, f); r(3, 3, 11, 3, f); r(3, 5, 5, 2, c); }
  else if (v === 2) { r(4, 1, 9, 12, f); r(3, 4, 11, 7, f); r(5, 2, 4, 2, c); }
  else { r(3, 4, 11, 9, f); r(2, 6, 13, 6, f); r(5, 2, 7, 3, f); r(5, 4, 4, 2, c); }
  r(3, 11, 11, 2, '#1f5e23');
}
function sapin(r, v) {
  const f = '#1f6b3a', c = '#2f8a4c';
  r(7, 17, 3, 3, '#6b4423');
  const etages = v ? [[2, 13, 13], [3, 9, 11], [4, 5, 9], [6, 1, 5]] : [[2, 13, 13], [3, 8, 11], [5, 3, 7]];
  for (const [x, y, l] of etages) { r(x, y, l, 4, f); r(x + 1, y, l - 2, 1, c); }
}
const BOUQUETS = {
  buisson: [14, 10, (r) => { r(1, 3, 12, 6, '#2f7d32'); r(3, 1, 8, 3, '#2f7d32'); r(4, 2, 3, 2, '#4caf50'); r(4, 5, 1, 1, '#e04848'); r(9, 4, 1, 1, '#e04848'); r(7, 7, 1, 1, '#e04848'); }],
  souche: [12, 9, (r) => { r(2, 2, 8, 6, '#6b4423'); r(2, 2, 8, 2, '#c9a46a'); r(4, 2, 4, 1, '#a37f4c'); r(0, 7, 3, 1, '#6b4423'); r(9, 7, 3, 1, '#6b4423'); r(9, 4, 2, 2, '#d64b3b'); }],
  rocher_moyen: [14, 10, (r) => { r(1, 4, 12, 6, '#8a8d93'); r(3, 1, 8, 4, '#9fa2a8'); r(4, 1, 4, 1, '#c5c8cd'); r(1, 9, 12, 1, '#5f6268'); r(9, 3, 2, 1, '#5b8f3a'); }],
  rocher_gros: [30, 12, (r) => { r(1, 5, 14, 7, '#8a8d93'); r(3, 2, 10, 4, '#9fa2a8'); r(14, 3, 14, 9, '#7f8288'); r(16, 1, 9, 3, '#9fa2a8'); r(4, 2, 4, 1, '#c5c8cd'); r(17, 1, 4, 1, '#c5c8cd'); r(1, 11, 27, 1, '#5f6268'); }],
  rocher_petit: [8, 6, (r) => { r(1, 2, 6, 4, '#8a8d93'); r(2, 1, 4, 2, '#a5a8ae'); }],
  fleurs_1: [10, 6, (r) => { r(0, 4, 10, 2, '#4f8f35'); r(1, 2, 2, 2, '#e04848'); r(5, 1, 2, 2, '#f2c14e'); r(8, 2, 2, 2, '#e04848'); }],
  fleurs_2: [10, 6, (r) => { r(0, 4, 10, 2, '#4f8f35'); r(1, 1, 2, 2, '#ffffff'); r(4, 2, 2, 2, '#b37ae0'); r(7, 1, 2, 2, '#ffffff'); }],
  herbes_hautes: [10, 8, (r) => { r(1, 3, 1, 5, '#3f7f2a'); r(3, 1, 1, 7, '#4f8f35'); r(5, 2, 1, 6, '#3f7f2a'); r(7, 0, 1, 8, '#4f8f35'); r(9, 3, 1, 5, '#3f7f2a'); }],
  cloture: [20, 10, (r) => { r(2, 0, 2, 10, '#9b6b3d'); r(16, 0, 2, 10, '#9b6b3d'); r(0, 2, 20, 2, '#7a5230'); r(0, 6, 20, 2, '#7a5230'); }],
};

function chateau(r) {
  const p = '#9a9ca3', pc = '#b8bac0', ps = '#76787f';
  // tours arrière, mur, donjon, tours avant (vue de haut, porte à gauche)
  r(4, 6, 52, 90, p);
  for (let y = 10; y < 94; y += 6) for (let x = 6 + ((y / 6) % 2) * 3; x < 54; x += 7) r(x, y, 4, 1, ps);
  r(16, 26, 30, 44, pc); r(16, 26, 30, 3, '#d4d6db');
  for (let x = 16; x < 46; x += 6) r(x, 22, 3, 4, pc);
  r(26, 14, 1, 12, '#4a2f17'); r(27, 14, 8, 5, '#f2c14e');
  for (const [x, y] of [[0, 0], [40, 0], [0, 78], [40, 78]]) {
    r(x, y + 6, 20, 18, p); r(x, y + 6, 3, 18, pc);
    for (let i = 0; i < 7; i++) r(x + 9 - i, y + i - 2, 2 + 2 * i, 1, '#c0392b');
  }
  r(0, 40, 10, 22, '#4a3420'); r(1, 41, 8, 20, '#6b4a2b'); r(1, 45, 8, 1, '#3a2814'); r(1, 51, 8, 1, '#3a2814'); r(1, 57, 8, 1, '#3a2814');
}
function entree(r) {
  r(0, 0, 24, 64, '#6e6458'); r(0, 0, 24, 4, '#4f8f35'); r(18, 4, 6, 56, '#857a6c');
  r(6, 22, 18, 20, '#140f12'); r(8, 20, 14, 2, '#140f12'); r(14, 24, 10, 16, '#000000');
  r(2, 46, 6, 6, '#8a8d93'); r(16, 8, 5, 5, '#8a8d93'); r(3, 60, 20, 4, '#4f8f35');
}

/** Décors de secours, au même format que les éléments d'un pack Blender. */
export function decorsDeSecours(carte) {
  const els = {};
  const ajouter = (nom, l, h, trace, ancre) => {
    const img = dessiner(l, h, trace);
    els[carte + '_' + nom] = { img, ancre: ancre || [img.width / 2, img.height - 2], echelle: ECHELLE, lisse: false };
  };
  [0, 1, 2].forEach((v) => ajouter('chene_' + (v + 1), 17, 20, (r) => chene(r, v)));
  [0, 1].forEach((v) => ajouter('sapin_' + (v + 1), 17, 20, (r) => sapin(r, v)));
  for (const [nom, [l, h, t]] of Object.entries(BOUQUETS)) ajouter(nom, l, h, t, nom === 'rocher_gros' ? [16, 12] : null);
  ajouter('chateau', 60, 100, chateau, [31, 51]);
  ajouter('entree', 24, 64, entree, [13, 33]);
  // Désert : éléments de secours tirés des précédents (le pack de Blender les remplace).
  const alias = { forteresse: 'chateau', entree_nord: 'entree', entree_sud: 'entree', cactus_1: 'sapin_1', cactus_2: 'sapin_2',
    cactus_3: 'sapin_1', palmier_1: 'chene_2', palmier_2: 'chene_1', dune: 'rocher_gros', touffe: 'herbes_hautes',
    fort: 'chateau', sapin_3: 'sapin_1', congere: 'rocher_gros', lac: 'oasis' };
  ajouter('pont', 20, 20, (r) => { r(0, 0, 20, 20, '#7a5230'); for (let y = 1; y < 20; y += 4) r(0, y, 20, 1, '#5a3a22'); r(0, 0, 1, 20, '#c9b48a'); r(19, 0, 1, 20, '#c9b48a'); }, [11, 11]);
  ajouter('oasis', 34, 30, (r) => { r(2, 6, 30, 20, '#8a8d93'); r(4, 8, 26, 16, '#3fa7c9'); r(8, 10, 10, 3, '#8fd6ff'); r(24, 2, 3, 14, '#8a6a43'); r(20, 0, 11, 4, '#4e8a3c'); }, [17, 16]);
  for (const [nom, base] of Object.entries(alias)) els[carte + '_' + nom] = els[carte + '_' + nom] || els[carte + '_' + base];
  return els;
}
