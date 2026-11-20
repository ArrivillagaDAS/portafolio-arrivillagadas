// Créditos de los modelos 3D. Los de licencia CC BY 3.0 exigen atribución visible en el sitio.
const CREDITS = [
  { what: 'Gato', author: 'Quaternius', license: 'CC0', url: 'https://poly.pizza/m/qKICY6xla2' },
  { what: 'Muebles y objetos (Furniture Kit)', author: 'Kenney', license: 'CC0', url: 'https://kenney.nl/assets/furniture-kit' },
  { what: 'Repisas (Furniture Bits)', author: 'Kay Lousberg', license: 'CC0', url: 'https://kaylousberg.itch.io/furniture-bits' },
  { what: 'Taza', author: 'MilkAndBanana', license: 'CC0', url: 'https://poly.pizza/m/54cOZNS04L' },
  { what: 'Torre de PC "Gaming Computer"', author: 'Alex Safayan', license: 'CC BY 3.0', url: 'https://poly.pizza/m/5cN7W4ufoII' },
  { what: 'Mando "Low Poly Controller"', author: 'Ginsta', license: 'CC BY 3.0', url: 'https://poly.pizza/m/fCyA3Ug79X' },
  { what: 'Audífonos "Headphones"', author: 'Ginsta', license: 'CC BY 3.0', url: 'https://poly.pizza/m/VLB0kuGDoP' },
];
const LICENSES = {
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
};

/** Ventana de créditos; se abre desde la personalización y desde el HUD. */
export function createCredits({ onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.hidden = true;
  el.innerHTML = `
    <section class="jukebox credits" role="dialog" aria-modal="true" aria-labelledby="cr-title">
      <p class="eyebrow">Créditos</p>
      <h2 id="cr-title">Modelos 3D</h2>
      <ul class="credit-list">
        ${CREDITS.map((c) => `
          <li>
            <a href="${c.url}" target="_blank" rel="noopener">${c.what}</a>
            <span>por ${c.author} · <a href="${LICENSES[c.license]}" target="_blank" rel="noopener">${c.license}</a></span>
          </li>`).join('')}
      </ul>
      <p class="hint">Música, rascador, arcade, pecera, rockola y jardín: hechos con código (Three.js, Rapier y Web Audio).</p>
      <div class="actions"><button type="button" class="primary" data-close>Cerrar</button></div>
    </section>`;
  document.body.appendChild(el);
  const close = () => { el.hidden = true; onClose?.(); };
  el.querySelector('[data-close]').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  return {
    get open() { return !el.hidden; },
    show() { el.hidden = false; el.querySelector('[data-close]').focus(); },
    close,
  };
}
