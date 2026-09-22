/**
 * Audio Synthesis Utility using Web Audio API
 * Provides zero-dependency, reliable sound effects for Cash Register Chime & Voice Note playback.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Cash Register Bell / Payment Received Chime (Ka-Ching!)
   */
  playCashRegister() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Coin 1 (High bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Coin 2 (Higher bell chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2093.00, now + 0.15); // C7
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.4, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.8);
  }

  /**
   * Khaleeji Voice Note Simulation Tone / Melody
   */
  playVoiceNoteDemo(onEnd?: () => void) {
    const ctx = this.getContext();
    if (!ctx) {
      if (onEnd) onEnd();
      return;
    }

    const now = ctx.currentTime;
    // Pleasant 4-note boutique greeting chime
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });

    if (onEnd) {
      setTimeout(onEnd, 1200);
    }
  }
}

export const soundEngine = new SoundEngine();
