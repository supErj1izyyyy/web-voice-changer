/**
 * Audio Recorder Engine
 * Merekam aliran keluaran (Output Audio) yang telah melewati DSP Effect dan Equalizer
 * Menghasilkan file audio unduhan (.wav / .webm)
 */
class AudioRecorder {
  constructor(dspEngine) {
    this.dspEngine = dspEngine;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordedBlob = null;
    this.recordedUrl = null;
  }

  /**
   * Memulai perekaman dari MediaStreamDestination
   */
  start() {
    if (!this.dspEngine || !this.dspEngine.recordingDestination) {
      throw new Error('DSP Engine belum siap untuk perekaman.');
    }

    this.recordedChunks = [];
    const stream = this.dspEngine.recordingDestination.stream;

    // Cek mime type yang didukung browser
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
    let selectedMime = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMime = type;
        break;
      }
    }

    this.mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.recordedBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
      if (this.recordedUrl) {
        URL.revokeObjectURL(this.recordedUrl);
      }
      this.recordedUrl = URL.createObjectURL(this.recordedBlob);
    };

    this.mediaRecorder.start(100); // 100ms chunk
    this.isRecording = true;
  }

  /**
   * Menghentikan perekaman dan mengembalikan URL unduhan
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isRecording = false;
        resolve(null);
        return;
      }

      this.mediaRecorder.addEventListener(
        'stop',
        () => {
          this.isRecording = false;
          resolve({
            blob: this.recordedBlob,
            url: this.recordedUrl,
          });
        },
        { once: true }
      );

      this.mediaRecorder.stop();
    });
  }
}

window.AudioRecorder = AudioRecorder;
