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
  let toastTimer = 0, lastLabel = null, quoteTimer = 0;
  document.body.insertAdjacentHTML('beforeend', `
    <aside class="quote" role="status" aria-live="polite" hidden>
      <p class="eyebrow" data-q-n></p>
      <p class="q" data-q-text></p>
      <p class="q-end" data-q-end hidden>Encontraste todos los pescados. Gracias por conocer lo que me motiva.</p>
    </aside>`);
  const quoteEl = document.querySelector('.quote');

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
    /** Frase de un pescado dorado: tarjeta grande en el centro durante unos segundos. */
    quote(text, n, total) {
      fishEl.querySelector('[data-n]').textContent = n;
      fishEl.querySelector('[data-t]').textContent = total;
      fishEl.classList.remove('bump'); void fishEl.offsetWidth; fishEl.classList.add('bump');
      quoteEl.querySelector('[data-q-n]').textContent = `Pescado dorado ${n} de ${total}`;
      quoteEl.querySelector('[data-q-text]').textContent = text;
      quoteEl.querySelector('[data-q-end]').hidden = n !== total;
      quoteEl.hidden = false;
      quoteEl.classList.remove('in'); void quoteEl.offsetWidth; quoteEl.classList.add('in');
      clearTimeout(quoteTimer);
      quoteTimer = setTimeout(() => { quoteEl.hidden = true; }, n === total ? 7000 : 5200);
      if (n === total) this.confetti();
    },
    /** Lluvia de confeti hecha con elementos DOM (se borra sola). */
    confetti() {
      const colors = ['#ff6fb5', '#ffafcc', '#ffd23f', '#6fd3ff', '#b79cff', '#fff3e4'];
      const box = document.createElement('div');
      box.className = 'confetti';
      box.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 90; i++) {
        const p = document.createElement('i');
        p.style.left = `${Math.random() * 100}%`;
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = `${Math.random() * 0.6}s`;
        p.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
        p.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
        box.appendChild(p);
      }
      document.body.appendChild(box);
      setTimeout(() => box.remove(), 3800);
    },
  };
}
