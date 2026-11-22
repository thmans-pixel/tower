// Pouvoirs du joueur (spec 004, lot 3). Distances en pixels (une case = 40), durées en secondes.
export const POUVOIRS = {
  meteores: {
    nom: 'Météores', touche: 'm', recharge: 45, resume: '3 météores autour du point visé',
    description: 'Trois météores tombent autour du point visé et frappent tout ce qui se trouve dessous, volants compris.',
    nombre: 3, rayon: 60, zone: 40, degats: 120, chute: 0.8, ecart: 0.25,
  },
  renforts: {
    nom: 'Renforts', touche: 'r', recharge: 30, resume: '2 soldats bloquent le chemin',
    description: 'Deux soldats arrivent sur une case du chemin, arrêtent les ennemis et les combattent. Le boss les écrase.',
    soldats: 2, pv: 150, dps: 10, duree: 8, coupEnnemi: 8,
  },
};

export const ORDRE_POUVOIRS = ['meteores', 'renforts'];
