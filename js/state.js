// ==========================================================
// state.js - Centralized Application State Engine (v1.3.0)
// ==========================================================

window.App = {
    // Endpoint Backend Google Apps Script Web App
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwrFDLCm2S-6q9r4M_8QvY1ZThBptmS1K9_X0o9TqH99R41Q/exec",
    
    // State Soal & Konfigurasi Paket
    questionsDataConfig: {},
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
    skorConfig: {},

    // State Anti-Kecurangan & Lock Engine
    isExamStarted: false,
    isExamSubmitted: false,
    warningCount: 0,
    MAX_WARNINGS: 3
};
