/**
 * Visualizer Spectrum Engine
 * Menggambar spektrum FFT secara real-time pada Canvas HTML5
 * Mendukung mode Bars, Curved Area, dan Time-domain Waveform
 */
class SpectrumVisualizer {
  constructor(inputCanvasId, outputCanvasId) {
    this.inputCanvas = document.getElementById(inputCanvasId);
    this.outputCanvas = document.getElementById(outputCanvasId);

    this.inputCtx = this.inputCanvas ? this.inputCanvas.getContext('2d') : null;
    this.outputCtx = this.outputCanvas ? this.outputCanvas.getContext('2d') : null;

    this.inputAnalyser = null;
    this.outputAnalyser = null;

    this.mode = 'bars'; // 'bars' | 'line' | 'wave'
    this.animationFrameId = null;

    // Buffer data FFT
    this.inputDataArray = null;
    this.outputDataArray = null;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    [this.inputCanvas, this.outputCanvas].forEach((canvas) => {
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
      }
    });
  }

  setAnalysers(inputAnalyser, outputAnalyser) {
    this.inputAnalyser = inputAnalyser;
    this.outputAnalyser = outputAnalyser;

    if (this.inputAnalyser) {
      const bufferLength = this.inputAnalyser.frequencyBinCount;
      this.inputDataArray = new Uint8Array(bufferLength);
    }
    if (this.outputAnalyser) {
      const bufferLength = this.outputAnalyser.frequencyBinCount;
      this.outputDataArray = new Uint8Array(bufferLength);
    }

    if (!this.animationFrameId) {
      this.startLoop();
    }
  }

  setMode(newMode) {
    this.mode = newMode;
  }

  startLoop() {
    const render = () => {
      this.animationFrameId = requestAnimationFrame(render);
      this.draw();
    };
    render();
  }

  draw() {
    if (this.inputCtx && this.inputAnalyser && this.inputDataArray) {
      this.renderSpectrum(
        this.inputCanvas,
        this.inputCtx,
        this.inputAnalyser,
        this.inputDataArray,
        {
          primary: '#22d3ee', // Cyan
          secondary: '#06b6d4',
          bgGradient: ['rgba(6, 182, 212, 0.25)', 'rgba(6, 182, 212, 0.0)'],
        }
      );
    }

    if (this.outputCtx && this.outputAnalyser && this.outputDataArray) {
      this.renderSpectrum(
        this.outputCanvas,
        this.outputCtx,
        this.outputAnalyser,
        this.outputDataArray,
        {
          primary: '#a78bfa', // Violet
          secondary: '#8b5cf6',
          bgGradient: ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.0)'],
        }
      );
    }
  }

  renderSpectrum(canvas, ctx, analyser, dataArray, theme) {
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid lines (dB reference)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let y = height * 0.25; y < height; y += height * 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (this.mode === 'wave') {
      // Time-domain Waveform
      analyser.getByteTimeDomainData(dataArray);
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.strokeStyle = theme.primary;
      ctx.beginPath();

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

    } else if (this.mode === 'line') {
      // Frequency Spectrum Area Curve
      analyser.getByteFrequencyData(dataArray);

      const numBins = Math.floor(dataArray.length * 0.75); // Fokus frekuensi audio dengar
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, theme.bgGradient[0]);
      gradient.addColorStop(1, theme.bgGradient[1]);

      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < numBins; i++) {
        const x = (i / (numBins - 1)) * width;
        const barHeight = (dataArray[i] / 255.0) * height * 0.95;
        const y = height - barHeight;

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Outline
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.beginPath();
      for (let i = 0; i < numBins; i++) {
        const x = (i / (numBins - 1)) * width;
        const barHeight = (dataArray[i] / 255.0) * height * 0.95;
        const y = height - barHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

    } else {
      // Default: Bars Mode
      analyser.getByteFrequencyData(dataArray);

      const numBars = 64;
      const barStep = Math.floor((dataArray.length * 0.7) / numBars);
      const barWidth = (width / numBars) * 0.75;
      const gap = (width / numBars) * 0.25;

      const barGradient = ctx.createLinearGradient(0, height, 0, 0);
      barGradient.addColorStop(0, theme.secondary);
      barGradient.addColorStop(1, theme.primary);
      ctx.fillStyle = barGradient;

      for (let i = 0; i < numBars; i++) {
        const binIndex = i * barStep;
        const value = dataArray[binIndex] || 0;
        const barHeight = (value / 255.0) * height * 0.92;
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        // Rounded top bars
        const radius = Math.min(barWidth / 2, 4 * window.devicePixelRatio);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(barHeight, 2), [radius, radius, 0, 0]);
        ctx.fill();
      }
    }
  }
}

window.SpectrumVisualizer = SpectrumVisualizer;
