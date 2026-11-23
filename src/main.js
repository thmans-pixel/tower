// Point d'entrée : relie la logique (src/sim), l'affichage (src/render), le son et l'interface.
import { W, H, T, DT, COLS, ROWS } from './sim/const.js';
import { CARTES } from './data/cartes.js';
import { TOURS, ORDRE_TOURS } from './data/tours.js';
import { nouvellePartie, avancer, poser, ameliorer, vendre, cibler, appelerVague, peutPoser, lancerMeteores, appelerRenforts, pouvoirPret } from './sim/partie.js';
import { POUVOIRS, ORDRE_POUVOIRS } from './data/pouvoirs.js';
import { CHEMIN } from './sim/carte.js';
import { etoilesPartie, enregistrerVictoire, enregistrerInfini, enregistrerAleatoire, aleatoireOuvert, progressionVide } from './sim/progression.js';
import { genererCarte } from './sim/generateur.js';
import { scoreInfini } from './sim/partie.js';
import { charger, enregistrer, effacer } from './ui/sauvegarde.js';
import { fusionner } from './sim/transfert.js';
import { chargerDecors } from './render/decors.js';
import { chargerModeles } from './render/modeles.js';
import { Vue } from './render/vue.js';
import { Son } from './audio/son.js';
import { Musique, AIRS_DE_PARTIE } from './audio/musique.js';
import { ENNEMIS } from './data/ennemis.js';
import { Interface } from './ui/interface.js';
import { rangDeTouche } from './ui/clavier.js';

const toile = document.getElementById('toile');
const vue = new Vue(toile);
// Pièces d'or qui filent vers le compteur (spec 012) : position du compteur sur la toile, et pulsation à l'arrivée.
vue.cibleOr = () => {
  const r = toile.getBoundingClientRect(), o = document.getElementById('or').getBoundingClientRect();
  const k = toile.width / r.width;
  return { x: (o.left + o.width / 2 - r.left) * k, y: (o.top + o.height / 2 - r.top) * k };
};
vue.surPiece = () => {
  son.jouer('piece');
  const c = document.getElementById('or').parentElement;
  c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
};
const son = new Son();
const musique = new Musique(son);
const decors = {};
let partie = null;          // partie en cours
let apercu = null;          // carte affichée derrière les écrans de menu
let idCarte = 'prairie';
let mode = 'campagne';         // choix de l'écran des cartes : campagne, carte aléatoire ou mode infini
const alea = { theme: 'prairie', longueur: 25, graine: numeroAuHasard(), vignette: null };
let progression = charger();   // cartes débloquées, étoiles, difficulté choisie, son
son.actif = progression.son;
son.volMusique = progression.volMusique;
son.volEffets = progression.volEffets;
vue.reduits = progression.effetsReduits;
let ecran = 'titre';
let vitesse = 1, enPause = false, reste = 0, avant = performance.now(), finMontree = false;
const ui = {
  construction: null, fantome: null, selection: null, pouvoir: null, visee: null,
  verrou: null,     // tour verrouillée par un appui long (tablette) : on en pose plusieurs à la suite
  peutPoser: (c, r) => partie && peutPoser(partie, c, r),
  surChemin: (c, r) => partie && partie.carte.etat(c, r) === CHEMIN,
};

const interfaceJeu = new Interface({
  construire, pouvoir: choisirPouvoir, verrouiller, appel, pause: basculerPause, vitesse: changerVitesse, son: basculerSon, effets: basculerEffets,
  volumes: () => ({ musique: son.volMusique, effets: son.volEffets }),
  volume: (voie, v) => { if (voie === 'musique') son.volMusique = progression.volMusique = v; else son.volEffets = progression.volEffets = v; son.appliquer(); enregistrer(progression); },
  essaiSon: () => son.jouer('piece'),
  recommencer: () => partie && interfaceJeu.question('Recommencer la partie depuis la vague 1 ?', () => commencer(idCarte)),
  menu: () => (partie && !partie.fin ? interfaceJeu.question('Quitter la partie et revenir aux cartes ?', () => montrer('cartes')) : montrer('cartes')),
  ecran: montrer, carte: (id) => commencer(id), rejouer: () => commencer(idCarte),
  difficulte: (d) => { progression.difficulte = d; enregistrer(progression); afficherCartes(); son.jouer('clic'); },
  mode: (m) => { mode = m; afficherCartes(); son.jouer('clic'); },
  alea: async (changement) => {
    if (changement.graine === 'hasard') changement.graine = numeroAuHasard();
    Object.assign(alea, changement);
    alea.vignette = await vignetteAleatoire();
    afficherCartes();
    son.jouer('clic');
  },
  jouerAleatoire: () => commencer(genererCarte(alea.graine, alea.theme, alea.longueur)),
  progression: () => progression,
  reunir: (q) => { progression = fusionner(progression, q); enregistrer(progression); afficherCartes(); son.jouer('clic'); },
  effacer: () => { effacer(); progression = progressionVide(); mode = 'campagne'; son.actif = true; afficherCartes(); },
  deselectionner: () => { ui.selection = null; },
  ameliorer: (variante) => { const r = partie && ameliorer(partie, ui.selection, variante); if (r && !r.ok) son.jouer('erreur'); },
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
  if (nom === 'cartes') afficherCartes();
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

/** Écran des cartes selon le mode choisi (un mode qui n'est pas encore ouvert retombe sur la campagne). */
function afficherCartes() {
  if ((mode === 'infini' && !progression.infiniOuvert) || (mode === 'aleatoire' && !aleatoireOuvert(progression))) mode = 'campagne';
  if (mode === 'aleatoire' && !alea.vignette) { vignetteAleatoire().then((v) => { alea.vignette = v; afficherCartes(); }); }
  interfaceJeu.listeCartes(CARTES, vignette, progression, mode, alea);
}

function numeroAuHasard() {
  return 1 + Math.floor(Math.random() * 99999);
}

/** Aperçu de la carte aléatoire choisie, dessiné sur une toile à part. */
async function vignetteAleatoire() {
  const def = genererCarte(alea.graine, alea.theme, alea.longueur);
  const t = document.createElement('canvas');
  t.width = W; t.height = H;
  const v = new Vue(t);
  const etat = nouvellePartie(def);
  v.modeles = vue.modeles;
  v.preparer(etat.carte, await decorsDe(def.id));
  v.dessiner(etat, { construction: null, selection: null }, 0);
  return t;
}

/** `id` : nom d'une carte de la campagne, ou description d'une carte aléatoire (genererCarte). */
async function commencer(id) {
  idCarte = id;
  const d = await decorsDe(typeof id === 'object' ? id.id : id);
  partie = nouvellePartie(id, progression.difficulte, { infini: typeof id !== 'object' && mode === 'infini' && progression.infiniOuvert });
  vue.preparer(partie.carte, d);
  Object.assign(ui, { construction: null, fantome: null, selection: null, pouvoir: null, visee: null });
  vitesse = 1; enPause = false; reste = 0; finMontree = false;
  interfaceJeu.signature = '';
  ecran = 'jeu';
  interfaceJeu.montrerEcran('jeu');
}

function construire(sorte) {
  if (!partie || partie.fin) return;
  ui.construction = ui.construction === sorte ? null : sorte;
  if (ui.verrou !== ui.construction) ui.verrou = null;
  ui.selection = null; ui.pouvoir = null; ui.visee = null;
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

function basculerEffets() {
  vue.reduits = !vue.reduits;
  progression.effetsReduits = vue.reduits;
  enregistrer(progression);
}

function basculerSon() {
  son.actif = !son.actif;
  progression.son = son.actif;
  son.appliquer();
  enregistrer(progression);
}

/** Fin de partie : étoiles et déblocages enregistrés, puis l'écran de fin. */
function bilanPartie(s) {
  const bilan = { etoiles: etoilesPartie(s), nouvelles: [], infini: false, record: false };
  if (s.carte.def.aleatoire) {
    if (s.fin === 'victoire') { progression = enregistrerAleatoire(progression, s.difficulte); enregistrer(progression); }
  } else if (s.infini) {
    const r = enregistrerInfini(progression, idCarte, scoreInfini(s));
    progression = r.progression;
    enregistrer(progression);
    bilan.record = r.record;
  } else if (s.fin === 'victoire') {
    const r = enregistrerVictoire(progression, idCarte, s.difficulte, bilan.etoiles);
    progression = r.progression;
    enregistrer(progression);
    bilan.nouvelles = r.nouvelles.map((c) => CARTES[c].nom);
    bilan.infini = r.infini;
  }
  return bilan;
}

// ---------------------------------------------------------------- pointeur et clavier

function caseSous(e) {
  const r = toile.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  return { c: Math.floor(x / T), r: Math.floor(y / T) };
}

function verrouiller(sorte) {
  if (!partie || partie.fin) return;
  ui.verrou = ui.verrou === sorte ? null : sorte;
  if (ui.verrou) { ui.construction = sorte; ui.selection = null; ui.pouvoir = null; }
  son.jouer('clic');
}

function choisirPouvoir(nom) {
  if (!partie || partie.fin) return;
  if (!pouvoirPret(partie, nom)) { son.jouer('erreur'); return; }
  ui.pouvoir = ui.pouvoir === nom ? null : nom;
  ui.construction = null; ui.selection = null; ui.fantome = null; ui.visee = null;
  son.jouer('clic');
}

function pointSous(e) {
  const r = toile.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  return { x, y, c: Math.floor(x / T), r: Math.floor(y / T) };
}

/** Lance le pouvoir choisi au point visé ; renvoie vrai s'il est parti. */
function lancerPouvoir(v) {
  const res = ui.pouvoir === 'meteores' ? lancerMeteores(partie, v.x, v.y) : appelerRenforts(partie, v.c, v.r);
  if (res.ok) { ui.pouvoir = null; ui.visee = null; return true; }
  son.jouer('erreur');
  vue.texte(v.x, v.y - 10, res.raison === 'place' ? 'Sur le chemin seulement' : 'Pas encore prêt', '#ff8a7a');
  return false;
}

toile.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  if (ui.construction) ui.fantome = caseSous(e);
  if (ui.pouvoir) ui.visee = pointSous(e);
});
toile.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { ui.fantome = null; ui.visee = null; } });
toile.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.construction = null; ui.selection = null; ui.pouvoir = null; ui.visee = null; ui.verrou = null; });
toile.addEventListener('pointerdown', (e) => {
  son.reveiller();
  if (!partie || e.button > 0) return;
  const { c, r } = caseSous(e);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
  if (ui.pouvoir) {
    // Au doigt, le premier toucher montre la zone, le second lance (comme pour bâtir).
    const v = pointSous(e);
    if (e.pointerType !== 'mouse' && (!ui.visee || Math.hypot(ui.visee.x - v.x, ui.visee.y - v.y) > 24)) { ui.visee = v; return; }
    lancerPouvoir(v);
    return;
  }
  if (ui.construction) {
    // Au doigt, le premier toucher montre la portée, le second bâtit.
    if (e.pointerType !== 'mouse' && (!ui.fantome || ui.fantome.c !== c || ui.fantome.r !== r)) { ui.fantome = { c, r }; return; }
    const res = poser(partie, ui.construction, c, r);
    if (res.ok) {
      // Pose en série : Maj maintenue pendant le clic, ou tour verrouillée par un appui long.
      const serie = e.shiftKey || ui.verrou === ui.construction;
      if (serie && partie.or >= TOURS[ui.construction].prix) { if (e.pointerType !== 'mouse') ui.fantome = null; }
      else {
        if (serie) vue.texte(c * T + T / 2, r * T - 16, 'Pas assez d’or', '#ff8a7a');
        ui.construction = null; ui.fantome = null; ui.verrou = null;
      }
    }
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
  const rang = rangDeTouche(e);
  if (rang && rang <= ORDRE_TOURS.length) { construire(ORDRE_TOURS[rang - 1]); return; }
  if (rang > 6) { choisirPouvoir(ORDRE_POUVOIRS[rang - 7]); return; }
  const pv = ORDRE_POUVOIRS.find((n) => POUVOIRS[n].touche === e.key.toLowerCase());
  if (pv) { choisirPouvoir(pv); return; }
  if (e.key === ' ') { e.preventDefault(); basculerPause(); }
  else if (e.key === 'f' || e.key === 'F') changerVitesse();
  else if (e.key === 'Escape') { ui.construction = null; ui.selection = null; ui.fantome = null; ui.pouvoir = null; ui.visee = null; ui.verrou = null; }
});
window.addEventListener('pointerdown', () => son.reveiller(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && partie && !partie.fin) enPause = true;
});

// ---------------------------------------------------------------- taille de la carte à l'écran

const scene = document.getElementById('scene'), cadre = document.getElementById('cadre');
// Spec 013 : la carte prend toute la place possible ; si c'est la largeur qui manque (fenêtre haute), la boutique
// remonte juste sous la carte au lieu de laisser deux bandes vides.
const app = document.getElementById('app');
const ajuster = () => {
  app.classList.remove('etroit');
  const l = scene.clientWidth - 12, h = scene.clientHeight - 12;
  const k = Math.max(0.2, Math.min(l / W, h / H));
  cadre.style.width = Math.floor(W * k) + 'px';
  cadre.style.height = Math.floor(H * k) + 'px';
  app.classList.toggle('etroit', l / W < h / H - 0.02);
};
const observateur = new ResizeObserver(ajuster);
observateur.observe(app);

// ---------------------------------------------------------------- boucle

/** Air et intensité selon l'écran et la partie (spec 014, partie 2). L'air d'une partie est tiré au hasard. */
let airPartie = { partie: null, air: null };
function majMusique() {
  let air = null, intensite = 0;
  if (!document.hidden && son.ac && son.volMusique > 0) {
    if (ecran !== 'jeu' || !partie) air = 'menu';
    else if (!partie.fin) {
      if (airPartie.partie !== partie) {
        const autres = AIRS_DE_PARTIE.filter((a) => a !== airPartie.air);   // pas deux fois le même air de suite
        airPartie = { partie, air: autres[Math.floor(Math.random() * autres.length)] };
      }
      air = airPartie.air;
      if (partie.ennemis.some((e) => ENNEMIS[e.sorte].boss)) air = 'boss';
      const enVague = partie.lancement || partie.ennemis.length > 0;
      intensite = enVague ? (Number.isFinite(partie.nbVagues) && partie.vague >= partie.nbVagues * 0.75 ? 2 : 1) : 0;
    }
  }
  if (air && son.ac && !musique.minuterie) musique.nom = null;   // le son vient d'être réveillé : on relance
  musique.jouer(air);
  musique.intensite = intensite;
}

function boucle(maintenant) {
  majMusique();
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
    if (evs.some((e) => e.type === 'fuite')) {   // le cœur tremble et rougit (spec 012, lot C)
      const c = document.getElementById('vies').parentElement;
      c.classList.remove('aie'); void c.offsetWidth; c.classList.add('aie');
    }
    son.evenements(evs);
    if (partie.fin && !finMontree) {
      finMontree = true;
      ui.construction = null; ui.pouvoir = null;
      const bilan = bilanPartie(partie);
      setTimeout(() => partie && partie.fin && interfaceJeu.fin(partie, bilan), 1200);
    }
  }
  const dtEffets = enPause ? 0 : partie && !partie.fin ? dtJeu : dtReel;
  vue.dessiner(partie || apercu, partie ? ui : { construction: null, selection: null }, dtEffets);
  interfaceJeu.maj(partie || apercu, ui, { vitesse, pause: enPause, son: son.actif, reduits: vue.reduits });
  requestAnimationFrame(boucle);
}

// Version en ligne (écrite par tools/deploiement/mettre-a-jour.sh) ; absente en local.
fetch('version.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((v) => {
    if (!v) return;
    const [a, m, j] = String(v.date).split('-');
    document.getElementById('version').textContent = `Version ${v.version} du ${j}/${m}/${a}`;
  })
  .catch(() => {});

// Démarrage : la Prairie s'affiche derrière l'écran titre.
(async () => {
  const [d, modeles] = await Promise.all([decorsDe('prairie'), chargerModeles()]);
  vue.modeles = modeles;
  interfaceJeu.iconesModeles(modeles);
  apercu = nouvellePartie('prairie');
  vue.preparer(apercu.carte, d);
  vue.dessiner(apercu, { construction: null, selection: null }, 0);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').drawImage(toile, 0, 0);
  vignettes.prairie = c;
  // Vignettes des autres cartes jouables, dessinées sur une toile à part.
  for (const def of Object.values(CARTES)) {
    if (!def.ouverte || vignettes[def.id]) continue;
    const t = document.createElement('canvas');
    t.width = W; t.height = H;
    const v = new Vue(t);
    const etat = nouvellePartie(def.id);
    v.preparer(etat.carte, await decorsDe(def.id));
    v.dessiner(etat, { construction: null, selection: null }, 0);
    vignettes[def.id] = t;
  }
  const params = new URLSearchParams(location.search);
  if (params.has('jouer')) await commencer(params.get('jouer') || 'prairie');
  else montrer('titre');
  if (params.has('test')) window.td = { musique,  partie: () => partie, ui, vue, poser, appelerVague, avancer, commencer };
  requestAnimationFrame(boucle);
})();
