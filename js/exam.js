// ==========================================================
// exam.js - Core Engine Ujian CBT & Navigasi Soal (v1.4.0 - ULTRA FAST SUBMIT & NO CAMERA)
// ==========================================================

// Inisialisasi Objek Global Safe Guard
window.App = window.App || {};

/**
 * Toggle Status Tombol Mulai Ujian (Sesuai Checkbox Persetujuan)
 */
function toggleMulaiButton() {
    const chk = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    const btn = document.getElementById("btn-mulai-ujian") || document.getElementById("btn-start-exam");
    
    if (!chk || !btn) return;

    if (chk.checked) {
        btn.disabled = false;
        btn.classList.add("active");
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.classList.remove("active");
        btn.style.cursor = "not-allowed";
    }
}

function kembaliKePage1() {
    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-login")?.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function mulaiUjianPenuh() {
    const chk = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    if (chk && !chk.checked) {
        alert("Anda wajib menyetujui syarat dan ketentuan sebelum memulai ujian!");
        return;
    }

    // Ping Webhook non-blocking (Fire & Forget)
    const webhookUrl = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";
    fetch(webhookUrl, { mode: 'no-cors', keepalive: true }).catch(() => {});

    // 1. Set Profil Peserta di Header Kanan Atas
    updateHeaderUserProfile();

    // 2. Pindah Tampilan ke Page CBT Engine
    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-cbt")?.classList.remove("hidden");
    window.scrollTo(0, 0);

    // 3. Tandai State Ujian Dimulai & Catat Waktu Mulai
    App.isExamStarted = true;
    App.isExamSubmitted = false;
    App.isSubmitting = false; 
    App.warningCount = App.warningCount || 0;
    App.warningLogs = App.warningLogs || [];
    App.cheatingSnapshots = []; // FITUR KAMERA/SNAPSHOT DIBEKUKAN
    App.startTime = App.startTime || new Date().toISOString();

    // 4. Minta Mode Fullscreen (Opsional)
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
            console.warn("Fullscreen request bypass/denied.");
        });
    }

    // 5. INISIALISASI KEAMANAN (Kamera Dimatikan)
    if (typeof window.initSecurityListeners === "function") {
        window.initSecurityListeners();
    } else if (typeof initSecurityListeners === "function") {
        initSecurityListeners();
    }

    // 6. Inisialisasi CBT (Render Soal & Timer)
    initCBT();
}

/**
 * Update Nama & Instansi Peserta pada Header Kanan Atas Ujian
 */
function updateHeaderUserProfile() {
    const elNama = document.getElementById("disp-user-name");
    const elInstansi = document.getElementById("disp-user-school");

    if (window.App) {
        const p = App.verifiedPesertaData || App.userIdentitas || {};
        if (elNama) elNama.textContent = p["Nama Lengkap"] || p.nama || "-";
        if (elInstansi) elInstansi.textContent = p["Asal Instansi"] || p.sekolah || "-";
    }
}

/**
 * Sinkronisasi Metadata dari JSON Soal ke App Global
 */
function syncExamMetadataFromJSON(dataJSON) {
    if (!window.App || !dataJSON) return;

    App.soalData = dataJSON;
    App.questionsData = dataJSON.questions || [];

    App.modePenilaian = dataJSON.mode_penilaian || "1A";
    App.skorConfig = dataJSON.skor_config || {
        skor_benar: 1.0,
        skor_salah: 0.0,
        skor_kosong: 0.0,
        use_scaling_100: false,
        bobot_level: { E: 1.0, M: 3.0, H: 5.0 }
    };

    App.currentKodeUjian = dataJSON.kode_ujian || App.currentKodeUjian;
    App.modeUjian = dataJSON.mode_ujian || App.modeUjian;
    App.timerDurationMinutes = dataJSON.timer_menit || dataJSON.durasi_menit || 10;
}

function initCBT() {
    if (!window.App) return;

    if (App.soalData) {
        syncExamMetadataFromJSON(App.soalData);
    }

    // Proteksi data jawaban agar tidak tertimpa saat re-init
    App.userAnswers = App.userAnswers || {};
    App.currentIndex = App.currentIndex || 0;

    renderNumberGrid();
    loadQuestion(App.currentIndex);

    let durasiMenit = App.timerDurationMinutes || 10;
    startTimer(parseInt(durasiMenit, 10) * 60);
}

function startTimer(durationInSeconds) {
    let timer = parseInt(durationInSeconds, 10);
    if (isNaN(timer) || timer <= 0) timer = 600;

    const timerDisplay = document.getElementById("timer-display") || document.getElementById("timer");

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
            
            submitJawaban(true, true);
        }
    };

    intervalFunc();
    App.timerInterval = setInterval(intervalFunc, 1000);
}

function renderNumberGrid() {
    const grid = document.getElementById("number-grid");
    if (!grid || !window.App || !App.questionsData) return;
    
    const fragment = document.createDocumentFragment();
    App.questionsData.forEach((_, idx) => {
        const circle = document.createElement("div");
        circle.id = `circle-num-${idx}`;
        circle.className = "circle-btn unanswered";
        circle.textContent = idx + 1;
        circle.onclick = () => {
            App.currentIndex = idx;
            loadQuestion(App.currentIndex);
        };
        fragment.appendChild(circle);
    });

    grid.innerHTML = "";
    grid.appendChild(fragment);
}

function loadQuestion(index) {
    if (!window.App || !App.questionsData) return;
    const q = App.questionsData[index];
    if (!q) return;

    const displayNo = index + 1; 
    const elNo = document.getElementById("q-num");
    const elText = document.getElementById("q-text");
    const elLevel = document.getElementById("q-level");
    
    if (elNo) elNo.textContent = displayNo;
    if (elText) elText.innerHTML = q.Soal || "";
    if (elLevel) elLevel.textContent = q.Level ? `[Level: ${q.Level}]` : "";

    const imgContainer = document.getElementById("q-image-container");
    if (imgContainer) {
        const gambarVal = (q.Gambar && typeof q.Gambar === "string") ? q.Gambar.trim() : "";
        imgContainer.innerHTML = (gambarVal && gambarVal !== "-" && gambarVal.toLowerCase() !== "none") 
            ? `<img src="${gambarVal}" class="img-soal" alt="Gambar Soal">` 
            : "";
    }

    const optionsBox = document.getElementById("options-box");
    if (optionsBox) {
        optionsBox.innerHTML = "";

        ["A", "B", "C", "D", "E"].forEach(key => {
            if (q[key] !== undefined && q[key] !== null && String(q[key]).trim() !== "") {
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

    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([document.getElementById("q-text"), document.getElementById("options-box")])
            .catch(err => console.error("MathJax Error:", err));
    }

    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (btnPrev) btnPrev.disabled = (index === 0);
    if (btnNext) btnNext.disabled = (index === App.questionsData.length - 1);

    updateGridStatus();
}

function pilihJawaban(questionNum, selectedOption) {
    if (!window.App) return;
    
    if (App.userAnswers[questionNum] === selectedOption) {
        delete App.userAnswers[questionNum]; 
    } else {
        App.userAnswers[questionNum] = selectedOption;
    }
    
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

// ==========================================================
// FAST SUBMIT ALGORITHM & PANEL KONFIRMASI
// ==========================================================

async function submitJawaban(isAuto = false, isConfirmed = false) {
    if (!window.App) return;

    // Cegah double submit
    if (App.isExamSubmitted) return;

    const questions = App.questionsData || App.questions || [];
    const totalSoal = questions.length;
    const dijawab = Object.keys(App.userAnswers || {}).length;
    const kosong = totalSoal - dijawab;

    // 1. TAMPILKAN PANEL KONFIRMASI (Manual submission)
    if (!isAuto && !isConfirmed) {
        App.isSubmitting = true; 
        tampilkanPanelKonfirmasi(dijawab, kosong, totalSoal);
        return;
    }

    // 2. KUNCI STATUS SUBMIT & HENTIKAN TIMER INSTAN
    App.isSubmitting = true;
    App.isExamSubmitted = true; 
    
    if (typeof window.simpanLockSubmitted === "function") {
        window.simpanLockSubmitted(); 
    }

    if (App.timerInterval) {
        clearInterval(App.timerInterval);
    }

    // 3. TAMPILKAN OVERLAY LOADING SECARA INSTAN
    const overlayLoading = document.getElementById("loading-overlay");
    if (overlayLoading) overlayLoading.classList.remove("hidden");
    
    const btnSelesai = document.getElementById("btn-selesai");
    if (btnSelesai) {
        btnSelesai.disabled = true;
        btnSelesai.textContent = "Mengirim...";
    }

    // 4. EKSEKUSI SUBMIT CEPAT KE SCORING ENGINE
    setTimeout(() => {
        if (typeof submitJawabanScoring === "function") {
            submitJawabanScoring();
        } else if (typeof window.submitJawabanScoring === "function") {
            window.submitJawabanScoring();
        } else {
            alert("❌ Error: Engine Penilaian (submitJawabanScoring) tidak ditemukan!");
            if (overlayLoading) overlayLoading.classList.add("hidden");
            if (btnSelesai) {
                btnSelesai.disabled = false;
                btnSelesai.textContent = "Selesai Ujian";
            }
            App.isSubmitting = false;
            App.isExamSubmitted = false;
        }
    }, 10);
}

/**
 * Render Panel Modal Konfirmasi Pengumpulan
 */
function tampilkanPanelKonfirmasi(dijawabArg, kosongArg, totalSoalArg) {
    let totalSoal = totalSoalArg;
    let dijawab = dijawabArg;
    let kosong = kosongArg;

    if (totalSoal === undefined || dijawab === undefined || kosong === undefined) {
        const questions = (window.App && (App.questionsData || App.questions)) || [];
        totalSoal = questions.length;
        dijawab = window.App && App.userAnswers ? Object.keys(App.userAnswers).length : 0;
        kosong = totalSoal - dijawab;
    }

    if (window.App) App.isSubmitting = true;

    const existingModal = document.getElementById("custom-confirm-modal");
    if (existingModal) existingModal.remove();

    const warningKosongText = kosong > 0 
        ? `<div style="background: #fff3e0; color: #e65100; border-left: 4px solid #ef6c00; padding: 8px 12px; margin-top: 10px; font-size: 13px; border-radius: 4px;">⚠️ Ada <strong>${kosong} soal</strong> yang belum Anda jawab!</div>`
        : `<div style="background: #e8f5e9; color: #2e7d32; border-left: 4px solid #4caf50; padding: 8px 12px; margin-top: 10px; font-size: 13px; border-radius: 4px;">✅ Semua soal telah dijawab dengan lengkap.</div>`;

    const modalHTML = `
        <div id="custom-confirm-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 99999; font-family: sans-serif; backdrop-filter: blur(3px);">
            <div style="background: #ffffff; width: 90%; max-width: 440px; padding: 25px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center;">
                <div style="font-size: 42px; margin-bottom: 8px;">📋</div>
                <h3 style="margin: 0 0 10px 0; color: #1a237e; font-size: 20px;">Konfirmasi Pengumpulan</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Apakah Anda yakin ingin mengakhiri sesi ujian dan mengumpulkan jawaban Anda sekarang?</p>
                
                <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-bottom: 15px; text-align: left; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Total Soal:</span> <strong>${totalSoal} Soal</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #2e7d32;">
                        <span>Sudah Dijawab:</span> <strong>${dijawab} Soal</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: ${kosong > 0 ? '#c62828' : '#555'};">
                        <span>Belum Dijawab:</span> <strong>${kosong} Soal</strong>
                    </div>
                    ${warningKosongText}
                </div>

                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button id="btn-modal-batal" style="flex: 1; padding: 11px; border: 1px solid #ccc; background: #ffffff; color: #333; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">Batal</button>
                    <button id="btn-modal-ya" style="flex: 1; padding: 11px; border: none; background: #1a237e; color: #ffffff; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">Ya, Kirim</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById("btn-modal-batal").onclick = function() {
        document.getElementById("custom-confirm-modal")?.remove();
        if (window.App) App.isSubmitting = false;
    };

    document.getElementById("btn-modal-ya").onclick = function() {
        document.getElementById("custom-confirm-modal")?.remove();
        submitJawaban(false, true);
    };
}
