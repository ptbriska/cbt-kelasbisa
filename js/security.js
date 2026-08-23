/* ==========================================================================
   security.js - Engine Keamanan & Monitoring (v1.8.4 - FIXED & SYNCHRONIZED)
   ========================================================================== */

window.App = window.App || {};

let isWarningActive = false;
let blurDebounceTimer = null;
let lastViolationTimestamp = 0; // Cooldown timer pencegah hitungan ganda

/**
 * Dummy WebCam Handler
 */
async function initWebcamProctoring() {
    console.log("ℹ️ Fitur Kamera dinonaktifkan.");
    App.isWebcamActive = false;
    App.webcamStream = null;
    return Promise.resolve(true);
}

function captureSnapshot() {
    return null;
}

/**
 * Peringatan Suara Bahasa Indonesia
 */
function playVoiceWarning(text) {
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch(e) {
            console.warn("Speech Synthesis error:", e);
        }
    }
}

/**
 * Penanganan Utama Peringatan Pelanggaran Ujian
 */
function prosesPeringatanKecurangan(alasan = "Pindah Tab / Minimize") {
    const now = Date.now();
    // Cooldown 1.5 Detik untuk mencegah pemicu ganda dari event bersamaan
    if (now - lastViolationTimestamp < 1500) return;

    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting || isWarningActive) return;

    isWarningActive = true;
    lastViolationTimestamp = now;

    App.warningCount = (parseInt(App.warningCount, 10) || 0) + 1;
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3; 

    if (!App.warningLogs) App.warningLogs = [];

    const waktuSekarang = new Date();
    const timeString = waktuSekarang.toLocaleTimeString('id-ID');
    const timestampISO = waktuSekarang.toISOString();

    const logData = {
        peringatan_ke: App.warningCount,
        waktu: timeString,
        timestamp: timestampISO,
        alasan: alasan,
        foto_captured: false
    };
    App.warningLogs.push(logData);
    
    // Backup ke LocalStorage
    try {
        localStorage.setItem("cbt_warning_count", App.warningCount.toString());
        localStorage.setItem("cbt_violation_logs", JSON.stringify(App.warningLogs));
    } catch (e) {
        console.warn("Storage penuh / di-block.");
    }

    if (App.warningCount >= App.MAX_WARNINGS) {
        // BATAS TOLERANSI HABIS -> AUTO SUBMIT INSTAN
        isWarningActive = false;

        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");

        if (typeof window.submitJawaban === "function") {
            window.submitJawaban(true, true);
        } else if (typeof submitJawaban === "function") {
            submitJawaban(true, true);
        } else if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        } else if (typeof submitJawabanScoring === "function") {
            submitJawabanScoring();
        } else if (typeof window.konfirmasiSubmit === "function") {
            window.konfirmasiSubmit(true);
        } else {
            console.error("Gagal auto-submit: Engine submit tidak ditemukan.");
        }

    } else {
        // SUARA PERINGATAN TAHAP PERTAMA / KEDUA
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\n\nAlasan: ${alasan}.\nPelanggaran telah dicatat!`);
        
        setTimeout(() => {
            isWarningActive = false;
        }, 500); 
    }
}

/**
 * Paksa Kembalikan Tampilan ke Fullscreen
 */
function enforceFullscreen() {
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

/**
 * Inisialisasi Event Listener Keamanan saat Ujian Dimulai
 */
function initSecurityListeners() {
    console.log("🛡️ Initializing Security Listeners (Fixed Auto-Submit & Sync Count)...");
    
    const savedCount = parseInt(localStorage.getItem("cbt_warning_count"), 10);
    App.warningCount = !isNaN(savedCount) ? savedCount : 0;
    
    try {
        const savedLogs = localStorage.getItem("cbt_violation_logs");
        App.warningLogs = savedLogs ? JSON.parse(savedLogs) : [];
    } catch(e) {
        App.warningLogs = [];
    }

    App.MAX_WARNINGS = App.MAX_WARNINGS || 3;
    App.isSubmitting = false; 

    // 1. Deteksi Pindah Tab / Minimize
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Meninggalkan Tab / Membuka Browser Lain");
        }
    });

    // 2. Deteksi Alt+Tab / Hilang Fokus Layar
    window.addEventListener("blur", () => {
        if (App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            clearTimeout(blurDebounceTimer);
            blurDebounceTimer = setTimeout(() => {
                // Jangan pemicu blur jika dokumen sudah terdeteksi hidden oleh visibilitychange
                if (!document.hasFocus() && !document.hidden && !App.isSubmitting && !App.isExamSubmitted) {
                    prosesPeringatanKecurangan("Fokus Layar Terlepas (Alt+Tab / Pindah Aplikasi)");
                }
            }, 800);
        }
    });

    window.addEventListener("focus", () => {
        clearTimeout(blurDebounceTimer);
    });

    // 3. Deteksi Keluar Fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Keluar dari Mode Fullscreen");
            setTimeout(enforceFullscreen, 1000);
        }
    });

    // 4. Deteksi Shortcut Kibor Terlarang
    document.addEventListener("keydown", (e) => {
        if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;

        // Shortcut Screenshot (Win + Shift + S)
        if (e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
            e.preventDefault();
            document.body.style.display = "none";
            setTimeout(() => { document.body.style.display = "block"; }, 1000);
            prosesPeringatanKecurangan("Shortcut Screenshot (Win + Shift + S)");
            return false;
        }

        // DevTools (F12)
        if (e.key === "F12") {
            e.preventDefault();
            prosesPeringatanKecurangan("Mencoba Membuka DevTools (F12)");
            return false;
        }

        // Inspect Element (Ctrl + Shift + I/J/C)
        if (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) {
            e.preventDefault();
            prosesPeringatanKecurangan("Mencoba Membuka Inspect Element (Ctrl+Shift+I/J/C)");
            return false;
        }

        // Shortcut Kombinasi Ctrl (Ctrl+U, S, P, C, V)
        if (e.ctrlKey && ["u", "U", "s", "S", "p", "P", "c", "C", "v", "V"].includes(e.key)) {
            e.preventDefault();
            prosesPeringatanKecurangan(`Shortcut Terlarang (Ctrl+${e.key.toUpperCase()})`);
            return false;
        }

        // PrintScreen
        if (e.key === "PrintScreen" || e.keyCode === 44) {
            e.preventDefault();
            if (navigator.clipboard) {
                navigator.clipboard.writeText("[Sistem Keamanan CBT] Tangkapan layar dilarang.").catch(() => {});
            }
            document.body.style.display = "none";
            setTimeout(() => { document.body.style.display = "block"; }, 1000);

            prosesPeringatanKecurangan("Menekan Tombol PrintScreen (Capture Layar)");
            return false;
        }
    });
}

// Expose Fungsi ke Global Window
window.initSecurityListeners = initSecurityListeners;
window.initWebcamProctoring = initWebcamProctoring;
window.captureSnapshot = captureSnapshot;
window.prosesPeringatanKecurangan = prosesPeringatanKecurangan;
window.playVoiceWarning = playVoiceWarning;
window.enforceFullscreen = enforceFullscreen;

// Blokir Klik Kanan Pasif
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
});
