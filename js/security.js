// security.js
import { App } from './state.js';
import { submitJawaban } from './scoring.js';

export function playVoiceWarning(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
    }
}

export function startTimer(totalSeconds) {
    let timerSeconds = totalSeconds;
    const timerDisplay = document.getElementById("timer");

    App.timerInterval = setInterval(() => {
        const hours = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(timerSeconds % 60).padStart(2, '0');

        if (timerDisplay) timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;

        if (--timerSeconds < 0) {
            clearInterval(App.timerInterval);
            playVoiceWarning("Waktu ujian telah habis. Jawaban Anda otomatis dikirim.");
            alert("⏱️ Waktu Ujian Habis!");
            submitJawaban();
        }
    }, 1000);
}

export function handleVisibilityChange() {
    if (App.isExamStarted && !App.isExamSubmitted && document.hidden) {
        prosesPeringatanKecurangan();
    }
}

export function handleWindowBlur() {
    if (App.isExamStarted && !App.isExamSubmitted) {
        prosesPeringatanKecurangan();
    }
}

function prosesPeringatanKecurangan() {
    App.warningCount++;
    if (App.warningCount >= App.MAX_WARNINGS) {
        playVoiceWarning("Batas toleransi habis! Ujian Anda otomatis diakhiri.");
        alert(`⚠️ BATAS MAKSIMAL KECURANGAN! Ujian otomatis diakhiri.`);
        submitJawaban();
    } else {
        playVoiceWarning(`Peringatan ke ${App.warningCount}. Dilarang membuka tab lain!`);
        alert(`⚠️ PERINGATAN KECURANGAN (${App.warningCount}/${App.MAX_WARNINGS})!`);
    }
}
