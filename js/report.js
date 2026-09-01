/* ==========================================================
   CBT KIBI V2.0 PREMIUM - Static Student Report & Review
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

    // 3. BUILD HTML STRUCTURE (FITUR 1-7 REPORT)
    let html = `
    <div class="premium-report-wrapper">
        
        <!-- FITUR: KOP SURAT CBT -->
        <div class="report-header-card">
            <div class="header-flex">
                <div class="brand-info">
                    ${dataJSON.logo ? `<img src="${dataJSON.logo}" class="brand-logo" alt="Logo Lembaga">` : ''}
                    <div>
                        <h1 class="cbt-title">${dataJSON.nama_sistem_cbt || 'CBT SYSTEM'}</h1>
                        <h2 class="lembaga-title">${dataJSON.lembaga || 'SMAN 12 BANUA'}</h2>
                        <p class="alamat-text">${dataJSON.alamat_lembaga || '-'}</p>
                    </div>
                </div>
                <!-- FITUR: TOMBOL PRINT PDF -->
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

        <!-- FITUR 1, 2, 3: DASHBOARD SCORE ANALYSIS, ACCURACY & AVG TIME -->
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

        <!-- FITUR 4: SUBTEST STRENGTH ANALYSIS -->
        <div class="card-box analytics-container">
            <h3 class="section-title">📊 Subtest Strength Analysis</h3>
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
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FITUR 5: SECTION STRENGTH ANALYSIS -->
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
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FITUR 6 & 7: QUESTION REVIEW + TIMELOG + PEMBAHASAN -->
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

                    // Opsi Pilihan (Jika Tipe Single / Multiple Choice)
                    let optionsHTML = "";
                    if (rev.A || rev.B || rev.C || rev.D || rev.E) {
                        optionsHTML = `
                        <div class="options-review-list">
                            ${['A', 'B', 'C', 'D', 'E'].map(opt => {
                                if (!rev[opt]) return '';
                                return `<div class="opt-item ${String(rev.Kunci) === opt ? 'opt-key' : ''}">${opt}. ${rev[opt]}</div>`;
                            }).join('')}
                        </div>`;
                    }

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
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- FITUR: KALIMAT MOTIVASI (DI PALING AKHIR) -->
        ${dataJSON.kalimat_motivasi ? `
        <div class="motivation-banner">
            <div class="quote-icon">❝</div>
            <p class="motivation-text">${dataJSON.kalimat_motivasi}</p>
        </div>` : ''}

    </div>
    `;

    container.innerHTML = html;

    // Trigger MathJax jika ada notasi LaTeX
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise();
    }
}

document.addEventListener("DOMContentLoaded", renderFullStudentReport);
