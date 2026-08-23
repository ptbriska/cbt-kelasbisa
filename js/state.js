// ==========================================================
// state.js - Centralized Application State Engine (v1.5.4 - FIXED)
// ==========================================================

window.App = Object.assign(window.App || {}, {
    // Endpoint Backend Google Apps Script Web App
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // State Soal & Konfigurasi Paket
    questionsDataConfig: {},
    soalData: null,
    questionsData: [],
    validToken: "",
    timerDurationMinutes: 10,
    currentIndex: 0,
    userAnswers: {}, 
    userIdentitas: {},
    timerInterval: null,
    currentKodeUjian: "",
    startTime: "",
    
    // State Verifikasi Peserta
    isVerified: false,
    verifiedPesertaData: null,
    daftarPesertaValid: [],

    // State Mode Ujian & Scoring Engine (Sesuai Konfigurasi JSON)
    modeUjian: "LATIHAN", // Nilai default: "SIMULASI" / "LATIHAN"
    modePenilaian: "1A", 
    skorConfig: {
        skor_benar: 1.0,
        skor_salah: 0.0,
        skor_kosong: 0.0,
        use_scaling_100: false,
        bobot_level: { 
            E: 1.0, M: 3.0, H: 5.0,
            EASY: 1.0, MEDIUM: 3.0, HARD: 5.0 
        }
    },

    // State Anti-Kecurangan, Lock Engine & Proctoring
    isExamStarted: false,
    isExamSubmitted: false,
    isSubmitting: false, // Wajib ada untuk penanganan bypass sensor saat modal/submit
    warningCount: 0,
    MAX_WARNINGS: 3,
    warningLogs: [],
    cheatingSnapshots: [], // Ditambahkan agar wadah foto bukti kecurangan terinisialisasi
    isWebcamActive: false,
    webcamStream: null
});
