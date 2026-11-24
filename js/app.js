/**
 * Application Main Controller
 * Menghubungkan elemen UI HTML dengan DSPEngine, Equalizer, Effects, Visualizer, dan Recorder.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instansiasi Engine Utama
  const dsp = new DSPEngine();
  const visualizer = new SpectrumVisualizer('canvasInputSpectrum', 'canvasOutputSpectrum');
  let recorder = null;

  // 2. Referensi Elemen DOM
  // Audio Input Controls
  const btnMicToggle = document.getElementById('btnMicToggle');
  const labelMic = document.getElementById('labelMic');
  const audioFileInput = document.getElementById('audioFileInput');
  const fileControls = document.getElementById('fileControls');
  const btnPlayFile = document.getElementById('btnPlayFile');
  const btnStopFile = document.getElementById('btnStopFile');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const iconPlay = document.getElementById('iconPlay');

  // Status Badges
  const engineStatusText = document.getElementById('engineStatusText');
  const sampleRateText = document.getElementById('sampleRateText');
  const selectVisualizerMode = document.getElementById('selectVisualizerMode');

  // Recording Controls
  const btnRecordToggle = document.getElementById('btnRecordToggle');
  const labelRecord = document.getElementById('labelRecord');
  const btnDownloadRecord = document.getElementById('btnDownloadRecord');

  // Preset Buttons
  const presetButtons = document.querySelectorAll('.preset-btn');

  // Effects Controls
  const toggleEcho = document.getElementById('toggleEcho');
  const sliderEchoFeedback = document.getElementById('sliderEchoFeedback');
  const echoFeedbackVal = document.getElementById('echoFeedbackVal');

  const toggleDelay = document.getElementById('toggleDelay');
  const sliderDelayTime = document.getElementById('sliderDelayTime');
  const delayTimeVal = document.getElementById('delayTimeVal');
  const sliderDelayFeedback = document.getElementById('sliderDelayFeedback');
  const delayFeedbackVal = document.getElementById('delayFeedbackVal');

  // Equalizer Controls
  const btnResetEQ = document.getElementById('btnResetEQ');
  const eqSliders = [
    document.getElementById('eqSlider0'),
    document.getElementById('eqSlider1'),
    document.getElementById('eqSlider2'),
    document.getElementById('eqSlider3'),
    document.getElementById('eqSlider4'),
  ];
  const eqValues = [
    document.getElementById('eqVal0'),
    document.getElementById('eqVal1'),
    document.getElementById('eqVal2'),
    document.getElementById('eqVal3'),
    document.getElementById('eqVal4'),
  ];

  // Teori Modal
  const btnTeoriModal = document.getElementById('btnTeoriModal');
  const modalTeori = document.getElementById('modalTeori');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCloseModalBtn = document.getElementById('btnCloseModalBtn');

  // State
  let isMicActive = false;

  // -------------------------------------------------------------
  // Inisialisasi Audio Context & Visualizer Hook
  // -------------------------------------------------------------
  async function ensureEngineReady() {
    if (!dsp.isInitialized) {
      await dsp.init();
      recorder = new AudioRecorder(dsp);
      visualizer.setAnalysers(dsp.inputAnalyser, dsp.outputAnalyser);
      sampleRateText.textContent = `${dsp.getSampleRate().toLocaleString()} Hz`;
      engineStatusText.textContent = 'Aktif (DSP Engine Running)';
      engineStatusText.className = 'text-emerald-400 font-bold';
    }
  }

  // -------------------------------------------------------------
  // Live Mic Toggle
  // -------------------------------------------------------------
  btnMicToggle.addEventListener('click', async () => {
    try {
      if (!isMicActive) {
        await ensureEngineReady();
        await dsp.startMic();
        isMicActive = true;
        labelMic.textContent = 'Nonaktifkan Live Mic';
        btnMicToggle.className =
          'flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20';
        engineStatusText.textContent = 'Live Mic Aktif';
      } else {
        dsp.stopMic();
        isMicActive = false;
        labelMic.textContent = 'Aktifkan Live Mic';
        btnMicToggle.className =
          'flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20';
        engineStatusText.textContent = 'Standby';
      }
    } catch (err) {
      alert('Izin akses mikrofon ditolak atau tidak ditemukan mikrofon.');
    }
  });

  // -------------------------------------------------------------
  // File Upload & Playback
  // -------------------------------------------------------------
  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await ensureEngineReady();
      // Matikan mic jika sedang aktif
      if (isMicActive) {
        btnMicToggle.click();
      }

      fileNameDisplay.textContent = file.name;
      fileControls.classList.remove('hidden');

      engineStatusText.textContent = 'Memuat audio file...';
      await dsp.loadAudioFile(file);
      engineStatusText.textContent = `File siap: ${file.name}`;

      // Otomatis putar
      playAudio();
    } catch (err) {
      alert('Gagal membaca file audio: ' + err.message);
    }
  });

  function playAudio() {
    dsp.playAudioFile(() => {
      iconPlay.innerHTML = '<path d="M8 5v14l11-7z" />';
      engineStatusText.textContent = 'Pemutaran selesai';
    });
    iconPlay.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    engineStatusText.textContent = 'Memutar File Audio (Looping)';
  }

  btnPlayFile.addEventListener('click', () => {
    if (dsp.isFilePlaying) {
      dsp.stopAudioFile();
      iconPlay.innerHTML = '<path d="M8 5v14l11-7z" />';
      engineStatusText.textContent = 'Audio Dihentikan';
    } else {
      playAudio();
    }
  });

  btnStopFile.addEventListener('click', () => {
    dsp.stopAudioFile();
    iconPlay.innerHTML = '<path d="M8 5v14l11-7z" />';
    engineStatusText.textContent = 'Audio Dihentikan';
  });

  // -------------------------------------------------------------
  // Preset Voice Changer Buttons
  // -------------------------------------------------------------
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      await ensureEngineReady();
      const preset = btn.getAttribute('data-preset');

      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      dsp.effects.setPreset(preset);
      console.log('[Preset Aktif]:', preset);
    });
  });

  // -------------------------------------------------------------
  // Audio Effects Sliders & Toggles (Delay & Echo)
  // -------------------------------------------------------------
  toggleEcho.addEventListener('change', async (e) => {
    await ensureEngineReady();
    dsp.effects.setEchoActive(e.target.checked);
  });

  sliderEchoFeedback.addEventListener('input', async (e) => {
    await ensureEngineReady();
    const val = parseInt(e.target.value, 10);
    echoFeedbackVal.textContent = `${val}%`;
    dsp.effects.setEchoFeedback(val / 100);
  });

  toggleDelay.addEventListener('change', async (e) => {
    await ensureEngineReady();
    dsp.effects.setDelayActive(e.target.checked);
  });

  sliderDelayTime.addEventListener('input', async (e) => {
    await ensureEngineReady();
    const val = parseInt(e.target.value, 10);
    delayTimeVal.textContent = `${val} ms`;
    dsp.effects.setDelayTime(val / 1000);
  });

  sliderDelayFeedback.addEventListener('input', async (e) => {
    await ensureEngineReady();
    const val = parseInt(e.target.value, 10);
    delayFeedbackVal.textContent = `${val}%`;
    dsp.effects.setDelayFeedback(val / 100);
  });

  // -------------------------------------------------------------
  // 5-Band Equalizer Sliders
  // -------------------------------------------------------------
  eqSliders.forEach((slider, index) => {
    slider.addEventListener('input', async (e) => {
      await ensureEngineReady();
      const gain = parseFloat(e.target.value);
      eqValues[index].textContent = `${gain > 0 ? '+' : ''}${gain}dB`;
      dsp.equalizer.setBandGain(index, gain);
    });
  });

  btnResetEQ.addEventListener('click', async () => {
    await ensureEngineReady();
    dsp.equalizer.resetFlat();
    eqSliders.forEach((slider, idx) => {
      slider.value = 0;
      eqValues[idx].textContent = '0dB';
    });
  });

  // -------------------------------------------------------------
  // Visualizer Mode Selector
  // -------------------------------------------------------------
  selectVisualizerMode.addEventListener('change', (e) => {
    visualizer.setMode(e.target.value);
  });

  // -------------------------------------------------------------
  // Audio Recorder (Rekam Output)
  // -------------------------------------------------------------
  btnRecordToggle.addEventListener('click', async () => {
    await ensureEngineReady();

    if (!recorder.isRecording) {
      // Mulai Rekam
      recorder.start();
      btnRecordToggle.parentElement.classList.add('recording-active');
      labelRecord.textContent = 'Stop Merekam';
      btnRecordToggle.className =
        'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-700 text-white transition flex items-center gap-2 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400';
      btnDownloadRecord.classList.add('hidden');
    } else {
      // Berhenti Rekam
      const result = await recorder.stop();
      btnRecordToggle.parentElement.classList.remove('recording-active');
      labelRecord.textContent = 'Rekam Output';
      btnRecordToggle.className =
        'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-600/90 hover:bg-rose-500 text-white transition flex items-center gap-2 shadow-lg shadow-rose-600/20';

      if (result && result.url) {
        btnDownloadRecord.href = result.url;
        btnDownloadRecord.download = `DSP_Voice_Output_${Date.now()}.webm`;
        btnDownloadRecord.classList.remove('hidden');
      }
    }
  });

  // -------------------------------------------------------------
  // Teori & Rumus Modal Toggle
  // -------------------------------------------------------------
  const openModal = () => modalTeori.classList.remove('hidden');
  const closeModal = () => modalTeori.classList.add('hidden');

  btnTeoriModal.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCloseModalBtn.addEventListener('click', closeModal);
  modalTeori.addEventListener('click', (e) => {
    if (e.target === modalTeori) closeModal();
  });
});
