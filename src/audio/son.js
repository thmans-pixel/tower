// Effets sonores synthétisés (aucun fichier audio), déclenchés par les événements de la logique.
export class Son {
  constructor() {
    this.ac = null;
    this.actif = true;
    this.derniers = {};
  }

  /** À appeler depuis un geste du joueur : les navigateurs n'autorisent le son qu'après. */
  reveiller() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ac = new AC();
      this.maitre = this.ac.createGain();
      this.maitre.gain.value = 0.5;
      this.maitre.connect(this.ac.destination);
      const n = this.ac.sampleRate * 0.5;
      this.bruit = this.ac.createBuffer(1, n, this.ac.sampleRate);
      const d = this.bruit.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ac = null; }
  }

  ton(type, f0, f1, duree, vol, retard = 0) {
    const ac = this.ac, t = ac.currentTime + retard;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duree);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duree);
    o.connect(g); g.connect(this.maitre);
    o.start(t); o.stop(t + duree + 0.02);
  }

  souffle(duree, vol, coupure) {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.bruit; f.type = 'lowpass'; f.frequency.value = coupure;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + duree);
    s.connect(f); f.connect(g); g.connect(this.maitre);
    s.start(t); s.stop(t + duree);
  }

  /** Limite la répétition d'un même son (un tir d'archer par 70 ms suffit à l'oreille). */
  libre(cle, ecart) {
    const t = performance.now();
    if (t - (this.derniers[cle] || 0) < ecart) return false;
    this.derniers[cle] = t;
    return true;
  }

  jouer(nom) {
    if (!this.actif || !this.ac) return;
    switch (nom) {
      case 'erreur': this.ton('square', 180, 120, 0.12, 0.08); break;
      case 'clic': this.ton('square', 700, 700, 0.03, 0.04); break;
      default:
    }
  }

  evenements(liste) {
    if (!this.actif || !this.ac) return;
    for (const e of liste) {
      switch (e.type) {
        case 'tir':
          if (!this.libre('tir' + e.sorte, 70)) break;
          if (e.sorte === 'archers') this.ton('square', 900, 500, 0.05, 0.025);
          else if (e.sorte === 'canon' && e.variante !== 'b') { this.ton('sine', 140, 45, 0.25, 0.18); this.souffle(0.15, 0.08, 900); }
          else if (e.sorte === 'givre') this.ton('sine', 1300, 2000, 0.09, 0.04);
          else if (e.sorte === 'baliste') { this.ton('triangle', 220, 90, 0.18, 0.12); this.souffle(0.08, 0.06, 2500); }
          else if (e.sorte === 'canon' && e.variante === 'b') this.souffle(0.25, 0.05, 1800);
          else this.ton('triangle', 480, 960, 0.14, 0.06);
          break;
        case 'eclair': if (this.libre('eclair', 90)) { this.souffle(0.12, 0.09, 6000); this.ton('sawtooth', 1800, 300, 0.12, 0.04); } break;
        case 'explosion': if (this.libre('boum', 80)) this.souffle(0.3, 0.16, 600); break;
        case 'mort': if (this.libre('mort', 50)) this.ton('square', 320, 70, 0.12, 0.05); break;
        case 'blesse': if (e.armure && this.libre('tink', 120)) this.ton('triangle', 2400, 1800, 0.05, 0.025); break;
        case 'fuite': this.ton('sawtooth', 220, 90, 0.35, 0.09); break;
        case 'pose': this.ton('square', 300, 300, 0.06, 0.06); this.ton('square', 450, 450, 0.08, 0.06, 0.07); break;
        case 'amelioration': [523, 659, 784].forEach((f, i) => this.ton('square', f, f, 0.08, 0.05, i * 0.07)); break;
        case 'vente': this.ton('triangle', 700, 300, 0.2, 0.07); break;
        case 'vague': this.ton('sawtooth', 220, 220, 0.25, 0.06); this.ton('sawtooth', 330, 330, 0.35, 0.06, 0.25); break;
        case 'finVague': this.ton('triangle', 660, 990, 0.18, 0.06); break;
        case 'soin': if (e.soignes && this.libre('soin', 300)) this.ton('sine', 600, 900, 0.15, 0.03); break;
        case 'boss': [110, 98, 82].forEach((f, i) => this.ton('sawtooth', f, f, 0.5, 0.1, i * 0.45)); break;
        case 'rugissement': this.ton('sawtooth', 90, 45, 0.7, 0.14); this.souffle(0.6, 0.1, 400); break;
        case 'meteores': this.ton('sine', 900, 200, 0.8, 0.05); break;
        case 'impactMeteore': this.souffle(0.45, 0.2, 500); this.ton('sine', 90, 35, 0.4, 0.15); break;
        case 'renforts': [392, 523, 659].forEach((f, i) => this.ton('square', f, f, 0.12, 0.05, i * 0.1)); break;
        case 'ecrases': this.souffle(0.3, 0.12, 900); break;
        case 'victoire': [523, 659, 784, 1046].forEach((f, i) => this.ton('square', f, f, 0.18, 0.06, i * 0.16)); break;
        case 'defaite': [392, 330, 262, 196].forEach((f, i) => this.ton('triangle', f, f, 0.3, 0.08, i * 0.25)); break;
        default:
      }
    }
  }
}
