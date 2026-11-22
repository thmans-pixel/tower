import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOURS, ORDRE_TOURS } from '../src/data/tours.js';
import { POUVOIRS } from '../src/data/pouvoirs.js';
import { comparer, ficheTour, fichePouvoir, encadreNiveau2, ficheSpecialisation, statsNiveau } from '../src/ui/fiches.js';

test('chaque niveau et chaque spécialisation a une description', () => {
  for (const s of ORDRE_TOURS) {
    const d = TOURS[s];
    for (const n of [...d.niveaux, d.specialisations.a, d.specialisations.b]) assert.ok(n.description?.length > 20, s);
  }
  for (const p of Object.values(POUVOIRS)) assert.ok(p.description?.length > 20);
});

test('fiche de la boutique : prix, pastilles, améliorations, or manquant', () => {
  const f = ficheTour('canon', 'é 2', 50);
  assert.match(f, /Canon/);
  assert.match(f, /Il manque 60 or/);
  assert.match(f, /pas les volants/);
  assert.match(f, /Mortier/);
  assert.doesNotMatch(ficheTour('canon', 'é 2', 500), /Il manque/);
  assert.match(ficheTour('mage', "' 4"), /voit les invisibles/);
  assert.match(fichePouvoir('meteores', 'è 7 ou M'), /Recharge/);
});

test('comparaisons : mieux, moins bien, effet nouveau', () => {
  const n2 = comparer(statsNiveau('canon', 0), statsNiveau('canon', 1));
  assert.ok(n2.some((l) => l.libelle === 'Dégâts' && l.sens === 'mieux'));
  const mortier = comparer(statsNiveau('canon', 1), statsNiveau('canon', 'a'));
  assert.ok(mortier.some((l) => l.libelle === 'Tirs par s' && l.sens === 'moins'));
  assert.ok(mortier.some((l) => l.libelle.startsWith('Angle mort') && l.sens === 'moins'));
  const flammes = comparer(statsNiveau('canon', 1), statsNiveau('canon', 'b'));
  assert.ok(flammes.some((l) => l.libelle === 'Brûlure' && l.sens === 'nouveau'));
  const blizzard = comparer(statsNiveau('givre', 1), statsNiveau('givre', 'a'));
  assert.ok(blizzard.some((l) => l.apres === 'en continu'));
  for (const s of ORDRE_TOURS) {
    assert.match(encadreNiveau2(s), /Au niveau 2/);
    for (const v of ['a', 'b']) assert.match(ficheSpecialisation(s, v, 100), new RegExp(TOURS[s].specialisations[v].nom.replace("'", '.')));
  }
});
