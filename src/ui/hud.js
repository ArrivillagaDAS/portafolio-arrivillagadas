/** HUD del mundo: avisos de acción, notificaciones, contador de pescados y efecto túnel. */
export function createHud(host) {
  host.insertAdjacentHTML('beforeend', `
    <div class="prompt" hidden><kbd class="kb">E</kbd><span class="tap"><svg class="paw" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="10" r="2.2"/></g></svg></span> <span data-label></span></div>
    <div class="toast" role="status" aria-live="polite"></div>
    <div class="fish" hidden>Pescados <b data-n>0</b>/<span data-t>0</span></div>
  `);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="tunnel" aria-hidden="true"><div class="hole"></div><p></p></div>
    <div class="sand" aria-hidden="true"></div>
  `);
  const promptEl = host.querySelector('.prompt');
  const labelEl = host.querySelector('[data-label]');
  const toastEl = host.querySelector('.toast');
  const fishEl = host.querySelector('.fish');
  const tunnelEl = document.querySelector('.tunnel');
  const sandEl = document.querySelector('.sand');
  let toastTimer = 0, lastLabel = null;

  return {
    prompt(label) {
      if (label === lastLabel) return;
      lastLabel = label;
      promptEl.hidden = !label;
      if (label) labelEl.textContent = label;
    },
    toast(text, ms = 2200) {
      toastEl.textContent = text;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
    },
    setFish(maze) {
      fishEl.hidden = !maze;
      if (maze) { fishEl.querySelector('[data-n]').textContent = maze.collected; fishEl.querySelector('[data-t]').textContent = maze.total; }
    },
    fishCollected(n, total) {
      fishEl.querySelector('[data-n]').textContent = n;
      fishEl.classList.remove('bump'); void fishEl.offsetWidth; fishEl.classList.add('bump');
      this.toast(n === total ? '¡Todos los pescados! Busca el arenero de salida' : `¡Pescado dorado! ${n}/${total}`, 2000);
    },
    tunnel(text) {
      tunnelEl.querySelector('p').textContent = text;
      tunnelEl.classList.remove('run'); void tunnelEl.offsetWidth; tunnelEl.classList.add('run');
    },
    sand(on) { sandEl.classList.toggle('on', on); },
  };
}
