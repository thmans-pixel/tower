// Spec 020 : mode Vivaldi, les morceaux s'enchaînent et le boss reste à part.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENCHAINEMENT, pisteSuivante, Musique } from '../src/audio/musique.js';

/** Faux élément audio : garde ce qu'on lui demande, `finir()` simule la fin du morceau. */
class FauxAudio {
  constructor() { this.paused = true; this.currentTime = 0; this.loop = false; this.ecoute = {}; }
  canPlayType() { return ''; }
  addEventListener(type, f) { this.ecoute[type] = f; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  finir() { this.paused = true; this.ecoute.ended(); }
}

function musiqueVivaldi() {
  globalThis.Audio = FauxAudio;
  const son = { ac: { createMediaElementSource: () => ({ connect() {} }) }, musique: {} };
  const m = new Musique(son);
  m.regler(true);
  return m;
}
const nomDe = (m) => m.piste && Object.keys(m.pistes).find((t) => m.pistes[t] === m.piste);

test('pisteSuivante : jamais le boss ni le morceau qui vient de finir, et les deux autres sortent', () => {
  for (const derniere of ENCHAINEMENT) {
    const vus = new Set();
    for (let i = 0; i < 100; i++) {
      const t = pisteSuivante(derniere, i / 100);
      assert.notEqual(t, 'boss');
      assert.notEqual(t, derniere);
      assert.ok(ENCHAINEMENT.includes(t));
      vus.add(t);
    }
    assert.equal(vus.size, 2);
  }
  assert.ok(!ENCHAINEMENT.includes('boss'));
  assert.ok(ENCHAINEMENT.includes(pisteSuivante('prairie', 1)));   // tirage à 1 : reste dans la liste
});

test('une partie commence par le morceau de la carte, puis un autre s\'enchaîne', () => {
  const m = musiqueVivaldi();
  const partie = {};
  m.jouer('desert', partie);
  assert.equal(nomDe(m), 'desert');
  assert.equal(m.piste.loop, false);
  m.piste.finir();
  assert.ok(['prairie', 'montagne'].includes(nomDe(m)));
  assert.equal(m.piste.paused, false);
  const vus = [nomDe(m)];
  for (let i = 0; i < 20; i++) { const avant = nomDe(m); m.piste.finir(); assert.notEqual(nomDe(m), avant); assert.notEqual(nomDe(m), 'boss'); vus.push(nomDe(m)); }
  assert.ok(vus.includes('prairie') && vus.includes('montagne') && vus.includes('desert'));
});

test('le boss joue en boucle, puis le morceau interrompu reprend là où il en était', () => {
  const m = musiqueVivaldi();
  const partie = {};
  m.jouer('prairie', partie);
  const morceau = m.piste;
  morceau.currentTime = 42;
  m.jouer('boss', partie);
  assert.equal(nomDe(m), 'boss');
  assert.equal(m.piste.loop, true);
  assert.equal(morceau.paused, true);
  m.jouer('prairie', partie);
  assert.equal(m.piste, morceau);
  assert.equal(morceau.currentTime, 42);
  assert.equal(morceau.paused, false);
  assert.equal(m.pistes.boss.paused, true);
});

test('un morceau déjà enchaîné reprend aussi après le boss', () => {
  const m = musiqueVivaldi();
  const partie = {};
  m.jouer('montagne', partie);
  m.piste.finir();
  const second = m.piste;
  second.currentTime = 7;
  m.jouer('boss', partie);
  m.jouer('montagne', partie);
  assert.equal(m.piste, second);
  assert.equal(second.currentTime, 7);
});

test('menu : l\'enchaînement joue aussi, et une nouvelle partie repart du morceau de la carte', () => {
  const m = musiqueVivaldi();
  m.jouer('menu', 'menu');
  assert.equal(nomDe(m), 'prairie');
  m.piste.finir();
  assert.ok(['desert', 'montagne'].includes(nomDe(m)));
  m.jouer('montagne', {});   // la partie commence
  assert.equal(nomDe(m), 'montagne');
  assert.equal(m.piste.currentTime, 0);
  assert.equal(Object.values(m.pistes).filter((e) => !e.paused).length, 1);
});

test('onglet caché ou fin de partie : le silence ne perd pas la place du morceau', () => {
  const m = musiqueVivaldi();
  const partie = {};
  m.jouer('desert', partie);
  const morceau = m.piste;
  morceau.currentTime = 30;
  m.jouer(null, partie);
  assert.equal(morceau.paused, true);
  assert.equal(m.enMarche(), false);
  m.jouer('desert', partie);
  assert.equal(m.piste, morceau);
  assert.equal(morceau.currentTime, 30);
});

test('une nouvelle partie sur la même carte repart du début de l\'enchaînement', () => {
  const m = musiqueVivaldi();
  m.jouer('desert', {});
  m.piste.finir();
  const premiere = m.piste;
  premiere.currentTime = 9;
  m.jouer('desert', {});   // autre partie, même carte
  assert.equal(nomDe(m), 'desert');
  assert.equal(m.piste.currentTime, 0);
  assert.equal(premiere.paused, true);
});

test('revenir au mode synthé coupe les enregistrements', () => {
  const m = musiqueVivaldi();
  m.jouer('prairie', {});
  const morceau = m.piste;
  m.regler(false);
  assert.equal(morceau.paused, true);
  assert.equal(m.piste, null);
  assert.equal(Object.values(m.pistes).filter((e) => !e.paused).length, 0);
});
