// ==========================================================
// exam.js - Engine Ujian CBT & Navigasi Soal (v1.3.0)
// ==========================================================

function toggleMulaiButton() {
    const chk = document.getElementById("check-setuju");
    const btn = document.getElementById("btn-mulai-ujian");
    if (chk && btn) {
        btn.disabled = !chk.checked;
    }
}

function kembaliKePage1() {
    document.getElementById("page-info").classList.add("hidden");
    document.getElementById("page-login").classList.remove("hidden");
    window.scrollTo(0, 0);
}

function mulaiUjianPenuh() {
    const chk = document.getElementById("check-setuju");
    if (!chk || !chk.checked) {
        alert("Anda wajib menyetujui syarat dan ketentuan sebelum memulai ujian!");
        return;
    }

    // Pindah Tampilan ke Page 3 (CBT Engine)
    document.getElementById("page-info").classList.add("hidden");
    document.getElementById("page-cbt").classList.remove("hidden");
    window.scrollTo(0, 0);

    // Tandai State Ujian Dimulai
    App.isExamStarted = true;
    App.isExamSubmitted = false;

    // Aktifkan Fullscreen jika didukung
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    // Inisialisasi CBT
    initCBT();
}

function initCBT() {
    // Reset Jawaban dan Navigasi
    App.userAnswers = {};
    App.currentIndex = 0;

    // Render Grid Nomor Soal
    renderNumberGrid();

    // Load Soal Pertama
    loadQuestion(App.currentIndex);

    // Jalankan Timer Ujian
    startTimer(App.timerDurationMinutes * 60);
}

function startTimer(durationInSeconds) {
    let timer = durationInSeconds;
    const timerDisplay = document.getElementById("timer-display");

    if (App.timerInterval) clearInterval(App.timerInterval);

    App.timerInterval = setInterval(() => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;

        const mStr = minutes < 10 ? "0" + minutes : minutes;
        const sStr = seconds < 10 ? "0" + seconds : seconds;

        if (timerDisplay) {
            timerDisplay.textContent = `${mStr}:${sStr}`;
            
            // Peringatan jika waktu sisa kurang dari 5 menit
            if (timer <= 300) {
                timerDisplay.style.color = "#dc3545";
                timerDisplay.style.fontWeight = "bold";
            }
        }

        if (--timer < 0) {
            clearInterval(App.timerInterval);
            alert("Waktu pengerjaan Ujian telah habis! Jawaban Anda akan dikirim secara otomatis.");
            
            // Panggil Fungsi Submit Jawaban di scoring.js
            if (typeof submitJawaban === "function") {
                submitJawaban();
            }
        }
    }, 1000);
}

function renderNumberGrid() {
    const grid = document.getElementById("number-grid");
    if (!grid) return;
    grid.innerHTML = "";

    App.questionsData.forEach((_, idx) => {
        const circle = document.createElement("div");
        circle.id = `circle-num-${idx}`;
        circle.className = "circle-btn unanswered";
        circle.textContent = idx + 1;
        circle.onclick = () => {
            App.currentIndex = idx;
            loadQuestion(App.currentIndex);
        };
        grid.appendChild(circle);
    });
}

function loadQuestion(index) {
    const q = App.questionsData[index];
    if (!q) return;

    const displayNo = index + 1; 
    document.getElementById("q-num").textContent = displayNo;
    document.getElementById("q-text").innerHTML = q.Soal || "";

    // Render Gambar Soal jika Ada
    const imgContainer = document.getElementById("q-image-container");
    const gambarVal = (q.Gambar && typeof q.Gambar === "string") ? q.Gambar.trim() : "";
    imgContainer.innerHTML = (gambarVal && gambarVal !== "-" && gambarVal.toLowerCase() !== "none") 
        ? `<img src="${gambarVal}" class="img-soal" alt="Gambar Soal">` 
        : "";

    // Render Pilihan Jawaban
    const optionsBox = document.getElementById("options-box");
    optionsBox.innerHTML = "";

    ["A", "B", "C", "D", "E"].forEach(key => {
        if (q[key] && String(q[key]).trim() !== "") {
            const isSelected = App.userAnswers[displayNo] === key;
            const optionRow = document.createElement("div"); 
            optionRow.className = `option-row ${isSelected ? 'selected' : ''}`;
            
            optionRow.innerHTML = `
                <input type="radio" name="option_${displayNo}" value="${key}" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
                <span class="opt-key">${key}.</span>
                <span class="opt-val">${q[key]}</span>
            `;
            
            optionRow.onclick = () => pilihJawaban(displayNo, key);
            optionsBox.appendChild(optionRow);
        }
    });

    // Render MathJax jika ada Formula Matematika/Fisika
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([document.getElementById("q-text"), document.getElementById("options-box")])
            .catch(err => console.error("MathJax Error:", err));
    }

    // Status Tombol Navigasi
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (btnPrev) btnPrev.disabled = (index === 0);
    if (btnNext) btnNext.disabled = (index === App.questionsData.length - 1);

    updateGridStatus();
}

function pilihJawaban(questionNum, selectedOption) {
    // Jika mengeklik jawaban yang sama, tidak perlu merender ulang
    App.userAnswers[questionNum] = selectedOption;
    loadQuestion(App.currentIndex);
}

function updateGridStatus() {
    App.questionsData.forEach((_, idx) => {
        const circle = document.getElementById(`circle-num-${idx}`);
        if (!circle) return;
        
        const isAnswered = !!App.userAnswers[idx + 1];
        const isActive = (idx === App.currentIndex);

        let className = "circle-btn";
        if (isAnswered) className += " answered";
        else className += " unanswered";
        
        if (isActive) className += " active";

        circle.className = className;
    });
}

function navigasi(direction) {
    const newIndex = App.currentIndex + direction;
    if (newIndex >= 0 && newIndex < App.questionsData.length) {
        App.currentIndex = newIndex;
        loadQuestion(App.currentIndex);
    }
}

function toggleNavigator() {
    const navDrawer = document.getElementById("nav-drawer");
    if (navDrawer) {
        navDrawer.classList.toggle("open");
    }
}
