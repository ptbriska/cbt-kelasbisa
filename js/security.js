/* ==========================================================================
   security.js - Engine Keamanan & Monitoring (FIXED: STRICT COUNTER 3X & LOGS)
   ========================================================================== */

window.App = window.App || {};

// Inisialisasi State Awal pada Object App
App.warningCount = parseInt(localStorage.getItem("cbt_warning_count"), 10) || 0;
try {
    const savedLogs = localStorage.getItem("cbt_violation_logs");
    App.warningLogs = savedLogs ? JSON.parse(savedLogs) : [];
} catch(e) {
    App.warningLogs = [];
}

let isWarningActive = false;
let blurDebounceTimer = null;
let lastViolationTimestamp = 0;
let isSecurityInitialized = false; // Flag cegah duplikasi listener

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
    
    // Cooldown 1.5 detik cegah double trigger
    if (now - lastViolationTimestamp < 1500) return;

    // Abaikan jika ujian belum mulai, sudah dikirim, atau sedang proses pengiriman
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting || isWarningActive) return;

    isWarningActive = true;
    lastViolationTimestamp = now;

    // 1. Hitung ulang & update counter
    let currentCount = parseInt(App.warningCount, 10);
    if (isNaN(currentCount)) currentCount = 0;
    
    currentCount += 1;
    App.warningCount = currentCount;

    const maxLimit = parseInt(App.MAX_WARNINGS, 10) || 3;

    // 2. Format Logging
    if (!Array.isArray(App.warningLogs)) {
        App.warningLogs = [];
    }

    const waktuSekarang = new Date();
    const timeString = waktuSekarang.toLocaleTimeString('id-ID');
    const timestampISO = waktuSekarang.toISOString();

    const logData = {
        peringatan_ke: currentCount,
        waktu: timeString,
        timestamp: timestampISO,
        alasan: alasan
    };
    App.warningLogs.push(logData);
    
    // Backup instan ke LocalStorage
    try {
        localStorage.setItem("cbt_warning_count", App.warningCount.toString());
        localStorage.setItem("cbt_violation_logs", JSON.stringify(App.warningLogs));
    } catch (e) {
        console.warn("Storage error/full:", e);
    }

    // 3. Evaluasi Batas Pelanggaran
    if (App.warningCount >= maxLimit) {
        // TEPAT DIBATAS MAKSIMAL (3x) -> AUTO SUBMIT
        isWarningActive = false;
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");

        alert(`🚨 PELANGGARAN KE-${App.warningCount} DARI ${maxLimit}!\n\nBatas toleransi telah habis (${alasan}). Ujian Anda akan diakhiri dan dikirim otomatis.`);

        if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        } else if (typeof window.submitJawaban === "function") {
            window.submitJawaban(true, true);
        }
    } else {
        // PELANGGARAN KE-1 DAN KE-2 -> HANYA PERINGATAN
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang berpindah halaman!`);
        
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${maxLimit})\n\nAlasan: ${alasan}.\nJangan ulangi lagi! Ujian akan otomatis dikirim jika mencapai ${maxLimit} kali.`);
        
        setTimeout(() => {
            isWarningActive = false;
        }, 500); 
    }
}

/**
 * Paksa Fullscreen
 */
function enforceFullscreen() {
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

/**
 * Inisialisasi Security Event Listeners
 */
function initSecurityListeners() {
    if (isSecurityInitialized) return;
    isSecurityInitialized = true;

    console.log("🛡️ Initializing Security Listeners (Limit 3x Strict Enforcement)...");

    // Re-sync State
    const savedCount = parseInt(localStorage.getItem("cbt_warning_count"), 10);
    App.warningCount = !isNaN(savedCount) ? savedCount : (App.warningCount || 0);
    
    try {
        const savedLogs = localStorage.getItem("cbt_violation_logs");
        if (savedLogs) App.warningLogs = JSON.parse(savedLogs);
    } catch(e) {}

    App.MAX_WARNINGS = 3;
    App.isSubmitting = false; 

    // 1. Deteksi Pindah Tab / Minimize
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Meninggalkan Tab / Membuka Browser Lain");
        }
    });

    // 2. Deteksi Alt+Tab / Hilang Fokus
    window.addEventListener("blur", () => {
        if (App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            clearTimeout(blurDebounceTimer);
            blurDebounceTimer = setTimeout(() => {
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

    // 4. Shortcut Kibor Terlarang
    document.addEventListener("keydown", (e) => {
        if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;

        if (e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
            e.preventDefault();
            prosesPeringatanKecurangan("Shortcut Screenshot (Win + Shift + S)");
            return false;
        }

        if (e.key === "F12") {
            e.preventDefault();
            prosesPeringatanKecurangan("Mencoba Membuka DevTools (F12)");
            return false;
        }

        if (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) {
            e.preventDefault();
            prosesPeringatanKecurangan("Mencoba Membuka Inspect Element");
            return false;
        }

        if (e.key === "PrintScreen" || e.keyCode === 44) {
            e.preventDefault();
            prosesPeringatanKecurangan("Menekan Tombol PrintScreen");
            return false;
        }
    });
}

// Expose fungsi ke Window
window.initSecurityListeners = initSecurityListeners;
window.prosesPeringatanKecurangan = prosesPeringatanKecurangan;
window.playVoiceWarning = playVoiceWarning;
window.enforceFullscreen = enforceFullscreen;

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
});
