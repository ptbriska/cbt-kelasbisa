/* ==========================================================
   CBT KIBI V2.0 PREMIUM - Static Student Report & Review
   Update Version: 1.6.7 / 2.0 Complete Engine
   ========================================================== */

// Helper Pemformat Kunci Jawaban
function formatKunciReport(kunci) {
    if (Array.isArray(kunci)) return kunci.join(", ");
    if (typeof kunci === "object" && kunci !== null) {
        return Object.entries(kunci).map(([k, v]) => `${k} = ${v}`).join(" | ");
    }
    return String(kunci || "-");
}

// Helper Pemformat Jawaban Peserta
function formatUserAnswerReport(ans) {
    if (ans === undefined || ans === null || ans === "" || ans === "-") return "Tidak Diisi";
    if (Array.isArray(ans)) return ans.join(", ");
    if (typeof ans === "object" && ans !== null) {
        return Object.entries(ans).map(([k, v]) => `${k}: ${v}`).join(" | ");
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

// HELPER DINAMIS: Render Opsi Pembahasan Berdasarkan Tipe Soal
function renderOptionsByQuestionType(rev) {
    const tipePrefix = String(rev.Tipe || '1').charAt(0);

    // TIPE 3 (Isian / Short Answer): HILANGKAN opsi A-E sepenuhnya
    if (tipePrefix === '3') {
        return '';
    }

    // TIPE 4 (Pernyataan Benar/Salah)
    if (tipePrefix === '4') {
        const statements = rev.Pernyataan || rev.Statements || [];
        const keyArr = Array.isArray(rev.Kunci) ? rev.Kunci : [];
        const userArr = Array.isArray(rev.ans) ? rev.ans : [];

        if (statements.length === 0) return '';

        return `
        <div class="tf-review-container">
            <table class="premium-table mini-table">
                <thead>
                    <tr>
                        <th style="width:50px;">No</th>
                        <th>Pernyataan</th>
                        <th style="width:120px;">Jawaban Anda</th>
                        <th style="width:120px;">Kunci</th>
                        <th style="width:90px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${statements.map((st, sIdx) => {
                        const uVal = userArr[sIdx] || 'Kosong';
                        const kVal = keyArr[sIdx] || '-';
                        const isRowCorrect = String(uVal).toUpperCase() === String(kVal).toUpperCase();
                        return `
                        <tr>
                            <td>${sIdx + 1}</td>
                            <td>${st}</td>
                            <td><strong>${uVal}</strong></td>
                            <td><strong>${kVal}</strong></td>
                            <td><span class="badge ${isRowCorrect ? 'bg-success' : 'bg-danger'}">${isRowCorrect ? '✓ Benar' : '✗ Salah'}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    }

    // TIPE 5 (Skala / TKP / Bobot Nilai)
    if (tipePrefix === '5') {
        const keyObj = (typeof rev.Kunci === "object" && rev.Kunci !== null) ? rev.Kunci : {};
        return `
        <div class="options-review-list">
            ${['A', 'B', 'C', 'D', 'E'].map(opt => {
                if (!rev[opt]) return '';
                const weight = keyObj[opt] !== undefined ? keyObj[opt] : 0;
                const isSelected = String(rev.ans) === opt;
                return `
                <div class="opt-item ${isSelected ? 'opt-selected-tkp' : ''}">
                    <span class="opt-text"><strong>${opt}.</strong> ${rev[opt]}</span>
                    <span class="opt-weight-badge">Bobot: ${weight} Poin</span>
                </div>`;
            }).join('')}
        </div>`;
    }

    // TIPE 2 (Multiple Choice / Pilihan Ganda Kompleks)
    if (tipePrefix === '2') {
        const userArr = Array.isArray(rev.ans) ? rev.ans.map(String) : [String(rev.ans)];
        const keyArr = Array.isArray(rev.Kunci) ? rev.Kunci.map(String) : [String(rev.Kunci)];
        return `
        <div class="options-review-list">
            ${['A', 'B', 'C', 'D', 'E'].map(opt => {
                if (!rev[opt]) return '';
                const isKey = keyArr.includes(opt);
                const isUser = userArr.includes(opt);
                let optClass = '';
                if (isKey && isUser) optClass = 'opt-key opt-user-correct';
                else if (isKey) optClass = 'opt-key';
                else if (isUser) optClass = 'opt-user-wrong';

                return `
                <div class="opt-item ${optClass}">
                    <span class="opt-text"><strong>${opt}.</strong> ${rev[opt]}</span>
                    ${isKey ? '<span class="badge-key">KUNCI</span>' : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    // TIPE 1 (Single Choice / Pilihan Ganda Biasa)
    return `
    <div class="options-review-list">
        ${['A', 'B', 'C', 'D', 'E'].map(opt => {
            if (!rev[opt]) return '';
            const isKey = String(rev.Kunci) === opt;
            const isUser = String(rev.ans) === opt;
            let optClass = '';
            if (isKey && isUser) optClass = 'opt-key opt-user-correct';
            else if (isKey) optClass = 'opt-key';
            else if (isUser) optClass = 'opt-user-wrong';

            return `
            <div class="opt-item ${optClass}">
                <span class="opt-text"><strong>${opt}.</strong> ${rev[opt]}</span>
                ${isKey ? '<span class="badge-key">KUNCI</span>' : ''}
            </div>`;
        }).join('')}
    </div>`;
}

// FUNGSI UTAMA: Render Laporan Hasil Ujian Lengkap
function renderFullStudentReport() {
    const container = document.getElementById("pembahasan-container");
    if (!container) return;

    // 1. AMBIL DATA DARI CONTEXT APP ATAU LOCALSTORAGE
    let dataJSON = {};
    let userAnswers = {};
    let timeLogs = {};
    let studentProfile = {};

    if (typeof App !== "undefined" && App.soalData && Object.keys(App.soalData).length > 0) {
        dataJSON = App.soalData || {};
        userAnswers = App.userAnswers || {};
        timeLogs = App.questionTimeLogs || {};
        studentProfile = App.studentProfile || {
            nama: App.userName || "Peserta Ujian",
            nisn: App.userNisn || "-",
            kelas: App.userKelas || "-",
            nomorPeserta: App.userNoPeserta || "-"
        };
    } else {
        const storedReport = JSON.parse(localStorage.getItem("cbt_report_data") || "{}");
        dataJSON = storedReport.soalData || {};
        userAnswers = storedReport.userAnswers || {};
        timeLogs = storedReport.questionTimeLogs || {};
        studentProfile = storedReport.studentProfile || {
            nama: storedReport.userName || "Peserta Ujian",
            nisn: storedReport.userNisn || "-",
            kelas: storedReport.userKelas || "-",
            nomorPeserta: storedReport.userNoPeserta || "-"
        };
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
    let totalTimeSpent = 0;

    const subtestStats = {};
    const sectionStats = {};

    // 2. KALKULASI SKOR & AGREGASI METRIK
    const itemReviews = questions.map((q, idx) => {
        const no = q.No || (idx + 1);
        const tipe = q.Tipe || "1A";
        const level = q.Level || "E";
        const subtest = q.Subtest || "Umum";
        const section = q.Section || "Umum";
        const ans = userAnswers[no];
        const durasiSec = timeLogs[no] || 0;
        totalTimeSpent += durasiSec;

        const rule = scoringRules[tipe] || { skor_benar: 1, skor_salah: 0, skor_kosong: 0 };
        
        let status = "KOSONG", skorDiperoleh = 0, skorMaksSoal = 1;

        if (ans === undefined || ans === null || ans === "" || ans === "-") {
            status = "KOSONG";
            skorDiperoleh = rule.skor_kosong || 0;
            skorMaksSoal = rule.skor_benar || 1;
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
                    status = "BENAR"; 
                    skorDiperoleh = skorMaksSoal;
                } else {
                    status = "SALAH"; 
                    skorDiperoleh = rule.skor_salah || 0;
                }
            } 
            else if (tipe === "2A") {
                const keyArr = Array.isArray(q.Kunci) ? q.Kunci : [q.Kunci];
                const userArr = Array.isArray(ans) ? ans : [ans];
                const isExact = keyArr.length === userArr.length && keyArr.every(val => userArr.includes(val));
                if (isExact) { 
                    status = "BENAR"; 
                    skorDiperoleh = rule.skor_benar_semua || 1; 
                } else { 
                    status = "SALAH"; 
                    skorDiperoleh = rule.skor_salah || 0; 
                }
                skorMaksSoal = rule.skor_benar_semua || 1;
            } 
            else if (tipe === "4A") {
                const keyArr = Array.isArray(q.Kunci) ? q.Kunci : [];
                const userArr = Array.isArray(ans) ? ans : [];
                let correctCount = 0;
                keyArr.forEach((kVal, kIdx) => { 
                    if (userArr[kIdx] && String(userArr[kIdx]).toUpperCase() === String(kVal).toUpperCase()) correctCount++; 
                });
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

        // Agregasi Subtest & Section
        const aggregate = (target, key) => {
            if (!target[key]) target[key] = { total: 0, benar: 0, salah: 0, kosong: 0, skor: 0, maxSkor: 0 };
            target[key].total++;
            if (status === "BENAR") target[key].benar++;
            else if (status === "SALAH") target[key].salah++;
            else if (status === "KOSONG") target[key].kosong++;
            target[key].skor += skorDiperoleh;
            target[key].maxSkor += skorMaksSoal;
        };
        aggregate(subtestStats, subtest);
        aggregate(sectionStats, section);

        return { ...q, no, ans, status, skorDiperoleh, skorMaksSoal, durasiSec };
    });

    const accuracyPct = questions.length > 0 ? ((totalBenar / questions.length) * 100).toFixed(1) : 0;
    const avgTimeSec = questions.length > 0 ? Math.round(totalTimeSpent / questions.length) : 0;

    // 3. BUILD HTML STRUCTURE
    let html = `
    <div class="premium-report-wrapper">
        
        <!-- FITUR: KOP SURAT CBT -->
        <div class="report-header-card">
            <div class="header-flex">
                <div class="brand-info">
                    ${dataJSON.logo ? `<img src="${dataJSON.logo}" class="brand-logo" alt="Logo Lembaga">` : ''}
                    <div>
                        <h1 class="cbt-title">${dataJSON.nama_sistem_cbt || 'CBT SYSTEM'}</h1>
                        <h2 class="lembaga-title">${dataJSON.lembaga || 'LAPORAN HASIL TES PESERTA'}</h2>
                        <p class="alamat-text">${dataJSON.alamat_lembaga || '-'}</p>
                    </div>
                </div>
                <button onclick="window.print()" class="btn-print">
                    🖨️ Cetak / Print PDF
                </button>
            </div>
        </div>

        <!-- FITUR: TABEL IDENTITAS PESERTA -->
        <div class="card-box participant-info-card">
            <h3 class="card-subtitle">📌 Identitas Peserta Ujian</h3>
            <div class="identity-grid">
                <div class="id-item"><span>Nama Peserta:</span> <strong>${studentProfile.nama}</strong></div>
                <div class="id-item"><span>Kode Ujian:</span> <strong>${dataJSON.kode_ujian || '-'}</strong></div>
                <div class="id-item"><span>Nama Kegiatan:</span> <strong>${dataJSON.nama_kegiatan || '-'}</strong></div>
                <div class="id-item"><span>Sistem & Mode:</span> <strong>${dataJSON.sistem_ujian || 'CBT'} (${dataJSON.mode_ujian || 'LATIHAN'})</strong></div>
                <div class="id-item"><span>Penyelenggara:</span> <strong>${dataJSON.penyelenggara || '-'}</strong></div>
                <div class="id-item"><span>Total Durasi:</span> <strong>${formatTimeDuration(totalTimeSpent)} / ${dataJSON.timer_menit || 120} Menit</strong></div>
            </div>
        </div>

        <!-- FITUR: DASHBOARD SCORE ANALYSIS -->
        <div class="dashboard-grid">
            <div class="score-card primary">
                <p class="card-label">TOTAL SKOR PEROLEHAN</p>
                <h2 class="card-value">${totalSkorPerolehan.toFixed(1)} <span class="max-val">/ ${totalSkorMaksimal}</span></h2>
                <div class="progress-bg"><div class="progress-bar" style="width: ${Math.min((totalSkorPerolehan/totalSkorMaksimal)*100, 100)}%"></div></div>
            </div>
            <div class="score-card success">
                <p class="card-label">SCORE ACCURACY</p>
                <h2 class="card-value">${accuracyPct}%</h2>
                <p class="card-desc">${totalBenar} dari ${questions.length} Soal Benar</p>
            </div>
            <div class="score-card info">
                <p class="card-label">AVG TIME / QUESTION</p>
                <h2 class="card-value">${formatTimeDuration(avgTimeSec)}</h2>
                <p class="card-desc">Rata-rata Waktu per Soal</p>
            </div>
            <div class="score-card danger">
                <p class="card-label">SOAL SALAH</p>
                <h2 class="card-value">${totalSalah}</h2>
                <p class="card-desc">Perlu Evaluasi Ulang</p>
            </div>
            <div class="score-card warning">
                <p class="card-label">TIDAK DIJAWAB</p>
                <h2 class="card-value">${totalKosong}</h2>
                <p class="card-desc">Kosong / Ragu-ragu</p>
            </div>
        </div>

        <!-- FITUR: VISUALISASI GRAFIK CHART.JS -->
        <div class="card-box charts-main-wrapper">
            <h3 class="section-title">📊 Visualisasi Analisis Performa</h3>
            <div class="charts-grid-layout" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-top: 15px;">
                <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <h4 style="text-align: center; margin-bottom: 10px; font-size: 14px;">Proporsi Jawaban</h4>
                    <div style="height: 220px; position: relative;">
                        <canvas id="chartScorePie"></canvas>
                    </div>
                </div>
                <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <h4 style="text-align: center; margin-bottom: 10px; font-size: 14px;">Analisis Waktu Pengerjaan Per Soal (Detik)</h4>
                    <div style="height: 220px; position: relative;">
                        <canvas id="chartTimeLine"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- FITUR: SUBTEST STRENGTH ANALYSIS -->
        <div class="card-box analytics-container">
            <h3 class="section-title">📊 Subtest Strength Analysis</h3>
            <div style="height: 200px; margin-bottom: 20px;">
                <canvas id="chartSubtestBar"></canvas>
            </div>
            <div class="table-responsive">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th>Subtest</th>
                            <th>Jumlah Soal</th>
                            <th>Benar</th>
                            <th>Salah</th>
                            <th>Kosong</th>
                            <th>Akurasi (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(subtestStats).map(([stName, stData]) => {
                            const pct = stData.total > 0 ? ((stData.benar / stData.total) * 100).toFixed(1) : 0;
                            return `
                            <tr>
                                <td><strong>${stName}</strong></td>
                                <td>${stData.total} Soal</td>
                                <td class="text-success font-weight-bold">${stData.benar}</td>
                                <td class="text-danger">${stData.salah}</td>
                                <td class="text-muted">${stData.kosong}</td>
                                <td>
                                    <div class="progress-mini">
                                        <div class="progress-mini-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}" style="width: ${pct}%"></div>
                                    </div>
                                    <small>${pct}%</small>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FITUR: SECTION STRENGTH ANALYSIS -->
        <div class="card-box analytics-container">
            <h3 class="section-title">📌 Section Strength Analysis</h3>
            <div class="table-responsive">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th>Section (Materi)</th>
                            <th>Jumlah Soal</th>
                            <th>Benar</th>
                            <th>Salah</th>
                            <th>Kosong</th>
                            <th>Akurasi (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(sectionStats).map(([secName, secData]) => {
                            const pct = secData.total > 0 ? ((secData.benar / secData.total) * 100).toFixed(1) : 0;
                            return `
                            <tr>
                                <td><strong>${secName}</strong></td>
                                <td>${secData.total} Soal</td>
                                <td class="text-success font-weight-bold">${secData.benar}</td>
                                <td class="text-danger">${secData.salah}</td>
                                <td class="text-muted">${secData.kosong}</td>
                                <td>
                                    <div class="progress-mini">
                                        <div class="progress-mini-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}" style="width: ${pct}%"></div>
                                    </div>
                                    <small>${pct}%</small>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FITUR: LOG REVIEW TABEL COMPACT -->
        <div class="card-box log-review-container">
            <h3 class="section-title">📋 Log Rekap Pengerjaan Soal</h3>
            <div class="table-responsive">
                <table class="premium-table compact-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tipe</th>
                            <th>Level</th>
                            <th>Subtest</th>
                            <th>Section</th>
                            <th>Jawaban Anda</th>
                            <th>Kunci Jawaban</th>
                            <th>Skor</th>
                            <th>Durasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemReviews.map(r => `
                        <tr>
                            <td><strong>${r.no}</strong></td>
                            <td><span class="badge bg-light">${r.Tipe}</span></td>
                            <td>${r.Level}</td>
                            <td>${r.Subtest}</td>
                            <td>${r.Section}</td>
                            <td>${formatUserAnswerReport(r.ans)}</td>
                            <td>${formatKunciReport(r.Kunci)}</td>
                            <td><strong>+${r.skorDiperoleh}</strong></td>
                            <td>${formatTimeDuration(r.durasiSec)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FITUR: QUESTION REVIEW & PEMBAHASAN -->
        <div class="review-container card-box">
            <div class="review-header">
                <h3 class="section-title">📝 Question Review & Pembahasan Lengkap</h3>
            </div>

            <div class="review-list">
                ${itemReviews.map(rev => {
                    let badgeClass = 'bg-muted', icon = '➖';
                    if (rev.status === 'BENAR') { badgeClass = 'bg-success'; icon = '✓'; }
                    else if (rev.status === 'SALAH') { badgeClass = 'bg-danger'; icon = '✗'; }
                    else if (rev.status === 'PARSIAL' || rev.status === 'SKOR_SCALE') { badgeClass = 'bg-warning'; icon = '⭐'; }

                    const ansText = formatUserAnswerReport(rev.ans);
                    const keyText = formatKunciReport(rev.Kunci);
                    const teksSoal = rev.Soal || rev.Pertanyaan || "Teks soal tidak tersedia.";
                    const teksPembahasan = rev.Pembahasan || "Penjelasan belum tersedia untuk nomor ini.";
                    
                    // Render opsi dinamis berdasarkan tipe soal
                    const optionsHTML = renderOptionsByQuestionType(rev);

                    return `
                    <div class="review-card-item">
                        <div class="card-head">
                            <div class="head-left">
                                <span class="q-number">Soal No. ${rev.no}</span>
                                <span class="q-tags">${rev.Subtest} • ${rev.Section} (Tipe ${rev.Tipe})</span>
                            </div>
                            <div class="head-right">
                                <span class="time-spent">⏱️ Timelog: ${formatTimeDuration(rev.durasiSec)} (${rev.durasiSec}s)</span>
                                <span class="status-badge ${badgeClass}">${icon} Skor: +${rev.skorDiperoleh}</span>
                            </div>
                        </div>
                        
                        <div class="q-content">
                            <div class="q-text">${teksSoal}</div>
                            ${rev.Gambar ? `<div class="q-image"><img src="${rev.Gambar}" alt="Gambar Soal No ${rev.no}"></div>` : ''}
                            ${optionsHTML}
                        </div>

                        <div class="answer-compare">
                            <div class="ans-box user-ans ${rev.status === 'BENAR' ? 'correct-border' : 'wrong-border'}">
                                <small>Jawaban Peserta:</small>
                                <strong>${ansText}</strong>
                            </div>
                            <div class="ans-box key-ans">
                                <small>Kunci Jawaban:</small>
                                <strong>${keyText}</strong>
                            </div>
                        </div>

                        <div class="pembahasan-detail-box">
                            <h4>💡 Penjelasan / Pembahasan:</h4>
                            <div class="pembahasan-text">${teksPembahasan}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- FITUR: KALIMAT MOTIVASI -->
        ${dataJSON.kalimat_motivasi ? `
        <div class="motivation-banner">
            <div class="quote-icon">❝</div>
            <p class="motivation-text">${dataJSON.kalimat_motivasi}</p>
        </div>` : ''}

    </div>`;

    container.innerHTML = html;

    // Trigger MathJax untuk LaTeX
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise();
    }

    // Inisialisasi Grafik Chart.js
    renderReportCharts(totalBenar, totalSalah, totalKosong, itemReviews, subtestStats);
}

// HELPER: Inisialisasi Chart.js Visual
function renderReportCharts(benar, salah, kosong, itemReviews, subtestStats) {
    if (typeof Chart === 'undefined') return;

    // 1. Pie Chart - Proporsi Jawaban
    const pieCtx = document.getElementById('chartScorePie');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Benar', 'Salah', 'Kosong'],
                datasets: [{
                    data: [benar, salah, kosong],
                    backgroundColor: ['#10B981', '#EF4444', '#9CA3AF']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Line Chart - Time Analysis
    const lineCtx = document.getElementById('chartTimeLine');
    if (lineCtx) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: itemReviews.map(r => `No ${r.no}`),
                datasets: [{
                    label: 'Durasi (Detik)',
                    data: itemReviews.map(r => r.durasiSec),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 3. Bar Chart - Subtest Strength
    const barCtx = document.getElementById('chartSubtestBar');
    if (barCtx) {
        const labels = Object.keys(subtestStats);
        const accuracyData = labels.map(k => {
            const st = subtestStats[k];
            return st.total > 0 ? ((st.benar / st.total) * 100).toFixed(1) : 0;
        });

        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Akurasi Subtest (%)',
                    data: accuracyData,
                    backgroundColor: '#8B5CF6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { min: 0, max: 100 } }
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", renderFullStudentReport);
