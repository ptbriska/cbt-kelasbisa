// ==========================================================
// security.js - Engine Keamanan & Photo Proctoring (v1.3.7)
// ==========================================================

const GOOGLE_DRIVE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";

// Pastikan App Global Selalu Ada
window.App = window.App || {};

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
 * Mengirim foto kecurangan secara async ke Google Drive
 */
async function uploadFotoKecuranganToDrive(fotoBase64, alasanPelanggaran) {
    if (!fotoBase64 || !GOOGLE_DRIVE_WEB_APP_URL) return;

    const p = App.verifiedPesertaData || App.userIdentitas || {};
    const namaPeserta = p["Nama Lengkap"] || p.nama || "Tanpa Nama";
    const kodeUjian = App.currentKodeUjian || p.kode_ujian || "NO-KODE";

    const payload = {
        kode_ujian: kodeUjian,
        nama_peserta: namaPeserta,
        alasan: alasanPelanggaran,
        image: fotoBase64
    };

    try {
        await fetch(GOOGLE_DRIVE_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        console.log("📷 Foto pelanggaran dikirim ke Google Drive.");
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
    if (!App.isExamStarted || App.isExamSubmitted || isWarningActive) return;

    isWarningActive = true;
    App.warningCount = (App.warningCount || 0) + 1;
    App.MAX_WARNINGS = App.MAX_WARNINGS || 3; 
    
    // 1. Ambil Foto Wajah
    const fotoBukti = captureSnapshot();
    
    // 2. Inisialisasi Penyimpanan Foto & Log Global
    if (!App.warningLogs) App.warningLogs = [];
    if (!App.cheatingSnapshots) App.cheatingSnapshots = [];

    if (fotoBukti) {
        App.cheatingSnapshots.push({
            peringatan_ke: App.warningCount,
            alasan: alasan,
            timestamp: new Date().toISOString(),
            image_base64: fotoBukti
        });
    }

    // 3. Simpan Log Detail ke State Global & LocalStorage
    const logData = {
        peringatan_ke: App.warningCount,
        waktu: new Date().toLocaleTimeString('id-ID'),
        timestamp: new Date().toISOString(),
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

    // 4. Unggah Foto ke Google Drive secara otomatis
    if (fotoBukti) {
        uploadFotoKecuranganToDrive(fotoBukti, alasan);
    }

    // 5. Eksekusi Sanksi & Notifikasi
    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        alert(`⚠️ BATAS MAKSIMAL KECURANGAN!\nAlasan: ${alasan}.\nUjian otomatis diakhiri dan bukti pelanggaran telah disimpan.`);
        
        isWarningActive = false;
        if (typeof submitJawaban === "function") {
            submitJawaban();
        }
    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang melakukan pelanggaran!`);
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\nAlasan: ${alasan}.\nFoto & bukti pelanggaran telah direkam oleh sistem!`);
        isWarningActive = false;
    }
}

/**
 * Paksa Kembalikan Tampilan ke Fullscreen
 */
function mintaMintaFullscreen() {
    if (!App.isExamStarted || App.isExamSubmitted) return;
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

    initWebcamProctoring();

    // 1. Deteksi Pindah Tab / Browser
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && App.isExamStarted && !App.isExamSubmitted) {
            prosesPeringatanKecurangan("Meninggalkan Tab / Pindah Browser");
        }
    });

    // 2. Deteksi Fokus Layar Lepas (Alt+Tab / Snipping Tool Overlay)
    window.addEventListener("blur", () => {
        if (App.isExamStarted && !App.isExamSubmitted) {
            prosesPeringatanKecurangan("Fokus Layar Terlepas (Alt+Tab / Pindah Aplikasi / Snipping Tool)");
        }
    });

    // 3. Deteksi Keluar Mode Fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && App.isExamStarted && !App.isExamSubmitted) {
            prosesPeringatanKecurangan("Keluar dari Mode Fullscreen");
            setTimeout(mintaMintaFullscreen, 1000);
        }
    });

    // 4. Deteksi Kombinasi Shortcut Terlarang, PrintScreen, dan Win+Shift+S
    document.addEventListener("keydown", (e) => {
        if (!App.isExamStarted || App.isExamSubmitted) return;

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
                navigator.clipboard.writeText("[Sistem Keamanan CBT] Tangkapan layar dilarang.");
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

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
});
