// Pouvoirs du joueur (spec 004, lot 3). Distances en pixels (une case = 40), durées en secondes.
export const POUVOIRS = {
  meteores: {
    nom: 'Météores', touche: 'm', recharge: 45, resume: '3 météores autour du point visé',
    nombre: 3, rayon: 60, zone: 40, degats: 120, chute: 0.8, ecart: 0.25,
  },
  renforts: {
    nom: 'Renforts', touche: 'r', recharge: 30, resume: '2 soldats bloquent le chemin',
    soldats: 2, pv: 150, dps: 10, duree: 8, coupEnnemi: 8,
  },
};

export const ORDRE_POUVOIRS = ['meteores', 'renforts'];
