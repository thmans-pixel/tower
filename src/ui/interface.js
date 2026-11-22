// Barres, panneau de tour, écrans : tout le texte à l'écran. Ne touche pas à l'état : les boutons appellent les
// fonctions passées par main.js.
import { TOURS, ORDRE_TOURS, CIBLAGES, statsTour } from '../data/tours.js';
import { ENNEMIS } from '../data/ennemis.js';
import { T, W } from '../sim/const.js';
import { composition, peutAppeler, bonusAppel, prixAmelioration, prixRevente } from '../sim/partie.js';
import { spriteTour } from '../render/sprites.js';
import { etiquetteRang } from './clavier.js';
import { POUVOIRS, ORDRE_POUVOIRS } from '../data/pouvoirs.js';
import { DIFFICULTES, ORDRE_DIFFICULTES } from '../data/difficultes.js';
import { estDebloquee, meilleuresEtoiles, infiniJouable, aleatoireOuvert, ORDRE_CARTES } from '../sim/progression.js';
import { THEMES, LONGUEURS } from '../sim/generateur.js';
import { scoreInfini } from '../sim/partie.js';

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
    this.creerPouvoirs();
    $('appel').onclick = () => actions.appel();
    $('b-pause').onclick = () => actions.pause();
    $('b-vitesse').onclick = () => actions.vitesse();
    $('b-son').onclick = () => actions.son();
    $('b-recommencer').onclick = () => actions.recommencer();
    $('b-menu').onclick = () => actions.menu();
    $('b-jouer').onclick = () => actions.ecran('cartes');
    $('b-retour').onclick = () => actions.ecran('titre');
    $('b-effacer').onclick = () => this.question('Effacer toute la progression (cartes débloquées, étoiles, scores) ?', () => actions.effacer());
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
    zone.innerHTML = ORDRE_TOURS.map((s, i) => {
      const d = TOURS[s];
      return `<button class="outil" data-sorte="${s}" title="${d.nom} — ${d.resume} (touche ${etiquetteRang(i + 1)} ; Maj + clic pour en poser plusieurs ; appui long pour verrouiller)">
        <img alt="" src="${spriteTour(s, 0).toDataURL()}">
        <span class="nom">${d.nom}</span>
        <span class="prix"><i class="ico piece"></i>${d.prix}</span>
        <kbd>${etiquetteRang(i + 1)}</kbd><span class="serie">en série</span></button>`;
    }).join('');
    // Appui long (tablette) : verrouille la tour pour en poser plusieurs à la suite ; un nouvel appui long la libère.
    let minuteur = null, appuiLong = false;
    zone.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.outil');
      if (!b) return;
      appuiLong = false;
      minuteur = setTimeout(() => { appuiLong = true; this.a.verrouiller(b.dataset.sorte); }, 500);
    });
    for (const fin of ['pointerup', 'pointerleave', 'pointercancel']) zone.addEventListener(fin, () => clearTimeout(minuteur));
    zone.addEventListener('contextmenu', (e) => { if (e.target.closest('.outil')) e.preventDefault(); });
    zone.addEventListener('click', (e) => {
      const b = e.target.closest('.outil');
      if (!b) return;
      if (appuiLong) { appuiLong = false; return; }
      this.a.construire(b.dataset.sorte);
    });
  }

  creerPouvoirs() {
    const zone = $('pouvoirs');
    zone.innerHTML = ORDRE_POUVOIRS.map((n, k) => {
      const p = POUVOIRS[n];
      const touches = `${etiquetteRang(7 + k)} ${p.touche.toUpperCase()}`;
      return `<button class="pouvoir" data-pouvoir="${n}" title="${p.nom} — ${p.resume} (touches ${touches})">
        <b>${p.nom}</b><span class="etat">Prêt</span><kbd>${touches}</kbd><i class="charge"></i></button>`;
    }).join('');
    zone.addEventListener('click', (e) => {
      const b = e.target.closest('.pouvoir');
      if (b) this.a.pouvoir(b.dataset.pouvoir);
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

  /** Écran des cartes : difficulté, puis une carte par case, avec ses étoiles ou son cadenas. */
  /** `mode` : 'campagne', 'aleatoire' ou 'infini' ; `alea` : réglages et vignette de la carte aléatoire. */
  listeCartes(cartes, vignette, prog, mode = 'campagne', alea = null) {
    const diff = prog.difficulte;
    const infini = mode === 'infini';
    const modes = $('choix-mode');
    const offerts = [['campagne', 'Campagne', 'cartes à gagner'],
      ...(aleatoireOuvert(prog) ? [['aleatoire', 'Carte aléatoire', 'un chemin neuf']] : []),
      ...(prog.infiniOuvert ? [['infini', 'Mode infini', 'vagues sans fin']] : [])];
    modes.hidden = offerts.length < 2;
    modes.innerHTML = offerts.map(([m, nom, sous]) =>
      `<button data-mode="${m}" class="${m === mode ? 'actif' : ''}" aria-pressed="${m === mode}">${nom}<small>${sous}</small></button>`).join('');
    for (const b of modes.querySelectorAll('button')) b.onclick = () => this.a.mode(b.dataset.mode);
    $('choix-difficulte').innerHTML = ORDRE_DIFFICULTES.map((d) => {
      const x = DIFFICULTES[d];
      return `<button data-diff="${d}" class="${d === diff ? 'actif' : ''}" aria-pressed="${d === diff}">${x.nom}<small>${x.vies} vies</small></button>`;
    }).join('');
    for (const b of $('choix-difficulte').querySelectorAll('button')) b.onclick = () => this.a.difficulte(b.dataset.diff);
    const zone = $('liste-cartes');
    zone.innerHTML = '';
    if (mode === 'aleatoire' && alea) { this.ecranAleatoire(zone, prog, alea); return; }
    const etoiles = (n) => '<span class="etoiles">' + [1, 2, 3].map((i) => (i <= n ? '★' : '<span class="eteinte">★</span>')).join('') + '</span>';
    for (const id of ORDRE_CARTES) {
      const c = cartes[id];
      const ouverte = infini ? infiniJouable(prog, id) : estDebloquee(prog, id);
      const jouable = ouverte && c.ouverte;
      const b = document.createElement('button');
      b.className = 'carte-choix';
      b.disabled = !jouable;
      if (jouable && vignette) { const v = vignette(id); if (v) b.appendChild(v); }
      else b.insertAdjacentHTML('beforeend', `<div class="vide">${ouverte ? 'Bientôt' : 'Verrouillée'}</div>`);
      const texte = !c.ouverte ? 'Carte à venir.'
        : !ouverte ? (infini ? 'Gagnez cette carte pour y jouer sans fin.' : 'Gagnez la carte précédente pour l’ouvrir.')
          : infini ? 'Des vagues sans fin, de plus en plus fortes.' : `${c.resume} ${c.vagues.length} vagues.`;
      const note = !jouable ? '' : infini ? `<span class="record">Record : ${prog.infini[id] ? prog.infini[id] + ' vagues' : 'aucun'}</span>` : etoiles(meilleuresEtoiles(prog, id, diff));
      b.insertAdjacentHTML('beforeend', `<b>${c.nom}</b>${note}<span>${texte}</span>`);
      if (jouable) b.onclick = () => this.a.carte(id);
      zone.appendChild(b);
    }
  }

  /** Carte aléatoire : décor, longueur, numéro (graine), aperçu, puis Jouer. */
  ecranAleatoire(zone, prog, alea) {
    const noms = { prairie: 'Prairie', desert: 'Désert', montagne: 'Montagne' };
    const gagnees = prog.aleatoires[prog.difficulte] || 0;
    zone.innerHTML = `<div class="alea">
      <div class="alea-apercu"></div>
      <div class="alea-reglages">
        <div class="etiquette">Décor</div>
        <div class="difficultes">${Object.keys(THEMES).map((t) => `<button data-theme="${t}" class="${t === alea.theme ? 'actif' : ''}">${noms[t]}</button>`).join('')}</div>
        <div class="etiquette">Longueur</div>
        <div class="difficultes">${LONGUEURS.map((n) => `<button data-long="${n}" class="${n === alea.longueur ? 'actif' : ''}">${n} vagues</button>`).join('')}</div>
        <div class="etiquette">Numéro de la carte</div>
        <div class="alea-numero"><input id="num-carte" type="number" inputmode="numeric" min="1" max="99999" value="${alea.graine}" aria-label="Numéro de la carte">
          <button id="b-hasard" class="petit">Au hasard</button></div>
        <p class="alea-note">Même numéro, même carte : donnez-le à quelqu’un pour qu’il la joue aussi.</p>
        <button id="b-jouer-alea" class="grand">Jouer la carte n° ${alea.graine}</button>
        <p class="alea-note">Cartes aléatoires gagnées en ${DIFFICULTES[prog.difficulte].nom} : ${gagnees}</p>
      </div></div>`;
    if (alea.vignette) zone.querySelector('.alea-apercu').appendChild(alea.vignette);
    for (const b of zone.querySelectorAll('[data-theme]')) b.onclick = () => this.a.alea({ theme: b.dataset.theme });
    for (const b of zone.querySelectorAll('[data-long]')) b.onclick = () => this.a.alea({ longueur: Number(b.dataset.long) });
    $('b-hasard').onclick = () => this.a.alea({ graine: 'hasard' });
    $('num-carte').onchange = (e) => {
      const n = Math.max(1, Math.min(99999, Math.floor(Number(e.target.value) || 1)));
      this.a.alea({ graine: n });
    };
    $('b-jouer-alea').onclick = () => this.a.jouerAleatoire();
  }

  question(texte, oui) {
    $('question-texte').textContent = texte;
    $('question').hidden = false;
    $('b-oui').onclick = () => { $('question').hidden = true; oui(); };
  }

  /** `bilan` : { etoiles, nouvelles: [noms de cartes], infini } — ce que la partie a débloqué. */
  fin(s, bilan = {}) {
    $('fin-titre').textContent = s.fin === 'victoire' ? 'Victoire !' : s.infini ? 'Fin de la partie sans fin' : 'Le château est tombé';
    const et = $('fin-etoiles');
    et.hidden = s.fin !== 'victoire';
    et.innerHTML = [1, 2, 3].map((i) => (i <= (bilan.etoiles || 0) ? '★' : '<span class="eteinte">★</span>')).join('');
    const msg = [...(bilan.nouvelles || []).map((n) => `Nouvelle carte : ${n} !`), ...(bilan.infini ? ['Mode infini débloqué !'] : []),
      ...(bilan.record ? ['Nouveau record !'] : [])];
    $('fin-nouveau').hidden = !msg.length;
    $('fin-nouveau').textContent = msg.join(' ');
    const lignes = [
      ['Difficulté', DIFFICULTES[s.difficulte]?.nom || ''],
      ...(s.carte.def.aleatoire ? [['Carte', `n° ${s.carte.def.aleatoire.graine}`]] : []),
      s.infini ? ['Vagues repoussées', String(scoreInfini(s))] : ['Vague atteinte', `${s.vague} / ${s.nbVagues}`],
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
    this.majChamp('vague', s.infini ? `${s.vague} · sans fin` : `${s.vague}/${s.nbVagues}`);
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

    for (const b of document.querySelectorAll('.pouvoir')) {
      const n = b.dataset.pouvoir, reste = s.pouvoirs ? s.pouvoirs[n] : 0;
      const texte = reste > 0 ? Math.ceil(reste) + ' s' : ui.pouvoir === n ? 'Visez…' : 'Prêt';
      const etat = b.querySelector('.etat');
      if (etat.textContent !== texte) etat.textContent = texte;
      b.disabled = reste > 0 || !!s.fin;
      b.classList.toggle('actif', ui.pouvoir === n);
      b.querySelector('.charge').style.width = (reste > 0 ? (1 - reste / POUVOIRS[n].recharge) * 100 : 0).toFixed(0) + '%';
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
      b.classList.toggle('verrou', ui.verrou === sorte);
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
