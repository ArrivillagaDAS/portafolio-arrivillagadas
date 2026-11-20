// Música generada en vivo con Web Audio (sin archivos ni derechos de autor).
// Cada pista es un pequeño secuenciador de semicorcheas con sintetizadores y batería.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

export const TRACKS = [
  { id: 'lofi', name: 'Lo-fi Miau', desc: 'beats tranquilos para programar', bpm: 78 },
  { id: 'chip', name: 'Croqueta 8-bit', desc: 'chiptune de arcade', bpm: 140 },
  { id: 'synth', name: 'Neón Nocturno', desc: 'synthwave de medianoche', bpm: 100 },
  { id: 'bossa', name: 'Siesta al Sol', desc: 'bossa suave para dormir', bpm: 120 },
];

export class Music {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.step = 0;
    this.volume = 0.55;
  }

  #init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 64;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    // compresor suave para que nada sature
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(this.analyser).connect(ctx.destination);
    // eco para el lead (sabor "indie")
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.25;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(wet).connect(this.master);
    // ruido blanco reutilizable
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  get playing() { return !!this.track; }

  play(id) {
    this.#init();
    this.ctx.resume();
    this.stop();
    this.track = TRACKS.find((t) => t.id === id);
    if (!this.track) return;
    this.step = 0;
    this.next = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.#schedule(), 25);
    if (id === 'lofi') this.#crackle();
  }

  stop() {
    clearInterval(this.timer);
    this.crackleSrc?.stop(); this.crackleSrc = null;
    this.track = null;
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  /** Niveles 0..1 de 8 bandas para animar luces (vacío si no suena nada). */
  levels() {
    if (!this.track || !this.analyser) return [];
    this.analyser.getByteFrequencyData(this.bins);
    const out = [];
    for (let i = 0; i < 8; i++) out.push(this.bins[i * 2 + 1] / 255);
    return out;
  }

  // ------------------------------------------------------------ secuenciador
  #schedule() {
    const sixteenth = 60 / this.track.bpm / 4;
    while (this.next < this.ctx.currentTime + 0.12) {
      const swing = this.track.id === 'lofi' && this.step % 2 ? sixteenth * 0.18 : 0;
      this.#playStep(this.track.id, this.step, this.next + swing, sixteenth);
      this.next += sixteenth;
      this.step++;
    }
  }

  #playStep(id, s, t, sx) {
    const bar = Math.floor(s / 16) % 4, i = s % 16;
    if (id === 'lofi') {
      const chords = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]]; // Fmaj7 Em7 Dm7 Cmaj7
      if (i === 0) chords[bar].forEach((n, k) => this.#tone(NOTE(n - 12), t + k * 0.012, sx * 15, 'triangle', 0.07, 1400));
      if (i === 10) chords[bar].slice(1).forEach((n) => this.#tone(NOTE(n - 12), t, sx * 5, 'sine', 0.04, 1200));
      if (i === 0 || i === 7 || i === 10) this.#kick(t, 0.8);
      if (i === 4 || i === 12) this.#snare(t, 0.35, 1800);
      if (i % 2 === 0) this.#hat(t, i % 4 === 2 ? 0.08 : 0.04);
      if (i === 0) this.#tone(NOTE(chords[bar][0] - 24), t, sx * 12, 'sine', 0.16, 400);
      const mel = [76, null, 74, 72, null, null, 69, null, 72, null, null, 74, null, 72, null, null];
      if (bar % 2 === 1 && mel[i]) this.#tone(NOTE(mel[i]), t, sx * 2.5, 'sine', 0.05, 2500, true);
    } else if (id === 'chip') {
      const prog = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]; // Am F G Em
      const ch = prog[bar];
      this.#tone(NOTE(ch[i % 3] + 12 + (i >= 8 ? 12 : 0)), t, sx * 0.9, 'square', 0.035, 6000);
      if (i % 4 === 0) this.#tone(NOTE(ch[0] - 12), t, sx * 1.8, 'triangle', 0.18, 3000);
      if (i % 4 === 2) this.#tone(NOTE(ch[0]), t, sx * 0.8, 'triangle', 0.12, 3000);
      const lead = [69, 72, 76, 74, 72, 69, 67, 69, 72, 74, 76, 79, 76, 74, 72, 71];
      if (bar >= 2 && i % 2 === 0) this.#tone(NOTE(lead[(i + bar * 3) % 16] + 12), t, sx * 1.6, 'square', 0.028, 5000, true);
      if (i % 8 === 0) this.#kick(t, 0.7);
      if (i % 8 === 4) this.#snare(t, 0.25, 4000);
      if (i % 2 === 1) this.#hat(t, 0.03);
    } else if (id === 'synth') {
      const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
      const ch = prog[bar];
      if (i === 0) ch.forEach((n) => { this.#tone(NOTE(n), t, sx * 16, 'sawtooth', 0.03, 900); this.#tone(NOTE(n + 0.08), t, sx * 16, 'sawtooth', 0.03, 900); });
      if (i % 2 === 0) this.#tone(NOTE(ch[0] - 24), t, sx * 1.5, 'sawtooth', 0.07, 500);
      this.#tone(NOTE(ch[(i * 2) % 3] + 24), t, sx * 0.7, 'square', 0.018, 3000, true);
      if (i % 4 === 0) this.#kick(t, 0.9);
      if (i % 8 === 4) this.#snare(t, 0.45, 2500);
      if (i % 2 === 1) this.#hat(t, 0.05);
    } else if (id === 'bossa') {
      const prog = [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 61, 64, 67]]; // Dm7 G7 Cmaj7 A7
      const ch = prog[bar];
      const comp = [0, 3, 6, 10, 13];
      if (comp.includes(i)) ch.forEach((n) => this.#tone(NOTE(n - 12), t, sx * 1.6, 'triangle', 0.045, 2000));
      if (i === 0 || i === 6 || i === 8 || i === 14) this.#tone(NOTE(ch[0] - 24 + (i >= 8 ? 7 : 0)), t, sx * 3, 'sine', 0.16, 600);
      if (i % 2 === 0) this.#shaker(t, i % 4 === 0 ? 0.05 : 0.03);
      if (i === 3 || i === 10) this.#rim(t);
      const mel = [74, null, 72, null, 69, null, null, 71, 72, null, null, 69, null, 67, null, null];
      if (bar % 2 === 0 && mel[i]) this.#tone(NOTE(mel[i]), t, sx * 2, 'sine', 0.05, 3000, true);
    }
  }

  // ------------------------------------------------------------ instrumentos
  #tone(freq, t, dur, type, vol, cutoff, echo = false) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(f).connect(g).connect(this.master);
    if (echo) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }

  #noiseHit(t, dur, vol, type, freq) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  #kick(t, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.32);
  }
  #snare(t, vol, f) { this.#noiseHit(t, 0.18, vol, 'bandpass', f); this.#tone(190, t, 0.08, 'triangle', vol * 0.3, 2000); }
  #hat(t, vol) { this.#noiseHit(t, 0.04, vol, 'highpass', 8000); }
  #shaker(t, vol) { this.#noiseHit(t, 0.06, vol, 'highpass', 6000); }
  #rim(t) { this.#tone(1700, t, 0.03, 'square', 0.04, 4000); }

  #crackle() {
    // crujido de vinilo
    const c = this.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.012;
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    const g = c.createGain(); g.gain.value = 0.35;
    s.connect(f).connect(g).connect(this.master); s.start();
    this.crackleSrc = s;
  }
}
