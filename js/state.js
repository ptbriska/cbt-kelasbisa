// state.js
export const App = {
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwrFDLCm2S-6q9r4M_8QvY1ZThBptmS1K9_X0o9TqH99R41Q/exec",
    questionsDataConfig: {},
    questionsData: [],
    validToken: "",
    timerDurationMinutes: 60,
    currentIndex: 0,
    userAnswers: {}, 
    userIdentitas: {},
    timerInterval: null,
    currentKodeUjian: "",
    
    // State Verifikasi
    isVerified: false,
    verifiedPesertaData: null,
    daftarPesertaValid: [],

    // State Ujian
    modeUjian: "LATIHAN",
    modePenilaian: "1A", 
    skorConfig: {},
    isExamStarted: false,
    isExamSubmitted: false,
    warningCount: 0,
    MAX_WARNINGS: 3
};
