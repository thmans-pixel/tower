// Barres, panneau de tour, écrans : tout le texte à l'écran. Ne touche pas à l'état : les boutons appellent les
// fonctions passées par main.js.
import { TOURS, ORDRE_TOURS, CIBLAGES, statsTour } from '../data/tours.js';
import { ENNEMIS } from '../data/ennemis.js';
import { T, W } from '../sim/const.js';
import { composition, peutAppeler, bonusAppel, prixAmelioration, prixRevente } from '../sim/partie.js';
import { spriteTour } from '../render/sprites.js';

const $ = (id) => document.getElementById(id);
const nb = (n) => Math.round(n).toLocaleString('fr-FR');
const dec = (n, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const COUL = { gob: '#5fae3a', loup: '#8c8f99', orc: '#9aa3ad', bat: '#6d5585', cham: '#9b5fc0', slime: '#8be04e', slime_petit: '#8be04e', golem: '#7f8288', spectre: '#cfe3f0', ogre: '#c0392b' };

export class Interface {
  constructor(actions) {
    this.a = actions;
    this.cache = {};
    this.signature = '';
    this.creerBoutique();
    $('appel').onclick = () => actions.appel();
    $('b-pause').onclick = () => actions.pause();
    $('b-vitesse').onclick = () => actions.vitesse();
    $('b-son').onclick = () => actions.son();
    $('b-recommencer').onclick = () => actions.recommencer();
    $('b-menu').onclick = () => actions.menu();
    $('b-jouer').onclick = () => actions.ecran('cartes');
    $('b-retour').onclick = () => actions.ecran('titre');
    $('b-rejouer').onclick = () => actions.rejouer();
    $('b-fin-cartes').onclick = () => actions.ecran('cartes');
    $('b-non').onclick = () => { $('question').hidden = true; };
    $('panneau').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'fermer') actions.deselectionner();
      else if (act === 'ameliorer') actions.ameliorer(b.dataset.variante);
      else if (act === 'vendre') actions.vendre();
      else if (act === 'cibler') actions.cibler(b.dataset.mode);
    });
  }

  creerBoutique() {
    const zone = $('boutique');
    zone.innerHTML = ORDRE_TOURS.map((s) => {
      const d = TOURS[s];
      return `<button class="outil" data-sorte="${s}" title="${d.nom} — ${d.resume} (touche ${d.touche})">
        <img alt="" src="${spriteTour(s, 0).toDataURL()}">
        <span class="nom">${d.nom}</span>
        <span class="prix"><i class="ico piece"></i>${d.prix}</span>
        <kbd>${d.touche}</kbd></button>`;
    }).join('');
    zone.addEventListener('click', (e) => {
      const b = e.target.closest('.outil');
      if (b) this.a.construire(b.dataset.sorte);
    });
  }

  /** Icônes de la boutique : modèles de Blender (niveau 1) quand le pack est chargé. */
  iconesModeles(modeles) {
    for (const img of document.querySelectorAll('.outil img')) {
      const m = modeles.tours['tour_' + img.closest('.outil').dataset.sorte + '_1'];
      if (m) img.src = m.img.src;
    }
  }

  montrerEcran(nom) {
    $('ecran-titre').hidden = nom !== 'titre';
    $('ecran-cartes').hidden = nom !== 'cartes';
    if (nom !== 'jeu') { $('fin').hidden = true; $('question').hidden = true; }
  }

  listeCartes(cartes, vignette) {
    const zone = $('liste-cartes');
    zone.innerHTML = '';
    for (const c of Object.values(cartes)) {
      const b = document.createElement('button');
      b.className = 'carte-choix';
      b.disabled = !c.ouverte;
      if (c.ouverte && vignette) { const v = vignette(c.id); if (v) b.appendChild(v); }
      else b.insertAdjacentHTML('beforeend', '<div class="vide">Bientôt</div>');
      b.insertAdjacentHTML('beforeend', `<b>${c.nom}</b><span>${c.ouverte ? c.resume + ' ' + c.vagues.length + ' vagues.' : 'Carte à venir.'}</span>`);
      if (c.ouverte) b.onclick = () => this.a.carte(c.id);
      zone.appendChild(b);
    }
  }

  question(texte, oui) {
    $('question-texte').textContent = texte;
    $('question').hidden = false;
    $('b-oui').onclick = () => { $('question').hidden = true; oui(); };
  }

  fin(s) {
    $('fin-titre').textContent = s.fin === 'victoire' ? 'Victoire !' : 'Le château est tombé';
    const lignes = [
      ['Vague atteinte', `${s.vague} / ${s.nbVagues}`],
      ['Vies restantes', `${s.vies} / ${s.viesDepart}`],
      ['Ennemis abattus', nb(s.abattus)],
      ['Or gagné', nb(s.orGagne)],
      ['Durée', `${Math.floor(s.temps / 60)} min ${String(Math.floor(s.temps % 60)).padStart(2, '0')} s`],
    ];
    $('fin-bilan').innerHTML = lignes.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    $('fin').hidden = false;
  }

  majChamp(id, val) {
    if (this.cache[id] === val) return;
    this.cache[id] = val;
    $(id).textContent = val;
  }

  /** Mise à jour des barres, appelée à chaque image : n'écrit dans la page que ce qui a changé. */
  maj(s, ui, opts) {
    if (!s) return;
    this.majChamp('vies', String(s.vies));
    this.majChamp('or', nb(s.or));
    this.majChamp('vague', `${s.vague}/${s.nbVagues}`);
    this.majChamp('b-vitesse', '×' + opts.vitesse);
    this.majChamp('b-pause', opts.pause ? 'Reprendre' : 'Pause');
    this.majChamp('b-son', opts.son ? 'Son' : 'Muet');
    $('pause').hidden = !opts.pause;

    const appel = $('appel');
    let texte, attente = false;
    if (s.fin) texte = 'Partie terminée';
    else if (s.lancement) texte = `Vague ${s.vague} en cours…`;
    else if (s.vague === 0) { texte = 'Lancer la vague 1'; attente = true; }
    else if (s.vague >= s.nbVagues) texte = 'Dernière vague !';
    else texte = `Vague ${s.vague + 1} dans ${Math.ceil(s.compte)} s · appeler +${bonusAppel(s)} or`;
    this.majChamp('appel', texte);
    appel.disabled = !peutAppeler(s);
    appel.classList.toggle('attente', attente);

    const prochaine = s.vague + 1;
    const cleApercu = prochaine;
    if (this.cache.apercu !== cleApercu) {
      this.cache.apercu = cleApercu;
      const comp = composition(s, prochaine);
      $('apercu').innerHTML = comp.length
        ? `<span>Prochaine :</span>` + comp.map(({ sorte, nombre }) =>
          `<span class="puce"><i style="background:${COUL[sorte]}"></i>${nombre} ${nombre > 1 ? ENNEMIS[sorte].pluriel : ENNEMIS[sorte].nom}</span>`).join('')
        : '<span>Plus aucune vague après celle-ci.</span>';
    }

    // Barre de vie du boss, tant qu'il est en jeu.
    const boss = s.ennemis.find((e) => ENNEMIS[e.sorte].boss);
    const barre = $('barre-boss');
    if (boss) {
      barre.hidden = false;
      this.majChamp('nom-boss', ENNEMIS[boss.sorte].nom);
      $('jauge-boss').style.width = Math.max(0, (boss.pv / boss.pvMax) * 100).toFixed(1) + '%';
    } else if (!barre.hidden) barre.hidden = true;

    for (const b of document.querySelectorAll('.outil')) {
      const sorte = b.dataset.sorte;
      b.classList.toggle('actif', ui.construction === sorte);
      b.classList.toggle('trop-cher', s.or < TOURS[sorte].prix);
    }
    this.majPanneau(s, ui);
  }

  majPanneau(s, ui) {
    const p = $('panneau');
    const t = ui.selection && s.tours.find((x) => x.id === ui.selection);
    if (!t) { if (!p.hidden) { p.hidden = true; this.signature = ''; } return; }
    const d = TOURS[t.sorte], n = statsTour(t);
    const suiv = t.niveau === 0 ? statsTour({ ...t, niveau: 1 }) : null;   // flèches vers le niveau 2 seulement
    const prix = prixAmelioration(t), vente = prixRevente(t);
    const sig = [t.id, t.niveau, t.variante, t.ciblage, Math.round(t.degats), t.abattus, prix !== null && s.or >= prix, s.fin].join('|');
    if (sig === this.signature && !p.hidden) return;
    this.signature = sig;
    const fleche = (a, b, f) => (b !== undefined && b !== a ? ` <em>→ ${f(b)}</em>` : '');
    const cases = (px) => dec(px / T);
    const cad = (c) => dec(1 / c);
    const pct = (r) => Math.round(r * 100) + ' %';
    const lignes = [
      [n.chaine ? 'Dégâts (1er)' : 'Dégâts', nb(n.degats) + (n.salve ? ` × ${n.salve}` : '') + fleche(n.degats, suiv?.degats, nb)],
      ['Tirs par s', cad(n.cadence) + fleche(n.cadence, suiv?.cadence, cad)],
      ['Portée (cases)', (n.porteeMin ? cases(n.porteeMin) + ' à ' : '') + cases(n.portee) + fleche(n.portee, suiv?.portee, cases)],
    ];
    if (n.zone) lignes.push(['Zone (cases)', dec(n.zone / T) + fleche(n.zone, suiv?.zone, (z) => dec(z / T))]);
    if (n.ralenti) lignes.push(['Ralentit', pct(n.ralenti) + (n.aura ? ', toute la portée' : '') + fleche(n.ralenti, suiv?.ralenti, pct)]);
    if (n.gel) lignes.push(['Gèle', dec(n.gel) + ' s']);
    if (n.etourdit) lignes.push(['Étourdit', dec(n.etourdit) + ' s']);
    if (n.brulure) lignes.push(['Brûlure', `${n.brulure.dps}/s pendant ${n.brulure.duree} s`]);
    if (n.chaine) lignes.push(['Chaîne', `${n.chaine.nombre} ennemis, −${pct(n.chaine.baisse)} par saut`]);
    if (n.rebond) lignes.push(['Rebond', pct(n.rebond.facteur) + ' des dégâts']);
    if (n.transperce) lignes.push(['Transperce', cases(n.transperce) + ' cases']);
    if (n.perce) lignes.push(['Ignore', pct(n.perce) + ' de l’armure']);
    lignes.push(['Vise', n.volants ? 'sol et air' : 'sol seulement']);
    lignes.push(['Dégâts totaux', nb(t.degats)], ['Abattus', nb(t.abattus)]);
    const titre = t.niveau === 2 ? `${d.specialisations[t.variante].nom}<small>Niveau 3 — ${d.nom}</small>` : `${d.nom}<small>Niveau ${t.niveau + 1} sur 3</small>`;
    const bloque = (prix !== null && s.or < prix) || s.fin ? 'disabled' : '';
    let amelioration;
    if (prix === null) amelioration = '<button class="action" disabled>Niveau maximum</button>';
    else if (t.niveau === 1) {
      amelioration = '<div class="etiquette">Niveau 3 : choisissez une spécialisation</div><div class="choix">' +
        ['a', 'b'].map((v) => { const sp = d.specialisations[v]; return `<button class="action ameliorer specialite" data-act="ameliorer" data-variante="${v}" ${bloque}>
          <b>${sp.nom} · ${prix} or</b><span>${sp.resume}</span></button>`; }).join('') + '</div>';
    } else amelioration = `<button class="action ameliorer" data-act="ameliorer" ${bloque}>Améliorer · ${prix} or</button>`;
    p.innerHTML = `<button class="fermer" data-act="fermer" aria-label="Fermer">×</button>
      <h3>${titre}</h3>
      <dl class="stats">${lignes.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
      ${n.aura || n.chaine ? '' : `<div class="etiquette">Ciblage</div>
      <div class="ciblage">${Object.entries(CIBLAGES).map(([m, l]) =>
        `<button data-act="cibler" data-mode="${m}" class="${t.ciblage === m ? 'actif' : ''}">${l}</button>`).join('')}</div>`}
      ${amelioration}
      <button class="action vendre" data-act="vendre" ${s.fin ? 'disabled' : ''}>Vendre · +${vente} or</button>`;
    p.classList.toggle('gauche', t.x > W / 2);
    p.hidden = false;
  }
}
