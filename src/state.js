import { DEFAULT_LOOK, FURS } from './cat/palettes.js';

const KEY = 'gato-portfolio:look';

// Preferencia por visitante: si el almacenamiento falla, se usa el look por defecto.
export function loadLook() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && FURS.some((f) => f.id === saved.fur)) return { ...DEFAULT_LOOK, ...saved };
  } catch { /* sin almacenamiento disponible */ }
  return { ...DEFAULT_LOOK };
}

export function saveLook(look) {
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* ignorar */ }
}
