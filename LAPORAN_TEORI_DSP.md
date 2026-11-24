# LAPORAN TUGAS AKHIR PEMROSESAN SINYAL DIGITAL (PSD)
## PERANCANGAN DAN IMPLEMENTASI WEB REAL-TIME VOICE CHANGER & 5-BAND EQUALIZER BERBASIS DSP FORMANT SHAPING, KONVOLUSI, DAN ANALISIS SPEKTRUM FFT

---

### ABSTRAK
Tugas akhir ini bertujuan untuk merancang dan mengimplementasikan aplikasi web pengubah suara (*voice changer*) dan penyeimbang frekuensi (*equalizer*) secara *real-time* berbasis client-side browser. Sistem ini menerapkan prinsip-prinsip dasar Pemrosesan Sinyal Digital (PSD), meliputi operasi konvolusi waktu diskrit, pemodelan sistem kausal melalui persamaan beda (*difference equations*), transformasi Fourier cepat (*Fast Fourier Transform* / FFT) untuk analisis spektrum input dan output, serta teknik *formant shaping* untuk mensimulasikan karakteristik suara vokal tertentu (Normal, Robot, Laki-laki, Perempuan, Pak Jokowi, dan Pak Prabowo). Sistem mendukung masukan audio mikrofon langsung (*live microphone*) serta pengunggahan file audio digital (WAV/MP3).

---

## BAB I: LANDASAN TEORI MATEMATIS DSP

### 1.1 Konvolusi Waktu Diskrit (*Discrete-Time Convolution*)
Dalam sistem linier dan tak-ubah-waktu (*Linear Time-Invariant* / LTI), hubungan antara sinyal masukan $x[n]$, respon impuls sistem $h[n]$, dan sinyal keluaran $y[n]$ dinyatakan melalui operasi konvolusi matematis:

$$y[n] = x[n] * h[n] = \sum_{k=-\infty}^{\infty} x[k] \cdot h[n - k]$$

Secara fisik:
- $x[k]$ merepresentasikan sampel amplitudo sinyal suara pada indeks waktu ke-$k$.
- $h[n-k]$ merepresentasikan respon memori impuls sistem yang digeser sejauh $k$ dan dibalik (*time-reversed*).
- Pada aplikasi audio, konvolusi digunakan untuk merepresentasikan akustik ruang (*reverberation*), respon filter FIR/IIR, dan peredaman frekuensi.

---

### 1.2 Sistem Kausalitas (*Causality*) dan Persamaan Beda (*Difference Equations*)
Suatu sistem pemrosesan sinyal digital diklasifikasikan sebagai **sistem kausal** jika keluaran pada waktu $n$, yaitu $y[n]$, hanya ditentukan oleh masukan saat ini $x[n]$, masukan lampau $x[n-1], x[n-2], \dots$, dan keluaran lampau $y[n-1], y[n-2], \dots$. Sistem tidak boleh bergantung pada masukan masa depan ($x[n+1]$).

Syarat batas kausalitas pada respon impuls:
$$h[n] = 0, \quad \forall n < 0$$

Implementasi umum dari filter kausal IIR (*Infinite Impulse Response*) orde-$(N, M)$ dinyatakan dalam bentuk persamaan beda linier berkoefisien konstan:

$$y[n] = \sum_{k=0}^{M} b_k x[n-k] - \sum_{m=1}^{N} a_m y[n-m]$$

Dimana:
- $b_k$ adalah koefisien feedforward (pembilang fungsi transfer $H(z)$).
- $a_m$ adalah koefisien feedback (penyebut fungsi transfer $H(z)$).

#### A. Persamaan Beda untuk Delay Kausal
Untuk efek *Delay* dengan waktu tunda $D$ sampel dan faktor atenuasi umpan balik $\alpha$ ($0 \le \alpha < 1$ untuk kestabilan BIBO):

$$y[n] = x[n] + \alpha \cdot y[n - D]$$

Fungsi transfer dalam domain Z:
$$H_{\text{delay}}(z) = \frac{1}{1 - \alpha z^{-D}}$$

#### B. Persamaan Beda untuk Echo Kausal dengan Damping
Echo alami mengalami penyerapan frekuensi tinggi oleh medium udara dan dinding pantul. Respon filter damping orde-1 ditambahkan pada loop umpan balik:

$$w[n] = \beta x[n] + (1 - \beta) w[n-1] \quad (\text{Low-pass damping})$$
$$y[n] = x[n] + \alpha \cdot w[n - D]$$

---

### 1.3 Fast Fourier Transform (FFT) & Analisis Spektrum
Untuk merepresentasikan sinyal dari domain waktu diskrit $x[n]$ ke domain frekuensi diskrit $X[k]$, digunakan Discrete Fourier Transform (DFT):

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot e^{-j \frac{2\pi}{N} k n}, \quad k = 0, 1, \dots, N-1$$

Dimana:
- $N$ adalah panjang jendela FFT ($N = 1024$ sampel).
- $k$ adalah indeks bin frekuensi diskrit, dengan frekuensi kontinu yang bersesuaian:
$$f_k = \frac{k \cdot f_s}{N} \quad (\text{dengan } f_s = 48.000\text{ Hz})$$

Besaran magnitudo spektrum linier dan skala logaritmik (Desibel/dB):
$$|X[k]| = \sqrt{\text{Re}(X[k])^2 + \text{Im}(X[k])^2}$$
$$\text{Magnitudo (dB)} = 20 \log_{10}(|X[k]|)$$

Pada visualizer web, spektrum frekuensi digambar secara komparatif untuk sinyal sebelum pemrosesan ($X_{\text{in}}[k]$) dan sesudah pemrosesan ($Y_{\text{out}}[k]$) sehingga pengaruh filter dapat diamati secara visual.

---

## BAB II: ARSITEKTUR IMPLEMENTASI SISTEM

### 2.1 Alur Rantai Pemrosesan Sinyal (Signal Routing Graph)
```
[ Mic / Audio File ]
        │
        ▼
[ Source Splitter Node ]
   ├───► [ Input FFT Analyser (1024 pts) ] ───► (Canvas Spektrum Input)
   │
   └───► [ Voice Changer Module ] (Formant & Modulation)
              │
              ▼
         [ Effects Module ] (Echo & Delay Kausal)
              │
              ▼
         [ 5-Band Equalizer ] (Cascaded Biquad Direct Form II)
              │
              ▼
         [ Master Gain Node ]
              ├───► [ Output FFT Analyser ] ───► (Canvas Spektrum Output)
              ├───► [ AudioContext.destination ] (Speaker / Earphone)
              └───► [ MediaStreamDestination ] (WAV/WebM Recorder)
```

---

### 2.2 Desain 5-Band Equalizer
Equalizer diimplementasikan menggunakan 5 filter *biquad* kausal berjenjang (*cascaded*):

| Band | Frekuensi Pusat ($f_0$) | Tipe Filter | Fungsi Akustik |
| :--- | :--- | :--- | :--- |
| **Band 1** | 100 Hz | Low-Shelf | Mengontrol bobot sub-bass dan getaran dada |
| **Band 2** | 350 Hz | Peaking ($Q=1.0$) | Menyesuaikan kehangatan vokal (*body/warmth*) |
| **Band 3** | 1.000 Hz (1 kHz) | Peaking ($Q=1.0$) | Mengatur artikulasi dan keterbacaan vokal |
| **Band 4** | 3.500 Hz (3.5 kHz)| Peaking ($Q=1.0$) | Mengatur *presence* dan kejelasan konsonan |
| **Band 5** | 8.000 Hz (8 kHz) | High-Shelf | Mengatur kelembutan frekuensi tinggi (*air/sibilance*) |

Fungsi transfer biquad Direct Form II:
$$H(z) = \frac{b_0 + b_1 z^{-1} + b_2 z^{-2}}{a_0 + a_1 z^{-1} + a_2 z^{-2}}$$

---

### 2.3 Pemodelan Karakter Suara (*Voice Presets*)

#### 1. Preset Robot (Ring Modulation & Comb Filter)
- Menggunakan modulasi perkalian amplitudo (*amplitude modulation*):
  $$s_{\text{mod}}[n] = x[n] \cdot \cos(2\pi f_c n / f_s)$$
  dengan frekuensi pembawa $f_c = 55\text{ Hz}$ (gelombang sawtooth).
- Ditambah filter *comb* berdelay pendek ($D = 15\text{ ms}$) dan *bandpass filter* ($1200\text{ Hz}$) untuk menghasilkan timbre metalik khas mekanik.

#### 2. Preset Laki-Laki (*Deep Male Formant Shaping*)
- Meningkatkan resonansi nada rendah pita vokal pria pada frekuensi $140\text{ Hz}$ ($+9\text{ dB}$) dan $F_1$ pada $450\text{ Hz}$ ($+4\text{ dB}$).
- Menekan frekuensi tinggi di atas $3.200\text{ Hz}$ menggunakan lowpass filter kausal.

#### 3. Preset Perempuan (*Female Formant Shaping*)
- Menerapkan high-pass filter pada cutoff $240\text{ Hz}$ untuk memangkas resonansi rendah pria.
- Penguatan formant vokal wanita $F_2$ pada $2.200\text{ Hz}$ ($+7\text{ dB}$) dan formant kejelasan $F_3$ pada $5.000\text{ Hz}$ ($+5\text{ dB}$).

#### 4. Preset Pak Jokowi (DSP Formant Shaping)
- Karakteristik vokal tenang dan bersahaja disimulasikan melalui:
  1. High-pass lembut ($130\text{ Hz}$) untuk mengurangi resonansi boom.
  2. Resonansi saluran vokal pada area nasal/tenggorokan $1.850\text{ Hz}$ ($Q=2.5, +6.5\text{ dB}$).
  3. Reduksi frekuensi pertengahan bawah ($650\text{ Hz}, -3.5\text{ dB}$).
  4. *Dynamics Compressor* (threshold $-24\text{ dB}$, ratio $4:1$, attack $10\text{ ms}$) untuk menghasilkan artikulasi bicara yang santai dan rata.

#### 5. Preset Pak Prabowo (DSP Formant Shaping)
- Karakteristik vokal tegas, berwibawa, dan lantang disimulasikan melalui:
  1. Penguatan substansial resonansi rongga dada ($190\text{ Hz}, Q=1.5, +8.5\text{ dB}$).
  2. Penguatan frekuensi *speech presence* untuk gaya orasi ($2.900\text{ Hz}, Q=2.2, +5.5\text{ dB}$).
  3. *WaveShaper non-linear saturation* (kurva hiperbolik $\tanh$) untuk mensimulasikan saturasi mikrofon pidato dan bobot wibawa.

---

## BAB III: PEMBAHASAN KHUSUS (KOMPARASI DSP VS AI MODEL)

Pada pengujian konseptual untuk suara tokoh spesifik (Pak Jokowi dan Pak Prabowo), terdapat dua paradigma teknologi:

| Parameter | Pendekatan DSP Formant Shaping (Dipilih) | Pendekatan AI Deep Learning (RVC / VITS) |
| :--- | :--- | :--- |
| **Latensi Pemrosesan** | **< 10 ms (Real-time live mic tanpa jeda)** | 1.000 – 3.000 ms (memerlukan inferensi buffer) |
| **Kebutuhan Komputasi** | Sangat ringan, berjalan langsung di browser client | Memerlukan GPU/VRAM tinggi dan runtime PyTorch |
| **Ukuran Deployment** | **< 100 KB (Kode JS murni, siap hosting Vercel)** | 150 MB – 500 MB per model karakter |
| **Relevansi Matkul PSD** | **100% menggunakan teori filter, Z-transform, & FFT** | Cenderung *black-box neural network* |
| **Akurasi Timbre Tokoh** | Simulasi karakteristik resonansi frekuensi | Kloning timbre identik |

Pendekatan DSP Formant Shaping dipilih karena memenuhi kriteria utama mata kuliah Pemrosesan Sinyal Digital, mempertahankan prinsip sistem kausalitas *real-time*, dan dapat di-hosting secara instan di platform web modern (Vercel).

---

## BAB IV: KESIMPULAN
Aplikasi Web DSP Voice Changer berhasil dirancang dengan memenuhi seluruh persyaratan teknis:
1. Menghadirkan efek audio kausal berupa **Delay** dan **Echo** dengan parameter umpan balik yang dapat dikontrol.
2. Menyediakan **5-Band Equalizer** berbasis filter biquad Direct Form II untuk manipulasi spektrum frekuensi audio.
3. Menyediakan beragam preset suara (Robot, Laki-laki, Perempuan, Pak Jokowi, dan Pak Prabowo) berbasis manipulasi formant dan modulasi sinyal.
4. Menampilkan visualisasi spektrum **FFT real-time** ganda (Input vs Output) untuk membuktikan perubahan frekuensi secara matematis.
5. Mendukung input mikrofon langsung (*live mic*) dan file audio eksternal, serta kemampuan perekaman audio keluaran.
