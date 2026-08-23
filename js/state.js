// ==========================================================
// state.js - Centralized Application State Engine (v1.6.0 - NO CAMERA & FAST SYNC)
// ==========================================================

// Inisialisasi Objek Global State App secara aman
window.App = window.App || {};

Object.assign(window.App, {
    // Endpoint Backend Google Apps Script Web App
    WEBHOOK_URL: window.App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // State Soal & Konfigurasi Paket
    questionsDataConfig: window.App.questionsDataConfig || {},
    soalData: window.App.soalData || null,
    questionsData: window.App.questionsData || [],
    validToken: window.App.validToken || "",
    timerDurationMinutes: window.App.timerDurationMinutes || 10,
    currentIndex: window.App.currentIndex || 0,
    userAnswers: window.App.userAnswers || {}, 
    userIdentitas: window.App.userIdentitas || {},
    timerInterval: window.App.timerInterval || null,
    currentKodeUjian: window.App.currentKodeUjian || "",
    startTime: window.App.startTime || "",
    
    // State Verifikasi Peserta
    isVerified: window.App.isVerified || false,
    verifiedPesertaData: window.App.verifiedPesertaData || null,
    daftarPesertaValid: window.App.daftarPesertaValid || [],

    // State Mode Ujian & Scoring Engine
    modeUjian: window.App.modeUjian || "LATIHAN", 
    modePenilaian: window.App.modePenilaian || "1A", 
    skorConfig: window.App.skorConfig || {
        skor_benar: 1.0,
        skor_salah: 0.0,
        skor_kosong: 0.0,
        use_scaling_100: false,
        bobot_level: { 
            E: 1.0, M: 3.0, H: 5.0,
            EASY: 1.0, MEDIUM: 3.0, HARD: 5.0 
        }
    },

    // State Anti-Kecurangan & Lock Engine (Kamera Dimatikan)
    isExamStarted: window.App.isExamStarted || false,
    isExamSubmitted: window.App.isExamSubmitted || false,
    isSubmitting: window.App.isSubmitting || false,
    warningCount: window.App.warningCount || 0,
    MAX_WARNINGS: window.App.MAX_WARNINGS || 3,
    warningLogs: window.App.warningLogs || [],
    
    // Fitur Kamera Dinonaktifkan Total
    cheatingSnapshots: [],
    isWebcamActive: false,
    webcamStream: null
});
