/**
 * Effects Engine
 * Mengimplementasikan:
 * 1. Efek Audio Kausal: Delay & Echo
 * 2. Voice Changer Presets: Normal, Robot (Ring Mod), Male, Female, Pak Jokowi, Pak Prabowo
 */
class EffectsEngine {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;

    // Node Input & Output Modul Efek
    this.inputNode = this.audioCtx.createGain();
    this.outputNode = this.audioCtx.createGain();

    // Intermediate Nodes untuk Efek dan Preset
    this.presetInputNode = this.audioCtx.createGain();
    this.presetOutputNode = this.audioCtx.createGain();

    this.effectsInputNode = this.audioCtx.createGain();
    this.effectsOutputNode = this.audioCtx.createGain();

    // Setup Rantai Suara:
    // this.inputNode -> Preset Processor -> Effects Processor -> this.outputNode
    this.inputNode.connect(this.presetInputNode);
    this.presetOutputNode.connect(this.effectsInputNode);
    this.effectsOutputNode.connect(this.outputNode);

    // Variabel internal Preset
    this.currentPreset = 'normal';
    this.activePresetNodes = [];
    this.carrierOscillator = null;

    // Setup Modul Delay & Echo
    this.initDelayAndEcho();

    // Set Default Preset
    this.setPreset('normal');
  }

  /* ==========================================================
     1. MODUL DELAY & ECHO (Sistem Kausal dengan Feedback Loop)
     ========================================================== */
  initDelayAndEcho() {
    // Jalur Kering (Dry)
    this.dryGain = this.audioCtx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.effectsInputNode.connect(this.dryGain);
    this.dryGain.connect(this.effectsOutputNode);

    // A. DELAY MODULE
    // y[n] = x[n] + α·y[n-D]
    this.delayNode = this.audioCtx.createDelay(2.0); // max delay 2 detik
    this.delayNode.delayTime.setValueAtTime(0.28, this.audioCtx.currentTime); // 280ms

    this.delayFeedbackGain = this.audioCtx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.delayWetGain = this.audioCtx.createGain();
    this.delayWetGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime); // Awalnya mati

    // Delay Routing
    this.effectsInputNode.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode); // feedback loop kausal
    this.delayNode.connect(this.delayWetGain);
    this.delayWetGain.connect(this.effectsOutputNode);

    // B. ECHO MODULE
    // Echo menggunakan delay + lowpass damping filter (penyerapan frekuensi tinggi alami)
    this.echoDelayNode = this.audioCtx.createDelay(2.0);
    this.echoDelayNode.delayTime.setValueAtTime(0.35, this.audioCtx.currentTime); // 350ms

    this.echoDampingFilter = this.audioCtx.createBiquadFilter();
    this.echoDampingFilter.type = 'lowpass';
    this.echoDampingFilter.frequency.setValueAtTime(2500, this.audioCtx.currentTime); // Meredam >2.5kHz

    this.echoFeedbackGain = this.audioCtx.createGain();
    this.echoFeedbackGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.echoWetGain = this.audioCtx.createGain();
    this.echoWetGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime); // Awalnya mati

    // Echo Routing: input -> echoDelay -> echoDampingFilter -> feedback -> echoDelay
    this.effectsInputNode.connect(this.echoDelayNode);
    this.echoDelayNode.connect(this.echoDampingFilter);
    this.echoDampingFilter.connect(this.echoFeedbackGain);
    this.echoFeedbackGain.connect(this.echoDelayNode);
    this.echoDampingFilter.connect(this.echoWetGain);
    this.echoWetGain.connect(this.effectsOutputNode);

    // Status state
    this.isDelayActive = false;
    this.isEchoActive = false;
    this.delayFeedbackVal = 0.4;
    this.echoFeedbackVal = 0.35;
  }

  setDelayActive(active) {
    this.isDelayActive = active;
    const wetTarget = active ? 0.7 : 0.0;
    const fbTarget = active ? this.delayFeedbackVal : 0.0;
    this.delayWetGain.gain.setTargetAtTime(wetTarget, this.audioCtx.currentTime, 0.05);
    this.delayFeedbackGain.gain.setTargetAtTime(fbTarget, this.audioCtx.currentTime, 0.05);
  }

  setDelayTime(timeInSeconds) {
    this.delayNode.delayTime.setTargetAtTime(timeInSeconds, this.audioCtx.currentTime, 0.05);
  }

  setDelayFeedback(feedback) {
    this.delayFeedbackVal = feedback;
    if (this.isDelayActive) {
      this.delayFeedbackGain.gain.setTargetAtTime(feedback, this.audioCtx.currentTime, 0.05);
    }
  }

  setEchoActive(active) {
    this.isEchoActive = active;
    const wetTarget = active ? 0.6 : 0.0;
    const fbTarget = active ? this.echoFeedbackVal : 0.0;
    this.echoWetGain.gain.setTargetAtTime(wetTarget, this.audioCtx.currentTime, 0.05);
    this.echoFeedbackGain.gain.setTargetAtTime(fbTarget, this.audioCtx.currentTime, 0.05);
  }

  setEchoFeedback(feedback) {
    this.echoFeedbackVal = feedback;
    if (this.isEchoActive) {
      this.echoFeedbackGain.gain.setTargetAtTime(feedback, this.audioCtx.currentTime, 0.05);
    }
  }

  /* ==========================================================
     2. VOICE CHANGER PRESETS (Formant Shaping & Modulasi)
     ========================================================== */
  
  clearPresetNodes() {
    if (this.carrierOscillator) {
      try {
        this.carrierOscillator.stop();
        this.carrierOscillator.disconnect();
      } catch (e) {}
      this.carrierOscillator = null;
    }

    this.activePresetNodes.forEach((node) => {
      try { node.disconnect(); } catch (e) {}
    });
    this.activePresetNodes = [];
    try { this.presetInputNode.disconnect(); } catch (e) {}
  }

  setPreset(presetName) {
    this.clearPresetNodes();
    this.currentPreset = presetName;

    switch (presetName) {
      case 'robot':
        this.applyRobotPreset();
        break;
      case 'male':
        this.applyMalePreset();
        break;
      case 'female':
        this.applyFemalePreset();
        break;
      case 'jokowi':
        this.applyJokowiPreset();
        break;
      case 'prabowo':
        this.applyPrabowoPreset();
        break;
      case 'normal':
      default:
        this.applyNormalPreset();
        break;
    }
  }

  /**
   * Preset Normal: Passthrough langsung
   */
  applyNormalPreset() {
    this.presetInputNode.connect(this.presetOutputNode);
  }

  /**
   * Preset Robot:
   * Menggunakan Ring Modulation (Amplitude Modulation dengan carrier sinus/kotak ~50 Hz)
   * Ditambah comb filter pendek untuk resonansi logam robotik.
   */
  applyRobotPreset() {
    // 1. Modulator Gain Node
    const ringModGain = this.audioCtx.createGain();
    ringModGain.gain.value = 0.0;

    // 2. Carrier Oscillator (55 Hz - frekuensi suara robotik khas)
    this.carrierOscillator = this.audioCtx.createOscillator();
    this.carrierOscillator.type = 'sawtooth';
    this.carrierOscillator.frequency.setValueAtTime(55, this.audioCtx.currentTime);

    // Hubungkan carrier ke gain modulator
    this.carrierOscillator.connect(ringModGain.gain);
    this.carrierOscillator.start();

    // 3. Comb Filter (Delay mikro untuk efek logam)
    const combDelay = this.audioCtx.createDelay();
    combDelay.delayTime.setValueAtTime(0.015, this.audioCtx.currentTime); // 15ms comb
    const combFeedback = this.audioCtx.createGain();
    combFeedback.gain.setValueAtTime(0.65, this.audioCtx.currentTime);

    combDelay.connect(combFeedback);
    combFeedback.connect(combDelay);

    // 4. Bandpass filter pembentuk vokal robot
    const robotFilter = this.audioCtx.createBiquadFilter();
    robotFilter.type = 'bandpass';
    robotFilter.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    robotFilter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

    // Hubungkan: Input -> ringModGain -> combDelay -> robotFilter -> Output
    this.presetInputNode.connect(ringModGain);
    ringModGain.connect(combDelay);
    combDelay.connect(robotFilter);
    robotFilter.connect(this.presetOutputNode);

    this.activePresetNodes.push(ringModGain, combDelay, combFeedback, robotFilter);
  }

  /**
   * Preset Laki-Laki (Deep Male Formant Shaping):
   * Meningkatkan resonansi nada rendah (fundamental vokal pria 100-180 Hz)
   * dan memotong frekuensi tinggi agar terdengar lebih berat dan dalam.
   */
  applyMalePreset() {
    // 1. Resonansi dada (Chest resonance boost)
    const chestFilter = this.audioCtx.createBiquadFilter();
    chestFilter.type = 'peaking';
    chestFilter.frequency.setValueAtTime(140, this.audioCtx.currentTime);
    chestFilter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);
    chestFilter.gain.setValueAtTime(9.0, this.audioCtx.currentTime); // +9dB

    // 2. Formant F1 Male boost (~450 Hz)
    const f1Filter = this.audioCtx.createBiquadFilter();
    f1Filter.type = 'peaking';
    f1Filter.frequency.setValueAtTime(450, this.audioCtx.currentTime);
    f1Filter.Q.setValueAtTime(2.0, this.audioCtx.currentTime);
    f1Filter.gain.setValueAtTime(4.0, this.audioCtx.currentTime);

    // 3. Lowpass filter untuk meredam kecerahan vokal wanita
    const lowpass = this.audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(3200, this.audioCtx.currentTime);

    // Hubungkan berjenjang
    this.presetInputNode.connect(chestFilter);
    chestFilter.connect(f1Filter);
    f1Filter.connect(lowpass);
    lowpass.connect(this.presetOutputNode);

    this.activePresetNodes.push(chestFilter, f1Filter, lowpass);
  }

  /**
   * Preset Perempuan (Female Formant Shaping):
   * Memotong frekuensi rendah vokal pria (<220 Hz)
   * Menekankan formant F2 dan F3 (~2.5 kHz dan 4.5 kHz) untuk timbre tinggi/feminin.
   */
  applyFemalePreset() {
    // 1. High-Pass filter untuk membuang nada rendah pria
    const highpass = this.audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(240, this.audioCtx.currentTime);
    highpass.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

    // 2. Female Formant F2 boost (~2200 Hz)
    const f2Filter = this.audioCtx.createBiquadFilter();
    f2Filter.type = 'peaking';
    f2Filter.frequency.setValueAtTime(2200, this.audioCtx.currentTime);
    f2Filter.Q.setValueAtTime(2.0, this.audioCtx.currentTime);
    f2Filter.gain.setValueAtTime(7.0, this.audioCtx.currentTime);

    // 3. Female Formant Air / Clarity (~5000 Hz)
    const airFilter = this.audioCtx.createBiquadFilter();
    airFilter.type = 'peaking';
    airFilter.frequency.setValueAtTime(5000, this.audioCtx.currentTime);
    airFilter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);
    airFilter.gain.setValueAtTime(5.0, this.audioCtx.currentTime);

    this.presetInputNode.connect(highpass);
    highpass.connect(f2Filter);
    f2Filter.connect(airFilter);
    airFilter.connect(this.presetOutputNode);

    this.activePresetNodes.push(highpass, f2Filter, airFilter);
  }

  /**
   * Preset Pak Jokowi (DSP Formant Shaping):
   * Karakteristik:
   * - Suara santai, intonasi tenang
   * - Sedikit nasal resonance (~1.6 kHz - 2.4 kHz)
   * - Meredam frekuensi ultra-bass yang berat agar lebih terdengar natural dan ramah
   * - Dynamics Compressor untuk perataan volume bicara santai.
   */
  applyJokowiPreset() {
    // 1. Gentle low cut untuk mengurangi resonansi dada berlebih
    const lowCut = this.audioCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.setValueAtTime(130, this.audioCtx.currentTime);

    // 2. Nasal/Vocal tract formant shaping (~1800 Hz)
    const nasalFilter = this.audioCtx.createBiquadFilter();
    nasalFilter.type = 'peaking';
    nasalFilter.frequency.setValueAtTime(1850, this.audioCtx.currentTime);
    nasalFilter.Q.setValueAtTime(2.5, this.audioCtx.currentTime);
    nasalFilter.gain.setValueAtTime(6.5, this.audioCtx.currentTime);

    // 3. Slight midrange scoop di 600 Hz untuk karakter artikulasi santai
    const scoopFilter = this.audioCtx.createBiquadFilter();
    scoopFilter.type = 'peaking';
    scoopFilter.frequency.setValueAtTime(650, this.audioCtx.currentTime);
    scoopFilter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);
    scoopFilter.gain.setValueAtTime(-3.5, this.audioCtx.currentTime);

    // 4. Dynamics Compressor (suara stabil dan tenang)
    const compressor = this.audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, this.audioCtx.currentTime);
    compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.01, this.audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

    this.presetInputNode.connect(lowCut);
    lowCut.connect(nasalFilter);
    nasalFilter.connect(scoopFilter);
    scoopFilter.connect(compressor);
    compressor.connect(this.presetOutputNode);

    this.activePresetNodes.push(lowCut, nasalFilter, scoopFilter, compressor);
  }

  /**
   * Preset Pak Prabowo (DSP Formant Shaping):
   * Karakteristik:
   * - Nada suara berwibawa, tegas dan menggelegar
   * - Penguatan resonansi dada rendah yang tebal (160 Hz - 260 Hz)
   * - Penguatan kehadiran vokal berorasi (presence di ~3.0 kHz)
   * - Soft-clipping saturation (WaveShaper) untuk menambah wibawa dan saturasi mikrofon pidato.
   */
  applyPrabowoPreset() {
    // 1. Resonansi dada tegas (Chest boom)
    const deepChest = this.audioCtx.createBiquadFilter();
    deepChest.type = 'peaking';
    deepChest.frequency.setValueAtTime(190, this.audioCtx.currentTime);
    deepChest.Q.setValueAtTime(1.5, this.audioCtx.currentTime);
    deepChest.gain.setValueAtTime(8.5, this.audioCtx.currentTime);

    // 2. Mid Presence orasi (~2900 Hz)
    const speechPresence = this.audioCtx.createBiquadFilter();
    speechPresence.type = 'peaking';
    speechPresence.frequency.setValueAtTime(2900, this.audioCtx.currentTime);
    speechPresence.Q.setValueAtTime(2.2, this.audioCtx.currentTime);
    speechPresence.gain.setValueAtTime(5.5, this.audioCtx.currentTime);

    // 3. Soft Saturation Curve (WaveShaper Node)
    // Mensimulasikan kompresi dan ketegasan timbre vokal orasi
    const waveShaper = this.audioCtx.createWaveShaper();
    waveShaper.curve = this.createSoftDistortionCurve(15);
    waveShaper.oversample = '2x';

    // 4. Output level normalization gain
    const levelGain = this.audioCtx.createGain();
    levelGain.gain.setValueAtTime(0.9, this.audioCtx.currentTime);

    this.presetInputNode.connect(deepChest);
    deepChest.connect(speechPresence);
    speechPresence.connect(waveShaper);
    waveShaper.connect(levelGain);
    levelGain.connect(this.presetOutputNode);

    this.activePresetNodes.push(deepChest, speechPresence, waveShaper, levelGain);
  }

  /**
   * Membentuk kurva distorsi non-linear lembut (Tanh-like)
   * untuk saturasi ketegasan suara
   */
  createSoftDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}

window.EffectsEngine = EffectsEngine;
