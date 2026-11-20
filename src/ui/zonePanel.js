import { PROJECTS, ABOUT, SKILLS, CONTACT, SITE, PROFILE, PROCESS } from '../content.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = (label, url, ghost = false) => (url ? `<a class="btn${ghost ? ' ghost' : ''}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '');

/** Contenido de cada zona como HTML. */
function render(zone, data) {
  switch (zone) {
    case 'projects': {
      const p = PROJECTS[data.index];
      return `
        <p class="eyebrow">Proyecto ${data.index + 1} de ${PROJECTS.length}</p>
        <h2>${esc(p.title)}</h2>
        ${p.type ? `<p class="sub">${esc(p.type)}</p>` : ''}
        <p>${esc(p.desc)}</p>
        ${p.role ? `<p class="role"><b>Mi rol:</b> ${esc(p.role)}</p>` : ''}
        <ul class="chips">${p.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="links">${link('Ver demo', p.demo)}${link('Código', p.url, !!p.demo)}</div>`;
    }
    case 'about':
      return `<p class="eyebrow">Cabaña</p><h2>${esc(ABOUT.title)}</h2>
        ${ABOUT.text.map((t) => `<p>${esc(t)}</p>`).join('')}
        <dl class="profile">${PROFILE.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    case 'skills':
      return `<p class="eyebrow">Árbol de habilidades</p><h2>Skills</h2>
        ${SKILLS.map((g) => `<h3>${esc(g.group)}</h3><ul class="chips">${g.items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`).join('')}
        <h3>Cómo trabajo</h3><p class="process">${PROCESS.map(esc).join(' · ')}</p>
        <p class="soon">Trepa el parkour hasta la casa del árbol: arriba hay un premio.</p>`;
    case 'contact':
      return `<p class="eyebrow">Buzón</p><h2>Contacto</h2><p>${esc(CONTACT.text)}</p>
        <div class="links">${CONTACT.links.map((l) => link(l.label, l.url, true)).join('')}</div>`;
    case 'maze':
      return `<p class="eyebrow">Laberinto de setos</p><h2>Jardín secreto</h2>
        <p>Adentro hay pescados dorados. Cada uno guarda una de las cosas que me motivan a seguir.</p>`;
    case 'lake':
      return `<p class="eyebrow">Lago</p><h2>Lago tranquilo</h2><p>Puedes entrar... pero a los gatos no les gusta mojarse.</p>`;
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
