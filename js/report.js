/* ==========================================================
   CBT KIBI V1.6 - Full Student Report Logic (Standalone Ready)
   ========================================================== */

// Helper pemformat Kunci Jawaban untuk tabel review
function formatKunciReport(kunci) {
    if (Array.isArray(kunci)) return kunci.join(", ");
    if (typeof kunci === "object" && kunci !== null) {
        return Object.entries(kunci).map(([k, v]) => `${k}=${v}`).join(" | ");
    }
    return String(kunci || "-");
}

// Helper pemformat Jawaban Peserta
function formatUserAnswerReport(ans) {
    if (!ans || ans === "" || ans === "-") return "<em style='color:#6c757d;'>Tidak Diisi</em>";
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

// FUNGSI UTAMA: Render Laporan Hasil Ujian Lengkap
function renderFullStudentReport() {
    const container = document.getElementById("pembahasan-container");
    if (!container) return;

    // AMBIL DATA: Prioritas dari App (jika single page), atau dari localStorage (jika window terpisah)
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
        // Fallback mengambil dari localStorage (pembahasan.html)
        const storedReport = JSON.parse(localStorage.getItem("cbt_report_data") || "{}");
        dataJSON = storedReport.soalData || {};
        userAnswers = storedReport.userAnswers || {};
        timeLogs = storedReport.questionTimeLogs || {};
        userName = storedReport.userName || "Peserta Ujian";
    }

    // Jika data tidak ditemukan
    if (!dataJSON.questions || dataJSON.questions.length === 0) {
        container.innerHTML = `
            <div class="report-wrapper" style="text-align:center; padding: 50px;">
                <h3 style="color:#dc3545;">⚠️ Data Pembahasan Tidak Ditemukan</h3>
                <p>Silakan selesaikan ujian dan masukkan Token Pembahasan pada halaman utama terlebih dahulu.</p>
                <button onclick="window.close()" class="btn-print-full" style="margin-top:15px;">Tutup Halaman Ini</button>
            </div>
        `;
        return;
    }

    const questions = dataJSON.questions || [];
    const scoringRules = dataJSON.scoring_rules || {};

    // Variable Akumulasi Utama
    let totalBenar = 0;
    let totalSalah = 0;
    let totalKosong = 0;
    let totalSkorPerolehan = 0;
    let totalSkorMaksimal = 0;

    // Data Structure Agregasi Subtest & Section
    const subtestStats = {};
    const sectionStats = {};

    // 1. ITERASI KALKULASI SKOR PER SOAL & AGREGASI STATISTIK
    const itemReviews = questions.map((q, idx) => {
        const no = q.No || (idx + 1);
        const tipe = q.Tipe || "1A";
        const level = q.Level || "E";
        const subtest = q.Subtest || "Umum";
        const section = q.Section || "Umum";
        const ans = userAnswers[no];
        const durasiSec = timeLogs[no] || 0;

        const rule = scoringRules[tipe] || { skor_benar: 1, skor_salah: 0, skor_kosong: 0 };
        
        let status = "KOSONG";
        let skorDiperoleh = 0;
        let skorMaksSoal = 1;

        // Evaluasi Jawaban Berdasarkan Tipe Soal
        if (!ans || ans === "" || ans === "-") {
            status = "KOSONG";
            skorDiperoleh = rule.skor_kosong || 0;
        } else {
            if (tipe === "1A" || tipe === "1B" || tipe === "3A" || tipe === "3B") {
                const match = String(ans).trim().toLowerCase() === String(q.Kunci).trim().toLowerCase();
                if (match) {
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
                    if (userArr[kIdx] && userArr[kIdx] === kVal) correctCount++;
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

        // Akumulasi Total Ujian
        if (status === "BENAR") totalBenar++;
        else if (status === "SALAH") totalSalah++;
        else if (status === "KOSONG") totalKosong++;

        totalSkorPerolehan += skorDiperoleh;
        totalSkorMaksimal += skorMaksSoal;

        // Agregasi Subtest Stats
        if (!subtestStats[subtest]) {
            subtestStats[subtest] = { total: 0, benar: 0, salah: 0, kosong: 0, skor: 0, maxSkor: 0 };
        }
        subtestStats[subtest].total++;
        if (status === "BENAR") subtestStats[subtest].benar++;
        if (status === "SALAH") subtestStats[subtest].salah++;
        if (status === "KOSONG") subtestStats[subtest].kosong++;
        subtestStats[subtest].skor += skorDiperoleh;
        subtestStats[subtest].maxSkor += skorMaksSoal;

        // Agregasi Section Stats
        if (!sectionStats[section]) {
            sectionStats[section] = { total: 0, benar: 0, salah: 0, kosong: 0, skor: 0, maxSkor: 0 };
        }
        sectionStats[section].total++;
        if (status === "BENAR") sectionStats[section].benar++;
        if (status === "SALAH") sectionStats[section].salah++;
        if (status === "KOSONG") sectionStats[section].kosong++;
        sectionStats[section].skor += skorDiperoleh;
        sectionStats[section].maxSkor += skorMaksSoal;

        return {
            ...q,
            no,
            ans,
            status,
            skorDiperoleh,
            skorMaksSoal,
            durasiSec
        };
    });

    // 2. BUILD HTML STRUCTURE REPORT
    let html = `
    <div class="report-wrapper">
        <div class="report-action-bar">
            <h3>📊 Full Student Performance & Diagnostic Report</h3>
            <button onclick="window.print()" class="btn-print-full">🖨️ Cetak PDF Laporan Lengkap</button>
        </div>

        <!-- Kop Surat -->
        <div class="kop-surat-report">
            ${dataJSON.logo ? `<img src="${dataJSON.logo}" alt="Logo" class="kop-logo-report">` : ''}
            <div class="kop-text-report">
                <h1>${dataJSON.lembaga || 'KIBI EDUCATION CENTER'}</h1>
                <h3>${dataJSON.nama_sistem_cbt || 'CBT SYSTEM'} - ${dataJSON.nama_kegiatan || 'REKAP HASIL UJIAN'}</h3>
                <p>${dataJSON.alamat_lembaga || ''}</p>
            </div>
        </div>

        <!-- Identitas Peserta -->
        <div class="student-info-grid">
            <div class="info-item"><span>Kode Ujian:</span><strong>${dataJSON.kode_ujian || '-'}</strong></div>
            <div class="info-item"><span>Nama Peserta:</span><strong>${userName}</strong></div>
            <div class="info-item"><span>Mode Ujian:</span><strong>${dataJSON.mode_ujian || 'LATIHAN'}</strong></div>
            <div class="info-item"><span>Tanggal Ujian:</span><strong>${new Date().toLocaleDateString('id-ID')}</strong></div>
        </div>

        <!-- Ringkasan Nilai Akhir -->
        <div class="score-cards-wrapper">
            <div class="score-card highlight">
                <div class="title">TOTAL SKOR PEROLEHAN</div>
                <div class="value">${totalSkorPerolehan.toFixed(1)} / ${totalSkorMaksimal}</div>
            </div>
            <div class="score-card">
                <div class="title">AKURASI SOAL BENAR</div>
                <div class="value" style="color: #198754;">${totalBenar} <small style="font-size: 13px;">(${((totalBenar/questions.length)*100).toFixed(0)}%)</small></div>
            </div>
            <div class="score-card">
                <div class="title">SALAH / KURANG TEPAT</div>
                <div class="value" style="color: #dc3545;">${totalSalah}</div>
            </div>
            <div class="score-card">
                <div class="title">TIDAK DIJAWAB</div>
                <div class="value" style="color: #6c757d;">${totalKosong}</div>
            </div>
        </div>

        <!-- Analisis Per Subtest -->
        <div class="report-section-title">📊 Analisis Kekuatan Per Subtest</div>
        <table class="table-report">
            <thead>
                <tr>
                    <th>Subtest</th>
                    <th>Jumlah Soal</th>
                    <th>Benar</th>
                    <th>Salah</th>
                    <th>Kosong</th>
                    <th>Total Skor</th>
                    <th>Persentase</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.entries(subtestStats).forEach(([stName, stData]) => {
        const pct = stData.maxSkor > 0 ? ((stData.skor / stData.maxSkor) * 100).toFixed(1) : 0;
        html += `
            <tr>
                <td><strong>${stName}</strong></td>
                <td>${stData.total}</td>
                <td>${stData.benar}</td>
                <td>${stData.salah}</td>
                <td>${stData.kosong}</td>
                <td>${stData.skor.toFixed(1)} / ${stData.maxSkor}</td>
                <td><strong>${pct}%</strong></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <!-- Analisis Per Section -->
        <div class="report-section-title">🎯 Analisis Detail Per Section (Materi)</div>
        <table class="table-report">
            <thead>
                <tr>
                    <th>Section / Materi</th>
                    <th>Jumlah Soal</th>
                    <th>Benar</th>
                    <th>Salah</th>
                    <th>Skor</th>
                    <th>Akurasi</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.entries(sectionStats).forEach(([secName, secData]) => {
        const pct = secData.maxSkor > 0 ? ((secData.skor / secData.maxSkor) * 100).toFixed(1) : 0;
        html += `
            <tr>
                <td><strong>${secName}</strong></td>
                <td>${secData.total}</td>
                <td>${secData.benar}</td>
                <td>${secData.salah}</td>
                <td>${secData.skor.toFixed(1)} / ${secData.maxSkor}</td>
                <td><strong>${pct}%</strong></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <!-- Question Review + Timelog Table -->
        <div class="report-section-title">📝 Question Review & Timelog Detail</div>
        <table class="table-report">
            <thead>
                <tr>
                    <th style="width: 50px;">No</th>
                    <th style="width: 70px;">Tipe</th>
                    <th>Jawaban Anda</th>
                    <th>Kunci Jawaban</th>
                    <th style="width: 110px;">Status / Skor</th>
                    <th style="width: 90px;">Waktu Log</th>
                </tr>
            </thead>
            <tbody>
    `;

    itemReviews.forEach((rev) => {
        let badgeHtml = '';
        if (rev.status === 'BENAR') badgeHtml = `<span class="badge-status status-correct">✓ Benar (+${rev.skorDiperoleh})</span>`;
        else if (rev.status === 'SALAH') badgeHtml = `<span class="badge-status status-incorrect">✗ Salah (${rev.skorDiperoleh})</span>`;
        else if (rev.status === 'PARSIAL') badgeHtml = `<span class="badge-status status-score">~ Skor: ${rev.skorDiperoleh}</span>`;
        else if (rev.status === 'SKOR_SCALE') badgeHtml = `<span class="badge-status status-score">Poin: ${rev.skorDiperoleh}</span>`;
        else badgeHtml = `<span class="badge-status status-empty">- Kosong (0)</span>`;

        html += `
            <tr class="card-review-item">
                <td style="text-align:center;"><strong>${rev.no}</strong></td>
                <td><small>${rev.Tipe}</small></td>
                <td>${formatUserAnswerReport(rev.ans)}</td>
                <td><strong style="color:#198754;">${formatKunciReport(rev.Kunci)}</strong></td>
                <td>${badgeHtml}</td>
                <td>⏱️ ${formatTimeDuration(rev.durasiSec)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <!-- Motivasi Penutup -->
        ${dataJSON.kalimat_motivasi ? `
            <div class="motivation-box">
                💬 <strong>Pesan Motivasi:</strong> "${dataJSON.kalimat_motivasi}"
            </div>
        ` : ''}

    </div>`;

    container.innerHTML = html;

    // Trigger MathJax re-render jika ada rumus matematika
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise();
    }
}

// OTOMATIS RUN SAAT HALAMAN PEMBAHASAN.HTML DIBUKA
document.addEventListener("DOMContentLoaded", () => {
    renderFullStudentReport();
});
