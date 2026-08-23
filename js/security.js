// ==========================================================
// security.js - Engine Keamanan & Proteksi Anti-Kecurangan (v1.3.0)
// ==========================================================

function playVoiceWarning(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
    }
}

function handleVisibilityChange() {
    if (App.isExamStarted && !App.isExamSubmitted && document.hidden) {
        prosesPeringatanKecurangan();
    }
}

function handleWindowBlur() {
    if (App.isExamStarted && !App.isExamSubmitted) {
        prosesPeringatanKecurangan();
    }
}

function prosesPeringatanKecurangan() {
    App.warningCount++;
    
    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        alert(`⚠️ BATAS MAKSIMAL KECURANGAN! Ujian otomatis diakhiri.`);
        
        if (typeof submitJawaban === "function") {
            submitJawaban();
        }
    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang membuka tab lain!`);
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})!\nDilarang berpindah tab atau meninggalkan halaman ujian.`);
    }
}

function initSecurityListeners() {
    // Reset hitungan peringatan
    App.warningCount = 0;

    // Pasang Event Listener Keamanan
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    // Mencegah Klik Kanan & Shortcut Inspeksi
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
        // Blokir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
            e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
            (e.ctrlKey && e.key === "u")
        ) {
            e.preventDefault();
        }
    });
}
