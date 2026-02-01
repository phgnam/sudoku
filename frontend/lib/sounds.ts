// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private unlocked = false;

  // Lazy AudioContext initialization for iOS Safari compatibility
  private getContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== "undefined") {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return this.audioContext;
  }

  // Call this on first user interaction to unlock audio on iOS Safari
  async unlock(): Promise<void> {
    if (this.unlocked) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Play silent buffer to fully unlock on iOS
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    this.unlocked = true;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  // Simple beep sound
  private playTone(frequency: number, duration: number, volume: number = 0.1) {
    const ctx = this.getContext();
    if (!this.enabled || !ctx || ctx.state === "suspended") return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
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
