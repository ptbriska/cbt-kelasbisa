// ==========================================================
// state.js - Centralized Application State Engine (v1.6.3 - Dynamic Multi-Type Scoring)
// ==========================================================

// Inisialisasi Objek Global State App secara aman
window.App = window.App || {};

Object.assign(window.App, {
    // Endpoint Backend Google Apps Script Web App
    WEBHOOK_URL: window.App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // State Soal & Konfigurasi Paket Ujian
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

    // State Mode Ujian & Scoring Engine v1.6.3 (Dynamic Rules per Type)
    modeUjian: window.App.modeUjian || "LATIHAN", 
    modePenilaian: window.App.modePenilaian || "DYNAMIC", 
    isScoringCompleted: window.App.isScoringCompleted || false,
    scoringRules: window.App.scoringRules || {
        "1A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "1B": { "skor_benar": 4.0, "skor_salah": -1.0, "skor_kosong": 0.0 },
        "1C": { "bobot_level": { "E": 1.0, "M": 3.0, "H": 5.0 }, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "2A": { "skor_benar_semua": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "3A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "3B": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "4A": { "skor_per_baris_benar": 1.0, "skor_per_baris_salah": 0.0, "skor_per_baris_kosong": 0.0 },
        "5A": { "skor_kosong": 0.0 }
    },

    // State Anti-Kecurangan & Lock Engine (Non-Camera Proctoring)
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
