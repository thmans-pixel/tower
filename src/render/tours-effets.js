// Effets des tours (spec 012, lot B) : pose qui tombe et rebondit, amélioration, vente qui s'enfonce, lueur au
// tir. Fonctions de calcul pures (pas de dessin) : la vue s'en sert pour placer et étirer la tour.

const POSE = 0.42, CHUTE = 0.22, AMEL = 0.4, VENTE = 0.45;
export const DUREES = { pose: POSE, amel: AMEL, vente: VENTE, colonne: 0.75 };

/**
 * Décalage et étirement d'une tour animée à l'instant t de son animation :
 * { dy (vers le bas positif), sx, sy, impact (vrai à l'image où elle touche le sol) }.
 */
export function poseTour(anim, t, tPrec) {
  if (anim.genre === 'pose') {
    if (t < CHUTE) { const k = t / CHUTE; return { dy: -56 * (1 - k * k), sx: 0.92, sy: 1.1, impact: false }; }
    const k = Math.min(1, (t - CHUTE) / (POSE - CHUTE));
    const ressort = Math.sin(k * Math.PI) * (1 - k);
    return { dy: 0, sx: 1 + 0.18 * ressort, sy: 1 - 0.2 * ressort, impact: tPrec < CHUTE };
  }
  if (anim.genre === 'amel') {
    const k = Math.min(1, t / AMEL);
    const g = Math.sin(k * Math.PI);
    return { dy: -4 * g, sx: 1 + 0.12 * g, sy: 1 + 0.16 * g, impact: false };
  }
  if (anim.genre === 'vente') {
    const k = Math.min(1, t / VENTE);
    return { dy: 52 * k * k, sx: 1 - 0.1 * k, sy: 1, impact: false, tremble: (1 - k) * 2 };
  }
  return { dy: 0, sx: 1, sy: 1, impact: false };
}

/** Bout de l'arme d'une tour, d'où partent la lueur, la fumée et le jet de flammes. */
export function boutArme(t) {
  const a = t.angle || 0;
  const haut = t.sorte === 'canon' ? 14 : t.sorte === 'baliste' ? 6 : t.sorte === 'mage' ? 38 : t.sorte === 'tempete' ? 36 : 24;
  const long = t.sorte === 'canon' || t.sorte === 'baliste' ? 16 : 6;
  return { x: t.x + Math.cos(a) * long, y: t.y - haut + Math.sin(a) * long * 0.6 };
}
