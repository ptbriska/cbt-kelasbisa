// ==========================================================
// main.js - Entry Point & Window Bridge Handler (v1.3.0)
// ==========================================================

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
    
    // Navigasi & Rendering Soal
    if (typeof navigasi === "function") window.navigasi = navigasi;
    if (typeof loadQuestion === "function") window.loadQuestion = loadQuestion;
    if (typeof renderNumberGrid === "function") window.renderNumberGrid = renderNumberGrid;
    if (typeof toggleNavigator === "function") window.toggleNavigator = toggleNavigator;

    // Alur Persetujuan & Pindah Halaman
    if (typeof toggleMulaiButton === "function") window.toggleMulaiButton = toggleMulaiButton;
    if (typeof kembaliKePage1 === "function") window.kembaliKePage1 = kembaliKePage1;
    if (typeof mulaiUjianPenuh === "function") window.mulaiUjianPenuh = mulaiUjianPenuh;

    // Konfirmasi & Dialog Actions
    window.konfirmasiSubmit = function() {
        const total = App.questionsData.length;
        const dijawab = Object.keys(App.userAnswers).length;

        if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian CBT?`)) {
            if (typeof submitJawaban === "function") {
                submitJawaban();
            }
        }
    };

    window.konfirmasiKeluar = function() {
        if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
            location.reload();
        }
    };
});
