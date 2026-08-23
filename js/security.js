// ==========================================================
// security.js - Engine Keamanan & Photo Proctoring (v1.6.2 - FAST SUBMIT)
// Terintegrasi dengan Dynamic Scoring, Webhook GAS, & State App
// ==========================================================

window.App = window.App || {};

let isWarningActive = false;
let blurDebounceTimer = null;

/**
 * Inisialisasi Akses Kamera WebCam di awal ujian
 */
async function initWebcamProctoring() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
        });
        
        let videoEl = document.getElementById("proctoring-video");
        if (!videoEl) {
            videoEl = document.createElement("video");
            videoEl.id = "proctoring-video";
            videoEl.setAttribute("autoplay", "");
            videoEl.setAttribute("playsinline", "");
            videoEl.setAttribute("muted", "");
            videoEl.style.display = "none";
            document.body.appendChild(videoEl);
        }
        videoEl.srcObject = stream;
        App.webcamStream = stream;
        App.isWebcamActive = true;
        console.log("📷 WebCam Proctoring Berhasil Diaktifkan.");
    } catch (err) {
        console.warn("⚠️ Kamera WebCam tidak diizinkan atau tidak tersedia:", err);
        App.isWebcamActive = false;
    }
}

/**
 * Mengambil Snapshot Foto Wajah (Output: Base64 JPEG)
 * Dikompresi ke 400px agar payload ringan & cepat
 */
function captureSnapshot() {
    if (!App.isWebcamActive) return null;

    const videoEl = document.getElementById("proctoring-video");
    if (!videoEl || !videoEl.videoWidth) return null;

    try {
        const canvas = document.createElement("canvas");
        const scale = 400 / videoEl.videoWidth;
        canvas.width = 400;
        canvas.height = videoEl.videoHeight * scale;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL("image/jpeg", 0.6);
    } catch (e) {
        console.error("Gagal mengambil snapshot webcam:", e);
        return null;
    }
}

/**
 * Mengirim data kecurangan & foto secara Non-Blocking (Background Process)
 */
function uploadFotoKecuranganToDrive(fotoBase64, alasanPelanggaran) {
    const webhookUrl = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";
    if (!webhookUrl) return;

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
        image_base64: fotoBase64 || ""
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Dijalankan secara asynchronous tanpa menyandera alur utama
    fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal
    }).then(() => {
        clearTimeout(timeoutId);
        console.log("📷 Log kecurangan terkirim di background.");
    }).catch(err => {
        clearTimeout(timeoutId);
        console.warn("Background upload kecurangan gagal/timeout:", err);
    });
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
 * Penanganan Utama Peringatan & Rekam Bukti Pelanggaran
 */
function prosesPeringatanKecurangan(alasan = "Pindah Tab / Minimize") {
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting || isWarningActive) return;

    isWarningActive = true;
    App.warningCount = (App.warningCount || 0) + 1;
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3; 
    
    // 📸 Ambil snapshot kamera
    const fotoBukti = captureSnapshot();
    
    if (!App.warningLogs) App.warningLogs = [];
    if (!App.cheatingSnapshots) App.cheatingSnapshots = [];

    const timeString = new Date().toLocaleTimeString('id-ID');
    const timestampISO = new Date().toISOString();

    if (fotoBukti) {
        App.cheatingSnapshots.push({
            peringatan_ke: App.warningCount,
            alasan: alasan,
            timestamp: timestampISO,
            image_base64: fotoBukti
        });
    }

    const logData = {
        peringatan_ke: App.warningCount,
        waktu: timeString,
        timestamp: timestampISO,
        alasan: alasan,
        foto_captured: Boolean(fotoBukti)
    };
    App.warningLogs.push(logData);
    
    try {
        localStorage.setItem("cbt_violation_logs", JSON.stringify(App.warningLogs));
    } catch (e) {
        console.warn("Storage penuh / di-block.");
    }

    // 📤 KONTROL PENTING: Kirim data ke background TANPA AWAIT agar tidak bikin loading lambat
    uploadFotoKecuranganToDrive(fotoBukti, alasan);

    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        
        App.isSubmitting = true; 
        alert(`🚨 BATAS MAKSIMAL KECURANGAN TERCAPAI (${App.warningCount}/${App.MAX_WARNINGS})!\n\nAlasan: ${alasan}.\nUjian otomatis diakhiri.`);

        isWarningActive = false;

        // Auto-submit paksa
        if (typeof window.submitJawaban === "function") {
            window.submitJawaban(true, true);
        } else if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        } else {
            console.error("Gagal auto-submit: Engine submit tidak ditemukan.");
        }

    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\n\nAlasan: ${alasan}.\nBukti pelanggaran telah direkam!`);
        
        setTimeout(() => {
            isWarningActive = false;
        }, 1500); 
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
    console.log("🛡️ Initializing Security Listeners...");
    App.warningCount = 0;
    App.warningLogs = [];
    App.cheatingSnapshots = [];
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3;
    App.isSubmitting = false; 

    // Aktifkan Kamera Proctoring
    initWebcamProctoring();

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

    // 3. Deteksi Keluar Fullscreen (Auto Fullscreen Dipertahankan)
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
window.prosesPeringatanKecurangan = prosesPeringatanKecurangan;
window.enforceFullscreen = enforceFullscreen;

// Blokir Klik Kanan Pasif
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
});
