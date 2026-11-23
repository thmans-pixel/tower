// Mode mobile (spec 015) : détection du téléphone, gestes sur la carte (toucher, glisser, pincer pour zoomer,
// double toucher pour revenir), boutons ✔ / ✖ pour confirmer une pose ou un pouvoir. Ne touche pas à la logique :
// il rappelle main.js par `toucher(e)` (un toucher simple) et `glisser(e)` (le doigt bouge en visant).

const SEUIL = 10;          // px : au-delà, ce n'est plus un toucher mais un glissé
const ZOOM_MAX = 2;

export class Mobile {
  constructor({ toile, cadre, toucher, glisser, vise, confirmer, annuler }) {
    this.toile = toile; this.cadre = cadre;
    this.cb = { toucher, glisser, vise, confirmer, annuler };
    this.doigts = new Map();
    this.zoom = { k: 1, x: 0, y: 0 };
    this.dernierToucher = 0;
    this.detecter();
    window.addEventListener('resize', () => this.detecter());
    window.addEventListener('orientationchange', () => setTimeout(() => this.detecter(), 200));
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) toile.addEventListener(t, (e) => this[t](e));
    this.creerConfirmation();
    this.creerBandeau();
  }

  /** Téléphone : écran tactile dont le petit côté fait moins de 600 px (ou ?mobile=1 pour essayer). */
  detecter() {
    const force = new URLSearchParams(location.search).get('mobile');
    const tactile = matchMedia('(pointer: coarse)').matches;
    this.actif = force === '1' || (force !== '0' && tactile && Math.min(innerWidth, innerHeight) < 600);
    const paysage = innerWidth > innerHeight;
    document.body.classList.toggle('mobile', this.actif);
    document.body.classList.toggle('paysage', this.actif && paysage);
    document.body.classList.toggle('portrait', this.actif && !paysage);
    if (!this.actif) this.remettreZoom();
  }

  // ------------------------------------------------------------------ gestes

  pointerdown(e) {
    if (!this.actif || e.pointerType === 'mouse') return;
    this.toile.setPointerCapture?.(e.pointerId);
    this.doigts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (this.doigts.size === 2) { this.pince = this.mesurePince(); this.geste = true; }
    else if (this.doigts.size === 1) { this.geste = false; this.glisse = false; }
  }

  pointermove(e) {
    const d = this.doigts.get(e.pointerId);
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    if (this.doigts.size >= 2) {   // pincer / déplacer à deux doigts
      const p = this.mesurePince();
      if (this.pince) this.zoomer(p.dist / this.pince.dist, p.cx, p.cy, p.cx - this.pince.cx, p.cy - this.pince.cy);
      this.pince = p;
      return;
    }
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > SEUIL) this.glisse = true;
    if (!this.glisse || this.geste) return;
    if (this.cb.vise()) this.cb.glisser(e);              // ajuster la tour fantôme ou la zone du pouvoir
    else if (this.zoom.k > 1) this.deplacer(dx, dy);     // sinon, faire glisser la carte zoomée
  }

  pointerup(e) {
    if (!this.doigts.has(e.pointerId)) return;
    this.doigts.delete(e.pointerId);
    if (this.doigts.size > 0) return;
    const fin = this.geste || this.glisse;
    this.geste = false; this.pince = null;
    if (fin) return;
    const t = performance.now();
    if (t - this.dernierToucher < 280 && !this.cb.vise() && this.zoom.k > 1) { this.remettreZoom(); this.dernierToucher = 0; return; }
    this.dernierToucher = t;
    this.cb.toucher(e);
  }

  pointercancel(e) { this.doigts.delete(e.pointerId); if (!this.doigts.size) { this.geste = false; this.pince = null; } }

  mesurePince() {
    const [a, b] = [...this.doigts.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  // ------------------------------------------------------------------ zoom (transformation CSS de la toile)

  zoomer(facteur, cx, cy, dx, dy) {
    const r = this.cadre.getBoundingClientRect();
    const z = this.zoom;
    const k = Math.min(ZOOM_MAX, Math.max(1, z.k * facteur));
    // Le point sous les doigts reste sous les doigts.
    const px = cx - r.left, py = cy - r.top;
    z.x = px - ((px - z.x) * k) / z.k + dx;
    z.y = py - ((py - z.y) * k) / z.k + dy;
    z.k = k;
    this.appliquer();
  }

  deplacer(dx, dy) { this.zoom.x += dx; this.zoom.y += dy; this.appliquer(); }

  remettreZoom() { this.zoom = { k: 1, x: 0, y: 0 }; this.appliquer(); }

  appliquer() {
    const z = this.zoom, l = this.cadre.clientWidth, h = this.cadre.clientHeight;
    z.x = Math.min(0, Math.max(l - l * z.k, z.x));   // la carte couvre toujours le cadre
    z.y = Math.min(0, Math.max(h - h * z.k, z.y));
    this.toile.style.transformOrigin = '0 0';
    this.toile.style.transform = z.k === 1 ? '' : `translate(${z.x}px, ${z.y}px) scale(${z.k})`;
  }

  // ------------------------------------------------------------------ ✔ / ✖ et bandeau

  creerConfirmation() {
    const d = document.createElement('div');
    d.id = 'confirmer';
    d.hidden = true;
    d.innerHTML = '<button class="oui" aria-label="Bâtir">✔</button><button class="non" aria-label="Annuler">✖</button>';
    d.querySelector('.oui').onclick = (e) => { e.stopPropagation(); this.cb.confirmer(); };
    d.querySelector('.non').onclick = (e) => { e.stopPropagation(); this.cb.annuler(); };
    document.body.appendChild(d);
    this.confirmation = d;
  }

  /**
   * Place ✔ / ✖ à côté de la case visée (x, y en coordonnées de la toile), ou les cache.
   * `libelle` : texte du bouton ✔ (« Bâtir », « Lancer ») ; `possible` : faux si la case est interdite.
   */
  majConfirmation(cible, libelle, possible) {
    const d = this.confirmation;
    if (!this.actif || !cible) { d.hidden = true; return; }
    const r = this.toile.getBoundingClientRect();
    const k = r.width / this.toile.width;
    const x = r.left + cible.x * k, y = r.top + cible.y * k;
    d.hidden = false;
    const oui = d.querySelector('.oui');
    oui.textContent = possible ? '✔ ' + libelle : '✖ Impossible';
    oui.disabled = !possible;
    const l = d.offsetWidth, h = d.offsetHeight;
    // Au-dessus de la case si possible, sinon en dessous ; jamais hors de l'écran.
    let top = y - 34 * k - h;
    if (top < 4) top = y + 26 * k;
    d.style.left = Math.round(Math.max(4, Math.min(innerWidth - l - 4, x - l / 2))) + 'px';
    d.style.top = Math.round(Math.max(4, Math.min(innerHeight - h - 4, top))) + 'px';
  }

  creerBandeau() {
    const d = document.createElement('div');
    d.id = 'tourner';
    d.innerHTML = '<span>Tournez le téléphone pour mieux jouer</span><button aria-label="Fermer">✖</button>';
    d.querySelector('button').onclick = () => document.body.classList.add('sans-bandeau');
    document.body.appendChild(d);
  }
}
