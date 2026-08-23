// ==========================================================
// security.js - Engine Keamanan & Photo Proctoring (v1.3.3)
// ==========================================================

// Web App URL Google Apps Script untuk Simpan Foto ke Google Drive
const GOOGLE_DRIVE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwmc09UotPen4uw0-UX0zJDYydHp1iNs8HkjpQl3B4jdQ-U1hPLNM2EoUhnpL5AgNsLOQ/exec";

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

    const namaPeserta = App.userIdentitas ? App.userIdentitas.nama : "Tanpa Nama";
    const kodeUjian = App.currentKodeUjian || (App.userIdentitas ? App.userIdentitas.kode_ujian : "NO-KODE");

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
            headers: { "Content-Type": "application/json" },
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

/**
 * Penanganan Utama Peringatan & Rekam Bukti Pelanggaran
 */
function prosesPeringatanKecurangan(alasan = "Pindah Tab / Minimize") {
    if (!App.isExamStarted || App.isExamSubmitted) return;

    App.warningCount++;
    
    // 1. Ambil Foto Wajah
    const fotoBukti = captureSnapshot();
    
    // 2. Simpan Log Pelanggaran di State Global
    if (!App.warningLogs) App.warningLogs = [];
    App.warningLogs.push({
        peringatan_ke: App.warningCount,
        waktu: new Date().toLocaleTimeString(),
        alasan: alasan,
        foto_captured: Boolean(fotoBukti)
    });

    // 3. Unggah Foto ke Google Drive secara otomatis
    if (fotoBukti) {
        uploadFotoKecuranganToDrive(fotoBukti, alasan);
    }

    // 4. Eksekusi Sanksi & Notifikasi
    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        alert(`⚠️ BATAS MAKSIMAL KECURANGAN!\nAlasan: ${alasan}.\nUjian otomatis diakhiri dan foto bukti telah disimpan.`);
        
        if (typeof submitJawaban === "function") {
            submitJawaban();
        }
    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang berpindah aplikasi atau mengambil tangkapan layar!`);
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})\nAlasan: ${alasan}.\nFoto pelanggaran telah direkam oleh sistem!`);
    }
}

/**
 * Inisialisasi Event Listener Keamanan
 */
function initSecurityListeners() {
    App.warningCount = 0;
    App.warningLogs = [];

    // Aktifkan Kamera
    initWebcamProctoring();

    // 1. Deteksi Pindah Tab & Loss Focus (Minimize / Win+R / App Lain)
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) prosesPeringatanKecurangan("Pindah Tab / Browser");
    });

    window.addEventListener("blur", () => {
        prosesPeringatanKecurangan("Minimize / Buka App Lain / Snipping Tool");
    });

    // 2. Deteksi Keluar Fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && App.isExamStarted && !App.isExamSubmitted) {
            prosesPeringatanKecurangan("Keluar dari Mode Fullscreen");
        }
    });

    // 3. Mencegah Klik Kanan
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // 4. Blokir Shortcut DevTools (F12, Ctrl+U, Ctrl+Shift+I)
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
            (e.ctrlKey && e.key === "u") ||
            (e.ctrlKey && e.key === "U")
        ) {
            e.preventDefault();
        }
    });

    // 5. Deteksi Print Screen (PrtScn) & Clears Clipboard
    document.addEventListener("keyup", (e) => {
        if (e.key === "PrintScreen") {
            if (navigator.clipboard) {
                navigator.clipboard.writeText("[Sistem Keamanan CBT] Tangkapan layar dilarang.");
            }
            prosesPeringatanKecurangan("Menekan Tombol PrintScreen");
        }
    });
}
