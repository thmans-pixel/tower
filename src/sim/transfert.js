// Transfert de la progression d'un appareil à l'autre par un code court (spec 010). Données pures : pas de
// réseau, pas de navigateur. Le code commence par « TDR1- », puis des groupes de 4 caractères pris dans un
// alphabet sans lettres ambiguës (pas de I, L, O, U) ; les deux derniers caractères repèrent les fautes de frappe.
import { ORDRE_CARTES, relire } from './progression.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIXE = 'TDR1';
const DIFFS = ['facile', 'normal', 'difficile'];

/** Somme de contrôle sur 10 bits (deux caractères). */
function controle(chars) {
  let h = 0x2a;
  for (const ch of chars) h = (h * 31 + ALPHABET.indexOf(ch) + 7) % 1021;
  return ALPHABET[h >> 5] + ALPHABET[h & 31];
}

/** Un entier positif en caractères de 5 bits : 4 bits de donnée, le 5e dit « la suite continue ». */
function ecrireNombre(n, sortie) {
  n = Math.max(0, Math.floor(n));
  do {
    const bloc = n & 15;
    n = Math.floor(n / 16);
    sortie.push(ALPHABET[bloc | (n > 0 ? 16 : 0)]);
  } while (n > 0);
}

function lireNombres(chars) {
  const l = [];
  let n = 0, poids = 1, enCours = false;
  for (const ch of chars) {
    const v = ALPHABET.indexOf(ch);
    n += (v & 15) * poids;
    if (v & 16) { poids *= 16; enCours = true; } else { l.push(n); n = 0; poids = 1; enCours = false; }
  }
  return enCours ? null : l;
}

/** Les nombres que porte le code, dans un ordre fixe. */
function nombres(p) {
  const drapeaux = (p.debloquees.includes('desert') ? 1 : 0) | (p.debloquees.includes('montagne') ? 2 : 0) | (p.infiniOuvert ? 4 : 0);
  let etoiles = 0;
  ORDRE_CARTES.forEach((c, i) => DIFFS.forEach((d, j) => { etoiles += ((p.etoiles[c] || {})[d] || 0) * 4 ** (i * 3 + j); }));
  return [drapeaux, etoiles, ...ORDRE_CARTES.map((c) => p.infini[c] || 0), ...DIFFS.map((d) => p.aleatoires[d] || 0)];
}

/** Code d'une progression, par exemple « TDR1-K7Q2-3M0A-… ». */
export function codeProgression(p) {
  const corps = [];
  for (const n of nombres(p)) ecrireNombre(n, corps);
  corps.push(...controle(corps));
  const groupes = [];
  for (let i = 0; i < corps.length; i += 4) groupes.push(corps.slice(i, i + 4).join(''));
  return [PREFIXE, ...groupes].join('-');
}

/**
 * Relit un code collé : espaces, tirets et minuscules tolérés, O lu comme 0, I et L comme 1.
 * Renvoie { ok: true, progression } ou { ok: false } si le code est illisible.
 */
export function lireCode(texte) {
  if (typeof texte !== 'string') return { ok: false };
  let t = texte.toUpperCase().replace(/[\s-]/g, '');
  if (!t.startsWith(PREFIXE)) return { ok: false };
  t = t.slice(PREFIXE.length).replace(/O/g, '0').replace(/[IL]/g, '1');
  if (t.length < 3 || [...t].some((ch) => !ALPHABET.includes(ch))) return { ok: false };
  const corps = [...t.slice(0, -2)];
  if (controle(corps) !== t.slice(-2)) return { ok: false };
  const l = lireNombres(corps);
  if (!l || l.length !== 2 + ORDRE_CARTES.length + DIFFS.length) return { ok: false };
  const [drapeaux, etoiles] = l;
  const brut = { debloquees: ['prairie'], etoiles: {}, infini: {}, aleatoires: {}, infiniOuvert: (drapeaux & 4) !== 0 };
  if (drapeaux & 1) brut.debloquees.push('desert');
  if (drapeaux & 2) brut.debloquees.push('montagne');
  ORDRE_CARTES.forEach((c, i) => DIFFS.forEach((d, j) => {
    const n = Math.floor(etoiles / 4 ** (i * 3 + j)) % 4;
    if (n) (brut.etoiles[c] ||= {})[d] = n;
  }));
  ORDRE_CARTES.forEach((c, i) => { if (l[2 + i]) brut.infini[c] = l[2 + i]; });
  DIFFS.forEach((d, i) => { if (l[2 + ORDRE_CARTES.length + i]) brut.aleatoires[d] = l[2 + ORDRE_CARTES.length + i]; });
  return { ok: true, progression: relire(brut) };
}

/** Garde le meilleur des deux progressions ; les réglages (difficulté, son) restent ceux de `p`. */
export function fusionner(p, q) {
  const r = structuredClone(p);
  r.debloquees = ORDRE_CARTES.filter((c) => p.debloquees.includes(c) || q.debloquees.includes(c));
  for (const c of ORDRE_CARTES) for (const d of DIFFS) {
    const n = Math.max((p.etoiles[c] || {})[d] || 0, (q.etoiles[c] || {})[d] || 0);
    if (n) (r.etoiles[c] ||= {})[d] = n;
  }
  for (const c of ORDRE_CARTES) { const n = Math.max(p.infini[c] || 0, q.infini[c] || 0); if (n) r.infini[c] = n; }
  for (const d of DIFFS) { const n = Math.max(p.aleatoires[d] || 0, q.aleatoires[d] || 0); if (n) r.aleatoires[d] = n; }
  r.infiniOuvert = p.infiniOuvert || q.infiniOuvert;
  return r;
}
