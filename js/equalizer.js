/**
 * 5-Band Equalizer Engine
 * Menggunakan Cascaded Biquad Filter Kausal (Direct Form II)
 * Orde 2 untuk tiap band.
 */
class EqualizerEngine {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.inputNode = this.audioCtx.createGain();
    this.outputNode = this.audioCtx.createGain();

    // Definisi 5 Frekuensi Band Standar Industri:
    // Band 1: 100 Hz (Low-Shelf / Bass)
    // Band 2: 350 Hz (Peaking / Low-Mid)
    // Band 3: 1000 Hz (Peaking / Midrange)
    // Band 4: 3500 Hz (Peaking / High-Mid Presence)
    // Band 5: 8000 Hz (High-Shelf / Treble Air)
    this.bandFrequencies = [100, 350, 1000, 3500, 8000];
    this.filters = [];

    this.buildFilters();
  }

  buildFilters() {
    let prevNode = this.inputNode;

    this.filters = this.bandFrequencies.map((freq, index) => {
      const filter = this.audioCtx.createBiquadFilter();

      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === this.bandFrequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.setValueAtTime(1.0, this.audioCtx.currentTime); // Standard bandwidth
      }

      filter.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      filter.gain.setValueAtTime(0, this.audioCtx.currentTime); // Flat 0 dB default

      prevNode.connect(filter);
      prevNode = filter;
      return filter;
    });

    prevNode.connect(this.outputNode);
  }

  /**
   * Mengatur penguatan (gain dalam dB) untuk salah satu dari 5 band
   * @param {number} bandIndex (0..4)
   * @param {number} gainDb (-15 .. +15 dB)
   */
  setBandGain(bandIndex, gainDb) {
    if (this.filters[bandIndex]) {
      const clampedGain = Math.max(-15, Math.min(15, gainDb));
      this.filters[bandIndex].gain.setTargetAtTime(
        clampedGain,
        this.audioCtx.currentTime,
        0.05
      );
    }
  }

  /**
   * Reset seluruh 5 band ke posisi datar (0 dB)
   */
  resetFlat() {
    this.filters.forEach((filter) => {
      filter.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
    });
  }
}

window.EqualizerEngine = EqualizerEngine;
