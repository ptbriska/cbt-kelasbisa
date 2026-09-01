/* ==========================================================
   CBT KIBI V2.0 PREMIUM - Static Student Report & Review
   Update: Complete Engine + Tipe 4 & 5 Table + Chart Fix
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

    // TIPE 3 (Isian Singkat)
    if (tipePrefix === '3') return '';

    // TIPE 4 (Pernyataan Benar/Salah) -> DIBUAT DALAM TABEL
    if (tipePrefix === '4') {
        let statements = rev.Pernyataan || rev.Statements || [];
        if (statements.length === 0) {
            ['A','B','C','D','E'].forEach(opt => {
                if (rev[opt]) statements.push(rev[opt]);
            });
        }
        
        const keyArr = Array.isArray(rev.Kunci) ? rev.Kunci : String(rev.Kunci).split(',').map(s=>s.trim());
        const userArr = Array.isArray(rev.ans) ? rev.ans : String(rev.ans || '').split(',').map(s=>s.trim());

        if (statements.length === 0) return '';

        return `
        <div class="table-responsive" style="margin-top:15px;">
            <table class="premium-table mini-table" style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8fafc; text-align: left;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; width:50px;">No</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0;">Pernyataan</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; width:120px; color:#ef4444;">Jawaban Anda</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; width:120px; color:#10b981;">Kunci</th>
                    </tr>
                </thead>
                <tbody>
                    ${statements.map((st, sIdx) => {
                        const uVal = userArr[sIdx] || 'Kosong';
                        const kVal = keyArr[sIdx] || '-';
                        const isMatch = String(uVal).toUpperCase() === String(kVal).toUpperCase();
                        return `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${sIdx + 1}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${st}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; color: ${isMatch ? '#10b981' : '#ef4444'}; font-weight:bold;">${uVal}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #10b981; font-weight:bold;">${kVal}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    }

    // TIPE 5 (Skala / TKP / Bobot Nilai) -> DIBUAT DALAM TABEL
    if (tipePrefix === '5') {
        const keyObj = (typeof rev.Kunci === "object" && rev.Kunci !== null) ? rev.Kunci : {};
        return `
        <div class="table-responsive" style="margin-top:15px;">
            <table class="premium-table mini-table" style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8fafc; text-align: left;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; width:60px;">Opsi</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0;">Pernyataan / Pilihan</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; width:100px;">Bobot Poin</th>
                    </tr>
                </thead>
                <tbody>
                    ${['A', 'B', 'C', 'D', 'E'].map(opt => {
                        if (!rev[opt]) return '';
                        const weight = keyObj[opt] !== undefined ? keyObj[opt] : 0;
                        const isSelected = String(rev.ans) === opt;
                        const bgStyle = isSelected ? 'background-color: #fef08a;' : ''; 
                        return `
                        <tr style="${bgStyle}">
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${opt}</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${rev[opt]}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight:bold;">${weight} Poin</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    }

    // TIPE 1 & 2 (Pilihan Ganda Standar & Kompleks)
    const userArr = Array.isArray(rev.ans) ? rev.ans.map(String) : [String(rev.ans)];
    const keyArr = Array.isArray(rev.Kunci) ? rev.Kunci.map(String) : [String(rev.Kunci)];
    return `
    <div class="options-review-list" style="margin-top:15px;">
        ${['A', 'B', 'C', 'D', 'E'].map(opt => {
            if (!rev[opt]) return '';
            const isKey = keyArr.includes(opt);
            const isUser = userArr.includes(opt);
            let optStyle = "padding: 8px; border: 1px solid #e2e8f0; border-radius: 5px; margin-bottom: 5px;";
            let badge = "";

            if (isKey && isUser) {
                optStyle = "padding: 8px; border: 1px solid #10b981; background: #d1fae5; border-radius: 5px; margin-bottom: 5px;";
                badge = `<span style="float:right; background:#10b981; color:#fff; padding:2px 8px; border-radius:12px; font-size:12px;">✓ Benar</span>`;
            } else if (isKey) {
                optStyle = "padding: 8px; border: 1px solid #10b981; border-radius: 5px; margin-bottom: 5px;";
                badge = `<span style="float:right; background:#10b981; color:#fff; padding:2px 8px; border-radius:12px; font-size:12px;">KUNCI</span>`;
            } else if (isUser) {
                optStyle = "padding: 8px; border: 1px solid #ef4444; background: #fee2e2; border-radius: 5px; margin-bottom: 5px;";
                badge = `<span style="float:right; background:#ef4444; color:#fff; padding:2px 8px; border-radius:12px; font-size:12px;">Pilihan Anda</span>`;
            }

            return `
            <div style="${optStyle}">
                <strong>${opt}.</strong> ${rev[opt]}
                ${badge}
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
        
        <!-- FITUR: KOP SURAT CBT (LOKASI LOGO KIRI, TEKS RATA TENGAH) -->
        <div class="report-header-card" style="position: relative; display: flex; align-items: center; justify-content: center; min-height: 90px; padding: 20px; text-align: center;">
            ${dataJSON.logo ? `<img src="${dataJSON.logo}" class="brand-logo" style="position: absolute; left: 24px; top: 50%; transform: translateY(-50%); max-height: 65px; width: auto;" alt="Logo Lembaga">` : ''}
            
            <div class="brand-text-center" style="text-align: center; margin: 0 auto; padding: 0 80px;">
                <h1 class="cbt-title" style="margin: 0; font-size: 20px; font-weight: 800; text-align: center;">${dataJSON.nama_sistem_cbt || 'CBT SYSTEM'}</h1>
                <h2 class="lembaga-title" style="margin: 4px 0; font-size: 16px; font-weight: 700; text-align: center;">${dataJSON.lembaga || 'LAPORAN HASIL TES PESERTA'}</h2>
                <p class="alamat-text" style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">${dataJSON.alamat_lembaga || '-'}</p>
            </div>

            <button onclick="window.print()" class="btn-print" style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%);">
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
                    
                    // Render opsi dinamis
                    const optionsHTML = renderOptionsByQuestionType(rev);

                    // LOGIKA KOTAK WARNA JAWABAN (HIJAU / MERAH)
                    let answerCompareHTML = '';
                    const isPerfectMatch = String(rev.ans).trim().toUpperCase() === String(rev.Kunci).trim().toUpperCase();
                    const isTipe5 = String(rev.Tipe || '').startsWith('5');
                    const isAnswered = rev.ans !== undefined && rev.ans !== null && rev.ans !== "" && rev.ans !== "-";

                    if (rev.status === 'BENAR' || isPerfectMatch || (isTipe5 && isAnswered)) {
                        answerCompareHTML = `
                            <div style="background: #d1fae5; border: 1px solid #10b981; padding: 12px; margin-top: 20px; border-radius: 6px;">
                                <div style="color: #065f46; font-weight: bold; font-size: 15px; margin-bottom: 5px;">✅ Jawabanmu dan Kunci Valid, Selamat</div>
                                <div style="color: #065f46;">Jawaban Anda: <strong>${ansText}</strong> ${isTipe5 ? `(Memperoleh ${rev.skorDiperoleh} Poin)` : ''}</div>
                            </div>
                        `;
                    } else {
                        answerCompareHTML = `
                            <div style="display: flex; gap: 15px; margin-top: 20px;">
                                <div style="flex: 1; background: #fee2e2; border: 1px solid #ef4444; padding: 12px; border-radius: 6px;">
                                    <div style="color: #991b1b; font-weight: bold; font-size: 14px; margin-bottom: 5px;">❌ Jawabanmu</div>
                                    <div style="color: #991b1b; font-size: 16px;"><strong>${ansText}</strong></div>
                                </div>
                                <div style="flex: 1; background: #d1fae5; border: 1px solid #10b981; padding: 12px; border-radius: 6px;">
                                    <div style="color: #065f46; font-weight: bold; font-size: 14px; margin-bottom: 5px;">✅ Kunci Jawaban</div>
                                    <div style="color: #065f46; font-size: 16px;"><strong>${keyText}</strong></div>
                                </div>
                            </div>
                        `;
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

                        ${answerCompareHTML}

                        <div class="pembahasan-detail-box" style="margin-top: 20px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <h4 style="margin:0 0 10px 0; color:#3b82f6;">💡 Penjelasan / Pembahasan:</h4>
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

    // Trigger MathJax untuk LaTeX jika ada
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise();
    }

    // Eksekusi Grafik dengan Delay agar DOM siap
    setTimeout(() => {
        renderReportCharts(totalBenar, totalSalah, totalKosong, itemReviews, subtestStats);
    }, 500);
}

// HELPER: Inisialisasi Chart.js Visual
function renderReportCharts(benar, salah, kosong, itemReviews, subtestStats) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js tidak terdeteksi! Diagram tidak dapat ditampilkan.");
        ['chartScorePie', 'chartTimeLine', 'chartSubtestBar'].forEach(id => {
            const canvasEl = document.getElementById(id);
            if(canvasEl) {
                canvasEl.outerHTML = `<div style="text-align:center; padding: 40px 20px; background:#fff3cd; color:#856404; border-radius:8px;">
                    <strong>Peringatan:</strong> Library Chart.js belum dimuat. Pastikan terhubung internet atau script sudah ditambahkan.
                </div>`;
            }
        });
        return;
    }

    const initChart = (canvasId, config) => {
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            let chartStatus = Chart.getChart(canvasId); 
            if (chartStatus != undefined) chartStatus.destroy();
            new Chart(ctx, config);
        }
    };

    // 1. Pie Chart
    initChart('chartScorePie', {
        type: 'doughnut',
        data: {
            labels: ['Benar', 'Salah', 'Kosong'],
            datasets: [{ data: [benar, salah, kosong], backgroundColor: ['#10B981', '#EF4444', '#9CA3AF'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Line Chart
    initChart('chartTimeLine', {
        type: 'line',
        data: {
            labels: itemReviews.map(r => `No ${r.no}`),
            datasets: [{
                label: 'Durasi (Detik)',
                data: itemReviews.map(r => r.durasiSec),
                borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    // 3. Bar Chart
    const labels = Object.keys(subtestStats);
    const accuracyData = labels.map(k => (subtestStats[k].total > 0 ? (subtestStats[k].benar / subtestStats[k].total) * 100 : 0));
    initChart('chartSubtestBar', {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Akurasi (%)', data: accuracyData, backgroundColor: '#8B5CF6' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });
}

document.addEventListener("DOMContentLoaded", renderFullStudentReport);
