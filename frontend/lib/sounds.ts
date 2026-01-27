// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  // Simple beep sound
  private playTone(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration,
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Click sound (subtle)
  click() {
    this.playTone(800, 0.05, 0.05);
  }

  // Success sound (pleasant)
  success() {
    this.playTone(523.25, 0.1, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 0.15, 0.1), 100); // E5
  }

  // Error sound (warning)
  error() {
    this.playTone(200, 0.15, 0.08);
  }

  // Victory fanfare
  victory() {
    const notes = [523.25, 587.33, 659.25, 783.99]; // C, D, E, G
    notes.forEach((note, index) => {
      setTimeout(() => this.playTone(note, 0.2, 0.12), index * 150);
    });
  }

  // Hint sound
  hint() {
    this.playTone(932.33, 0.1, 0.08); // A#5
  }
}

export const soundManager = new SoundManager();
