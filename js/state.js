// ==========================================================
// state.js - Centralized Application State Engine (v1.4.0)
// ==========================================================

window.App = Object.assign(window.App || {}, {
    // Endpoint Backend Google Apps Script Web App
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // State Soal & Konfigurasi Paket
    questionsDataConfig: {},
    soalData: null,
    questionsData: [],
    validToken: "",
    timerDurationMinutes: 60,
    currentIndex: 0,
    userAnswers: {}, 
    userIdentitas: {},
    timerInterval: null,
    currentKodeUjian: "",
    
    // State Verifikasi Peserta
    isVerified: false,
    verifiedPesertaData: null,
    daftarPesertaValid: [],

    // State Mode Ujian & Scoring Engine
    modeUjian: "LATIHAN",
    modePenilaian: "1A", 
    skorConfig: {
        skor_benar: 1.0,
        skor_salah: 0.0,
        skor_kosong: 0.0,
        use_scaling_100: false,
        bobot_level: { E: 1.0, M: 3.0, H: 5.0 }
    },

    // State Anti-Kecurangan & Lock Engine
    isExamStarted: false,
    isExamSubmitted: false,
    warningCount: 0,
    MAX_WARNINGS: 3
});
