// ==========================================================
// main.js - Entry Point & Window Bridge Handler (v1.3.4)
// ==========================================================

// ⚠️ PASTI INI DILAKUKAN SEBELUM EVENT DOMContentLoaded
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
    isExamStarted: false,
    isExamSubmitted: false
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

    // Engine Penilaian & Webhook
    if (typeof submitJawaban === "function") window.submitJawaban = submitJawaban;

    // Konfirmasi & Dialog Actions
    window.konfirmasiSubmit = function() {
        if (!window.App || !App.questionsData) return;

        const total = App.questionsData.length;
        const dijawab = Object.keys(App.userAnswers || {}).length;

        if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian CBT?`)) {
            // Pasang gembok submit jika dalam Mode SIMULASI
            if (App.modeUjian === "SIMULASI" && App.currentKodeUjian) {
                const dataPeserta = App.verifiedPesertaData || App.userIdentitas || {};
                const namaUser = dataPeserta["Nama Lengkap"] || dataPeserta.nama || "USER";[cite: 1]
                const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
                localStorage.setItem(lockKey, "TRUE");
            }

            if (typeof submitJawaban === "function") {
                submitJawaban();
            }
        }
    };

    window.konfirmasiKeluar = function() {
        if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
            // Hentikan timer jika ada
            if (window.App && App.timerInterval) {
                clearInterval(App.timerInterval);
            }
            location.reload();
        }
    };
});
