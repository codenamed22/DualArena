/**
 * Procedural audio for DuelByte Arena.
 *
 * All sound effects are synthesized live with the Web Audio API — no asset
 * files, so nothing to license or preload and it works fully offline. Browser
 * autoplay rules require a user gesture, so call resume() on first input.
 */

type ToneOptions = {
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  freqEnd?: number;
  delay?: number;
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  /** Lazily create the context (safe to call repeatedly). */
  init(): void {
    if (this.ctx) {
      return;
    }

    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return;
    }

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  /** Resume the context after a user gesture (autoplay policy). */
  resume(): void {
    this.init();
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (this.master) {
      this.master.gain.value = value ? 0.5 : 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private get t(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private tone(freq: number, duration: number, peak: number, options: ToneOptions = {}): void {
    if (!this.ctx || !this.master || !this.enabled) {
      return;
    }

    const { type = "sine", attack = 0.006, decay = duration, freqEnd, delay = 0 } = options;
    const start = this.t + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.01, decay));

    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(duration: number, peak: number, filterFreq: number, filterType: BiquadFilterType = "bandpass", delay = 0): void {
    if (!this.ctx || !this.master || !this.enabled) {
      return;
    }

    const start = this.t + delay;
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  // --- Game events ---------------------------------------------------------

  shoot(): void {
    this.tone(820, 0.14, 0.16, { type: "sawtooth", freqEnd: 240, decay: 0.13 });
    this.noise(0.05, 0.05, 2400, "highpass");
  }

  hit(): void {
    this.noise(0.13, 0.22, 520, "bandpass");
    this.tone(150, 0.18, 0.26, { type: "sine", freqEnd: 60, decay: 0.18 });
  }

  shieldHit(): void {
    this.tone(900, 0.16, 0.12, { type: "triangle", freqEnd: 1300, decay: 0.15 });
  }

  powerupHealth(): void {
    [523, 659, 784].forEach((freq, i) => this.tone(freq, 0.16, 0.16, { type: "sine", delay: i * 0.07 }));
  }

  powerupShield(): void {
    this.tone(660, 0.4, 0.12, { type: "triangle" });
    this.tone(664, 0.4, 0.12, { type: "triangle", freqEnd: 880 });
  }

  countdownTick(): void {
    this.tone(440, 0.09, 0.18, { type: "square", decay: 0.09 });
  }

  duel(): void {
    this.tone(330, 0.3, 0.2, { type: "sawtooth", freqEnd: 880, decay: 0.28 });
    this.noise(0.25, 0.08, 1800, "lowpass");
  }

  roundWin(): void {
    [523, 659, 784].forEach((freq, i) => this.tone(freq, 0.32, 0.16, { type: "triangle", delay: i * 0.1 }));
  }

  matchWin(): void {
    [523, 659, 784, 1046].forEach((freq, i) => {
      this.tone(freq, 0.5, 0.16, { type: "triangle", delay: i * 0.12 });
      this.tone(freq / 2, 0.5, 0.08, { type: "sine", delay: i * 0.12 });
    });
  }

  uiSelect(): void {
    this.tone(660, 0.12, 0.14, { type: "square", freqEnd: 990, decay: 0.12 });
  }
}

export const audio = new AudioManager();
