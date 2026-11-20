import { TRACKS } from '../audio/Music.js';

/** Menú de la rockola: elegir pista, parar y volumen. */
export function createJukeboxMenu(music, { onClose }) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.hidden = true;
  el.innerHTML = `
    <section class="jukebox" role="dialog" aria-modal="true" aria-labelledby="jb-title">
      <header>
        <p class="eyebrow">Rockola</p>
        <h2 id="jb-title">¿Qué suena?</h2>
      </header>
      <ul class="tracks">
        ${TRACKS.map((t) => `
          <li><button type="button" data-track="${t.id}">
            <span class="tt"><b>${t.name}</b><small>${t.desc} · ${t.bpm} bpm</small></span>
            <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
          </button></li>`).join('')}
      </ul>
      <label class="vol">Volumen <input type="range" min="0" max="1" step="0.01" value="${music.volume}" aria-label="Volumen"></label>
      <div class="actions">
        <button type="button" class="ghost" data-stop>Silencio</button>
        <button type="button" class="primary" data-close>Listo</button>
      </div>
      <p class="hint">Música generada en vivo en tu navegador</p>
    </section>`;
  document.body.appendChild(el);

  const render = () => el.querySelectorAll('[data-track]').forEach((b) => {
    const on = music.track?.id === b.dataset.track;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  el.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', () => { music.play(b.dataset.track); render(); }));
  el.querySelector('[data-stop]').addEventListener('click', () => { music.stop(); render(); });
  el.querySelector('input').addEventListener('input', (e) => music.setVolume(+e.target.value));
  const close = () => { el.hidden = true; onClose?.(); };
  el.querySelector('[data-close]').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });

  return {
    get open() { return !el.hidden; },
    show() { render(); el.hidden = false; el.querySelector('.on, [data-track]').focus(); },
    close,
  };
}
