// ==========================================================
// main.js - Entry Point & Window Bridge Handler (v1.6.0)
// ==========================================================

// 1. Inisialisasi Objek Global State App Safe-Guard
window.App = window.App || {};

// Assign default values secara langsung (Global Initialization)
Object.assign(window.App, {
    verifiedPesertaData: window.App.verifiedPesertaData || null,
    userIdentitas: window.App.userIdentitas || null,
    soalData: window.App.soalData || null,
    questionsData: window.App.questionsData || [],
    userAnswers: window.App.userAnswers || {},
    currentIndex: window.App.currentIndex || 0,
    
    // Konfigurasi Penilaian & Soal
    modePenilaian: window.App.modePenilaian || "1A", 
    skorConfig: window.App.skorConfig || {
        skor_benar: 1,
        skor_salah: 0,
        skor_kosong: 0,
        bobot_level: { EASY: 1, MEDIUM: 2, HARD: 3 },
        use_scaling_100: false
    },
    
    currentKodeUjian: window.App.currentKodeUjian || "",
    modeUjian: window.App.modeUjian || "LATIHAN",
    timerDurationMinutes: window.App.timerDurationMinutes || 10,
    WEBHOOK_URL: window.App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // Flag Alur Ujian
    isExamStarted: window.App.isExamStarted || false,
    isExamSubmitted: window.App.isExamSubmitted || false,
    isSubmitting: window.App.isSubmitting || false,

    // State Keamanan (Kamera/Webcam Dinonaktifkan)
    warningCount: window.App.warningCount || 0,
    MAX_WARNINGS: window.App.MAX_WARNINGS || 3,
    warningLogs: window.App.warningLogs || [],
    cheatingSnapshots: [], // Kamera dimatikan, snapshot selalu kosong
    isWebcamActive: false,
    webcamStream: null,
    timerInterval: window.App.timerInterval || null
});

// ==========================================================
// BRIDGE INTEGRASI & DUMMY KAMERA HANDLER
// ==========================================================

// Dummy function agar tidak crash jika skrip lain memanggil webcam
window.initWebcamProctoring = function() {
    console.log("ℹ️ Fitur Kamera / Proctoring WebCam dinonaktifkan.");
    return Promise.resolve(true);
};

/**
 * Mengunci LocalStorage setelah submit
 */
window.simpanLockSubmitted = function() {
    const mode = (window.App.modeUjian || "").toUpperCase();
    if (window.App && (mode === "SIMULASI" || mode === "LATIHAN") && window.App.currentKodeUjian) {
        const dataPeserta = window.App.verifiedPesertaData || window.App.userIdentitas || {};
        const namaUser = dataPeserta["Nama Lengkap"] || dataPeserta.nama || "USER";
        const lockKey = `SUBMITTED_${window.App.currentKodeUjian}_${namaUser}`;
        localStorage.setItem(lockKey, "TRUE");
    }
};

/**
 * Eksekusi Pengumpulkan Ujian Secara Langsung & Cepat (Fast-Path Fix)
 */
window.konfirmasiSubmit = function() {
    if (window.App) window.App.isSubmitting = true;
    
    // Matikan timer langsung jika sedang berjalan
    if (window.App && window.App.timerInterval) {
        clearInterval(window.App.timerInterval);
        window.App.timerInterval = null;
    }

    // Prioritaskan eksekusi langsung Engine Scoring tanpa perantara
    if (typeof submitJawabanScoring === "function") {
        submitJawabanScoring();
    } else if (typeof window.submitJawabanScoring === "function") {
        window.submitJawabanScoring();
    } else if (typeof submitJawaban === "function") {
        submitJawaban(false, true);
    } else if (typeof window.submitJawaban === "function") {
        window.submitJawaban(false, true);
    }
};

/**
 * Bridge Navigasi ke Halaman Pembahasan Jawaban & Rapor Peserta (Answer.js / Report.js)
 */
window.bukaHalamanKunciJawaban = function() {
    if (typeof renderHalamanPembahasan === "function") {
        renderHalamanPembahasan();
    } else if (typeof window.renderHalamanPembahasan === "function") {
        window.renderHalamanPembahasan();
    } else if (typeof renderAnswerPage === "function") {
        renderAnswerPage();
    } else if (typeof window.renderAnswerPage === "function") {
        window.renderAnswerPage();
    } else {
        console.warn("⚠️ Fungsi render pembahasan belum terdeteksi di answer.js!");
        alert("Membuka Halaman Pembahasan Jawaban dan Rapor Peserta...");
    }
};

/**
 * Dialog Keluar dari Ujian
 */
window.konfirmasiKeluar = function() {
    if (window.App) window.App.isSubmitting = true; 

    if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
        if (window.App && window.App.timerInterval) {
            clearInterval(window.App.timerInterval);
        }

        localStorage.removeItem("cbt_violation_logs");
        location.reload();
    } else {
        setTimeout(() => { 
            if (window.App) window.App.isSubmitting = false; 
        }, 300);
    }
};

// ==========================================================
// EVENT LISTENER LOAD
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Muat Database Peserta saat pertama kali dibuka
    if (typeof loadDaftarPeserta === "function") {
        await loadDaftarPeserta().catch(err => console.warn("Load peserta error:", err));
    }

    // 2. Attach Event Listener Tombol Verifikasi
    const btnCek = document.getElementById("btn-cek-verifikasi");
    if (btnCek) {
        btnCek.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof cekVerifikasiPeserta === "function") {
                cekVerifikasiPeserta();
            } else if (typeof window.cekVerifikasiPeserta === "function") {
                window.cekVerifikasiPeserta();
            }
        });
    }

    // 3. Attach Event Listener Checkbox Persetujuan Ujian
    const checkbox = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    if (checkbox) {
        const handleToggle = () => {
            if (typeof toggleMulaiButton === "function") toggleMulaiButton();
            else if (typeof window.toggleMulaiButton === "function") window.toggleMulaiButton();
        };

        checkbox.addEventListener("change", handleToggle);
        
        // Trigger initial state
        handleToggle();
    }

    // 4. Synergize Global References
    if (typeof processPeringatanKecurangan === "function") window.prosesPeringatanKecurangan = processPeringatanKecurangan;
    if (typeof initSecurityListeners === "function") window.initSecurityListeners = initSecurityListeners;
    if (typeof loadDaftarPeserta === "function") window.loadDaftarPeserta = loadDaftarPeserta;
    if (typeof cekVerifikasiPeserta === "function") window.cekVerifikasiPeserta = cekVerifikasiPeserta;
    if (typeof navigasi === "function") window.navigasi = navigasi;
    if (typeof loadQuestion === "function") window.loadQuestion = loadQuestion;
    if (typeof renderNumberGrid === "function") window.renderNumberGrid = renderNumberGrid;
    if (typeof toggleNavigator === "function") window.toggleNavigator = toggleNavigator;
    if (typeof toggleMulaiButton === "function") window.toggleMulaiButton = toggleMulaiButton;
    if (typeof kembaliKePage1 === "function") window.kembaliKePage1 = kembaliKePage1;
    if (typeof mulaiUjianPenuh === "function") window.mulaiUjianPenuh = mulaiUjianPenuh;
    if (typeof submitJawabanScoring === "function") window.submitJawabanScoring = submitJawabanScoring;
    if (typeof submitJawaban === "function") window.submitJawaban = submitJawaban;
    if (typeof tampilkanPanelKonfirmasi === "function") window.tampilkanPanelKonfirmasi = tampilkanPanelKonfirmasi;
    
    // Bridge Pembahasan & Rapor (Jawaban)
    if (typeof bukaHalamanKunciJawaban === "function") window.bukaHalamanKunciJawaban = bukaHalamanKunciJawaban;
});
