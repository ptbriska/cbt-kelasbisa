// ==========================================================
// main.js - Entry Point & Window Bridge Handler (v1.5.0 - FIXED PREMATURE LOCK)
// ==========================================================

// Inisialisasi Objek Global State App
window.App = window.App || {
    verifiedPesertaData: null,
    userIdentitas: null,
    soalData: null,
    questionsData: [],
    userAnswers: {},
    currentIndex: 0,
    modePenilaian: "1A",
    skorConfig: null,
    currentKodeUjian: "",
    modeUjian: "UTAMA",
    timerDurationMinutes: 10,
    isExamStarted: false,
    isExamSubmitted: false,
    isSubmitting: false, // Bypass sensor keamanan saat proses submit/modal
    
    // State Pengawasan Keamanan & Proctoring
    warningCount: 0,
    MAX_WARNINGS: 3,
    warningLogs: [],
    isWebcamActive: false,
    webcamStream: null
};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Muat Database Peserta saat aplikasi pertama kali dibuka
    if (typeof loadDaftarPeserta === "function") {
        await loadDaftarPeserta();
    }

    // 2. Attach Event Listener Tombol Verifikasi
    const btnCek = document.getElementById("btn-cek-verifikasi");
    if (btnCek && typeof cekVerifikasiPeserta === "function") {
        btnCek.addEventListener("click", (e) => {
            e.preventDefault();
            cekVerifikasiPeserta();
        });
    }

    // ==========================================================
    // EXPOSE FUNGSI KE GLOBAL (WINDOW) UNTUK HANDLER INLINE HTML
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

    // Sistem Keamanan & Proctoring
    if (typeof initSecurityListeners === "function") window.initSecurityListeners = initSecurityListeners;
    if (typeof initWebcamProctoring === "function") window.initWebcamProctoring = initWebcamProctoring;
    if (typeof prosesPeringatanKecurangan === "function") window.prosesPeringatanKecurangan = prosesPeringatanKecurangan;

    // Engine Penilaian & Modal UI
    if (typeof submitJawaban === "function") window.submitJawaban = submitJawaban;
    if (typeof tampilkanPanelKonfirmasi === "function") window.tampilkanPanelKonfirmasi = tampilkanPanelKonfirmasi;

    // ==========================================================
    // Konfirmasi & Dialog Actions
    // ==========================================================
    
    /**
     * Mengunci LocalStorage HANYA jika dipanggil setelah konfirmasi YA
     */
    window.simpanLockSubmitted = function() {
        if (window.App && App.modeUjian === "SIMULASI" && App.currentKodeUjian) {
            const dataPeserta = App.verifiedPesertaData || App.userIdentitas || {};
            const namaUser = dataPeserta["Nama Lengkap"] || dataPeserta.nama || "USER";
            const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
            localStorage.setItem(lockKey, "TRUE");
        }
    };

    window.konfirmasiSubmit = function() {
        // Panggil submitJawaban (tanpa mengunci localStorage dulu)
        if (typeof submitJawaban === "function") {
            submitJawaban(false, false);
        }
    };

    window.konfirmasiKeluar = function() {
        // Matikan sensor keamanan sementara agar konfirmasi keluar tidak dianggap kecurangan
        if (window.App) App.isSubmitting = true; 

        if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
            if (window.App && App.timerInterval) {
                clearInterval(App.timerInterval);
            }

            if (window.App && App.webcamStream) {
                App.webcamStream.getTracks().forEach(track => track.stop());
            }

            localStorage.removeItem("cbt_violation_logs");
            location.reload();
        } else {
            // Jika batal keluar, aktifkan kembali sensor
            setTimeout(() => { 
                if (window.App) App.isSubmitting = false; 
            }, 500);
        }
    };
});
