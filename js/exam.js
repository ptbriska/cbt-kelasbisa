/* ==========================================================
   js/exam.js - Core Engine Ujian CBT Multi-Type V1.6.7
   Sesuai Dokumen Pedoman Tipe Soal & Format JSON (1A-1C, 2A, 3A-3B, 4A, 5A)
   Fitur & Perbaikan V1.6.7: 
   1. Tombol Clear Answer (Kosongkan Jawaban) per Soal
   2. Optimized Font-Size Switcher via Dynamic CSS Variables
   3. Auto-position Tombol Selesai di Atas Grid Soal
   4. Explicit Metadata Labels (SECTION, SUBTEST, LEVEL KESULTAN SOAL, TIPE SOAL)
   5. Tombol Ragu-Ragu (Visual Marker State)
   6. Data Sanitization & Input Normalization (Trim & Safe Array)
   7. Real-time Timelog Sync per Detik (Solusi Log Waktu 00:00 di report.js)
   ========================================================== */

window.App = window.App || {};

// ==========================================================
// 1. UTILS & NAVIGATION HELPERS
// ==========================================================

function formatSecondsToHMS(totalSeconds) {
    const sec = Math.max(0, parseInt(totalSeconds, 10) || 0);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    return `${hStr}:${mStr}:${sStr}`;
}

function toggleMulaiButton() {
    const chk = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    const btn = document.getElementById("btn-mulai-ujian") || document.getElementById("btn-start-exam");
    
    if (!chk || !btn) return;

    const isChecked = chk.checked;
    btn.disabled = !isChecked;
    btn.classList.toggle("btn-start-disabled", !isChecked);
    btn.classList.toggle("active", isChecked);
    btn.style.cursor = isChecked ? "pointer" : "not-allowed";
}

function kembaliKePage1() {
    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-login")?.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function updateHeaderUserProfile() {
    const elNama = document.getElementById("disp-user-name");
    const elInstansi = document.getElementById("disp-user-school");

    if (window.App) {
        const p = App.verifiedPesertaData || App.userIdentitas || {};
        if (elNama) elNama.textContent = p["Nama Lengkap"] || p.nama || "-";
        if (elInstansi) elInstansi.textContent = p["Asal Instansi"] || p.sekolah || "-";
    }
}

function navigasi(direction) {
    if (!window.App || !App.questionsData) return;
    const newIndex = App.currentIndex + direction;
    if (newIndex >= 0 && newIndex < App.questionsData.length) {
        App.currentIndex = newIndex;
        loadQuestion(App.currentIndex);
    }
}

function konfirmasiKeluar() {
    if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian? Jawaban yang belum dikirim mungkin akan hilang.")) {
        window.location.reload();
    }
}

// Check status apakah sebuah nomor soal sudah terisi valid
function isQuestionAnswered(displayNo) {
    if (!window.App || !App.userAnswers) return false;
    const ans = App.userAnswers[displayNo];
    
    if (Array.isArray(ans)) {
        return ans.some(val => val !== undefined && val !== null && String(val).trim() !== "");
    }
    return ans !== undefined && ans !== null && String(ans).trim() !== "";
}

// Toggle status Ragu-Ragu (Visual Only)
function toggleDoubt(displayNo) {
    if (!window.App) return;
    App.doubtState = App.doubtState || {};
    App.doubtState[displayNo] = !App.doubtState[displayNo];
    
    loadQuestion(App.currentIndex);
}

// Fitur Reset / Kosongkan Jawaban untuk Soal Aktif
function clearAnswer(displayNo) {
    if (!window.App || !App.userAnswers) return;
    delete App.userAnswers[displayNo];
    loadQuestion(App.currentIndex);
}

// Fitur Custom Ukuran Font via CSS Variables & Root Styling
function setFontSize(size) {
    if (!window.App) return;
    App.fontSize = size || 'medium';

    let pxSize = "16px";
    if (App.fontSize === "small") pxSize = "14px";
    if (App.fontSize === "large") pxSize = "19px";

    const optionsBox = document.getElementById("options-box");
    if (optionsBox) {
        optionsBox.style.setProperty('--cbt-font-size', pxSize);
        optionsBox.style.fontSize = pxSize;
    }

    const qText = document.getElementById("q-text");
    if (qText) {
        qText.style.fontSize = pxSize;
    }

    // Update active style pada toolbar ukuran font
    document.querySelectorAll(".btn-font-size").forEach(btn => {
        const isCurrent = btn.dataset.size === App.fontSize;
        btn.style.backgroundColor = isCurrent ? "#2563eb" : "#f3f4f6";
        btn.style.color = isCurrent ? "#ffffff" : "#374151";
        btn.style.borderColor = isCurrent ? "#2563eb" : "#d1d5db";
        btn.style.fontWeight = isCurrent ? "bold" : "normal";
    });
}

// ==========================================================
// 2. CBT INIT & TIMING
// ==========================================================

function mulaiUjianPenuh() {
    const chk = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    if (chk && !chk.checked) {
        alert("Anda wajib menyetujui syarat dan ketentuan sebelum memulai ujian!");
        return;
    }

    const webhookUrl = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";
    fetch(webhookUrl, { mode: 'no-cors', keepalive: true }).catch(() => {});

    updateHeaderUserProfile();

    document.getElementById("page-info")?.classList.add("hidden");
    document.getElementById("page-cbt")?.classList.remove("hidden");
    window.scrollTo(0, 0);

    App.isExamStarted = true;
    App.isExamSubmitted = false;
    App.isSubmitting = false; 
    App.isScoringCompleted = false;
    
    App.warningCount = 0;
    App.warningLogs = [];
    App.cheatingSnapshots = []; 

    // INIT REALTIME TIMELOG STATE
    App.startTimestamp = Date.now();
    App.startTime = new Date(App.startTimestamp).toISOString();
    App.elapsedSeconds = 0;
    App.durasiDetik = 0;
    App.waktuPengerjaanFormatted = "00:00:00";
    App.timeLog = "00:00:00";
    App.questionTimeLogs = App.questionTimeLogs || {};

    try {
        localStorage.removeItem("cbt_warning_count");
        localStorage.removeItem("cbt_violation_logs");
    } catch (e) {}

    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
            console.warn("Fullscreen request bypassed or denied.");
        });
    }

    const initSecurity = window.initSecurityListeners || initSecurityListeners;
    if (typeof initSecurity === "function") {
        initSecurity();
    }

    initCBT();
}

function syncExamMetadataFromJSON(dataJSON) {
    if (!window.App || !dataJSON) return;

    App.soalData = dataJSON;
    App.questionsData = dataJSON.questions || [];

    App.scoringRules = dataJSON.scoring_rules || {
        "1A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "1B": { "skor_benar": 4.0, "skor_salah": -1.0, "skor_kosong": 0.0 },
        "1C": { "bobot_level": { "E": 1.0, "M": 3.0, "H": 5.0 }, "skor_salah": 0.0 },
        "2A": { "skor_benar_semua": 1.0, "skor_salah": 0.0 },
        "3A": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "3B": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "4A": { "skor_per_baris_benar": 1.0, "skor_per_baris_salah": 0.0 },
        "5A": { "tipe": "weighted_options", "skor_kosong": 0.0 }
    };

    App.currentKodeUjian = dataJSON.kode_ujian || App.currentKodeUjian;
    App.timerDurationMinutes = dataJSON.timer_menit || dataJSON.durasi_menit || 10;
}

function initCBT() {
    if (!window.App) return;

    if (App.soalData) {
        syncExamMetadataFromJSON(App.soalData);
    }

    App.userAnswers = App.userAnswers || {};
    App.doubtState = App.doubtState || {};
    App.fontSize = App.fontSize || 'medium';
    App.currentIndex = App.currentIndex || 0;

    renderNumberGrid();
    loadQuestion(App.currentIndex);

    const durasiMenit = App.timerDurationMinutes || 10;
    startTimer(parseInt(durasiMenit, 10) * 60);
}

function startTimer(durationInSeconds) {
    let totalSecondsAllowed = parseInt(durationInSeconds, 10);
    if (isNaN(totalSecondsAllowed) || totalSecondsAllowed <= 0) totalSecondsAllowed = 600;

    const timerDisplay = document.getElementById("timer-display") || document.getElementById("timer");

    if (App.timerInterval) {
        clearInterval(App.timerInterval);
    }

    if (!App.startTimestamp) {
        App.startTimestamp = Date.now();
    }

    const intervalFunc = () => {
        // Hitung selisih detik secara presisi menggunakan timestamp sistem
        const now = Date.now();
        const elapsed = Math.floor((now - App.startTimestamp) / 1000);
        const remaining = totalSecondsAllowed - elapsed;

        // Sync data Timelog real-time untuk report.js
        App.elapsedSeconds = elapsed;
        App.durasiDetik = elapsed;
        App.waktuTerpakai = elapsed;
        App.waktuPengerjaanFormatted = formatSecondsToHMS(elapsed);
        App.timeLog = App.waktuPengerjaanFormatted;

        // Track akumulasi durasi per nomor soal secara real-time
        if (App.isExamStarted && !App.isExamSubmitted) {
            const currentNo = App.currentIndex + 1;
            App.questionTimeLogs = App.questionTimeLogs || {};
            App.questionTimeLogs[currentNo] = (App.questionTimeLogs[currentNo] || 0) + 1;
        }

        // Tampilan mundur di UI Ujian
        const displaySec = Math.max(0, remaining);
        const hours = Math.floor(displaySec / 3600);
        const minutes = Math.floor((displaySec % 3600) / 60);
        const seconds = displaySec % 60;

        const hStr = String(hours).padStart(2, '0');
        const mStr = String(minutes).padStart(2, '0');
        const sStr = String(seconds).padStart(2, '0');

        if (timerDisplay) {
            timerDisplay.textContent = `${hStr}:${mStr}:${sStr}`;
            if (displaySec <= 300) {
                timerDisplay.style.color = "#dc3545";
                timerDisplay.style.fontWeight = "bold";
            } else {
                timerDisplay.style.color = "";
                timerDisplay.style.fontWeight = "";
            }
        }

        // Waktu habis
        if (remaining <= 0) {
            if (App.timerInterval) clearInterval(App.timerInterval);
            App.endTime = new Date().toISOString();
            alert("⏰ Waktu pengerjaan Ujian telah habis! Jawaban Anda akan dikirim secara otomatis.");
            submitJawaban(true, true);
        }
    };

    intervalFunc();
    App.timerInterval = setInterval(intervalFunc, 1000);
}

// ==========================================================
// 3. UI RENDERING (GRID & QUESTION TYPES)
// ==========================================================

function renderNumberGrid() {
    const grid = document.getElementById("number-grid");
    if (!window.App || !App.questionsData) return;

    // Tombol Selesai Berada di Atas Grid Soal
    const btnSelesai = document.getElementById("btn-selesai");
    if (btnSelesai && grid && grid.parentElement) {
        let topActionBox = document.getElementById("grid-top-actions");
        if (!topActionBox) {
            topActionBox = document.createElement("div");
            topActionBox.id = "grid-top-actions";
            topActionBox.style.cssText = "margin-bottom: 12px; width: 100%;";
            grid.parentElement.insertBefore(topActionBox, grid);
        }
        if (btnSelesai.parentElement !== topActionBox) {
            topActionBox.appendChild(btnSelesai);
            btnSelesai.style.cssText = "width: 100%; padding: 10px 14px; font-weight: bold; border-radius: 8px; cursor: pointer; text-align: center;";
        }
    }

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

    if (grid) {
        grid.innerHTML = "";
        grid.appendChild(fragment);
    }
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
    if (elText) elText.innerHTML = q.Soal || q.pertanyaan || "";

    // BADGE METADATA (DENGAN LABEL TEKS EKSPLISIT)
    if (elLevel) {
        elLevel.style.setProperty("background", "transparent", "important");
        elLevel.style.setProperty("background-color", "transparent", "important");
        elLevel.style.setProperty("border", "none", "important");
        elLevel.style.setProperty("box-shadow", "none", "important");
        elLevel.style.setProperty("padding", "0", "important");

        const sectionVal = q.Section || q.section || q.MataPelajaran || q.mapel || (App.soalData && (App.soalData.nama_kegiatan || App.soalData.mata_pelajaran));
        const subtestVal = q.Subtest || q.subtest || q.Materi || q.materi || q.Topik || q.topik;
        const levelVal   = q.Level   || q.level   || q.Kesulitan || q.kesulitan;
        const tipeVal    = q.Tipe    || q.tipe    || q.tipe_soal || "1A";

        let badgeHTML = `<div class="question-badges-wrapper" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; background: transparent; padding: 0; border: none;">`;
        
        if (sectionVal && String(sectionVal).trim() !== "" && String(sectionVal) !== "-") {
            badgeHTML += `<span class="badge-tag badge-section">📘 SECTION : ${String(sectionVal).trim().toUpperCase()}</span>`;
        }

        if (subtestVal && String(subtestVal).trim() !== "" && String(subtestVal) !== "-") {
            badgeHTML += `<span class="badge-tag badge-subtest">📌 SUBTEST : ${String(subtestVal).trim().toUpperCase()}</span>`;
        }

        if (levelVal && String(levelVal).trim() !== "" && String(levelVal) !== "-") {
            let lvlUpper = String(levelVal).trim().toUpperCase();
            let lvlClass = "medium";
            
            if (["E", "EASY", "MUDAH"].includes(lvlUpper)) {
                lvlClass = "easy";
            } else if (["H", "HARD", "SULIT"].includes(lvlUpper)) {
                lvlClass = "hard";
            } else if (["M", "MEDIUM", "SEDANG"].includes(lvlUpper)) {
                lvlClass = "medium";
            }

            badgeHTML += `<span class="badge-tag badge-level ${lvlClass}">🔥 LEVEL KESULTAN SOAL : ${lvlUpper}</span>`;
        }

        badgeHTML += `<span class="badge-tag badge-tipe">📝 TIPE SOAL : ${String(tipeVal).trim().toUpperCase()}</span>`;
        badgeHTML += `</div>`;
        
        badgeHTML += `
            <div class="font-size-toolbar" style="display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; margin-bottom: 12px; padding: 4px 8px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <span style="font-size: 12px; font-weight: 600; color: #4b5563; margin-right: 4px;">UKURAN TEKS:</span>
                <button type="button" class="btn-font-size" data-size="small" onclick="setFontSize('small')" title="Teks Kecil" style="padding: 2px 8px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">A-</button>
                <button type="button" class="btn-font-size" data-size="medium" onclick="setFontSize('medium')" title="Teks Sedang (Default)" style="padding: 2px 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">A</button>
                <button type="button" class="btn-font-size" data-size="large" onclick="setFontSize('large')" title="Teks Besar" style="padding: 2px 8px; font-size: 15px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">A+</button>
            </div>
        `;
        
        elLevel.innerHTML = badgeHTML;
    }

    // GAMBAR SOAL
    const imgContainer = document.getElementById("q-image-container");
    if (imgContainer) {
        const gambarVal = (q.Gambar && typeof q.Gambar === "string") ? q.Gambar.trim() : "";
        imgContainer.innerHTML = (gambarVal && gambarVal !== "-" && gambarVal.toLowerCase() !== "none") 
            ? `<img src="${gambarVal}" class="img-soal" alt="Gambar Soal">` 
            : "";
    }

    const optionsBox = document.getElementById("options-box");
    if (!optionsBox) return;
    optionsBox.innerHTML = "";

    const currentAns = App.userAnswers[displayNo];
    const tipeSoal = String(q.Tipe || q.tipe || "1A").trim().toUpperCase();

    // RENDER BERDASARKAN TIPE SOAL
    if (["1A", "1B", "1C", "5A"].includes(tipeSoal)) {
        ["A", "B", "C", "D", "E"].forEach(key => {
            if (q[key] !== undefined && q[key] !== null && String(q[key]).trim() !== "" && q[key] !== "-") {
                const isSelected = (currentAns === key);
                const row = document.createElement("div"); 
                row.className = `option-row ${isSelected ? 'selected' : ''}`;
                row.innerHTML = `
                    <input type="radio" name="opt_${displayNo}" value="${key}" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
                    <span class="opt-key">${key}.</span>
                    <span class="opt-val">${q[key]}</span>
                `;
                row.onclick = () => {
                    App.userAnswers[displayNo] = (App.userAnswers[displayNo] === key) ? undefined : key;
                    loadQuestion(App.currentIndex);
                };
                optionsBox.appendChild(row);
            }
        });
    } else if (tipeSoal === "2A") {
        let ansArray = Array.isArray(currentAns) ? currentAns : [];
        ["A", "B", "C", "D", "E"].forEach(key => {
            if (q[key] !== undefined && q[key] !== null && String(q[key]).trim() !== "" && q[key] !== "-") {
                const isSelected = ansArray.includes(key);
                const row = document.createElement("div"); 
                row.className = `option-row ${isSelected ? 'selected' : ''}`;
                row.innerHTML = `
                    <input type="checkbox" name="opt_${displayNo}" value="${key}" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
                    <span class="opt-key">${key}.</span>
                    <span class="opt-val">${q[key]}</span>
                `;
                row.onclick = () => {
                    let updated = Array.isArray(App.userAnswers[displayNo]) ? [...App.userAnswers[displayNo]] : [];
                    if (updated.includes(key)) {
                        updated = updated.filter(item => item !== key);
                    } else {
                        updated.push(key);
                    }
                    if (updated.length === 0) delete App.userAnswers[displayNo];
                    else App.userAnswers[displayNo] = updated;
                    loadQuestion(App.currentIndex);
                };
                optionsBox.appendChild(row);
            }
        });
    } else if (tipeSoal === "3A" || tipeSoal === "3B") {
        const textVal = currentAns || "";
        const container = document.createElement("div");
        container.className = "essay-container";
        const isMultiLine = tipeSoal === "3B" && textVal.length > 50;
        
        container.innerHTML = `
            <label style="display:block; font-weight: bold; margin-bottom: 8px; color: var(--text-dark, #333);">Jawaban Anda:</label>
            ${isMultiLine ? 
                `<textarea id="input-short-answer" class="essay-input-multi" placeholder="Ketikkan jawaban Anda secara rinci...">${textVal}</textarea>` :
                `<input type="${tipeSoal === '3A' ? 'number' : 'text'}" id="input-short-answer" class="essay-input-single" value="${textVal}" placeholder="${tipeSoal === '3A' ? 'Masukkan angka...' : 'Ketikkan kata/frasa...'}">`
            }
        `;
        
        optionsBox.appendChild(container);

        const inputEl = document.getElementById("input-short-answer");
        if (inputEl) {
            inputEl.oninput = (e) => {
                const val = e.target.value;
                if (val.trim() === "") delete App.userAnswers[displayNo];
                else App.userAnswers[displayNo] = val;
                updateGridStatus();
            };
        }
    } else if (tipeSoal === "4A") {
        let userAnsArray = Array.isArray(currentAns) ? currentAns : [];
        const statements = ["A", "B", "C", "D", "E"].filter(k => q[k] && String(q[k]).trim() !== "" && q[k] !== "-");
        
        let tableHTML = `
            <div class="matrix-container">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Pernyataan</th>
                            <th class="matrix-radio-cell">Benar (B)</th>
                            <th class="matrix-radio-cell">Salah (S)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        statements.forEach((key, idx) => {
            const valPernyataan = q[key];
            const currentChoice = userAnsArray[idx] || "";
            
            tableHTML += `
                <tr>
                    <td class="matrix-statement">${idx + 1}. ${valPernyataan}</td>
                    <td class="matrix-radio-cell">
                        <input type="radio" name="tf_${displayNo}_${idx}" value="B" ${currentChoice === 'B' ? 'checked' : ''} onchange="simpanTFKlik(${displayNo}, ${idx}, 'B', ${statements.length})">
                    </td>
                    <td class="matrix-radio-cell">
                        <input type="radio" name="tf_${displayNo}_${idx}" value="S" ${currentChoice === 'S' ? 'checked' : ''} onchange="simpanTFKlik(${displayNo}, ${idx}, 'S', ${statements.length})">
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        optionsBox.innerHTML = tableHTML;
    }

    // BOTTOM TOOLBAR: RAGU-RAGU & CLEAR ANSWER
    const isDoubt = !!(App.doubtState && App.doubtState[displayNo]);
    const hasAnswer = isQuestionAnswered(displayNo);

    const doubtContainer = document.createElement("div");
    doubtContainer.className = "doubt-container";
    doubtContainer.style.cssText = "margin-top: 15px; padding-top: 12px; border-top: 1px dashed #ccc; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;";
    
    doubtContainer.innerHTML = `
        <label class="btn-doubt-label" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-weight: 600; color: #d97706;">
            <input type="checkbox" id="chk-doubt-${displayNo}" ${isDoubt ? 'checked' : ''} onchange="toggleDoubt(${displayNo})" style="width: 18px; height: 18px; cursor: pointer;">
            🟨 Tandai Ragu-Ragu
        </label>
        ${hasAnswer ? `
            <button type="button" onclick="clearAnswer(${displayNo})" style="background: transparent; color: #ef4444; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                🗑️ Kosongkan Jawaban
            </button>
        ` : ''}
    `;
    optionsBox.appendChild(doubtContainer);

    setFontSize(App.fontSize || 'medium');

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

window.simpanTFKlik = function(displayNo, barisIdx, pilihan, totalBaris) {
    if (!window.App) return;
    let currentArr = Array.isArray(App.userAnswers[displayNo]) ? [...App.userAnswers[displayNo]] : new Array(totalBaris).fill("");
    
    currentArr[barisIdx] = pilihan;
    App.userAnswers[displayNo] = currentArr;
    updateGridStatus();
};

function updateGridStatus() {
    if (!window.App || !App.questionsData) return;
    App.questionsData.forEach((_, idx) => {
        const circle = document.getElementById(`circle-num-${idx}`);
        if (!circle) return;

        const displayNo = idx + 1;
        const isAnswered = isQuestionAnswered(displayNo);
        const isActive = (idx === App.currentIndex);
        const isDoubt = !!(App.doubtState && App.doubtState[displayNo]);

        let className = "circle-btn";
        
        if (isDoubt) {
            className += " doubt";
        } else if (isAnswered) {
            className += " answered";
        } else {
            className += " unanswered";
        }
        
        if (isActive) className += " active";

        circle.className = className;
    });
}

// ==========================================================
// 4. SUBMISSION & CONFIRMATION
// ==========================================================

function hitungRingkasanJawaban() {
    const questions = (window.App && App.questionsData) || [];
    const totalSoal = questions.length;
    let dijawab = 0;

    for (let i = 1; i <= totalSoal; i++) {
        if (isQuestionAnswered(i)) dijawab++;
    }

    const kosong = totalSoal - dijawab;
    return { totalSoal, dijawab, kosong };
}

function tampilkanPanelKonfirmasi(dijawabArg, kosongArg, totalSoalArg) {
    let { totalSoal, dijawab, kosong } = hitungRingkasanJawaban();

    if (totalSoalArg !== undefined) totalSoal = totalSoalArg;
    if (dijawabArg !== undefined) dijawab = dijawabArg;
    if (kosongArg !== undefined) kosong = kosongArg;

    if (window.App) App.isSubmitting = true;

    const modalStatis = document.getElementById("modal-konfirmasi");
    const teksRingkasan = document.getElementById("teks-ringkasan-konfirmasi");

    if (modalStatis && teksRingkasan) {
        teksRingkasan.innerHTML = `
            Total Soal: <strong>${totalSoal}</strong><br>
            Sudah Dijawab: <strong style="color: #2e7d32;">${dijawab}</strong><br>
            Belum Dijawab: <strong style="color: ${kosong > 0 ? '#c62828' : '#555'};">${kosong}</strong>
            ${kosong > 0 ? '<br><span style="color: #e65100; font-size: 13px;">⚠️ Ada soal yang belum dijawab!</span>' : ''}
        `;
        modalStatis.classList.remove("hidden");
        modalStatis.style.setProperty("display", "flex", "important");
        return;
    }

    const existingModal = document.getElementById("custom-confirm-modal");
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="custom-confirm-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 99999;">
            <div style="background: #ffffff; width: 90%; max-width: 440px; padding: 25px; border-radius: 12px; text-align: center;">
                <h3>Konfirmasi Pengumpulan</h3>
                <p>Total Soal: <strong>${totalSoal}</strong> | Dijawab: <strong>${dijawab}</strong> | Belum: <strong>${kosong}</strong></p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btn-modal-batal" class="btn-secondary" style="flex:1;">Batal</button>
                    <button id="btn-modal-ya" class="btn-primary" style="flex:1;">Ya, Kirim</button>
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

function konfirmasiSubmit() {
    const modalStatis = document.getElementById("modal-konfirmasi");
    if (modalStatis) {
        modalStatis.classList.add("hidden");
        modalStatis.style.setProperty("display", "none", "important");
    }
    submitJawaban(false, true);
}

async function submitJawaban(isAuto = false, isConfirmed = false) {
    if (!window.App) return;

    if (App.isExamSubmitted && !isAuto) return;

    const { totalSoal, dijawab, kosong } = hitungRingkasanJawaban();

    if (!isAuto && !isConfirmed) {
        App.isSubmitting = true; 
        tampilkanPanelKonfirmasi(dijawab, kosong, totalSoal);
        return;
    }

    const modalStatis = document.getElementById("modal-konfirmasi");
    if (modalStatis) {
        modalStatis.classList.add("hidden");
        modalStatis.style.setProperty("display", "none", "important");
    }
    const dinamikModal = document.getElementById("custom-confirm-modal");
    if (dinamikModal) dinamikModal.remove();

    App.isSubmitting = true;
    App.isExamSubmitted = true; 

    // FINALISASI DAN SYNC TOTAL WAKTU PENGERJAAN KE VAR APP
    App.endTime = new Date().toISOString();
    if (App.startTimestamp) {
        const finalElapsed = Math.floor((Date.now() - App.startTimestamp) / 1000);
        App.elapsedSeconds = finalElapsed;
        App.durasiDetik = finalElapsed;
        App.waktuTerpakai = finalElapsed;
        App.waktuPengerjaanFormatted = formatSecondsToHMS(finalElapsed);
        App.timeLog = App.waktuPengerjaanFormatted;
    }

    if (typeof window.simpanLockSubmitted === "function") {
        window.simpanLockSubmitted(); 
    }

    if (App.timerInterval) {
        clearInterval(App.timerInterval);
    }

    const overlayLoading = document.getElementById("loading-overlay");
    if (overlayLoading) {
        overlayLoading.classList.remove("hidden");
        overlayLoading.style.display = "flex";
    }
    
    const btnSelesai = document.getElementById("btn-selesai");
    if (btnSelesai) {
        btnSelesai.disabled = true;
        btnSelesai.textContent = "Mengirim...";
    }

    const submitScoring = window.submitJawabanScoring || submitJawabanScoring;
    if (typeof submitScoring === "function") {
        submitScoring();
    } else {
        alert("❌ Error: Engine Penilaian (submitJawabanScoring) tidak ditemukan!");
        if (overlayLoading) {
            overlayLoading.classList.add("hidden");
            overlayLoading.style.display = "none";
        }
        if (btnSelesai) {
            btnSelesai.disabled = false;
            btnSelesai.textContent = "🏁 SELESAI & KIRIM JAWABAN";
        }
        App.isSubmitting = false;
        App.isExamSubmitted = false;
    }
}
