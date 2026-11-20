import { isCrownUnlocked } from '../state.js';
import { FURS } from '../cat/palettes.js';

/**
 * Pantalla inicial: el visitante elige pelaje y accesorios antes de entrar.
 * @param {HTMLElement} host
 * @param {{ look: object, onChange: (look) => void, onEnter: (look) => void }} opts
 */
export function createCustomizer(host, { look, onChange, onEnter, onCredits }) {
  const state = { ...look };

  host.innerHTML = `
    <section class="custom" aria-labelledby="custom-title">
      <p class="eyebrow">Portafolio interactivo</p>
      <h1 id="custom-title">Elige tu gato</h1>
      <p class="lead">Vas a explorar el bosque con él. Personalízalo a tu gusto.</p>

      <fieldset class="group">
        <legend>Pelaje <span class="value" data-fur-name></span></legend>
        <div class="swatches" role="radiogroup" aria-label="Color de pelaje">
          ${FURS.map((f) => `
            <button type="button" class="swatch" role="radio" data-fur="${f.id}"
              aria-label="${f.name}" title="${f.name}"
              style="--c1:${f.main};--c2:${f.dark}"></button>`).join('')}
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>Accesorios</legend>
        <label class="toggle">
          <input type="checkbox" data-acc="headset">
          <span class="track"><span class="thumb"></span></span>
          <span class="tlabel">Audífonos RGB</span>
        </label>
        <label class="toggle">
          <input type="checkbox" data-acc="collar">
          <span class="track"><span class="thumb"></span></span>
          <span class="tlabel">Collar LED</span>
        </label>
        <label class="toggle" data-crown-row>
          <input type="checkbox" data-acc="crown">
          <span class="track"><span class="thumb"></span></span>
          <span class="tlabel">Corona dorada <small data-crown-hint>(se gana en la cima de la casa del árbol)</small></span>
        </label>
      </fieldset>

      <div class="actions">
        <button type="button" class="ghost" data-random>Aleatorio</button>
        <button type="button" class="primary" data-enter>Entrar al bosque →</button>
      </div>
      <p class="hint">Arrastra para girar al gato · tócalo para saludar</p>
      <p class="hint"><button type="button" class="linklike" data-credits>Créditos</button></p>
    </section>`;

  const furName = host.querySelector('[data-fur-name]');
  const swatches = [...host.querySelectorAll('[data-fur]')];
  const toggles = [...host.querySelectorAll('[data-acc]')];

  function render() {
    swatches.forEach((b) => {
      const on = b.dataset.fur === state.fur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    furName.textContent = FURS.find((f) => f.id === state.fur)?.name ?? '';
    toggles.forEach((t) => { t.checked = !!state[t.dataset.acc]; });
    // la corona está bloqueada hasta llegar a la cima de la casa del árbol
    const unlocked = isCrownUnlocked();
    const crownInput = host.querySelector('[data-acc="crown"]');
    crownInput.disabled = !unlocked;
    host.querySelector('[data-crown-row]').classList.toggle('locked', !unlocked);
    host.querySelector('[data-crown-hint]').hidden = unlocked;
  }

  function set(patch) {
    Object.assign(state, patch);
    render();
    onChange({ ...state });
  }

  swatches.forEach((b) => b.addEventListener('click', () => set({ fur: b.dataset.fur })));
  // flechas para moverse entre colores (patrón radiogroup)
  host.querySelector('.swatches').addEventListener('keydown', (e) => {
    const i = FURS.findIndex((f) => f.id === state.fur);
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const next = FURS[(i + d + FURS.length) % FURS.length];
    set({ fur: next.id });
    host.querySelector(`[data-fur="${next.id}"]`).focus();
  });
  toggles.forEach((t) => t.addEventListener('change', () => set({ [t.dataset.acc]: t.checked })));

  host.querySelector('[data-random]').addEventListener('click', () => {
    const others = FURS.filter((f) => f.id !== state.fur);
    set({
      fur: others[Math.floor(Math.random() * others.length)].id,
      headset: Math.random() > 0.3,
      collar: Math.random() > 0.3,
    });
  });
  host.querySelector('[data-enter]').addEventListener('click', () => onEnter({ ...state }));
  host.querySelector('[data-credits]').addEventListener('click', () => onCredits?.());

  render();
  return {
    /** Sincroniza el panel con un look cambiado desde fuera (p. ej. al ganar la corona). */
    sync(next) { Object.assign(state, next); render(); },
    show() { render(); host.hidden = false; requestAnimationFrame(() => host.classList.remove('out')); },
    hide() { host.classList.add('out'); setTimeout(() => { host.hidden = true; }, 450); },
  };
}
