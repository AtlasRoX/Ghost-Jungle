/**
 * Ghost Jungle - Procedural Web Audio Sound Engine
 * Synthesizes mystical forest ambiance, ghost chimes, and summoning sweeps
 * without any external audio asset dependencies.
 */

class GhostSoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.ambientGain = null;
    this.ambientNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
      this.playGhostChime(3);
    }
    return !this.isMuted;
  }

  startAmbient() {
    if (this.isMuted || !this.ctx) return;
    this.stopAmbient();

    try {
      // 1. Deep mystical forest drone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const droneFilter = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(82.4, this.ctx.currentTime); // E2 note

      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

      droneGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      osc1.connect(droneFilter);
      osc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientNodes.push(osc1, osc2, droneGain);
    } catch (e) {
      console.warn('Audio ambient init error:', e);
    }
  }

  stopAmbient() {
    this.ambientNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.ambientNodes = [];
  }

  /**
   * Play crystal ghost chime when hovering or selecting a ghost
   * Pitch adapts to ghost tier
   */
  playGhostChime(tier = 1) {
    if (this.isMuted || !this.ctx) return;
    this.init();

    try {
      const now = this.ctx.currentTime;
      // Frequency based on tier (Higher tier = deeper resonance; lower tier = sparkling chime)
      const freqs = {
        1: [880, 1320, 1760],   // Wisp: high sparkling
        2: [659, 987, 1318],    // Specter: luminous
        3: [440, 660, 880],     // Phantom: etherial
        4: [293, 440, 587],     // Wraith: majestic
        5: [146, 220, 293, 440] // Titan: deep cosmic chord
      };

      const chord = freqs[tier] || freqs[1];

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = tier >= 4 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);

        // Exponential decay envelope
        gain.gain.setValueAtTime(0.045 / chord.length, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + tier * 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.03);
        osc.stop(now + 1.5 + tier * 0.2);
      });
    } catch (e) {
      console.warn('Sound chime error:', e);
    }
  }

  /**
   * Sound effect when summoning a new GitHub jungle
   */
  playSummonSound() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);
    } catch (e) {}
  }
}

window.soundEngine = new GhostSoundEngine();
