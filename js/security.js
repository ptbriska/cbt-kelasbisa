// ==========================================================
// security.js - Engine Keamanan & Photo Proctoring (v1.5.4 - FIXED)
// Terintegrasi dengan Dynamic Scoring, Webhook GAS, & State App
// ==========================================================

window.App = window.App || {};

let isWarningActive = false;

/**
 * Inisialisasi Akses Kamera WebCam di awal ujian
 */
async function initWebcamProctoring() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        let videoEl = document.getElementById("proctoring-video");
        if (!videoEl) {
            videoEl = document.createElement("video");
            videoEl.id = "proctoring-video";
            videoEl.setAttribute("autoplay", "");
            videoEl.setAttribute("playsinline", "");
            videoEl.style.display = "none";
            document.body.appendChild(videoEl);
        }
        videoEl.srcObject = stream;
        App.webcamStream = stream;
        App.isWebcamActive = true;
        console.log("📷 WebCam Proctoring Berhasil Diaktifkan.");
    } catch (err) {
        console.warn("Kamera WebCam tidak diizinkan atau tidak tersedia:", err);
        App.isWebcamActive = false;
    }
}

/**
 * Mengambil Snapshot Foto Wajah (Output: Base64 JPEG)
 */
function captureSnapshot() {
    if (!App.isWebcamActive) return null;

    const videoEl = document.getElementById("proctoring-video");
    if (!videoEl || !videoEl.videoWidth) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL("image/jpeg", 0.7); 
}

/**
 * Mengirim foto kecurangan secara async ke Google Drive (Webhook)
 * Dilengkapi Safety Abort Timeout 4 detik agar tidak mengunci auto-submit.
 */
async function uploadFotoKecuranganToDrive(fotoBase64, alasanPelanggaran) {
    if (!fotoBase64) return false;

    // URL Webhook diambil secara dinamis dari App state
    const webhookUrl = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";
    if (!webhookUrl) return false;

    const p = App.verifiedPesertaData || App.userIdentitas || {};
    const namaPeserta = p["Nama Lengkap"] || p.nama || "Tanpa Nama";
    const examData = App.examData || {};
    const kodeUjian = examData.kode_ujian || App.currentKodeUjian || p.kode_ujian || "NO-KODE";

    const payload = {
        kode_ujian: kodeUjian,
        nama_peserta: namaPeserta,
        alasan: alasanPelanggaran,
        identitas: p,
        image: fotoBase64
    };

    // Safety Timeout 4 Detik agar jika internet bermasalah, submit jawaban tidak hang
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
        await fetch(webhookUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log("📷 Foto pelanggaran berhasil dikirim ke Google Drive.");
        return true;
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("Upload foto kecurangan timeout/gagal (Melanjutkan submit jawaban):", err);
        return false;
    }
}

/**
 * Peringatan Suara Bahasa Indonesia
 */
function playVoiceWarning(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Penanganan Utama Peringatan & Rekam Bukti Pelanggaran
 */
async function prosesPeringatanKecurangan(alasan = "Pindah Tab / Minimize") {
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting || isWarningActive) return;

    isWarningActive = true;
    App.warningCount = (App.warningCount || 0) + 1;
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3; 
    
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
        foto_captured: Boolean(fotoBukti),
        foto_data: fotoBukti || null
    };
    App.warningLogs.push(logData);
    
    try {
        localStorage.setItem("cbt_violation_logs", JSON.stringify(App.warningLogs));
    } catch (e) {
        console.warn("Storage penuh, menyimpan log tanpa base64 foto.");
    }

    // Upload bukti foto ke Google Drive
    if (fotoBukti) {
        await uploadFotoKecuranganToDrive(fotoBukti, alasan);
    }

    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        
        isWarningActive = false;
        App.isSubmitting = true; 

        alert(`⚠️ BATAS MAKSIMAL KECURANGAN TERCAPAI (${App.warningCount}/${App.MAX_WARNINGS})!\nAlasan: ${alasan}.\nUjian otomatis diakhiri dan jawaban Anda langsung dikirim tanpa konfirmasi.`);

        // ==========================================================
        // EKSEKUSI SISWA NAKAL: KIRIM PARAMETER (true, true)
        // (isAuto = true, isConfirmed = true) UNTUK BYPASS MODAL KONFIRMASI
        // ==========================================================
        if (typeof window.submitJawaban === "function") {
            window.submitJawaban(true, true);
        } else if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        } else {
            console.error("Gagal auto-submit: Engine submit tidak ditemukan.");
        }

    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        
        setTimeout(() => {
            alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\nAlasan: ${alasan}.\nFoto & bukti pelanggaran telah direkam oleh sistem!`);
        }, 50);
        
        setTimeout(() => {
            isWarningActive = false;
        }, 2000); 
    }
}

/**
 * Paksa Kembalikan Tampilan ke Fullscreen
 */
function enforceFullscreen() {
    if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
            console.log("Pengguna menolak mode fullscreen.");
        });
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

    initWebcamProctoring();

    // Deteksi klik manual tombol submit untuk menghindari pemicu peringatan palsu
    document.addEventListener("click", (e) => {
        const target = e.target.closest("button, a, input[type='button'], input[type='submit']");
        if (target) {
            const text = (target.innerText || target.value || "").toUpperCase();
            if (text.includes("SELESAI") || text.includes("KUMPUL") || text.includes("SUBMIT") || text.includes("AKHIRI")) {
                App.isSubmitting = true; 
                
                setTimeout(() => {
                    if (!App.isExamSubmitted) {
                        App.isSubmitting = false;
                    }
                }, 10000);
            }
        }
    }, true);

    // 1. Deteksi Pindah Tab / Minimize
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Meninggalkan Tab / Pindah Browser");
        }
    });

    // 2. Deteksi Alt+Tab / Hilang Fokus Layar
    window.addEventListener("blur", () => {
        if (App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Fokus Layar Terlepas (Alt+Tab / Pindah Aplikasi)");
        }
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

        // Shortcut Kombinasi Ctrl (Ctrl+U, S, P, C)
        if (e.ctrlKey && ["u", "U", "s", "S", "p", "P", "c", "C"].includes(e.key)) {
            e.preventDefault();
            prosesPeringatanKecurangan(`Shortcut Terlarang (Ctrl+${e.key.toUpperCase()})`);
            return false;
        }

        // PrintScreen
        if (e.key === "PrintScreen" || e.keyCode === 44) {
            e.preventDefault();
            if (navigator.clipboard) {
                navigator.clipboard.writeText("[Sistem Keamanan CBT] Tangkapan layar dilarang.")
                    .catch(err => console.warn("Clipboard access denied", err));
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

// Blokir Klik Kanan
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
});
