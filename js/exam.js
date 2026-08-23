// ==========================================================
// exam.js - Engine Ujian CBT & Navigasi Soal (v1.3.2)
// ==========================================================

function toggleMulaiButton() {
    const chk = document.getElementById("check-setuju");
    const btn = document.getElementById("btn-mulai-ujian");
    if (chk && btn) {
        btn.disabled = !chk.checked;
    }
}

function kembaliKePage1() {
    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-login")?.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function mulaiUjianPenuh() {
    const chk = document.getElementById("check-setuju");
    if (!chk || !chk.checked) {
        alert("Anda wajib menyetujui syarat dan ketentuan sebelum memulai ujian!");
        return;
    }

    // 1. Set Profil Peserta di Header Kanan Atas (Page 3)
    updateHeaderUserProfile();

    // 2. Pindah Tampilan ke Page 3 (CBT Engine)
    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-cbt")?.classList.remove("hidden");
    window.scrollTo(0, 0);

    // 3. Tandai State Ujian Dimulai
    if (window.App) {
        App.isExamStarted = true;
        App.isExamSubmitted = false;
    }

    // 4. Aktifkan Fullscreen jika didukung
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    // 5. Inisialisasi CBT
    initCBT();
}

/**
 * Update Nama & Instansi Peserta pada Header Kanan Atas Ujian Sesuai peserta.json
 */
function updateHeaderUserProfile() {
    const elNama = document.getElementById("disp-user-name");
    const elInstansi = document.getElementById("disp-user-school");

    if (window.App) {
        const p = App.verifiedPesertaData || App.userIdentitas || {};
        if (elNama) elNama.textContent = p["Nama Lengkap"] || p.nama || "-";[cite: 1]
        if (elInstansi) elInstansi.textContent = p["Asal Instansi"] || p.sekolah || "-";[cite: 1]
    }
}

function initCBT() {
    if (!window.App) return;

    // Reset Jawaban dan Navigasi
    App.userAnswers = {};
    App.currentIndex = 0;

    // Render Grid Nomor Soal
    renderNumberGrid();

    // Load Soal Pertama
    loadQuestion(App.currentIndex);

    // Deteksi Durasi Ujian (Dalam Menit) dari Berbagai Sumber Data
    let durasiMenit = 10; // Default Fallback

    if (App.timerDurationMinutes) {
        durasiMenit = App.timerDurationMinutes;
    } else if (App.soalData) {
        durasiMenit = App.soalData.timer_menit || App.soalData.durasi_menit || App.soalData.waktu_menit || App.soalData.durasi || 10;
    } else if (App.examConfig) {
        durasiMenit = App.examConfig.durasi_menit || App.examConfig.waktu || 10;
    }

    // Jalankan Timer Ujian (Diubah ke Detik)
    startTimer(parseInt(durasiMenit, 10) * 60);
}

function startTimer(durationInSeconds) {
    let timer = parseInt(durationInSeconds, 10);
    if (isNaN(timer) || timer <= 0) timer = 600; // Fallback ke 10 menit jika invalid

    // Cari elemen display timer (Mendukung ID #timer-display atau #timer)
    const timerDisplay = document.getElementById("timer-display") || document.getElementById("timer");

    // Hentikan timer sebelumnya jika ada
    if (window.App && App.timerInterval) {
        clearInterval(App.timerInterval);
    }

    const intervalFunc = () => {
        const hours = Math.floor(timer / 3600);
        const minutes = Math.floor((timer % 3600) / 60);
        const seconds = timer % 60;

        const hStr = String(hours).padStart(2, '0');
        const mStr = String(minutes).padStart(2, '0');
        const sStr = String(seconds).padStart(2, '0');

        if (timerDisplay) {
            timerDisplay.textContent = `${hStr}:${mStr}:${sStr}`;
            
            // Peringatan jika waktu sisa kurang dari 5 menit (300 detik)
            if (timer <= 300) {
                timerDisplay.style.color = "#dc3545";
                timerDisplay.style.fontWeight = "bold";
            } else {
                timerDisplay.style.color = "";
                timerDisplay.style.fontWeight = "";
            }
        }

        if (--timer < 0) {
            if (window.App && App.timerInterval) clearInterval(App.timerInterval);
            alert("⏰ Waktu pengerjaan Ujian telah habis! Jawaban Anda akan dikirim secara otomatis.");
            
            // Panggil Fungsi Submit Jawaban di scoring.js
            if (typeof submitJawaban === "function") {
                submitJawaban();
            }
        }
    };

    // Jalankan render detik pertama secara mendadak
    intervalFunc();
    
    // Set Interval dan simpan ke App global state
    if (window.App) {
        App.timerInterval = setInterval(intervalFunc, 1000);
    }
}

function renderNumberGrid() {
    const grid = document.getElementById("number-grid");
    if (!grid || !window.App || !App.questionsData) return;
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
    if (!window.App || !App.questionsData) return;
    const q = App.questionsData[index];
    if (!q) return;

    const displayNo = index + 1; 
    const elNo = document.getElementById("q-num");
    const elText = document.getElementById("q-text");
    
    if (elNo) elNo.textContent = displayNo;
    if (elText) elText.innerHTML = q.Soal || "";

    // Render Gambar Soal jika Ada
    const imgContainer = document.getElementById("q-image-container");
    if (imgContainer) {
        const gambarVal = (q.Gambar && typeof q.Gambar === "string") ? q.Gambar.trim() : "";
        imgContainer.innerHTML = (gambarVal && gambarVal !== "-" && gambarVal.toLowerCase() !== "none") 
            ? `<img src="${gambarVal}" class="img-soal" alt="Gambar Soal">` 
            : "";
    }

    // Render Pilihan Jawaban
    const optionsBox = document.getElementById("options-box");
    if (optionsBox) {
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
    }

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
    if (!window.App) return;
    App.userAnswers[questionNum] = selectedOption;
    loadQuestion(App.currentIndex);
}

function updateGridStatus() {
    if (!window.App || !App.questionsData) return;
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
    if (!window.App || !App.questionsData) return;
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
