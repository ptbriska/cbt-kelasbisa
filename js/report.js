/* ==========================================================
   CBT KIBI V2.0 PREMIUM - Interactive Student Report & Review
   ========================================================== */

// Helper pemformat Kunci Jawaban
function formatKunciReport(kunci) {
    if (Array.isArray(kunci)) return kunci.join(", ");
    if (typeof kunci === "object" && kunci !== null) {
        return Object.entries(kunci).map(([k, v]) => `${k}=${v}`).join(" | ");
    }
    return String(kunci || "-");
}

// Helper pemformat Jawaban Peserta
function formatUserAnswerReport(ans) {
    if (!ans || ans === "" || ans === "-") return "Tidak Diisi";
    if (Array.isArray(ans)) return ans.join(", ");
    if (typeof ans === "object" && ans !== null) {
        return Object.entries(ans).map(([k, v]) => `${k}:${v}`).join(" | ");
    }
    return String(ans);
}

// Helper Format Detik ke Menit:Detik
function formatTimeDuration(seconds) {
    if (!seconds || seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Fungsi Interaktif Buka/Tutup Pembahasan (Accordion)
function togglePembahasan(no) {
    const detailBox = document.getElementById(`pembahasan-detail-${no}`);
    const btn = document.getElementById(`btn-toggle-${no}`);
    if (detailBox.style.display === "none") {
        detailBox.style.display = "block";
        btn.innerHTML = "Tutup Pembahasan ▴";
        btn.classList.add("active");
    } else {
        detailBox.style.display = "none";
        btn.innerHTML = "Lihat Pembahasan ▾";
        btn.classList.remove("active");
    }
}

// Fungsi Filter Soal Berdasarkan Status
function filterReview(status) {
    const cards = document.querySelectorAll('.review-card-item');
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filter-${status.toLowerCase()}`).classList.add('active');

    cards.forEach(card => {
        if (status === 'ALL' || card.dataset.status === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// FUNGSI UTAMA: Render Laporan Hasil Ujian Lengkap
function renderFullStudentReport() {
    const container = document.getElementById("pembahasan-container");
    if (!container) return;

    // AMBIL DATA
    let dataJSON = {};
    let userAnswers = {};
    let timeLogs = {};
    let userName = "Peserta Ujian";

    if (typeof App !== "undefined" && App.soalData && Object.keys(App.soalData).length > 0) {
        dataJSON = App.soalData || {};
        userAnswers = App.userAnswers || {};
        timeLogs = App.questionTimeLogs || {};
        userName = App.userName || "Peserta Ujian";
    } else {
        const storedReport = JSON.parse(localStorage.getItem("cbt_report_data") || "{}");
        dataJSON = storedReport.soalData || {};
        userAnswers = storedReport.userAnswers || {};
        timeLogs = storedReport.questionTimeLogs || {};
        userName = storedReport.userName || "Peserta Ujian";
    }

    if (!dataJSON.questions || dataJSON.questions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Data Pembahasan Tidak Ditemukan</h3>
                <p>Silakan selesaikan ujian terlebih dahulu.</p>
                <button onclick="window.close()" class="btn-primary">Tutup Halaman</button>
            </div>
        `;
        return;
    }

    const questions = dataJSON.questions || [];
    const scoringRules = dataJSON.scoring_rules || {};

    let totalBenar = 0, totalSalah = 0, totalKosong = 0;
    let totalSkorPerolehan = 0, totalSkorMaksimal = 0;
    const subtestStats = {}, sectionStats = {};

    // 1. KALKULASI SKOR
    const itemReviews = questions.map((q, idx) => {
        const no = q.No || (idx + 1);
        const tipe = q.Tipe || "1A";
        const level = q.Level || "E";
        const subtest = q.Subtest || "Umum";
        const section = q.Section || "Umum";
        const ans = userAnswers[no];
        const durasiSec = timeLogs[no] || 0;
        const rule = scoringRules[tipe] || { skor_benar: 1, skor_salah: 0, skor_kosong: 0 };
        
        let status = "KOSONG", skorDiperoleh = 0, skorMaksSoal = 1;

        if (!ans || ans === "" || ans === "-") {
            status = "KOSONG";
            skorDiperoleh = rule.skor_kosong || 0;
        } else {
            if (tipe === "1A" || tipe === "1B" || tipe === "3A" || tipe === "3B") {
                if (String(ans).trim().toLowerCase() === String(q.Kunci).trim().toLowerCase()) {
                    status = "BENAR";
                    skorDiperoleh = (tipe === "1B") ? (rule.skor_benar || 4) : (rule.skor_benar || 1);
                } else {
                    status = "SALAH";
                    skorDiperoleh = (tipe === "1B") ? (rule.skor_salah || -1) : (rule.skor_salah || 0);
                }
                skorMaksSoal = (tipe === "1B") ? 4 : 1;
            } 
            else if (tipe === "1C") {
                const bobotMap = rule.bobot_level || { E: 1, M: 3, H: 5 };
                skorMaksSoal = bobotMap[level] || 1;
                if (String(ans).trim().toUpperCase() === String(q.Kunci).trim().toUpperCase()) {
                    status = "BENAR"; skorDiperoleh = skorMaksSoal;
                } else {
                    status = "SALAH"; skorDiperoleh = rule.skor_salah || 0;
                }
            } 
            else if (tipe === "2A") {
                const keyArr = Array.isArray(q.Kunci) ? q.Kunci : [q.Kunci];
                const userArr = Array.isArray(ans) ? ans : [ans];
                const isExact = keyArr.length === userArr.length && keyArr.every(val => userArr.includes(val));
                if (isExact) { status = "BENAR"; skorDiperoleh = rule.skor_benar_semua || 1; } 
                else { status = "SALAH"; skorDiperoleh = rule.skor_salah || 0; }
                skorMaksSoal = rule.skor_benar_semua || 1;
            } 
            else if (tipe === "4A") {
                const keyArr = Array.isArray(q.Kunci) ? q.Kunci : [];
                const userArr = Array.isArray(ans) ? ans : [];
                let correctCount = 0;
                keyArr.forEach((kVal, kIdx) => { if (userArr[kIdx] && userArr[kIdx] === kVal) correctCount++; });
                skorDiperoleh = correctCount * (rule.skor_per_baris_benar || 1);
                skorMaksSoal = keyArr.length * (rule.skor_per_baris_benar || 1);
                status = (correctCount === keyArr.length) ? "BENAR" : (correctCount > 0 ? "PARSIAL" : "SALAH");
            } 
            else if (tipe === "5A") {
                const keyObj = (typeof q.Kunci === "object") ? q.Kunci : {};
                skorDiperoleh = Number(keyObj[ans]) || 0;
                skorMaksSoal = rule.skor_maksimal || 5;
                status = "SKOR_SCALE";
            }
        }

        if (status === "BENAR") totalBenar++;
        else if (status === "SALAH") totalSalah++;
        else if (status === "KOSONG") totalKosong++;

        totalSkorPerolehan += skorDiperoleh;
        totalSkorMaksimal += skorMaksSoal;

        // Helper function untuk agregasi
        const aggregate = (target, key) => {
            if (!target[key]) target[key] = { total: 0, benar: 0, salah: 0, kosong: 0, skor: 0, maxSkor: 0 };
            target[key].total++;
            if (status === "BENAR") target[key].benar++;
            if (status === "SALAH") target[key].salah++;
            if (status === "KOSONG") target[key].kosong++;
            target[key].skor += skorDiperoleh;
            target[key].maxSkor += skorMaksSoal;
        };
        aggregate(subtestStats, subtest);
        aggregate(sectionStats, section);

        return { ...q, no, ans, status, skorDiperoleh, skorMaksSoal, durasiSec };
    });

    // 2. BUILD HTML STRUCTURE REPORT (PREMIUM UI)
    let html = `
    <div class="premium-report-wrapper">
        <!-- HEADER KOP & IDENTITAS -->
        <div class="report-header-card">
            <div class="header-flex">
                <div class="brand-info">
                    ${dataJSON.logo ? `<img src="${dataJSON.logo}" class="brand-logo">` : ''}
                    <div>
                        <h1>${dataJSON.lembaga || 'KIBI EDUCATION CENTER'}</h1>
                        <p class="subtitle">${dataJSON.nama_kegiatan || 'Smart Evaluation Report'}</p>
                    </div>
                </div>
                <button onclick="window.print()" class="btn-print"><i class="icon-print"></i> Download PDF</button>
            </div>
            
            <div class="student-profile">
                <div class="profile-avatar">${userName.charAt(0).toUpperCase()}</div>
                <div class="profile-details">
                    <h2>${userName}</h2>
                    <div class="badges">
                        <span class="badge-info">Mode: ${dataJSON.mode_ujian || 'Latihan'}</span>
                        <span class="badge-info">Tgl: ${new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- MAIN SCORE DASHBOARD -->
        <div class="dashboard-grid">
            <div class="score-card primary">
                <p class="card-label">NILAI AKHIR</p>
                <h2 class="card-value">${totalSkorPerolehan.toFixed(1)} <span class="max-val">/ ${totalSkorMaksimal}</span></h2>
                <div class="progress-bg"><div class="progress-bar" style="width: ${(totalSkorPerolehan/totalSkorMaksimal)*100}%"></div></div>
            </div>
            <div class="score-card success">
                <p class="card-label">AKURASI</p>
                <h2 class="card-value">${((totalBenar/questions.length)*100).toFixed(0)}%</h2>
                <p class="card-desc">${totalBenar} Soal Benar</p>
            </div>
            <div class="score-card danger">
                <p class="card-label">PERLU PERBAIKAN</p>
                <h2 class="card-value">${totalSalah}</h2>
                <p class="card-desc">Soal Keliru/Salah</p>
            </div>
            <div class="score-card warning">
                <p class="card-label">TIDAK TERJAWAB</p>
                <h2 class="card-value">${totalKosong}</h2>
                <p class="card-desc">Kehabisan Waktu/Ragu</p>
            </div>
        </div>

        <!-- ANALISIS STATISTIK MATERI -->
        <div class="analytics-container">
            <h3 class="section-title">Analisis Penguasaan Materi (Subtest)</h3>
            <div class="table-responsive">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th>Subtest</th>
                            <th>Benar</th>
                            <th>Salah</th>
                            <th>Kosong</th>
                            <th>Perolehan Skor</th>
                            <th>Penguasaan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(subtestStats).map(([stName, stData]) => {
                            const pct = stData.maxSkor > 0 ? ((stData.skor / stData.maxSkor) * 100).toFixed(1) : 0;
                            return `
                            <tr>
                                <td><strong>${stName}</strong><br><small>${stData.total} Soal</small></td>
                                <td class="text-success font-weight-bold">${stData.benar}</td>
                                <td class="text-danger">${stData.salah}</td>
                                <td class="text-muted">${stData.kosong}</td>
                                <td><strong>${stData.skor.toFixed(1)}</strong> / ${stData.maxSkor}</td>
                                <td>
                                    <div class="progress-mini">
                                        <div class="progress-mini-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}" style="width: ${pct}%"></div>
                                    </div>
                                    <small>${pct}%</small>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- REVIEW SOAL & PEMBAHASAN LENGKAP -->
        <div class="review-container">
            <div class="review-header">
                <h3 class="section-title">Kajian Ulang & Pembahasan Lengkap</h3>
                <div class="filter-group">
                    <button id="filter-all" class="filter-btn active" onclick="filterReview('ALL')">Semua Soal</button>
                    <button id="filter-benar" class="filter-btn text-success" onclick="filterReview('BENAR')">✓ Benar</button>
                    <button id="filter-salah" class="filter-btn text-danger" onclick="filterReview('SALAH')">✗ Salah</button>
                    <button id="filter-kosong" class="filter-btn text-muted" onclick="filterReview('KOSONG')">Kosong</button>
                </div>
            </div>

            <div class="review-list">
                ${itemReviews.map(rev => {
                    // Status Badge Mapping
                    let badgeClass = 'bg-muted', icon = '➖';
                    if (rev.status === 'BENAR') { badgeClass = 'bg-success'; icon = '✓'; }
                    else if (rev.status === 'SALAH') { badgeClass = 'bg-danger'; icon = '✗'; }
                    else if (rev.status === 'PARSIAL' || rev.status === 'SKOR_SCALE') { badgeClass = 'bg-warning'; icon = '⭐'; }

                    const ansText = formatUserAnswerReport(rev.ans);
                    const keyText = formatKunciReport(rev.Kunci);
                    // Ambil teks soal dan pembahasan dari JSON jika ada
                    const teksSoal = rev.Pertanyaan || "Teks soal tidak disertakan dalam data.";
                    const teksPembahasan = rev.Pembahasan || "Penjelasan/pembahasan belum tersedia untuk soal ini.";

                    return `
                    <div class="review-card-item" data-status="${rev.status}">
                        <div class="card-head">
                            <div class="head-left">
                                <span class="q-number">Soal No. ${rev.no}</span>
                                <span class="q-tags">${rev.Subtest} • Tipe ${rev.Tipe}</span>
                            </div>
                            <div class="head-right">
                                <span class="time-spent">⏱️ ${formatTimeDuration(rev.durasiSec)}</span>
                                <span class="status-badge ${badgeClass}">${icon} Skor: +${rev.skorDiperoleh}</span>
                            </div>
                        </div>
                        
                        <div class="q-content">
                            <div class="q-text">${teksSoal}</div>
                        </div>

                        <div class="answer-compare">
                            <div class="ans-box user-ans ${rev.status === 'BENAR' ? 'correct-border' : 'wrong-border'}">
                                <small>Jawaban Anda:</small>
                                <strong>${ansText}</strong>
                            </div>
                            <div class="ans-box key-ans">
                                <small>Kunci Jawaban:</small>
                                <strong>${keyText}</strong>
                            </div>
                        </div>

                        <button id="btn-toggle-${rev.no}" class="btn-toggle-pembahasan" onclick="togglePembahasan(${rev.no})">
                            Lihat Pembahasan ▾
                        </button>

                        <div id="pembahasan-detail-${rev.no}" class="pembahasan-detail-box" style="display: none;">
                            <h4>Penjelasan:</h4>
                            <div class="pembahasan-text">${teksPembahasan}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        ${dataJSON.kalimat_motivasi ? `
        <div class="motivation-banner">
            <div class="quote-icon">❝</div>
            <p>${dataJSON.kalimat_motivasi}</p>
        </div>` : ''}

    </div>
    `;

    container.innerHTML = html;

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise();
    }
}

document.addEventListener("DOMContentLoaded", renderFullStudentReport);
