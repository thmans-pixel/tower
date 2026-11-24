// Hall of fame (spec 018) : écran des classements et envoi d'un résultat depuis l'écran de fin.
// C'est le SEUL fichier du jeu qui fait des appels réseau (`fetch('/api/hall')`). Tout ce qui vient du serveur
// (pseudos, valeurs) est mis dans la page avec textContent, jamais en HTML.
import { scoreHall, pseudoEnfant, pseudoEnfantValide, pseudoValide } from '../sim/hall.js';
import { PSEUDO_MIN, PSEUDO_MAX } from '../data/pseudos.js';
import { ORDRE_CARTES } from '../sim/progression.js';
import { DIFFICULTES, ORDRE_DIFFICULTES } from '../data/difficultes.js';
import { CARTES } from '../data/cartes.js';
import { TOURS } from '../data/tours.js';

const URL_HALL = '/api/hall';
const DELAI = 8000;
const $ = (id) => document.getElementById(id);
const nb = (n) => Math.round(n).toLocaleString('fr-FR');
const INDISPONIBLE = 'Hall of fame indisponible pour le moment.';

export const CLASSEMENTS = {
  tour: { nom: 'Meilleure tour', unite: 'dégâts', cartes: false, difficultes: false },
  labyrinthe: { nom: 'Labyrinthe', unite: 'vagues (le moins est le mieux)', cartes: false, difficultes: true },
  infini: { nom: 'Mode infini', unite: 'vagues', cartes: true, difficultes: true },
  campagne: { nom: 'Campagne', unite: 'vies restantes', cartes: true, difficultes: true },
};

const nomCarte = (c) => (c === 'labyrinthe' ? 'Labyrinthe' : CARTES[c]?.nom || c);
const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);
const gens = (enfant) => (enfant ? 'chez les enfants' : 'chez les adultes');

/** Appel au service ; ne lève jamais : { ok, donnees } ou { ok: false, message, raison }. */
async function appeler(url, options = {}) {
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), DELAI);
  try {
    const r = await fetch(url, { ...options, signal: arret.signal, cache: 'no-store' });
    let donnees = null;
    try { donnees = await r.json(); } catch { /* page d'erreur du serveur web : indisponible */ }
    if (!donnees || typeof donnees !== 'object') return { ok: false, message: INDISPONIBLE, raison: 'indisponible' };
    if (r.ok) return { ok: true, donnees };
    return { ok: false, message: typeof donnees.erreur === 'string' ? donnees.erreur : INDISPONIBLE, raison: donnees.raison || 'indisponible' };
  } catch {
    return { ok: false, message: INDISPONIBLE, raison: 'indisponible' };
  } finally {
    clearTimeout(minuteur);
  }
}

export class HallUi {
  /** `actions` : { progression(), retenir(changements), son(nom) } — main.js garde la progression. */
  constructor(actions) {
    this.a = actions;
    this.vue = { classement: 'tour', carte: 'prairie', difficulte: 'normal', enfant: false };
    this.envoi = null;   // { resultats, enfant, pseudoEnfant }
    this.demande = 0;
    $('b-hall').onclick = () => this.ouvrir();
    $('b-hall-cartes').onclick = () => this.ouvrir();
    $('b-fermer-hall').onclick = () => { $('hall').hidden = true; };
    $('b-envoyer-hall').onclick = () => this.envoyer();
    const repondre = (enfant) => () => { this.a.retenir({ enfant, ageRepondu: true }); this.a.son('clic'); if (this.partie) this.proposer(...this.partie); };
    $('b-age-oui').onclick = repondre(true);
    $('b-age-non').onclick = repondre(false);
    $('b-autre-pseudo').onclick = () => { this.envoi.pseudoEnfant = pseudoEnfant(Math.floor(Math.random() * 2 ** 31)); this.montrerPseudo(); this.a.son('clic'); };
    $('pseudo-hall').oninput = () => { $('hall-message').textContent = ''; };
    $('pseudo-hall').onkeydown = (e) => { if (e.key === 'Enter') this.envoyer(); };
  }

  // ---------- l'écran des classements

  ouvrir() {
    this.vue.enfant = !!this.a.progression().enfant;
    $('hall').hidden = false;
    this.a.son('clic');
    this.dessiner();
  }

  dessiner() {
    const v = this.vue, c = CLASSEMENTS[v.classement];
    const boutons = (id, liste, courant, cle) => {
      const zone = $(id);
      zone.replaceChildren(...liste.map(([val, nom]) => {
        const b = document.createElement('button');
        b.textContent = nom;
        b.className = val === courant ? 'actif' : '';
        b.setAttribute('aria-pressed', String(val === courant));
        b.onclick = () => { v[cle] = val; this.a.son('clic'); this.dessiner(); };
        return b;
      }));
    };
    boutons('hall-onglets', [[false, 'Adultes'], [true, 'Enfants']], v.enfant, 'enfant');
    boutons('hall-classements', Object.entries(CLASSEMENTS).map(([k, x]) => [k, x.nom]), v.classement, 'classement');
    $('hall-cartes').hidden = !c.cartes;
    $('hall-difficultes').hidden = !c.difficultes;
    if (c.cartes) boutons('hall-cartes', ORDRE_CARTES.map((k) => [k, CARTES[k].nom]), v.carte, 'carte');
    if (c.difficultes) boutons('hall-difficultes', ORDRE_DIFFICULTES.map((k) => [k, DIFFICULTES[k].nom]), v.difficulte, 'difficulte');
    this.charger();
  }

  async charger() {
    const v = this.vue, c = CLASSEMENTS[v.classement];
    const demande = ++this.demande;
    const liste = $('hall-liste'), note = $('hall-note');
    liste.replaceChildren();
    note.textContent = 'Chargement…';
    const q = new URLSearchParams({ classement: v.classement, enfant: v.enfant ? '1' : '0' });
    if (c.cartes) q.set('carte', v.carte);
    if (c.difficultes) q.set('difficulte', v.difficulte);
    const r = await appeler(`${URL_HALL}?${q}`);
    if (demande !== this.demande) return;   // une réponse plus récente a pris le relais
    if (!r.ok || !Array.isArray(r.donnees.entrees)) { note.textContent = r.ok ? INDISPONIBLE : r.message; return; }
    const prog = this.a.progression();
    const moi = ((v.enfant ? prog.pseudoEnfant : prog.pseudo) || '').toLowerCase();
    note.textContent = r.donnees.entrees.length ? `Valeur : ${c.unite}.` : 'Personne n’est encore classé ici : à vous de jouer !';
    liste.replaceChildren(...r.donnees.entrees.map((e) => {
      const li = document.createElement('li');
      if (moi && String(e.pseudo).toLowerCase() === moi) li.className = 'moi';
      const place = document.createElement('b'); place.textContent = String(e.place);
      const nom = document.createElement('span'); nom.className = 'nom'; nom.textContent = String(e.pseudo);
      if (v.classement === 'tour' && e.detail) {
        const d = e.detail, pet = document.createElement('small');
        pet.textContent = `${TOURS[d.tour]?.nom || ''} · ${nomCarte(d.carte)} · ${DIFFICULTES[d.difficulte]?.nom || ''} · ${d.mode === 'campagne' ? 'campagne' : d.mode === 'infini' ? 'infini' : 'labyrinthe'}`;
        nom.append(pet);
      }
      const val = document.createElement('span'); val.className = 'val'; val.textContent = nb(e.valeur);
      li.append(place, nom, val);
      return li;
    }));
  }

  // ---------- l'envoi, depuis l'écran de fin

  /** À appeler quand l'écran de fin s'affiche : montre « Envoyer au hall of fame » s'il y a quelque chose à classer. */
  proposer(s, idCarte) {
    const resultats = scoreHall(s, idCarte);
    $('fin-hall').hidden = !resultats.length;
    $('hall-resultat').replaceChildren();
    $('hall-message').textContent = '';
    if (!resultats.length) { this.envoi = null; return; }
    const prog = this.a.progression();
    this.envoi = { resultats, enfant: !!prog.enfant, pseudoEnfant: prog.pseudoEnfant || pseudoEnfant(Math.floor(Math.random() * 2 ** 31)) };
    this.partie = [s, idCarte];
    // Tant qu'on ne sait pas si c'est un enfant, pas de champ libre : on demande d'abord l'âge.
    $('hall-age').hidden = !!prog.ageRepondu;
    $('hall-envoi').hidden = !prog.ageRepondu;
    $('b-envoyer-hall').disabled = false;
    $('hall-pseudo-enfant').hidden = !this.envoi.enfant;
    $('hall-pseudo-adulte').hidden = this.envoi.enfant;
    $('hall-resume').textContent = resultats.map((r) => this.phrase(r)).join(' · ');
    if (this.envoi.enfant) this.montrerPseudo();
    else { $('pseudo-hall').value = prog.pseudo || ''; $('pseudo-hall').minLength = PSEUDO_MIN; $('pseudo-hall').maxLength = PSEUDO_MAX; }
  }

  phrase(r) {
    const nomC = CLASSEMENTS[r.classement].nom;
    return r.classement === 'tour' ? `${nomC} (${TOURS[r.tour]?.nom}) : ${nb(r.valeur)} dégâts` : `${nomC} : ${nb(r.valeur)}`;
  }

  montrerPseudo() {
    $('pseudo-propose').textContent = this.envoi.pseudoEnfant;
  }

  async envoyer() {
    const e = this.envoi;
    if (!e) return;
    const message = $('hall-message');
    let pseudo;
    if (e.enfant) {
      pseudo = e.pseudoEnfant;
      if (!pseudoEnfantValide(pseudo)) return;
    } else {
      pseudo = $('pseudo-hall').value.trim();
      if (!pseudoValide(pseudo)) { message.textContent = `Le pseudo doit avoir de ${PSEUDO_MIN} à ${PSEUDO_MAX} caractères : lettres, chiffres, espaces ou tirets.`; return; }
    }
    $('b-envoyer-hall').disabled = true;
    message.textContent = 'Envoi…';
    const lignes = [];
    let accepte = false, premierRefus = '';
    for (const r of e.resultats) {
      const rep = await appeler(URL_HALL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, pseudo, enfant: e.enfant }) });
      if (rep.ok) {
        accepte = true;
        const d = rep.donnees;
        lignes.push(`${this.phrase(r)} → ${ordinal(d.place)} ${gens(e.enfant)}${d.ameliore ? '' : ` (votre meilleur reste ${nb(d.valeur)})`}`);
      } else {
        lignes.push(`${CLASSEMENTS[r.classement].nom} : ${rep.message}`);
        premierRefus ||= rep.message;
      }
    }
    if (accepte) {
      this.a.retenir(e.enfant ? { pseudoEnfant: pseudo } : { pseudo });
      $('hall-envoi').hidden = true;
      message.textContent = '';
    } else {
      $('b-envoyer-hall').disabled = false;   // rien n'est réessayé en cachette : c'est au joueur de recommencer
      message.textContent = premierRefus;
    }
    $('hall-resultat').replaceChildren(...(accepte ? lignes : []).map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
    if (accepte) this.a.son('piece');
  }
}
