/* ==========================================================
   js/exam.js - Core Engine Ujian CBT Multi-Type V1.6.0
   Sesuai Dokumen Pedoman Tipe Soal & Format JSON (Termasuk Tipe 5A)
   ========================================================== */

window.App = window.App || {};

function toggleMulaiButton() {
    const chk = document.getElementById("check-setuju") || document.getElementById("agree-checkbox");
    const btn = document.getElementById("btn-mulai-ujian") || document.getElementById("btn-start-exam");
    
    if (!chk || !btn) return;

    if (chk.checked) {
        btn.disabled = false;
        btn.classList.remove("btn-start-disabled");
        btn.classList.add("active");
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.classList.add("btn-start-disabled");
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
    App.startTime = new Date().toISOString();

    try {
        localStorage.removeItem("cbt_warning_count");
        localStorage.removeItem("cbt_violation_logs");
    } catch(e) {}

    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
            console.warn("Fullscreen request bypass/denied.");
        });
    }

    if (typeof window.initSecurityListeners === "function") {
        window.initSecurityListeners();
    } else if (typeof initSecurityListeners === "function") {
        initSecurityListeners();
    }

    initCBT();
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

function syncExamMetadataFromJSON(dataJSON) {
    if (!window.App || !dataJSON) return;

    App.soalData = dataJSON;
    App.questionsData = dataJSON.questions || [];

    // Sinkronkan aturan scoring per JSON (ditambahkan 5A)[cite: 3]
    App.scoringRules = dataJSON.scoring_rules || {
        "1A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },[cite: 3]
        "1B": { "skor_benar": 4.0, "skor_salah": -1.0, "skor_kosong": 0.0 },[cite: 3]
        "1C": { "bobot_level": { "E": 1.0, "M": 3.0, "H": 5.0 }, "skor_salah": 0.0 },[cite: 3]
        "2A": { "skor_benar_semua": 1.0, "skor_salah": 0.0 },[cite: 3]
        "3A": { "skor_benar": 1.0, "skor_salah": 0.0 },[cite: 3]
        "3B": { "skor_benar": 1.0, "skor_salah": 0.0 },[cite: 3]
        "4A": { "skor_per_baris_benar": 1.0, "skor_per_baris_salah": 0.0 },[cite: 3]
        "5A": { "tipe": "weighted_options", "skor_kosong": 0.0 }[cite: 3]
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
    if (!window.App || !App.questionsData) return;
    
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

/**
 * RENDER SOAL BERDASARKAN TIPE (1A-1C, 2A, 3A-3B, 4A, 5A)[cite: 3]
 * & RENDER BADGE PARAMETRIK SOAL
 */
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

    // -------------------------------------------------------------------
    // RENDER BADGE PARAMETRIK SOAL (Mapel, Subtest, Level, Tipe)
    // -------------------------------------------------------------------
    if (elLevel) {
        let badgeHTML = `<div class="question-badges-wrapper">`;
        
        // Badge Section / Mapel
        const sectionVal = q.Section || q.MataPelajaran || q.Mapel || (App.soalData && App.soalData.mata_pelajaran);
        if (sectionVal && String(sectionVal).trim() !== "" && String(sectionVal) !== "-") {
            badgeHTML += `<span class="badge-tag badge-section">📘 ${sectionVal}</span>`;
        }

        // Badge Subtest / Topik
        const subtestVal = q.Subtest || q.Materi || q.Topik;
        if (subtestVal && String(subtestVal).trim() !== "" && String(subtestVal) !== "-") {
            badgeHTML += `<span class="badge-tag badge-subtest">📌 ${subtestVal}</span>`;
        }

        // Badge Level Kesulitan (Easy, Medium, Hard / E, M, H)
        const levelVal = q.Level || q.Kesulitan;
        if (levelVal && String(levelVal).trim() !== "" && String(levelVal) !== "-") {
            let lvlUpper = String(levelVal).trim().toUpperCase();
            let lvlClass = "medium";
            let lvlText = levelVal;

            if (lvlUpper === "E" || lvlUpper === "EASY" || lvlUpper === "MUDAH") {
                lvlClass = "easy";
                lvlText = "Easy";
            } else if (lvlUpper === "H" || lvlUpper === "HARD" || lvlUpper === "SULIT") {
                lvlClass = "hard";
                lvlText = "Hard";
            } else if (lvlUpper === "M" || lvlUpper === "MEDIUM" || lvlUpper === "SEDANG") {
                lvlClass = "medium";
                lvlText = "Medium";
            }

            badgeHTML += `<span class="badge-tag badge-level ${lvlClass}">🔥 Level: ${lvlText}</span>`;
        }

        // Badge Tipe Soal
        const tipeVal = q.Tipe || "1A";
        badgeHTML += `<span class="badge-tag badge-tipe">📝 Tipe: ${tipeVal}</span>`;

        badgeHTML += `</div>`;
        elLevel.innerHTML = badgeHTML;
    }

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
    const tipeSoal = String(q.Tipe || "1A").trim().toUpperCase();

    // -------------------------------------------------------------------
    // TIPE 1A, 1B, 1C & TIPE 5A: Single Choice / Weighted Options (Radio Button)[cite: 3]
    // -------------------------------------------------------------------
    if (["1A", "1B", "1C", "5A"].includes(tipeSoal)) {[cite: 3]
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
    } 
    // -------------------------------------------------------------------
    // TIPE 2A: Multiple Response (Checkbox)
    // -------------------------------------------------------------------
    else if (tipeSoal === "2A") {
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
    }
    // -------------------------------------------------------------------
    // TIPE 3A & 3B: Short Answer (Input Text/Angka)
    // -------------------------------------------------------------------
    else if (tipeSoal === "3A" || tipeSoal === "3B") {
        const textVal = currentAns || "";
        const container = document.createElement("div");
        container.className = "essay-container";
        
        const isMultiLine = tipeSoal === "3B" && textVal.length > 50;
        
        if (isMultiLine) {
            container.innerHTML = `
                <label style="display:block; font-weight: bold; color: var(--text-dark);">Jawaban Anda:</label>
                <textarea id="input-short-answer" 
                          class="essay-input-multi" 
                          placeholder="Ketikkan jawaban Anda secara rinci...">${textVal}</textarea>
            `;
        } else {
            container.innerHTML = `
                <label style="display:block; font-weight: bold; color: var(--text-dark);">Jawaban Anda:</label>
                <input type="${tipeSoal === '3A' ? 'number' : 'text'}" 
                       id="input-short-answer" 
                       class="essay-input-single" 
                       value="${textVal}" 
                       placeholder="${tipeSoal === '3A' ? 'Masukkan angka...' : 'Ketikkan kata/frasa...'}">
            `;
        }
        
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
    }
    // -------------------------------------------------------------------
    // TIPE 4A: True/False Checklist Table
    // -------------------------------------------------------------------
    else if (tipeSoal === "4A") {
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

/**
 * Helper Simpan Jawaban Tipe 4A (True/False Checklist)
 */
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

        const ans = App.userAnswers[idx + 1];
        let isAnswered = false;

        if (Array.isArray(ans)) {
            isAnswered = ans.some(val => val && val !== "");
        } else if (typeof ans === "string") {
            isAnswered = ans.trim() !== "";
        }

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

function konfirmasiKeluar() {
    if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian? Jawaban yang belum dikirim mungkin akan hilang.")) {
        window.location.reload();
    }
}

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

    const questions = App.questionsData || App.questions || [];
    const totalSoal = questions.length;
    const dijawab = Object.keys(App.userAnswers || {}).length;
    const kosong = totalSoal - dijawab;

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

    if (typeof submitJawabanScoring === "function") {
        submitJawabanScoring();
    } else if (typeof window.submitJawabanScoring === "function") {
        window.submitJawabanScoring();
    } else {
        alert("❌ Error: Engine Penilaian (submitJawabanScoring) tidak ditemukan!");
        if (overlayLoading) {
            overlayLoading.classList.add("hidden");
            overlayLoading.style.display = "none";
        }
        if (btnSelesai) {
            btnSelesai.disabled = false;
            btnSelesai.textContent = "🏁 SELESAI";
        }
        App.isSubmitting = false;
        App.isExamSubmitted = false;
    }
}
