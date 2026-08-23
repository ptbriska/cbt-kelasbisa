// main.js
import { App } from './state.js';
import { cekVerifikasiPeserta } from './auth.js';
import { startTimer, handleVisibilityChange, handleWindowBlur } from './security.js';
import { loadQuestion, renderNumberGrid, navigasi } from './exam.js';
import { submitJawaban } from './scoring.js';

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Tombol Verifikasi
    const btnCek = document.getElementById("btn-cek-verifikasi");
    if (btnCek) btnCek.addEventListener("click", e => {
        e.preventDefault();
        cekVerifikasiPeserta();
    });

    // 2. Form Identitas Lanjut
    document.getElementById("form-identitas")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        // ... (Pindahkan logika ambil soal JSON, set App config, dan pindah Page 2 kesini)
    });

    // 3. Kontrol Navigasi Soal (Expose ke window jika dipanggil via onclick="navigasi(1)" di HTML)
    window.navigasi = navigasi;
    window.toggleMulaiButton = function() {
        const isChecked = document.getElementById("check-setuju").checked;
        const btnMulai = document.getElementById("btn-mulai-ujian");
        btnMulai.disabled = !isChecked;
        btnMulai.classList.toggle("btn-start-disabled", !isChecked);
    };

    window.mulaiUjianPenuh = function() {
        document.getElementById("page-info").classList.add("hidden");
        document.getElementById("page-cbt").classList.remove("hidden");
        
        App.isExamStarted = true;
        renderNumberGrid();
        loadQuestion(App.currentIndex);
        startTimer(App.timerDurationMinutes * 60);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
    };
});
