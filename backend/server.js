const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// State untuk menyimpan data dari Arduino dan perintah dari Aplikasi Mobile
let deviceState = {
  // Data dari sensor
  suhu: 0.0,
  lembap: 0.0,
  nilaiLDR: 0,
  nilaiHujan: 4095, // default dry
  gelap: false,
  hujan: false,

  // Status alat saat ini (dari Arduino)
  jemuranKeluar: true,
  kipasMenyala: false,

  // Kontrol dari aplikasi mobile
  autoMode: true,           // true = Arduino kontrol otomatis, false = Manual dari HP
  manualJemuranKeluar: true, // Jika manual, ini menentukan target posisi jemuran
  manualKipasMenyala: false, // Jika manual, ini menentukan target kipas

  // Riwayat sensor hujan untuk grafik
  rainHistory: []
};

// Variable untuk mencatat kapan terakhir history diupdate agar tidak spamming
let lastHistoryTime = 0;

// Generate mock data untuk inisialisasi awal agar grafik tidak kosong saat server start
const initMockRainHistory = () => {
  const now = Date.now();
  for (let i = 9; i >= 0; i--) {
    const time = new Date(now - i * 15 * 1000); // interval 15 detik
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
    
    // Simulasi hujan bertahap naik (i=9 paling lama/kering, i=0 paling baru/hujan)
    const percent = Math.max(0, Math.min(100, Math.round((9 - i) * 10 + (Math.random() * 8 - 4)))); 
    const value = Math.max(0, Math.min(4095, Math.round(4095 - (percent * 40.95))));
    deviceState.rainHistory.push({
      timestamp: timeStr,
      value: value,
      percent: percent,
      hujan: percent > 15
    });
  }
  // Update state saat ini dengan data paling baru dari mock
  const latest = deviceState.rainHistory[deviceState.rainHistory.length - 1];
  deviceState.nilaiHujan = latest.value;
  deviceState.hujan = latest.hujan;
};
initMockRainHistory();

/**
 * ==========================================
 * ENDPOINT UNTUK APLIKASI MOBILE (REACT NATIVE)
 * ==========================================
 */

// GET /api/status - Mengambil status terbaru
app.get('/api/status', (req, res) => {
  console.log(`[APP] Mobile App memanggil /api/status pada ${new Date().toLocaleTimeString()}`);
  res.json(deviceState);
});

// POST /api/control - Mengirim perintah dari aplikasi mobile
app.post('/api/control', (req, res) => {
  const { autoMode, jemuranKeluar, kipasMenyala } = req.body;
  
  if (autoMode !== undefined) deviceState.autoMode = autoMode;
  if (jemuranKeluar !== undefined) deviceState.manualJemuranKeluar = jemuranKeluar;
  if (kipasMenyala !== undefined) deviceState.manualKipasMenyala = kipasMenyala;

  res.json({ message: 'Control updated successfully', state: deviceState });
});


/**
 * ==========================================
 * ENDPOINT UNTUK ARDUINO (ESP32)
 * ==========================================
 */

// POST /api/sensor - ESP32 mengirim data sensor ke server
app.post('/api/sensor', (req, res) => {
  const { 
    suhu, 
    lembap, 
    nilaiLDR, 
    nilaiHujan, 
    gelap, 
    hujan,
    jemuranKeluar,
    kipasMenyala
  } = req.body;

  console.log(`[ESP32] Data diterima: Suhu=${suhu}°C, Lembap=${lembap}%, Hujan=${nilaiHujan}`);

  // Update data state
  if (suhu !== undefined) deviceState.suhu = suhu;
  if (lembap !== undefined) deviceState.lembap = lembap;
  if (nilaiLDR !== undefined) deviceState.nilaiLDR = nilaiLDR;
  if (gelap !== undefined) deviceState.gelap = gelap;
  if (jemuranKeluar !== undefined) deviceState.jemuranKeluar = jemuranKeluar;
  if (kipasMenyala !== undefined) deviceState.kipasMenyala = kipasMenyala;

  // Proses data sensor hujan dan riwayatnya
  if (nilaiHujan !== undefined) {
    deviceState.nilaiHujan = nilaiHujan;
    
    // Auto-detect resolusi sensor (10-bit: 1023 atau 12-bit: 4095)
    const maxVal = nilaiHujan > 1024 ? 4095 : 1023;
    const divisor = maxVal / 100;
    const percent = Math.round(Math.max(0, Math.min(100, 100 - (nilaiHujan / divisor))));
    
    const isRaining = hujan !== undefined ? hujan : (percent > 15);
    deviceState.hujan = isRaining;

    // Batasi penulisan history paling cepat 2 detik sekali agar tidak spamming
    const nowMs = Date.now();
    if (nowMs - lastHistoryTime >= 2000) {
      lastHistoryTime = nowMs;
      
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      deviceState.rainHistory.push({
        timestamp: timeStr,
        value: nilaiHujan,
        percent: percent,
        hujan: isRaining
      });

      // Batasi history maksimal 20 data terakhir
      if (deviceState.rainHistory.length > 20) {
        deviceState.rainHistory.shift();
      }
    }
  } else if (hujan !== undefined) {
    deviceState.hujan = hujan;
  }

  // Balasan ke ESP32: kirimkan mode control agar ESP32 tahu harus ngapain
  res.json({
    autoMode: deviceState.autoMode,
    targetJemuranKeluar: deviceState.manualJemuranKeluar,
    targetKipasMenyala: deviceState.manualKipasMenyala
  });
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Smart IoT Clothesline API is running on http://0.0.0.0:${port}`);
  console.log(`Endpoint untuk Mobile App: GET /api/status, POST /api/control`);
  console.log(`Endpoint untuk Arduino : POST /api/sensor`);
});
