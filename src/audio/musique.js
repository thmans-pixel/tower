// Musique synthétisée (spec 014, partie 2) : un séquenceur Web Audio qui programme les notes un peu à l'avance.
// Airs : Prairie (air original, esprit arcade), Désert (air original, mode oriental), Montagne (« Korobeiniki »,
// air populaire russe du XIXe siècle, dans le domaine public), boss (ostinato original), menu (Prairie au calme).
// Intensité : 0 entre les vagues (mélodie et basse douce), 1 pendant une vague (batterie, basse pleine),
// 2 aux dernières vagues (tempo un peu plus vif).

const NOTES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** « A4 » → 440 Hz ; « - » = silence. */
export function frequence(n) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTES[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

/** « E5:2 B4 C5 » → [[note, croches]] (durée 1 croche par défaut). */
const lire = (txt) => txt.trim().split(/\s+/).map((t) => { const [n, d] = t.split(':'); return [n, Number(d || 1)]; });

export const AIRS = {
  prairie: {
    tempo: 138, onde: 'square', basseOnde: 'triangle', batterie: 'arcade',
    melodie: lire(`G4 C5 E5 G5 E5 C5 D5 E5   D5:2 B4 G4 B4:2 D5:2   C5 E5 A5 G5 E5:2 C5:2   F5:2 E5 D5 C5:2 A4:2
                   G4 C5 E5 G5 C6:2 B5 A5    G5:2 D5:2 B4:2 G4:2    A4 C5 F5 A5 G5 F5 E5 D5   C5:4 G4:2 C5:2
                   E5 E5 G5 E5 C5:2 E5:2     D5 D5 F5 D5 B4:2 G4:2  C5 E5 G5 A5 G5:2 E5:2     F5 E5 D5 C5 D5:4
                   E5 E5 G5 E5 C6:2 B5:2     A5 G5 F5 E5 D5:2 G4:2  A4 B4 C5 D5 E5 F5 G5 B4   C5:6 -:2`),
    accords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'C', 'G', 'C', 'F', 'C', 'Am', 'F', 'C'],
  },
  desert: {
    tempo: 104, onde: 'triangle', basseOnde: 'sine', batterie: 'doum',
    melodie: lire(`D5:2 Eb5 F#5 G5:2 F#5 Eb5   D5:4 A4:2 C5 Bb4   A4:2 Bb4 C5 D5:2 Eb5 D5   C5:2 Bb4 A4 D5:4
                   G5:2 F#5 Eb5 F#5:2 Eb5 D5   Eb5:2 D5 C5 D5:4   C5 Bb4 A4 Bb4 C5:2 Bb4 A4   D5:6 -:2`),
    accords: ['D', 'D', 'Gm', 'D', 'Gm', 'Cm', 'D', 'D'],
  },
  montagne: {   // Korobeiniki (domaine public), arrangement original
    tempo: 140, onde: 'square', basseOnde: 'triangle', batterie: 'arcade',
    melodie: lire(`E5:2 B4 C5 D5:2 C5 B4   A4:2 A4 C5 E5:2 D5 C5   B4:3 C5 D5:2 E5:2   C5:2 A4:2 A4:2 -:2
                   -:1 D5:2 F5 A5:2 G5 F5   E5:3 C5 E5:2 D5 C5     B4:2 B4 C5 D5:2 E5:2   C5:2 A4:2 A4:2 -:2`),
    accords: ['E', 'Am', 'E', 'Am', 'Dm', 'C', 'E', 'Am'],
  },
  // Boss : thème original dans un style d'épopée médiévale sombre (demande : « dans le style de Game of Thrones »,
  // dont le thème est protégé et n'est pas repris) : ut mineur à trois temps, violoncelle en ostinato, cordes
  // graves, tambours de guerre.
  boss: {
    tempo: 168, mesure: 6, onde: 'sawtooth', coupure: 1600, attaque: 0.05, basseOnde: 'sawtooth', batterie: 'guerre',
    ostinato: [1, 2, 1.498, 1, 2, 1.498], octaveBasse: 1 / 2,
    melodie: lire(`C5:3 D5 Eb5:2   G4:4 Ab4 Bb4   C5:2 Bb4 Ab4 G4:2   F4:6
                   Eb5:3 F5 G5:2   Ab5:4 G5 F5    Eb5:2 D5 C5 D5:2    C5:6
                   G5:3 F5 Eb5:2   D5:4 Eb5 F5    Eb5:2 D5 C5 Bb4:2   C5:6
                   Ab5:3 G5 F5:2   G5:4 F5 Eb5    D5:2 C5 B4 D5:2     C5:6`),
    accords: ['Cm', 'Eb', 'Ab', 'Fm', 'Cm', 'Ab', 'G', 'Cm', 'Cm', 'G', 'Ab', 'Cm', 'Fm', 'Cm', 'G', 'Cm'],
  },
};
AIRS.menu = { ...AIRS.prairie, tempo: 112 };

const FONDAMENTALE = (accord) => frequence(accord.replace('m', '').replace(/^([A-G][#b]?)$/, '$12'));
const TIERCE = (accord) => (accord.endsWith('m') ? 3 : 4);

export class Musique {
  constructor(son) {
    this.son = son;
    this.air = null;
    this.intensite = 0;
    this.minuterie = null;
  }

  /** Lance un air (nom de AIRS), ou rien si c'est déjà lui. `null` arrête. */
  jouer(nom) {
    if (nom === this.nom) return;
    this.nom = nom;
    this.air = nom ? AIRS[nom] : null;
    this.pas = 0; this.note = 0; this.resteNote = 0;
    if (!this.air) { clearInterval(this.minuterie); this.minuterie = null; return; }
    const ac = this.son.ac;
    if (!ac) return;
    this.temps = ac.currentTime + 0.1;
    if (!this.minuterie) this.minuterie = setInterval(() => this.programmer(), 25);
  }

  /** Programme les croches des 0,2 s à venir. */
  programmer() {
    const ac = this.son.ac;
    if (!ac || !this.air || !this.son.musique) return;
    if (ac.state !== 'running') { this.temps = ac.currentTime + 0.1; return; }
    if (this.temps < ac.currentTime - 0.3) this.temps = ac.currentTime + 0.05;   // rattrapage après une pause
    const a = this.air;
    const croche = 60 / (a.tempo * (this.intensite >= 2 ? 1.08 : 1)) / 2;
    while (this.temps < ac.currentTime + 0.2) {
      this.croche(a, this.temps, croche);
      this.temps += croche;
      this.pas++;
    }
  }

  croche(a, t, croche) {
    const fort = this.intensite >= 1;
    const parMesure = a.mesure || 8;
    const mesure = Math.floor(this.pas / parMesure) % a.accords.length, temps = this.pas % parMesure;
    const accord = a.accords[mesure];
    // Mélodie : une note commence quand la précédente est finie.
    if (this.resteNote <= 0) {
      const [n, d] = a.melodie[this.note % a.melodie.length];
      this.note++;
      this.resteNote = d;
      const f = frequence(n);
      if (f) this.voix(a.onde, f, t, d * croche * 0.9, fort ? 0.07 : 0.05, a.coupure || 2400, a.attaque);
      if (f && a.mesure === 6) this.voix(a.onde, f / 2, t, d * croche * 0.9, 0.035, 900, a.attaque);   // cordes doublées à l'octave grave
    }
    this.resteNote--;
    // Basse : fondamentale (et quinte) sur les temps, ou ostinato pour le boss.
    const fb = FONDAMENTALE(accord) / 4;
    if (a.ostinato) {   // violoncelle qui martèle son motif, notes détachées
      this.voix(a.basseOnde, fb * (a.octaveBasse || 1) * 2 * a.ostinato[temps], t, croche * 0.7, temps === 0 ? 0.1 : 0.075, 1100, 0.01);
    } else if (fort ? temps % 2 === 0 : temps % 4 === 0) {
      const f = temps === 4 || temps === 6 ? fb * 1.498 : fb;
      this.voix(a.basseOnde, f, t, croche * (fort ? 1.6 : 3.5), fort ? 0.11 : 0.07, 900);
    }
    // Accord tenu très doux, en début de mesure.
    if (temps === 0) {
      const f0 = FONDAMENTALE(accord) / 2;
      for (const m of [1, 2 ** (TIERCE(accord) / 12), 1.498]) this.voix('triangle', f0 * m, t, croche * (parMesure - 0.5), 0.016, 1500, 0.08);
    }
    if (fort) this.batterie(a.batterie, temps, t);
  }

  voix(onde, f, t, duree, vol, coupure, attaque = 0.008) {
    const ac = this.son.ac;
    const o = ac.createOscillator(), filtre = ac.createBiquadFilter(), g = ac.createGain();
    o.type = onde; o.frequency.value = f;
    filtre.type = 'lowpass'; filtre.frequency.value = coupure;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attaque);
    g.gain.setValueAtTime(vol, t + Math.max(attaque, duree * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(filtre); filtre.connect(g); g.connect(this.son.musique);
    o.start(t); o.stop(t + duree + 0.05);
  }

  coup(t, f0, f1, duree, vol) {   // grosse caisse ou tambour
    const ac = this.son.ac, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + duree);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(this.son.musique); o.start(t); o.stop(t + duree + 0.02);
  }

  frappe(t, coupure, duree, vol, type = 'highpass') {   // charleston, caisse claire, darbouka
    const ac = this.son.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.son.bruit; f.type = type; f.frequency.value = coupure;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    s.connect(f); f.connect(g); g.connect(this.son.musique); s.start(t, Math.random() * 0.5); s.stop(t + duree + 0.02);
  }

  batterie(style, temps, t) {
    if (style === 'guerre') {   // tambours de guerre : grosse frappe sur le 1, deux coups sur le 3, roulement en fin de mesure
      if (temps === 0) { this.coup(t, 95, 40, 0.5, 0.32); this.frappe(t, 600, 0.3, 0.06, 'lowpass'); }
      if (temps === 4 || temps === 5) this.coup(t, 130, 60, 0.22, 0.18);
      if (temps === 3) this.frappe(t, 2200, 0.1, 0.05, 'bandpass');
      return;
    }
    if (style === 'doum') {   // doum-tek du désert
      if (temps === 0 || temps === 3) this.coup(t, 110, 55, 0.25, 0.22);
      if (temps === 2 || temps === 6) this.frappe(t, 2500, 0.08, 0.05, 'bandpass');
      if (temps === 5 || temps === 7) this.frappe(t, 3500, 0.05, 0.03, 'bandpass');
      return;
    }
    if (temps % 4 === 0) this.coup(t, style === 'lourde' ? 120 : 150, 45, 0.18, style === 'lourde' ? 0.3 : 0.22);
    if (temps === 4) this.frappe(t, 1800, 0.12, 0.07);
    this.frappe(t, 7000, 0.03, temps % 2 ? 0.015 : 0.025);
    if (style === 'lourde' && temps === 6) this.coup(t, 120, 45, 0.18, 0.25);
  }
}
