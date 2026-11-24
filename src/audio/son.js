// Sons synthétisés (aucun fichier audio), déclenchés par les événements de la logique (spec 014).
// Deux voies : effets sonores et musique, chacune avec son volume, puis un compresseur pour ne jamais saturer.
export class Son {
  constructor() {
    this.ac = null;
    this.actif = true;          // coupure générale (bouton Muet)
    this.volEffets = 0.8;
    this.volMusique = 0.6;
    this.derniers = {};
  }

  /** À appeler depuis un geste du joueur : les navigateurs n'autorisent le son qu'après. */
  reveiller() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = this.ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
      this.maitre = ac.createGain();
      this.maitre.connect(comp); comp.connect(ac.destination);
      this.effets = ac.createGain(); this.effets.connect(this.maitre);
      this.musique = ac.createGain(); this.musique.connect(this.maitre);
      this.appliquer();
      const n = ac.sampleRate;
      this.bruit = ac.createBuffer(1, n, ac.sampleRate);
      const d = this.bruit.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ac = null; }
  }

  /** Reporte les réglages (muet, volumes) sur les voies, en douceur. */
  appliquer() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    this.maitre.gain.setTargetAtTime(this.actif ? 0.7 : 0, t, 0.05);
    this.effets.gain.setTargetAtTime(this.volEffets, t, 0.05);
    this.musique.gain.setTargetAtTime(this.volMusique, t, 0.05);
  }

  // ------------------------------------------------------------------ briques

  /** Oscillateur avec attaque douce et descente de fréquence f0 → f1. */
  ton(type, f0, f1, duree, vol, retard = 0, attaque = 0.005, sortie = this.effets) {
    const ac = this.ac, t = ac.currentTime + retard;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(sortie);
    o.start(t); o.stop(t + duree + 0.05);
    return o;
  }

  /** Bruit filtré (type : lowpass, highpass, bandpass), fréquence qui glisse de f0 à f1. */
  souffle(duree, vol, f0, type = 'lowpass', f1 = f0, q = 1, retard = 0, attaque = 0.004) {
    const ac = this.ac, t = ac.currentTime + retard;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.bruit; s.loopStart = Math.random() * 0.5;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    s.connect(f); f.connect(g); g.connect(this.effets);
    s.start(t, Math.random() * 0.4); s.stop(t + duree + 0.05);
  }

  /** Cloche : fondamentale et partiels inharmoniques qui s'éteignent lentement. */
  cloche(f, duree, vol, retard = 0) {
    [[1, 1], [2.01, 0.5], [2.98, 0.3], [4.1, 0.15]].forEach(([m, a]) => this.ton('sine', f * m, f * m, duree / m ** 0.3, vol * a, retard, 0.003));
  }

  /** Limite la répétition d'un même son. */
  libre(cle, ecart) {
    const t = performance.now();
    if (t - (this.derniers[cle] || 0) < ecart) return false;
    this.derniers[cle] = t;
    return true;
  }

  // ------------------------------------------------------------------ sons

  jouer(nom) {
    if (!this.actif || !this.ac) return;
    switch (nom) {
      case 'erreur': this.ton('triangle', 220, 160, 0.16, 0.08); this.ton('triangle', 180, 130, 0.18, 0.06, 0.08); break;
      case 'clic': this.ton('sine', 1100, 900, 0.04, 0.05); break;
      case 'piece': if (this.libre('piece', 70)) { const f = 1568 * (1 + (Math.random() - 0.5) * 0.04); this.ton('sine', f, f, 0.12, 0.03); this.ton('sine', f * 1.335, f * 1.335, 0.18, 0.025, 0.05); } break;
      default:
    }
  }

  tir(e) {
    switch (e.sorte) {
      case 'archers':   // sifflement de flèche
        this.souffle(0.13, 0.05, 3200, 'bandpass', 900, 3); this.ton('triangle', 620, 380, 0.06, 0.02); break;
      case 'canon':
        if (e.variante === 'b') { this.souffle(0.32, 0.06, 700, 'bandpass', 1400, 0.8, 0, 0.04); break; }   // souffle de flammes
        this.ton('sine', 130, 38, 0.32, 0.22, 0, 0.002); this.souffle(0.28, 0.12, 900, 'lowpass', 200); break;
      case 'givre':     // cristal
        this.ton('sine', 2637, 2637, 0.22, 0.025); this.ton('sine', 3951, 3951, 0.16, 0.015, 0.02); this.souffle(0.08, 0.02, 6000, 'highpass'); break;
      case 'mage':      // crépitement magique qui monte
        this.ton('triangle', 520, 1250, 0.18, 0.045); this.ton('sine', 780, 1870, 0.18, 0.025, 0.02); this.souffle(0.15, 0.025, 5000, 'highpass'); break;
      case 'baliste':   // claquement de corde
        this.souffle(0.05, 0.1, 1800, 'bandpass', 1800, 2); this.ton('triangle', 190, 70, 0.18, 0.12, 0, 0.002); break;
      default:
        this.ton('triangle', 480, 960, 0.14, 0.05);
    }
  }

  /** Petit cri à la mort, selon le monstre. */
  mort(e) {
    switch (e.sorte) {
      case 'slime': case 'slime_petit': this.ton('sine', 260, 820, 0.07, 0.07); this.ton('sine', 500, 180, 0.06, 0.04, 0.06); break;   // plop
      case 'loup': this.ton('sine', 980, 520, 0.16, 0.05); break;
      case 'chauve_souris': this.ton('sine', 2300, 1500, 0.07, 0.03); break;
      case 'golem': this.souffle(0.35, 0.14, 500, 'lowpass', 120); this.ton('sine', 90, 45, 0.3, 0.12); break;
      case 'spectre': this.ton('sine', 560, 180, 0.5, 0.04, 0, 0.05); break;
      case 'ogre': break;
      default: this.ton('square', 640 * (0.9 + Math.random() * 0.2), 330, 0.09, 0.025); this.souffle(0.06, 0.03, 1200, 'bandpass');
    }
  }

  evenements(liste) {
    if (!this.actif || !this.ac) return;
    for (const e of liste) {
      switch (e.type) {
        case 'tir': if (this.libre('tir' + e.sorte + (e.variante || ''), e.sorte === 'archers' ? 60 : 80)) this.tir(e); break;
        case 'eclair':   // grésillement électrique : petites salves de bruit aigu
          if (!this.libre('eclair', 90)) break;
          for (let i = 0; i < 5; i++) this.souffle(0.03, 0.06, 4500, 'highpass', 4500, 1, i * 0.025);
          this.ton('sawtooth', 1500, 250, 0.14, 0.025);
          break;
        case 'explosion': if (this.libre('boum', 80)) { this.souffle(0.4, 0.16, 700, 'lowpass', 120); this.ton('sine', 110, 40, 0.3, 0.1); } break;
        case 'mort': if (this.libre('mort' + e.sorte, 45)) this.mort(e); break;
        case 'blesse': if (e.armure && this.libre('tink', 110)) { this.ton('triangle', 2600, 2200, 0.07, 0.025); this.ton('sine', 3900, 3900, 0.05, 0.012); } break;
        case 'fuite': this.ton('sawtooth', 240, 90, 0.4, 0.07); this.souffle(0.3, 0.06, 500); break;
        case 'pose': this.souffle(0.1, 0.1, 400, 'lowpass', 150, 1, 0.2); this.ton('sine', 160, 70, 0.14, 0.14, 0.2); break;   // la tour touche le sol
        // Labyrinthe (spec 016)
        case 'poseMur': if (this.libre('mur', 50)) { this.souffle(0.08, 0.08, 500, 'lowpass', 150); this.ton('sine', 200, 90, 0.1, 0.1); } break;
        case 'venteMur': if (this.libre('mur', 50)) this.ton('sine', 1318, 1568, 0.1, 0.025); break;
        case 'aTerre': if (this.libre('aterre', 70)) { this.ton('sine', 660, 990, 0.12, 0.04); this.ton('sine', 990, 1320, 0.14, 0.03, 0.07); } break;
        case 'prevusAppliques': this.souffle(0.25, 0.1, 500, 'lowpass', 150); [392, 523].forEach((f, i) => this.cloche(f, 0.4, 0.03, 0.1 + i * 0.1)); break;
        case 'amelioration': [523, 659, 784, 1046].forEach((f, i) => this.cloche(f, 0.5, 0.035, i * 0.07)); break;
        case 'vente': this.souffle(0.35, 0.07, 600, 'lowpass', 150); [1318, 1568, 1760].forEach((f, i) => this.ton('sine', f, f, 0.12, 0.025, 0.1 + i * 0.06)); break;
        case 'vague': this.cloche(392, 1.4, 0.07); this.cloche(392, 1.4, 0.05, 0.45); break;   // cloche du château
        case 'tourDeLaVague': [1047, 1319, 1568, 2093].forEach((f, i) => this.cloche(f, 0.45, 0.025, 0.25 + i * 0.07)); break;
        case 'finVague': [784, 988, 1175].forEach((f, i) => this.cloche(f, 0.5, 0.03, i * 0.08)); break;
        case 'soin': if (e.soignes && this.libre('soin', 300)) this.ton('sine', 600, 900, 0.2, 0.03, 0, 0.04); break;
        case 'boss': [110, 98, 82].forEach((f, i) => { this.ton('sawtooth', f, f, 0.55, 0.06, i * 0.45); this.ton('sine', f / 2, f / 2, 0.6, 0.12, i * 0.45); }); break;
        case 'rugissement': this.ton('sawtooth', 95, 45, 0.8, 0.1, 0, 0.05); this.souffle(0.7, 0.12, 500, 'lowpass', 200, 1, 0, 0.08); break;
        case 'meteores': this.souffle(0.9, 0.06, 3000, 'bandpass', 300, 2); break;   // sifflement de chute
        case 'impactMeteore': this.souffle(0.5, 0.2, 600, 'lowpass', 100); this.ton('sine', 90, 32, 0.45, 0.16); break;
        case 'renforts': [392, 523, 659, 784].forEach((f, i) => this.ton('square', f, f, 0.12, 0.03, i * 0.1, 0.01)); break;
        case 'ecrases': this.souffle(0.3, 0.12, 900, 'lowpass', 200); break;
        case 'victoire': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.cloche(f, 0.6, 0.04, i * 0.14)); break;
        case 'defaite': [392, 330, 262, 196].forEach((f, i) => this.ton('triangle', f, f * 0.98, 0.45, 0.06, i * 0.3, 0.02)); break;
        default:
      }
    }
  }
}
