// Point d'entrée : relie la logique (src/sim), l'affichage (src/render), le son et l'interface.
import { W, H, T, DT, COLS, ROWS } from './sim/const.js';
import { CARTES } from './data/cartes.js';
import { TOURS, ORDRE_TOURS } from './data/tours.js';
import { nouvellePartie, avancer, poser, ameliorer, vendre, cibler, appelerVague, peutPoser } from './sim/partie.js';
import { chargerDecors } from './render/decors.js';
import { Vue } from './render/vue.js';
import { Son } from './audio/son.js';
import { Interface } from './ui/interface.js';

const toile = document.getElementById('toile');
const vue = new Vue(toile);
const son = new Son();
const decors = {};
let partie = null;          // partie en cours
let apercu = null;          // carte affichée derrière les écrans de menu
let idCarte = 'prairie';
let ecran = 'titre';
let vitesse = 1, enPause = false, reste = 0, avant = performance.now(), finMontree = false;
const ui = { construction: null, fantome: null, selection: null, peutPoser: (c, r) => partie && peutPoser(partie, c, r) };

const interfaceJeu = new Interface({
  construire, appel, pause: basculerPause, vitesse: changerVitesse, son: basculerSon,
  recommencer: () => partie && interfaceJeu.question('Recommencer la partie depuis la vague 1 ?', () => commencer(idCarte)),
  menu: () => (partie && !partie.fin ? interfaceJeu.question('Quitter la partie et revenir aux cartes ?', () => montrer('cartes')) : montrer('cartes')),
  ecran: montrer, carte: (id) => commencer(id), rejouer: () => commencer(idCarte),
  deselectionner: () => { ui.selection = null; },
  ameliorer: () => { const r = partie && ameliorer(partie, ui.selection); if (r && !r.ok) son.jouer('erreur'); },
  vendre: () => { if (partie && vendre(partie, ui.selection).ok) ui.selection = null; },
  cibler: (m) => { if (partie) { cibler(partie, ui.selection, m); son.jouer('clic'); } },
});

async function decorsDe(id) {
  return decors[id] || (decors[id] = await chargerDecors(id));
}

function montrer(nom) {
  ecran = nom;
  if (nom !== 'jeu') { partie = null; ui.selection = null; ui.construction = null; enPause = false; }
  interfaceJeu.montrerEcran(nom);
  if (nom === 'cartes') interfaceJeu.listeCartes(CARTES, vignette);
}

let vignettes = {};
function vignette(id) {
  const src = vignettes[id];
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = W / 2; c.height = H / 2;
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

async function commencer(id) {
  idCarte = id;
  const d = await decorsDe(id);
  partie = nouvellePartie(id);
  vue.preparer(partie.carte, d);
  Object.assign(ui, { construction: null, fantome: null, selection: null });
  vitesse = 1; enPause = false; reste = 0; finMontree = false;
  interfaceJeu.signature = '';
  ecran = 'jeu';
  interfaceJeu.montrerEcran('jeu');
}

function construire(sorte) {
  if (!partie || partie.fin) return;
  ui.construction = ui.construction === sorte ? null : sorte;
  ui.selection = null;
  son.jouer('clic');
}

function appel() {
  if (partie) appelerVague(partie);
}

function basculerPause() {
  if (!partie || partie.fin) return;
  enPause = !enPause;
}

function changerVitesse() {
  vitesse = vitesse === 3 ? 1 : vitesse + 1;
}

function basculerSon() {
  son.actif = !son.actif;
}

// ---------------------------------------------------------------- pointeur et clavier

function caseSous(e) {
  const r = toile.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  return { c: Math.floor(x / T), r: Math.floor(y / T) };
}

toile.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' && ui.construction) ui.fantome = caseSous(e);
});
toile.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') ui.fantome = null; });
toile.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.construction = null; ui.selection = null; });
toile.addEventListener('pointerdown', (e) => {
  son.reveiller();
  if (!partie || e.button > 0) return;
  const { c, r } = caseSous(e);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
  if (ui.construction) {
    // Au doigt, le premier toucher montre la portée, le second bâtit.
    if (e.pointerType !== 'mouse' && (!ui.fantome || ui.fantome.c !== c || ui.fantome.r !== r)) { ui.fantome = { c, r }; return; }
    const res = poser(partie, ui.construction, c, r);
    if (res.ok) { ui.construction = null; ui.fantome = null; }
    else {
      son.jouer('erreur');
      vue.texte(c * T + T / 2, r * T, res.raison === 'or' ? 'Pas assez d’or' : 'Impossible ici', '#ff8a7a');
    }
    return;
  }
  const t = partie.tours.find((x) => x.c === c && x.r === r);
  ui.selection = t ? t.id : null;
  if (t) son.jouer('clic');
});

window.addEventListener('keydown', (e) => {
  son.reveiller();
  if (ecran !== 'jeu' || !partie) return;
  if (!document.getElementById('question').hidden) return;
  const sorte = ORDRE_TOURS.find((s) => TOURS[s].touche === e.key);
  if (sorte) { construire(sorte); return; }
  if (e.key === ' ') { e.preventDefault(); basculerPause(); }
  else if (e.key === 'f' || e.key === 'F') changerVitesse();
  else if (e.key === 'Escape') { ui.construction = null; ui.selection = null; ui.fantome = null; }
});
window.addEventListener('pointerdown', () => son.reveiller(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && partie && !partie.fin) enPause = true;
});

// ---------------------------------------------------------------- taille de la carte à l'écran

const scene = document.getElementById('scene'), cadre = document.getElementById('cadre');
const ajuster = () => {
  const l = scene.clientWidth - 24, h = scene.clientHeight - 24;
  const k = Math.max(0.2, Math.min(l / W, h / H));
  cadre.style.width = Math.floor(W * k) + 'px';
  cadre.style.height = Math.floor(H * k) + 'px';
};
const observateur = new ResizeObserver(ajuster);
observateur.observe(scene);

// ---------------------------------------------------------------- boucle

function boucle(maintenant) {
  const dtReel = Math.min(0.05, (maintenant - avant) / 1000);
  avant = maintenant;
  let dtJeu = 0;
  if (partie && ecran === 'jeu' && !enPause && !partie.fin) {
    reste += dtReel * vitesse;
    let n = 0;
    while (reste >= DT && n < 12) { avancer(partie); reste -= DT; dtJeu += DT; n++; }
    if (n === 12) reste = 0;
  }
  if (partie) {
    const evs = partie.evenements.splice(0);
    vue.evenements(evs);
    son.evenements(evs);
    if (partie.fin && !finMontree) {
      finMontree = true;
      ui.construction = null;
      setTimeout(() => partie && partie.fin && interfaceJeu.fin(partie), 1200);
    }
  }
  const dtEffets = enPause ? 0 : partie && !partie.fin ? dtJeu : dtReel;
  vue.dessiner(partie || apercu, partie ? ui : { construction: null, selection: null }, dtEffets);
  interfaceJeu.maj(partie || apercu, ui, { vitesse, pause: enPause, son: son.actif });
  requestAnimationFrame(boucle);
}

// Démarrage : la Prairie s'affiche derrière l'écran titre.
(async () => {
  const d = await decorsDe('prairie');
  apercu = nouvellePartie('prairie');
  vue.preparer(apercu.carte, d);
  vue.dessiner(apercu, { construction: null, selection: null }, 0);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').drawImage(toile, 0, 0);
  vignettes.prairie = c;
  const params = new URLSearchParams(location.search);
  if (params.has('jouer')) await commencer(params.get('jouer') || 'prairie');
  else montrer('titre');
  if (params.has('test')) window.td = { partie: () => partie, ui, vue, poser, appelerVague, avancer, commencer };
  requestAnimationFrame(boucle);
})();
