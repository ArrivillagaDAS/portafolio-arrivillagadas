import { PROJECTS, ABOUT, SKILLS, CONTACT, SITE } from '../content.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Contenido de cada zona como HTML. */
function render(zone, data) {
  switch (zone) {
    case 'projects': {
      const p = PROJECTS[data.index];
      return `
        <p class="eyebrow">Proyecto ${data.index + 1} de ${PROJECTS.length}</p>
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.desc)}</p>
        <ul class="chips">${p.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${p.url ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Ver proyecto</a>` : ''}`;
    }
    case 'about':
      return `<p class="eyebrow">Cabaña</p><h2>${esc(ABOUT.title)}</h2><p>${esc(ABOUT.text)}</p>
        <p class="soon">Pronto: entra a la cabaña para ver mi cuarto gamer.</p>`;
    case 'skills':
      return `<p class="eyebrow">Árbol de habilidades</p><h2>Habilidades</h2>
        <ul class="chips">${SKILLS.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
    case 'contact':
      return `<p class="eyebrow">Buzón</p><h2>Contacto</h2><p>${esc(CONTACT.text)}</p>
        <div class="links">${CONTACT.links.map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>`;
    case 'maze':
      return `<p class="eyebrow">Laberinto de setos</p><h2>Jardín secreto</h2><p>Pronto: un laberinto con pescados dorados escondidos.</p>`;
    case 'lake':
      return `<p class="eyebrow">Lago</p><h2>Lago tranquilo</h2><p>Los gatos y el agua no se llevan bien. Mejor mirar desde la orilla.</p>`;
    case 'play':
      return `<p class="eyebrow">Zona de juegos</p><h2>A jugar</h2><p>Tira las latas con un cabezazo (E) y rueda los estambres.</p>`;
    default:
      return `<h2>${esc(SITE.name)}</h2>`;
  }
}

/** Tarjeta de información que aparece al entrar a una zona (y se va al salir). */
export function createZonePanel() {
  const el = document.createElement('aside');
  el.className = 'zone-card';
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;
  document.body.appendChild(el);
  let key = null;
  return {
    show(zone, data = {}) {
      const k = `${zone}:${data.index ?? ''}`;
      if (k === key) return;
      key = k;
      el.innerHTML = render(zone, data);
      el.hidden = false;
      el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    },
    hide() {
      if (!key) return;
      key = null;
      el.hidden = true;
    },
  };
}
