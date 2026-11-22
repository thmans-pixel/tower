// Fiches des tours et des pouvoirs (spec 008) : du HTML construit à partir des données, sans toucher au
// document ni à l'état. Utilisé par la fiche de la boutique et par le panneau d'une tour posée.
import { TOURS } from '../data/tours.js';
import { POUVOIRS } from '../data/pouvoirs.js';
import { VOIENT_INVISIBLE } from '../data/ennemis.js';
import { T } from '../sim/const.js';

const nb = (n) => Math.round(n).toLocaleString('fr-FR');
const dec = (n, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const cases = (px) => dec(px / T);
const tirs = (c) => dec(1 / c);
const pct = (r) => Math.round(r * 100) + ' %';

/** Caractéristiques d'un niveau : 0, 1 (niveaux) ou 'a' / 'b' (spécialisations), avec les valeurs de la tour. */
export function statsNiveau(sorte, niveau) {
  const d = TOURS[sorte];
  const n = typeof niveau === 'number' ? d.niveaux[niveau] : d.specialisations[niveau];
  return { volants: d.volants, degat: d.degat, ...n };
}

/** Dégâts d'un tir, salve comprise (une salve de 3 carreaux vaut 3 tirs). */
const degatsTir = (n) => n.degats * (n.salve || 1);
const texteDegats = (n) => nb(n.degats) + (n.salve ? ` × ${n.salve}` : '');

/** Effets particuliers d'un niveau, en clair : [libellé, valeur, clé]. */
export function effets(n) {
  const l = [];
  if (n.zone) l.push(['Zone (cases)', cases(n.zone), 'zone']);
  if (n.porteeMin) l.push(['Angle mort (cases)', cases(n.porteeMin), 'porteeMin']);
  if (n.ralenti) l.push(['Ralentit', pct(n.ralenti) + (n.aura ? ', toute la portée' : ''), 'ralenti']);
  if (n.gel) l.push(['Gèle', dec(n.gel) + ' s', 'gel']);
  if (n.etourdit) l.push(['Étourdit', dec(n.etourdit) + ' s', 'etourdit']);
  if (n.brulure) l.push(['Brûlure', `${n.brulure.dps}/s pendant ${n.brulure.duree} s`, 'brulure']);
  if (n.chaine) l.push(['Chaîne', `${n.chaine.nombre} ennemis, −${pct(n.chaine.baisse)} par saut`, 'chaine']);
  if (n.rebond) l.push(['Rebond', pct(n.rebond.facteur) + ' des dégâts', 'rebond']);
  if (n.transperce) l.push(['Transperce', cases(n.transperce) + ' cases', 'transperce']);
  if (n.perce) l.push(['Ignore', pct(n.perce) + ' de l’armure', 'perce']);
  if (n.salve) l.push(['Salve', `${n.salve} carreaux`, 'salve']);
  return l;
}

/** Pastilles : type de dégâts, volants, invisibles. */
export function pastilles(sorte, n = statsNiveau(sorte, 0)) {
  const p = [
    n.degat === 'magique'
      ? '<span class="pastille magique" title="Ignore l’armure">magique</span>'
      : '<span class="pastille physique" title="Réduit par l’armure">physique</span>',
    n.volants ? '<span class="pastille oui">volants</span>' : '<span class="pastille non">pas les volants</span>',
    VOIENT_INVISIBLE.includes(sorte) ? '<span class="pastille oui">voit les invisibles</span>' : '<span class="pastille non">pas les invisibles</span>',
  ];
  return `<div class="pastilles">${p.join('')}</div>`;
}

/** Tableau de base : dégâts, tirs par seconde, portée, puis les effets. */
export function tableau(n) {
  const l = [
    [n.chaine ? 'Dégâts (1er)' : 'Dégâts', texteDegats(n)],
    ['Tirs par s', n.aura ? 'en continu' : tirs(n.cadence)],
    ['Portée', (n.porteeMin ? cases(n.porteeMin) + ' à ' : '') + cases(n.portee) + ' cases'],
    ...effets(n).filter(([, , k]) => k !== 'porteeMin' && k !== 'salve'),
  ];
  return `<dl class="stats">${l.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
}

/**
 * Ce qui change d'un niveau à un autre, ligne par ligne : { libelle, avant, apres, sens } où `sens` vaut
 * 'mieux', 'moins' ou 'nouveau'. Sert à l'encadré « Au niveau 2 » et aux fiches de spécialisation.
 */
export function comparer(avant, apres) {
  const l = [];
  const cmp = (libelle, a, b, fa, fb = fa, plusGrandMieux = true) => {
    if (a === b) return;
    l.push({ libelle, avant: fa(a), apres: fb(b), sens: (b > a) === plusGrandMieux ? 'mieux' : 'moins' });
  };
  if (degatsTir(avant) !== degatsTir(apres)) {
    l.push({ libelle: 'Dégâts', avant: texteDegats(avant), apres: texteDegats(apres), sens: degatsTir(apres) > degatsTir(avant) ? 'mieux' : 'moins' });
  }
  if (!avant.aura && !apres.aura) cmp('Tirs par s', avant.cadence, apres.cadence, tirs, tirs, false);
  else if (apres.aura && !avant.aura) l.push({ libelle: 'Tirs', avant: tirs(avant.cadence) + '/s', apres: 'en continu', sens: 'nouveau' });
  cmp('Portée (cases)', avant.portee, apres.portee, cases);
  if (avant.zone && apres.zone) cmp('Zone (cases)', avant.zone, apres.zone, cases);
  if (avant.ralenti && apres.ralenti) cmp('Ralentit', avant.ralenti, apres.ralenti, pct);
  if (avant.duree && apres.duree && !apres.aura) cmp('Durée du ralenti', avant.duree, apres.duree, (d) => dec(d) + ' s');
  if (avant.chaine && apres.chaine) cmp('Chaîne', avant.chaine.nombre, apres.chaine.nombre, (c) => c + ' ennemis');
  if (avant.volants !== apres.volants) l.push({ libelle: 'Volants', avant: avant.volants ? 'oui' : 'non', apres: apres.volants ? 'oui' : 'non', sens: apres.volants ? 'mieux' : 'moins' });
  const deja = new Set(effets(avant).map(([, , k]) => k));
  for (const [libelle, valeur, k] of effets(apres)) {
    if (deja.has(k)) continue;
    l.push({ libelle, avant: '', apres: valeur, sens: k === 'porteeMin' ? 'moins' : 'nouveau' });
  }
  for (const [libelle, , k] of effets(avant)) {
    if (!effets(apres).some(([, , k2]) => k2 === k)) l.push({ libelle, avant: '', apres: 'perdu', sens: 'moins' });
  }
  return l;
}

/** Lignes de comparaison en HTML (vert : mieux, rouge : moins bien, or : nouveau). */
export function lignesComparaison(l) {
  return `<ul class="comparaison">${l.map((x) => `<li class="${x.sens}"><span>${x.libelle}</span><b>${
    x.sens === 'nouveau' || !x.avant ? (x.sens === 'nouveau' ? '★ ' : '') + x.apres : `${x.avant} → ${x.apres}`}</b></li>`).join('')}</ul>`;
}

/** Encadré « Au niveau 2 » du panneau d'une tour de niveau 1. */
export function encadreNiveau2(sorte) {
  const d = TOURS[sorte];
  return `<div class="encadre"><div class="etiquette">Au niveau 2</div><p>${d.niveaux[1].description}</p>${
    lignesComparaison(comparer(statsNiveau(sorte, 0), statsNiveau(sorte, 1)))}</div>`;
}

/** Contenu d'un bouton de spécialisation (panneau d'une tour de niveau 2). */
export function ficheSpecialisation(sorte, v, prix) {
  const sp = TOURS[sorte].specialisations[v];
  return `<b>${sp.nom} · ${prix} or</b><span>${sp.description}</span>${
    lignesComparaison(comparer(statsNiveau(sorte, 1), statsNiveau(sorte, v)))}`;
}

/** Fiche au survol d'un bouton de la boutique. `or` : or du joueur (null hors partie). */
export function ficheTour(sorte, touches, or = null) {
  const d = TOURS[sorte];
  const n = statsNiveau(sorte, 0);
  const manque = or !== null && or < d.prix ? d.prix - or : 0;
  return `<h4>${d.nom}<span class="prix${manque ? ' manque' : ''}">${d.prix} or</span></h4>
    ${manque ? `<div class="alerte">Il manque ${manque} or</div>` : ''}
    <p>${d.niveaux[0].description}</p>
    ${pastilles(sorte, n)}
    ${tableau(n)}
    <div class="etiquette">Améliorations</div>
    <p class="petit-texte">Niveau 2 : ${d.ameliorations[0]} or · niveau 3 : ${d.ameliorations[1]} or, au choix :</p>
    <ul class="specs">${['a', 'b'].map((v) => `<li><b>${d.specialisations[v].nom}</b> : ${d.specialisations[v].resume.toLowerCase()}</li>`).join('')}</ul>
    <div class="touches">Touche ${touches} · Maj + clic : plusieurs à la suite</div>`;
}

/** Fiche au survol d'un pouvoir. */
export function fichePouvoir(nom, touches) {
  const p = POUVOIRS[nom];
  const l = nom === 'meteores'
    ? [['Météores', p.nombre], ['Dégâts', `${p.degats} chacun (magique)`], ['Zone', cases(p.zone) + ' case chacun']]
    : [['Soldats', p.soldats], ['Points de vie', `${p.pv} chacun`], ['Durée', p.duree + ' s']];
  l.push(['Recharge', p.recharge + ' s']);
  return `<h4>${p.nom}</h4><p>${p.description}</p>
    <dl class="stats">${l.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
    <div class="touches">Touches ${touches}, puis clic sur la carte</div>`;
}
