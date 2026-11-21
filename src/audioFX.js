/**
 * Procedural Web Audio API sound & background music synthesizer for Chess 3D Royale.
 * Generates tactile board SFX plus 5 selectable ambient/cinematic music tracks
 * with stereo echo and warm low-pass filtering, requiring zero external audio files.
 */

export const MUSIC_TRACKS = {
  off: {
    id: 'off',
    label: 'Música: Desligada',
    shortLabel: 'Off',
  },
  grandmaster_nocturne: {
    id: 'grandmaster_nocturne',
    label: '♪ Noturno do Grande Mestre (Clássico)',
    shortLabel: 'Noturno',
    bpm: 68,
    filterFreq: 1350,
    delayTime: 0.36,
    delayFeedback: 0.28,
    wave: 'triangle',
    padWave: 'sine',
    steps: [
      { bass: 110.0, lead: 440.0, pad: [220.0, 261.63, 329.63] },
      { lead: 523.25 },
      { lead: 659.25 },
      { lead: 523.25 },
      { bass: 87.31, lead: 440.0, pad: [174.61, 220.0, 261.63] },
      { lead: 523.25 },
      { lead: 698.46 },
      { lead: 523.25 },
      { bass: 73.42, lead: 440.0, pad: [146.83, 220.0, 293.66] },
      { lead: 587.33 },
      { lead: 698.46 },
      { lead: 587.33 },
      { bass: 82.41, lead: 493.88, pad: [164.81, 207.65, 246.94] },
      { lead: 659.25 },
      { lead: 622.25 },
      { lead: 493.88 },
    ],
  },
  gotham_shadows: {
    id: 'gotham_shadows',
    label: '♪ Sombras de Gotham (Suspense Noir)',
    shortLabel: 'Gotham Noir',
    bpm: 60,
    filterFreq: 880,
    delayTime: 0.44,
    delayFeedback: 0.34,
    wave: 'sine',
    padWave: 'triangle',
    steps: [
      { bass: 65.41, pad: [130.81, 155.56, 196.0], lead: 392.0 },
      {},
      { lead: 311.13 },
      {},
      { bass: 103.83, pad: [155.56, 207.65, 261.63], lead: 415.3 },
      {},
      { lead: 392.0 },
      {},
      { bass: 87.31, pad: [130.81, 174.61, 207.65], lead: 349.23 },
      {},
      { lead: 311.13 },
      {},
      { bass: 98.0, pad: [146.83, 196.0, 246.94], lead: 293.66 },
      { lead: 311.13 },
      { lead: 293.66 },
      {},
    ],
  },
  avengers_march: {
    id: 'avengers_march',
    label: '♪ Marcha dos Heróis (Épico)',
    shortLabel: 'Heróis',
    bpm: 86,
    filterFreq: 1650,
    delayTime: 0.26,
    delayFeedback: 0.22,
    wave: 'sawtooth',
    padWave: 'triangle',
    steps: [
      { bass: 73.42, lead: 293.66, pad: [146.83, 220.0] },
      { bass: 73.42 },
      { bass: 73.42, lead: 440.0 },
      { bass: 110.0, lead: 392.0 },
      { bass: 116.54, lead: 349.23, pad: [116.54, 174.61, 233.08] },
      { bass: 116.54 },
      { bass: 130.81, lead: 392.0, pad: [130.81, 196.0, 261.63] },
      { lead: 440.0 },
      { bass: 73.42, lead: 587.33, pad: [146.83, 220.0] },
      { bass: 73.42 },
      { bass: 73.42, lead: 523.25 },
      { lead: 440.0 },
      { bass: 103.83, lead: 392.0, pad: [130.81, 196.0] },
      { lead: 349.23 },
      { bass: 110.0, lead: 329.63, pad: [110.0, 164.81, 220.0] },
      { lead: 392.0 },
    ],
  },
  cyber_grid: {
    id: 'cyber_grid',
    label: '♪ Horizonte Tático (Synth Suave)',
    shortLabel: 'Tático',
    bpm: 76,
    filterFreq: 1450,
    delayTime: 0.30,
    delayFeedback: 0.32,
    wave: 'triangle',
    padWave: 'sine',
    steps: [
      { bass: 82.41, lead: 329.63, pad: [164.81, 246.94] },
      { lead: 493.88 },
      { lead: 659.25 },
      { bass: 82.41, lead: 493.88 },
      { bass: 65.41, lead: 329.63, pad: [130.81, 196.0] },
      { lead: 392.0 },
      { lead: 523.25 },
      { lead: 392.0 },
      { bass: 98.0, lead: 392.0, pad: [196.0, 293.66] },
      { lead: 587.33 },
      { lead: 783.99 },
      { lead: 587.33 },
      { bass: 73.42, lead: 369.99, pad: [146.83, 220.0] },
      { lead: 440.0 },
      { lead: 587.33 },
      { lead: 440.0 },
    ],
  },
  zen_garden: {
    id: 'zen_garden',
    label: '♪ Jardim Zen (Concentração)',
    shortLabel: 'Zen',
    bpm: 56,
    filterFreq: 1150,
    delayTime: 0.45,
    delayFeedback: 0.36,
    wave: 'sine',
    padWave: 'sine',
    steps: [
      { bass: 146.83, lead: 587.33, pad: [220.0, 293.66] },
      {},
      { lead: 698.46 },
      { lead: 880.0 },
      {},
      { bass: 116.54, lead: 523.25, pad: [174.61, 261.63] },
      {},
      { lead: 659.25 },
      { bass: 130.81, lead: 587.33, pad: [196.0, 261.63] },
      {},
      { lead: 440.0 },
      {},
      { bass: 110.0, lead: 523.25, pad: [164.81, 220.0] },
      {},
      { lead: 440.0 },
      {},
    ],
  },
};

class AudioFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    this.musicTrack = 'grandmaster_nocturne';
    this.musicVolume = 0.45;
    this.musicGain = null;
    this.musicFilter = null;
    this.musicDelay = null;
    this.musicFeedback = null;
    this._musicTimer = null;
    this._musicStepIndex = 0;
    this._unlocked = false;

    this._bindUnlockListeners();
  }

  _bindUnlockListeners() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this._unlocked = true;
      if (this.musicTrack !== 'off') {
        const ctx = this._ensureContext(true);
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().then(() => {
            if (this.musicTrack !== 'off' && !this._musicTimer) {
              this._startMusicLoop();
            }
          }).catch(() => {});
        } else if (ctx && !this._musicTimer) {
          this._startMusicLoop();
        }
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  _ensureContext(allowWhenSfxMuted = false) {
    if (!allowWhenSfxMuted && !this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _ensureMusicBus(ctx) {
    if (!ctx) return null;
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume * 0.28, ctx.currentTime);

      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(1250, ctx.currentTime);

      this.musicDelay = ctx.createDelay(1.0);
      this.musicDelay.delayTime.setValueAtTime(0.36, ctx.currentTime);

      this.musicFeedback = ctx.createGain();
      this.musicFeedback.gain.setValueAtTime(0.28, ctx.currentTime);

      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(0.35, ctx.currentTime);

      this.musicFilter.connect(this.musicGain);
      this.musicFilter.connect(this.musicDelay);
      this.musicDelay.connect(this.musicFeedback);
      this.musicFeedback.connect(this.musicDelay);
      this.musicDelay.connect(wetGain);
      wetGain.connect(this.musicGain);

      this.musicGain.connect(ctx.destination);
    }
    return this.musicFilter;
  }

  setMusicTrack(trackId = 'grandmaster_nocturne') {
    const cfg = MUSIC_TRACKS[trackId] || MUSIC_TRACKS.off;
    this.musicTrack = cfg.id;
    this._stopMusicLoop();
    this._musicStepIndex = 0;

    if (cfg.id === 'off') return;

    const ctx = this._ensureContext(true);
    if (!ctx) return;

    this._ensureMusicBus(ctx);
    if (this.musicFilter) {
      this.musicFilter.frequency.setTargetAtTime(cfg.filterFreq || 1250, ctx.currentTime, 0.08);
    }
    if (this.musicDelay) {
      this.musicDelay.delayTime.setTargetAtTime(cfg.delayTime || 0.36, ctx.currentTime, 0.08);
    }
    if (this.musicFeedback) {
      this.musicFeedback.gain.setTargetAtTime(cfg.delayFeedback || 0.28, ctx.currentTime, 0.08);
    }

    if (this._unlocked || ctx.state === 'running') {
      this._startMusicLoop();
    }
  }

  getMusicTrack() {
    return this.musicTrack;
  }

  setMusicVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.musicVolume = Number.isFinite(clamped) ? clamped : 0.45;
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.28, this.ctx.currentTime, 0.06);
    }
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  _startMusicLoop() {
    this._stopMusicLoop();
    const track = MUSIC_TRACKS[this.musicTrack];
    if (!track || track.id === 'off' || !track.steps?.length) return;

    const intervalMs = Math.round(((60 / track.bpm) / 2) * 1000);
    this._scheduleMusicStep();
    this._musicTimer = setInterval(() => this._scheduleMusicStep(), intervalMs);
  }

  _stopMusicLoop() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _triggerTone(ctx, bus, freq, wave, startTime, durSec, peakGain) {
    if (!freq || peakGain <= 0.0005) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.06, durSec * 0.22));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durSec);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(startTime);
    osc.stop(startTime + durSec + 0.03);
  }

  _scheduleMusicStep() {
    const track = MUSIC_TRACKS[this.musicTrack];
    if (!track || track.id === 'off') {
      this._stopMusicLoop();
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const bus = this._ensureMusicBus(ctx);
    if (!bus) return;

    const step = track.steps[this._musicStepIndex % track.steps.length] || {};
    this._musicStepIndex++;

    const beatSec = 60 / track.bpm;
    const now = ctx.currentTime + 0.02;

    if (step.bass) {
      this._triggerTone(ctx, bus, step.bass, 'triangle', now, beatSec * 1.6, 0.22);
    }
    if (Array.isArray(step.pad)) {
      step.pad.forEach((f) => {
        this._triggerTone(ctx, bus, f, track.padWave || 'sine', now, beatSec * 2.1, 0.075);
      });
    }
    if (step.lead) {
      this._triggerTone(ctx, bus, step.lead, track.wave || 'triangle', now, beatSec * 0.95, 0.14);
    }
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  isEnabled() {
    return this.enabled;
  }

  vibrate(pattern) {
    if (!this.enabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore vibration unsupported/blocked
      }
    }
  }

  playSelect() {
    this.vibrate(12);
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playMove() {
    this.vibrate(18);
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Woody/marble tap resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.09);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);

    // Subtle click transient
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1100, now);
    click.frequency.exponentialRampToValueAtTime(300, now + 0.025);
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.035);
  }

  playCapture() {
    this.vibrate([28, 35, 55]);
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy low impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    // Crisp noise burst for shatter feel
    const bufferSize = Math.floor(ctx.sampleRate * 0.09);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1600, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }

  playCastle() {
    this.playMove();
    setTimeout(() => this.playMove(), 110);
  }

  playCheck() {
    this.vibrate([50, 40, 80]);
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [440, 587.33];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.14, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.24);
    });
  }

  playPromote() {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.28);
    });
  }

  playGameOver(victory = true) {
    this.vibrate(victory ? [40, 40, 120] : [80, 50, 80]);
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = victory ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = victory ? 'triangle' : 'sine';
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  playClockTick(urgent = false) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(urgent ? 980 : 720, now);
    gain.gain.setValueAtTime(urgent ? 0.08 : 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}

export const audioFX = new AudioFX();
