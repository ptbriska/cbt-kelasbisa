// ==========================================================
// security.js - Engine Keamanan & Photo Proctoring (v1.4.0 - FIXED)
// Terintegrasi dengan Dynamic Scoring & Backend GAS
// ==========================================================

// Pastikan App Global Selalu Ada
window.App = window.App || {};

// Gunakan URL Webhook dari App global jika ada, fallback ke URL hardcode
const GOOGLE_DRIVE_WEB_APP_URL = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";

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
 */
async function uploadFotoKecuranganToDrive(fotoBase64, alasanPelanggaran) {
    if (!fotoBase64 || !GOOGLE_DRIVE_WEB_APP_URL) return;

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

    try {
        await fetch(GOOGLE_DRIVE_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        console.log("📷 Foto pelanggaran berhasil dikirim ke Google Drive.");
    } catch (err) {
        console.error("Gagal mengunggah foto kecurangan:", err);
    }
}

/**
 * Peringatan Suara
 */
function playVoiceWarning(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
    }
}

let isWarningActive = false;

/**
 * Penanganan Utama Peringatan & Rekam Bukti Pelanggaran
 */
function prosesPeringatanKecurangan(alasan = "Pindah Tab / Minimize") {
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

    if (fotoBukti) {
        uploadFotoKecuranganToDrive(fotoBukti, alasan);
    }

    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        
        isWarningActive = false;
        
        // [PERBAIKAN KRITIKAL] Tandai bahwa proses submit sedang berlangsung 
        App.isSubmitting = true; 

        // Eksekusi Submit di Background TERLEBIH DAHULU
        if (typeof window.submitJawaban === "function") {
            window.submitJawaban();
        } else if (typeof window.selesaiUjian === "function") {
            window.selesaiUjian();
        } else {
            console.warn("Mencari tombol selesai otomatis...");
            const buttons = document.querySelectorAll('button');
            let buttonDiklik = false;
            
            for (let btn of buttons) {
                if (btn.innerText.toUpperCase().includes("SELESAI") || btn.innerText.toUpperCase().includes("KUMPUL") || btn.innerText.toUpperCase().includes("SUBMIT")) {
                    btn.click();
                    buttonDiklik = true;
                    break;
                }
            }
            if (!buttonDiklik) {
                console.error("Gagal auto-submit: Tombol SELESAI tidak ditemukan.");
            }
        }

        // Tampilkan Alert MENGGUNAKAN setTimeout agar eksekusi di atas TIDAK BLOKIR
        setTimeout(() => {
            alert(`⚠️ BATAS MAKSIMAL KECURANGAN!\nAlasan: ${alasan}.\nUjian otomatis diakhiri dan jawaban langsung dikirim.`);
        }, 100);

    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        
        // Agar alert biasa juga tidak bentrok, kasih setTimeout kecil
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

    // Deteksi interaksi klik pada tombol submit/selesai manual
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

    // 1. Deteksi Pindah Tab / Browser
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Meninggalkan Tab / Pindah Browser");
        }
    });

    // 2. Deteksi Fokus Layar Lepas
    window.addEventListener("blur", () => {
        if (App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Fokus Layar Terlepas (Alt+Tab / Pindah Aplikasi)");
        }
    });

    // 3. Deteksi Keluar Mode Fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && App.isExamStarted && !App.isExamSubmitted && !App.isSubmitting) {
            prosesPeringatanKecurangan("Keluar dari Mode Fullscreen");
            setTimeout(enforceFullscreen, 1000);
        }
    });

    // 4. Deteksi Kombinasi Shortcut Terlarang
    document.addEventListener("keydown", (e) => {
        if (!App.isExamStarted || App.isExamSubmitted || App.isSubmitting) return;

        if (e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
            e.preventDefault();
            document.body.style.display = "none";
            setTimeout(() => { document.body.style.display = "block"; }, 1000);
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
            prosesPeringatanKecurangan("Mencoba Membuka Inspect Element (Ctrl+Shift+I/J/C)");
            return false;
        }

        if (e.ctrlKey && ["u", "U", "s", "S", "p", "P", "c", "C"].includes(e.key)) {
            e.preventDefault();
            prosesPeringatanKecurangan(`Shortcut Terlarang (Ctrl+${e.key.toUpperCase()})`);
            return false;
        }

        if (e.key === "PrintScreen" || e.keyCode === 44) {
            e.preventDefault();
            if (navigator.clipboard) {
                // [PERBAIKAN MINOR] Tambahkan catch agar tidak crash jika browser nolak izin clipboard
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
