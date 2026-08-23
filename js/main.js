// ==========================================================
// main.js - Entry Point & Window Bridge Handler (v1.5.0 - NO CAMERA & FAST SUBMIT)
// ==========================================================

// 1. Inisialisasi Objek Global State App Safe-Guard
window.App = window.App || {};

// Assign default values jika belum didefinisikan
Object.assign(window.App, {
    verifiedPesertaData: App.verifiedPesertaData || null,
    userIdentitas: App.userIdentitas || null,
    soalData: App.soalData || null,
    questionsData: App.questionsData || [],
    userAnswers: App.userAnswers || {},
    currentIndex: App.currentIndex || 0,
    
    // Konfigurasi Penilaian & Soal
    modePenilaian: App.modePenilaian || "1A", 
    skorConfig: App.skorConfig || {
        skor_benar: 1,
        skor_salah: 0,
        skor_kosong: 0,
        bobot_level: { EASY: 1, MEDIUM: 2, HARD: 3 },
        use_scaling_100: false
    },
    
    currentKodeUjian: App.currentKodeUjian || "",
    modeUjian: App.modeUjian || "LATIHAN",
    timerDurationMinutes: App.timerDurationMinutes || 10,
    WEBHOOK_URL: App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec",
    
    // Flag Alur Ujian
    isExamStarted: App.isExamStarted || false,
    isExamSubmitted: App.isExamSubmitted || false,
    isSubmitting: App.isSubmitting || false,

    // State Keamanan (Kamera/Webcam Dinonaktifkan)
    warningCount: App.warningCount || 0,
    MAX_WARNINGS: App.MAX_WARNINGS || 3,
    warningLogs: App.warningLogs || [],
    cheatingSnapshots: [], // Kamera dimatikan, snapshot selalu kosong
    isWebcamActive: false,
    webcamStream: null,
    timerInterval: App.timerInterval || null
});

// ==========================================================
// BRIDGE INTEGRASI & DUMMY KAMERA HANDLER
// ==========================================================

// Dummy function agar tidak galat jika skrip lain memanggil pengawasan kamera
window.initWebcamProctoring = function() {
    console.log("ℹ️ Fitur Kamera / Proctoring WebCam dinonaktifkan.");
    return Promise.resolve(true);
};

// Expose fungsi pendukung jika terdefinisi
if (typeof processPeringatanKecurangan === "function") window.prosesPeringatanKecurangan = processPeringatanKecurangan;
if (typeof initSecurityListeners === "function") window.initSecurityListeners = initSecurityListeners;

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
        checkbox.addEventListener("change", () => {
            if (typeof toggleMulaiButton === "function") toggleMulaiButton();
            else if (typeof window.toggleMulaiButton === "function") window.toggleMulaiButton();
        });
        
        // Trigger initial state
        if (typeof toggleMulaiButton === "function") toggleMulaiButton();
        else if (typeof window.toggleMulaiButton === "function") window.toggleMulaiButton();
    }

    // ==========================================================
    // EXPOSE FUNGSI KE GLOBAL (WINDOW)
    // ==========================================================
    
    // Auth & Verifikasi
    if (typeof loadDaftarPeserta === "function") window.loadDaftarPeserta = loadDaftarPeserta;
    if (typeof cekVerifikasiPeserta === "function") window.cekVerifikasiPeserta = cekVerifikasiPeserta;

    // Navigasi & Rendering Soal
    if (typeof navigasi === "function") window.navigasi = navigasi;
    if (typeof loadQuestion === "function") window.loadQuestion = loadQuestion;
    if (typeof renderNumberGrid === "function") window.renderNumberGrid = renderNumberGrid;
    if (typeof toggleNavigator === "function") window.toggleNavigator = toggleNavigator;

    // Alur Persetujuan & Pindah Halaman
    if (typeof toggleMulaiButton === "function") window.toggleMulaiButton = toggleMulaiButton;
    if (typeof kembaliKePage1 === "function") window.kembaliKePage1 = kembaliKePage1;
    if (typeof mulaiUjianPenuh === "function") window.mulaiUjianPenuh = mulaiUjianPenuh;

    // Engine Penilaian & Modal UI
    if (typeof submitJawabanScoring === "function") window.submitJawabanScoring = submitJawabanScoring;
    if (typeof submitJawaban === "function") window.submitJawaban = submitJawaban;
    if (typeof tampilkanPanelKonfirmasi === "function") window.tampilkanPanelKonfirmasi = tampilkanPanelKonfirmasi;

    // ==========================================================
    // HELPER ACTIONS & FAST SUBMIT BRIDGE
    // ==========================================================
    
    /**
     * Mengunci LocalStorage setelah submit
     */
    window.simpanLockSubmitted = function() {
        const mode = (App.modeUjian || "").toUpperCase();
        if (window.App && (mode === "SIMULASI" || mode === "LATIHAN") && App.currentKodeUjian) {
            const dataPeserta = App.verifiedPesertaData || App.userIdentitas || {};
            const namaUser = dataPeserta["Nama Lengkap"] || dataPeserta.nama || "USER";
            const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
            localStorage.setItem(lockKey, "TRUE");
        }
    };

    /**
     * Eksekusi Pengumpulan Ujian Secara Cepat
     */
    window.konfirmasiSubmit = function() {
        if (window.App) App.isSubmitting = true;
        
        if (typeof submitJawaban === "function") {
            submitJawaban(false, true);
        } else if (typeof window.submitJawaban === "function") {
            window.submitJawaban(false, true);
        } else if (typeof submitJawabanScoring === "function") {
            submitJawabanScoring();
        } else if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        }
    };

    /**
     * Dialog Keluar dari Ujian
     */
    window.konfirmasiKeluar = function() {
        if (window.App) App.isSubmitting = true; 

        if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
            if (window.App && App.timerInterval) {
                clearInterval(App.timerInterval);
            }

            localStorage.removeItem("cbt_violation_logs");
            location.reload();
        } else {
            setTimeout(() => { 
                if (window.App) App.isSubmitting = false; 
            }, 300);
        }
    };
});
