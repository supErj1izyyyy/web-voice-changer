/**
 * DSP Core Engine
 * Mengelola AudioContext, routing graf audio, serta node analisis FFT
 */
class DSPEngine {
  constructor() {
    this.audioCtx = null;
    this.isInitialized = false;

    // Source nodes
    this.micStream = null;
    this.micSourceNode = null;
    this.fileSourceNode = null;
    this.audioBuffer = null;
    this.isFilePlaying = false;

    // Analyzer nodes untuk FFT Spectrum
    this.inputAnalyser = null;
    this.outputAnalyser = null;

    // Core Nodes
    this.sourceSplitter = null;
    this.masterGain = null;
    this.recordingDestination = null;

    // Subsystems
    this.equalizer = null;
    this.effects = null;
  }

  /**
   * Inisialisasi AudioContext sesuai standar browser modern
   */
  async init() {
    if (this.isInitialized && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // 1. Analyser untuk Spektrum Input (sebelum efek)
    this.inputAnalyser = this.audioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 1024;
    this.inputAnalyser.smoothingTimeConstant = 0.8;

    // 2. Analyser untuk Spektrum Output (setelah efek & EQ)
    this.outputAnalyser = this.audioCtx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.8;

    // 3. Node Pemisah & Master Gain
    this.sourceSplitter = this.audioCtx.createGain();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

    // 4. Recording Stream Destination
    this.recordingDestination = this.audioCtx.createMediaStreamDestination();

    // 5. Instansiasi Modul Efek & Equalizer
    this.equalizer = new EqualizerEngine(this.audioCtx);
    this.effects = new EffectsEngine(this.audioCtx);

    // 6. Hubungkan Routing Graf Audio:
    // Source -> sourceSplitter
    //   -> inputAnalyser (visualizer input)
    //   -> effects.input
    // effects.output -> equalizer.input
    // equalizer.output -> masterGain
    // masterGain
    //   -> outputAnalyser (visualizer output)
    //   -> audioCtx.destination (speaker)
    //   -> recordingDestination (recorder)

    this.sourceSplitter.connect(this.inputAnalyser);
    this.sourceSplitter.connect(this.effects.inputNode);

    this.effects.outputNode.connect(this.equalizer.inputNode);
    this.equalizer.outputNode.connect(this.masterGain);

    this.masterGain.connect(this.outputAnalyser);
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.connect(this.recordingDestination);

    this.isInitialized = true;
    console.log('[DSPEngine] AudioContext berhasil diinisialisasi:', this.audioCtx.sampleRate, 'Hz');
  }

  /**
   * Mengaktifkan input mikrofon langsung (Live Mic)
   */
  async startMic() {
    await this.init();
    this.stopAudioFile();

    if (this.micStream) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false
      });

      this.micSourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSourceNode.connect(this.sourceSplitter);
      return true;
    } catch (err) {
      console.error('[DSPEngine] Gagal mengakses mikrofon:', err);
      throw err;
    }
  }

  /**
   * Mematikan input mikrofon
   */
  stopMic() {
    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch (e) {}
      this.micSourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }

  /**
   * Memuat file audio yang di-upload ke dalam AudioBuffer
   */
  async loadAudioFile(file) {
    await this.init();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  /**
   * Memutar file audio yang sudah di-decode
   */
  playAudioFile(onEndedCallback) {
    if (!this.audioBuffer) return;
    this.stopMic();
    this.stopAudioFile();

    this.fileSourceNode = this.audioCtx.createBufferSource();
    this.fileSourceNode.buffer = this.audioBuffer;
    this.fileSourceNode.loop = true;

    this.fileSourceNode.connect(this.sourceSplitter);
    this.fileSourceNode.start(0);
    this.isFilePlaying = true;

    this.fileSourceNode.onended = () => {
      this.isFilePlaying = false;
      if (onEndedCallback) onEndedCallback();
    };
  }

  /**
   * Menghentikan pemutaran file audio
   */
  stopAudioFile() {
    if (this.fileSourceNode) {
      try {
        this.fileSourceNode.stop();
        this.fileSourceNode.disconnect();
      } catch (e) {}
      this.fileSourceNode = null;
    }
    this.isFilePlaying = false;
  }

  getSampleRate() {
    return this.audioCtx ? this.audioCtx.sampleRate : 48000;
  }
}

window.DSPEngine = DSPEngine;
