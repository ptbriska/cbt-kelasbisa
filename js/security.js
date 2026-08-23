/* ==========================================================================
   security.js - Engine Keamanan & Monitoring (v1.8.1 - VOICE & FULL NOTIF - NO CAMERA)
   Sistem Pengawasan Ringan: Voice Warning Active, Audit Log Teks, No Camera/Drive
   ========================================================================== */

window.App = window.App || {};

let isWarningActive = false;
let blurDebounceTimer = null;

/**
 * Dummy WebCam Handler (Hanya untuk kompatibilitas agar sistem tidak error)
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
 * Mengirim data log kecurangan teks secara Non-Blocking (Background Process)
 */
function uploadLogKecurangan(alasanPelanggaran) {
    const webhookUrl = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";
    if (!webhookUrl || webhookUrl.trim() === "") return;

    const p = App.verifiedPesertaData || App.userIdentitas || {};
    const namaPeserta = p["Nama Lengkap"] || p.nama || "Tanpa Nama";
    const examData = App.examData || {};
    const kodeUjian = examData.kode_ujian || App.currentKodeUjian || p.kode_ujian || "NO-KODE";

    const ringkasanLogText = (App.warningLogs || [])
        .map(l => `[${l.waktu}] ${l.alasan}`)
        .join(" | ");

    const payload = {
        action: "LOG_PELANGGARAN",
        kode_ujian: kodeUjian,
        nama_peserta: namaPeserta,
        jumlah_pelanggaran: App.warningCount || 1,
        log_kecurangan: ringkasanLogText || alasanPelanggaran,
        alasan_terakhir: alasanPelanggaran,
        identitas: p,
        image_base64: "" // Dikosongkan (kamera nonaktif)
    };

    fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).catch(err => console.warn("Background upload log kecurangan error:", err));
}

/**
 * Peringatan Suara Bahasa Indonesia (VOICE WARNING ACTIVE)
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
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting || isWarningActive) return;

    isWarningActive = true;
    App.warningCount = (App.warningCount || 0) + 1;
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3; 

    if (!App.warningLogs) App.warningLogs = [];

    const timeString = new Date().toLocaleTimeString('id-ID');
    const timestampISO = new Date().toISOString();

    const logData = {
        peringatan_ke: App.warningCount,
        waktu: timeString,
        timestamp: timestampISO,
        alasan: alasan,
        foto_captured: false
    };
    App.warningLogs.push(logData);
    
    try {
        localStorage.setItem("cbt_violation_logs", JSON.stringify(App.warningLogs));
    } catch (e) {
        console.warn("Storage penuh / di-block.");
    }

    // Kirim data log teks di background
    uploadLogKecurangan(alasan);

    if (App.warningCount >= App.MAX_WARNINGS) {
        // SUARA PERINGATAN FINAL
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        
        App.isSubmitting = true; 
        alert(`🚨 BATAS MAKSIMAL KECURANGAN TERCAPAI (${App.warningCount}/${App.MAX_WARNINGS})!\n\nAlasan: ${alasan}.\nUjian otomatis diakhiri.`);

        isWarningActive = false;

        // Auto-submit paksa instan
        if (typeof window.submitJawaban === "function") {
            window.submitJawaban(true, true);
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
        // SUARA PERINGATAN TAHAP PERTAMA/KEDUA
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\n\nAlasan: ${alasan}.\nPelanggaran telah dicatat!`);
        
        setTimeout(() => {
            isWarningActive = false;
        }, 1200); 
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
    console.log("🛡️ Initializing Security Listeners (Voice & Text Violation Log Active)...");
    App.warningCount = 0;
    App.warningLogs = [];
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
                if (!document.hasFocus() && !App.isSubmitting) {
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

        // Screenshot Shortcut (Win + Shift + S)
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
