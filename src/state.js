import { DEFAULT_LOOK, FURS } from './cat/palettes.js';

const KEY = 'portafolio-arrivillagadas:look';
const CROWN_KEY = 'portafolio-arrivillagadas:crown';

// Preferencia por visitante: si el almacenamiento falla, se usa el look por defecto.
export function loadLook() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && FURS.some((f) => f.id === saved.fur)) {
      const look = { ...DEFAULT_LOOK, ...saved };
      if (!isCrownUnlocked()) look.crown = false;
      return look;
    }
  } catch { /* sin almacenamiento disponible */ }
  return { ...DEFAULT_LOOK };
}

export function saveLook(look) {
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* ignorar */ }
}

/** La corona se gana en la cima de la casa del árbol y queda desbloqueada para siempre. */
export function isCrownUnlocked() {
  try { return localStorage.getItem(CROWN_KEY) === '1'; } catch { return false; }
}

export function unlockCrown() {
  try { localStorage.setItem(CROWN_KEY, '1'); } catch { /* ignorar */ }
}
