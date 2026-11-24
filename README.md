# Web Voice Changer & 5-Band Equalizer
### Tugas Akhir Mata Kuliah Pemrosesan Sinyal Digital (PSD)

Aplikasi web pengubah suara (*voice changer*) dan penyeimbang frekuensi (*equalizer*) interaktif berbasis Web Audio API (DSP murni), konvolusi, sistem kausalitas, dan visualisasi spektrum FFT secara real-time.

---

## ✨ Fitur Utama
1. **Live Mic & File Upload**:
   - Dukungan mikrofon langsung (*real-time live mic*) dengan latensi sangat rendah (<10ms).
   - Dukungan pemutaran file audio eksternal (MP3, WAV, OGG, dsb.).
2. **Dual Spectrum Visualizer (FFT)**:
   - Visualisasi spektrum frekuensi FFT $1024$ titik untuk **Sinyal Input (X[k])** dan **Sinyal Output (Y[k])**.
   - Mode tampilan: Bar Spectrum, Curve Area, dan Time-domain Waveform.
3. **Efek Audio Kausal**:
   - **Echo**: Dilengkapi damping filter penyerapan frekuensi tinggi alami.
   - **Delay**: Buffer delay dengan feedback loop kausal yang dapat diatur waktunya.
4. **5-Band Equalizer**:
   - Cascaded Biquad Direct Form II: 100Hz (Bass), 350Hz (Low-Mid), 1kHz (Mid), 3.5kHz (High-Mid), 8kHz (Treble).
5. **6 Preset Voice Changer (DSP Formant Shaping & Modulasi)**:
   - **Normal**: Passthrough murni.
   - **Robot**: Ring Modulation 55Hz + Comb Filter logam.
   - **Laki-Laki**: Penguatan resonansi dada dan penurunan cutoff frekuensi.
   - **Perempuan**: Pemotongan nada rendah pria dan penguatan formant tinggi ($2.2\text{ kHz}$ & $5\text{ kHz}$).
   - **Pak Jokowi**: Formant shaping saluran vokal $1.85\text{ kHz}$ + Dynamics Compressor santai.
   - **Pak Prabowo**: Resonansi dada $190\text{ Hz}$, presence $2.9\text{ kHz}$, dan saturasi non-linear lembut (Tanh).
6. **Audio Output Recorder**:
   - Perekaman suara hasil pemrosesan DSP ke format audio unduhan.
7. **Dokumentasi Teori & Rumus Terintegrasi**:
   - Modal interaktif di dalam web dan dokumen akademik lengkap di `LAPORAN_TEORI_DSP.md`.

---

## 🚀 Panduan Menjalankan Secara Lokal

Karena aplikasi ini murni berbasis client-side HTML, CSS, dan JavaScript modern, Anda tidak memerlukan server backend yang rumit.

### Opsi 1: Menggunakan Live Server / Python HTTP Server (Rekomendasi)
Buka terminal di folder `web-voice-changer`, lalu jalankan:

```bash
# Menggunakan Python 3 bawaan:
python -m http.server 8000
```
Lalu buka browser di: `http://localhost:8000`

### Opsi 2: Menggunakan VS Code Live Server
Klik kanan pada file `index.html` $\rightarrow$ pilih **"Open with Live Server"**.

*(Catatan: Browser mewajibkan context aman seperti `localhost` atau HTTPS agar izin mikrofon dapat diaktifkan).*

---

## 🌐 Panduan Deploy ke Vercel

Aplikasi ini sudah 100% siap di-deploy ke Vercel tanpa perlu konfigurasi build step:

### Cara 1: Menggunakan Vercel CLI
```bash
npm i -g vercel
cd web-voice-changer
vercel
```
Ikuti instruksi singkat di terminal (pilih default). Selesai!

### Cara 2: Melalui Dashboard Vercel (GitHub)
1. Unggah folder ini ke repository GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com/) $\rightarrow$ **Add New Project**.
3. Hubungkan repository GitHub Anda.
4. Klik **Deploy**. Website langsung aktif dengan domain HTTPS gratis!
